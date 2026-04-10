import { NextResponse } from "next/server";
import { extractResumeText } from "@/lib/resume-parser";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ""
]);
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

type DomainProfile = {
  domain: string;
  roles: string[];
  educationSignals: string[];
  experienceSignals: string[];
  toolSignals: string[];
  skillSignals: string[];
};

type RoleEvaluation = {
  role: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
};

type ExtractedInfo = {
  skills: string[];
  experience: string[];
  education: string[];
  tools: string[];
  soft_skills: string[];
};

type ProcessResponse = {
  success: boolean;
  domain: string;
  domain_confidence: number;
  roles: RoleEvaluation[];
  extracted_info: ExtractedInfo;
  errors?: string;
};

const DOMAIN_PROFILES: DomainProfile[] = [
  {
    domain: "Pharmaceuticals",
    roles: ["QA Executive", "QC Analyst", "Regulatory Affairs Associate"],
    educationSignals: ["b.pharm", "m.pharm", "pharmacy", "pharmaceutical", "pharmacology"],
    experienceSignals: ["gmp", "quality control", "quality assurance", "regulatory", "validation", "laboratory"],
    toolSignals: ["hplc", "lims", "sap"],
    skillSignals: ["documentation", "compliance", "sop", "batch record"]
  },
  {
    domain: "Healthcare",
    roles: ["Clinical Coordinator", "Healthcare Administrator", "Patient Care Specialist"],
    educationSignals: ["nursing", "b.sc nursing", "medical", "healthcare administration"],
    experienceSignals: ["patient care", "clinical", "hospital", "medical records", "care coordination"],
    toolSignals: ["ehr", "emr"],
    skillSignals: ["medical terminology", "triage", "documentation", "compliance"]
  },
  {
    domain: "Customer Support",
    roles: ["Customer Support Specialist", "Customer Success Associate", "Helpdesk Executive"],
    educationSignals: [],
    experienceSignals: ["customer support", "ticket", "call center", "client handling", "escalation"],
    toolSignals: ["zendesk", "freshdesk", "salesforce", "intercom"],
    skillSignals: ["issue resolution", "crm", "customer communication", "sla"]
  },
  {
    domain: "Business Operations",
    roles: ["Business Analyst", "Operations Executive", "Sales Operations Associate"],
    educationSignals: ["mba", "bba", "business administration", "commerce"],
    experienceSignals: ["operations", "reporting", "stakeholder management", "analysis", "process improvement"],
    toolSignals: ["excel", "power bi", "google sheets", "crm"],
    skillSignals: ["coordination", "forecasting", "reporting", "planning"]
  },
  {
    domain: "Technology",
    roles: ["Software Engineer", "Frontend Developer", "Full Stack Developer"],
    educationSignals: ["computer science", "information technology", "software engineering"],
    experienceSignals: ["developer", "software", "frontend", "backend", "api", "web application"],
    toolSignals: ["javascript", "typescript", "react", "node.js", "python", "docker", "aws"],
    skillSignals: ["sql", "rest api", "git", "testing"]
  }
];

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const stepLogs: string[] = [];

  try {
    stepLogs.push("step_1_validate_file_started");
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return respondWithError(
        {
          success: false,
          domain: "",
          domain_confidence: 0,
          roles: [],
          extracted_info: emptyExtractedInfo(),
          errors: "Resume file is required."
        },
        400,
        requestId,
        stepLogs
      );
    }

    const validationError = validateResumeFile(file);

    if (validationError) {
      return respondWithError(
        {
          success: false,
          domain: "",
          domain_confidence: 0,
          roles: [],
          extracted_info: emptyExtractedInfo(),
          errors: validationError
        },
        400,
        requestId,
        [...stepLogs, "step_1_validate_file_failed"]
      );
    }

    stepLogs.push("step_1_validate_file_completed");
    stepLogs.push("step_2_extract_text_started");

    let resumeText = "";

    try {
      resumeText = await extractResumeText(file);
    } catch (error) {
      return respondWithError(
        {
          success: false,
          domain: "",
          domain_confidence: 0,
          roles: [],
          extracted_info: emptyExtractedInfo(),
          errors: `Resume text extraction failed: ${getErrorMessage(error)}`
        },
        422,
        requestId,
        [...stepLogs, "step_2_extract_text_failed"]
      );
    }

    if (!resumeText.trim()) {
      return respondWithError(
        {
          success: false,
          domain: "",
          domain_confidence: 0,
          roles: [],
          extracted_info: emptyExtractedInfo(),
          errors: "Resume text could not be extracted from the uploaded file."
        },
        422,
        requestId,
        [...stepLogs, "step_2_extract_text_empty"]
      );
    }

    stepLogs.push("step_2_extract_text_completed");
    stepLogs.push("step_3_detect_domain_started");

    const sanitizedFileName = sanitizeFileName(file.name);
    const extractedInfo = extractStructuredInfo(resumeText);
    const domainResult = detectPrimaryDomain(resumeText, extractedInfo);

    stepLogs.push("step_3_detect_domain_completed");
    stepLogs.push("step_4_suggest_roles_started");

    const roleEvaluations = evaluateRolesForDomain(domainResult.domain, extractedInfo, resumeText);

    stepLogs.push("step_4_suggest_roles_completed");
    stepLogs.push("step_5_persist_resume_started");

    const supabase = getSupabaseAdmin();
    const storagePath = `${Date.now()}-${sanitizedFileName}`;
    const uploadResult = await uploadWithRetry({
      bucketName: process.env.SUPABASE_BUCKET ?? "resumes",
      file,
      storagePath,
      requestId,
      stepLogs
    });

    if (!uploadResult.success) {
      return respondWithError(
        {
          success: false,
          domain: domainResult.domain,
          domain_confidence: domainResult.confidence,
          roles: roleEvaluations,
          extracted_info: extractedInfo,
          errors: uploadResult.error
        },
        500,
        requestId,
        [...stepLogs, "step_5_persist_resume_upload_failed"]
      );
    }

    const { error: resumeInsertError } = await supabase.from("resumes").insert({
      file_name: sanitizedFileName,
      storage_path: storagePath,
      raw_text: resumeText,
      extracted_skills: extractedInfo.skills
    });

    if (resumeInsertError) {
      return respondWithError(
        {
          success: false,
          domain: domainResult.domain,
          domain_confidence: domainResult.confidence,
          roles: roleEvaluations,
          extracted_info: extractedInfo,
          errors: `Resume metadata could not be saved: ${resumeInsertError.message}`
        },
        500,
        requestId,
        [...stepLogs, "step_5_persist_resume_db_failed"]
      );
    }

    stepLogs.push("step_5_persist_resume_completed");

    const response: ProcessResponse = {
      success: true,
      domain: domainResult.domain,
      domain_confidence: domainResult.confidence,
      roles: roleEvaluations,
      extracted_info: extractedInfo
    };

    console.info("[resume-process:success]", {
      requestId,
      fileName: sanitizedFileName,
      domain: response.domain,
      domainConfidence: response.domain_confidence,
      steps: stepLogs
    });

    return NextResponse.json(response);
  } catch (error) {
    return respondWithError(
      {
        success: false,
        domain: "",
        domain_confidence: 0,
        roles: [],
        extracted_info: emptyExtractedInfo(),
        errors: `Unexpected processing error: ${getErrorMessage(error)}`
      },
      500,
      requestId,
      [...stepLogs, "unexpected_failure"]
    );
  }
}

function validateResumeFile(file: File) {
  if (!file.size) {
    return "Uploaded file is empty.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Maximum supported size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`;
  }

  const lowerName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));

  if (!hasValidExtension || !ALLOWED_MIME_TYPES.has(file.type)) {
    return "Only PDF and DOCX files are supported.";
  }

  return "";
}

async function uploadWithRetry({
  bucketName,
  file,
  storagePath,
  requestId,
  stepLogs
}: {
  bucketName: string;
  file: File;
  storagePath: string;
  requestId: string;
  stepLogs: string[];
}) {
  const supabase = getSupabaseAdmin();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { error } = await supabase.storage.from(bucketName).upload(storagePath, fileBuffer, {
      contentType: resolveContentType(file),
      upsert: false
    });

    if (!error) {
      stepLogs.push(`storage_upload_attempt_${attempt}_succeeded`);
      return { success: true as const };
    }

    lastError = error.message;
    console.error("[resume-process:storage-upload-failed]", {
      requestId,
      bucketName,
      storagePath,
      attempt,
      error: lastError
    });
  }

  return {
    success: false as const,
    error: `Resume upload failed after retry: ${lastError}`
  };
}

function resolveContentType(file: File) {
  if (file.type) {
    return file.type;
  }

  return file.name.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
  return normalized.replace(/^-|-$/g, "").slice(0, 120) || "resume";
}

function extractStructuredInfo(resumeText: string): ExtractedInfo {
  const lower = resumeText.toLowerCase();

  const skills = collectMatches(lower, [
    "patient care",
    "clinical documentation",
    "medical terminology",
    "care coordination",
    "gmp",
    "quality assurance",
    "quality control",
    "regulatory compliance",
    "validation",
    "customer support",
    "ticket handling",
    "issue resolution",
    "crm",
    "operations",
    "reporting",
    "stakeholder management",
    "process improvement",
    "javascript",
    "typescript",
    "react",
    "node.js",
    "python",
    "sql"
  ]);

  const tools = collectMatches(lower, [
    "hplc",
    "lims",
    "sap",
    "ehr",
    "emr",
    "zendesk",
    "freshdesk",
    "salesforce",
    "intercom",
    "excel",
    "power bi",
    "google sheets",
    "git",
    "docker",
    "aws"
  ]);

  const softSkills = collectMatches(lower, [
    "communication",
    "teamwork",
    "leadership",
    "problem solving",
    "attention to detail",
    "adaptability",
    "empathy",
    "organization"
  ]);

  return {
    skills,
    experience: extractExperienceLines(lower),
    education: extractEducationLines(lower),
    tools,
    soft_skills: softSkills
  };
}

function detectPrimaryDomain(resumeText: string, extractedInfo: ExtractedInfo) {
  const lower = resumeText.toLowerCase();

  const scoredDomains = DOMAIN_PROFILES.map((profile) => {
    const educationScore = profile.educationSignals.reduce(
      (total, signal) => total + (lower.includes(signal) ? 12 : 0),
      0
    );
    const experienceScore = profile.experienceSignals.reduce(
      (total, signal) => total + (lower.includes(signal) ? 10 : 0),
      0
    );
    const toolScore = profile.toolSignals.reduce(
      (total, signal) => total + (extractedInfo.tools.includes(signal) ? 5 : 0),
      0
    );
    const skillScore = profile.skillSignals.reduce(
      (total, signal) => total + (extractedInfo.skills.includes(signal) ? 2 : 0),
      0
    );

    return {
      domain: profile.domain,
      roles: profile.roles,
      score: educationScore + experienceScore + toolScore + skillScore
    };
  }).sort((a, b) => b.score - a.score);

  const winner = scoredDomains[0];
  const runnerUp = scoredDomains[1];

  if (!winner || winner.score === 0) {
    return {
      domain: "General Professional",
      confidence: 55,
      roles: ["Operations Associate", "Administrative Executive", "Customer Support Associate"]
    };
  }

  const margin = winner.score - (runnerUp?.score ?? 0);
  const confidence = Math.max(60, Math.min(98, 60 + margin + Math.round(winner.score / 4)));

  return {
    domain: winner.domain,
    confidence,
    roles: winner.roles
  };
}

function evaluateRolesForDomain(domain: string, extractedInfo: ExtractedInfo, resumeText: string): RoleEvaluation[] {
  const lower = resumeText.toLowerCase();
  const matchingProfile = DOMAIN_PROFILES.find((profile) => profile.domain === domain);
  const roles = matchingProfile?.roles ?? ["Operations Associate", "Administrative Executive"];

  return roles.map((role, index) => {
    const roleKeywordMap = getRoleKeywordMap(role);
    const matchedKeywords = roleKeywordMap.filter(
      (keyword) =>
        extractedInfo.skills.includes(keyword) ||
        extractedInfo.tools.includes(keyword) ||
        lower.includes(keyword)
    );
    const missingKeywords = roleKeywordMap.filter((keyword) => !matchedKeywords.includes(keyword));
    const score = Math.max(40, Math.min(95, 50 + matchedKeywords.length * 10 - missingKeywords.length * 3 - index * 3));

    return {
      role,
      score,
      strengths: matchedKeywords.length
        ? matchedKeywords.slice(0, 3).map((keyword) => `Shows evidence of ${keyword}`)
        : [`Background aligns broadly with ${domain.toLowerCase()} work`],
      weaknesses: missingKeywords.slice(0, 3).map((keyword) => `Needs stronger evidence of ${keyword}`),
      improvements: missingKeywords.slice(0, 3).map((keyword) => `Add measurable ${keyword} examples`)
    };
  });
}

function getRoleKeywordMap(role: string) {
  const lower = role.toLowerCase();

  if (lower.includes("qa")) {
    return ["quality assurance", "gmp", "documentation", "validation"];
  }

  if (lower.includes("qc")) {
    return ["quality control", "laboratory", "documentation", "compliance"];
  }

  if (lower.includes("regulatory")) {
    return ["regulatory compliance", "documentation", "validation", "sop"];
  }

  if (lower.includes("clinical") || lower.includes("patient")) {
    return ["patient care", "clinical documentation", "medical terminology", "care coordination"];
  }

  if (lower.includes("healthcare")) {
    return ["healthcare", "compliance", "documentation", "coordination"];
  }

  if (lower.includes("customer")) {
    return ["customer support", "issue resolution", "communication", "crm"];
  }

  if (lower.includes("helpdesk")) {
    return ["ticket handling", "issue resolution", "communication", "crm"];
  }

  if (lower.includes("business") || lower.includes("operations")) {
    return ["operations", "reporting", "excel", "stakeholder management"];
  }

  if (lower.includes("software") || lower.includes("developer")) {
    return ["javascript", "react", "node.js", "sql"];
  }

  return ["communication", "organization", "reporting"];
}

function extractExperienceLines(text: string) {
  const values = [
    text.includes("intern") ? "Internship experience present" : "",
    text.includes("manager") ? "Management exposure present" : "",
    text.includes("analyst") ? "Analyst responsibilities present" : "",
    text.includes("project") ? "Project work mentioned" : "",
    text.match(/(\d+)\+?\s+years?/)?.[0] ?? ""
  ];

  return dedupe(values);
}

function extractEducationLines(text: string) {
  return dedupe(
    [
      "b.pharm",
      "m.pharm",
      "b.sc nursing",
      "nursing",
      "mba",
      "bba",
      "computer science",
      "information technology",
      "pharmacy",
      "degree",
      "university",
      "college"
    ].filter((term) => text.includes(term))
  );
}

function collectMatches(text: string, values: string[]) {
  return dedupe(values.filter((value) => text.includes(value)));
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function emptyExtractedInfo(): ExtractedInfo {
  return {
    skills: [],
    experience: [],
    education: [],
    tools: [],
    soft_skills: []
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function respondWithError(payload: ProcessResponse, status: number, requestId: string, stepLogs: string[]) {
  console.error("[resume-process:error]", {
    requestId,
    status,
    error: payload.errors,
    steps: stepLogs
  });

  return NextResponse.json(payload, { status });
}
