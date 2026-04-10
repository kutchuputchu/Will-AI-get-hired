import { CandidateProfile, ResumeAnalysis, SuggestedRole } from "@/types";
import { expandRoleSuggestions, inferResumeDomain } from "@/lib/resume-vibe/role-graph";

type ClaudeResponse = {
  content?: Array<{ type: string; text?: string }>;
};

export async function analyzeResumeWithAI(resumeText: string): Promise<ResumeAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    return analyzeWithClaude(apiKey, resumeText);
  }

  if (groqApiKey) {
    return analyzeWithGroq(groqApiKey, resumeText);
  }

  if (!apiKey && !groqApiKey) {
    return buildMockAnalysis(resumeText);
  }

  return buildMockAnalysis(resumeText);
}

async function suggestRolesFromStructuredProfile(apiKey: string, provider: "claude" | "groq", structuredProfile: Record<string, unknown>) {
  const prompt = buildRoleSuggestionPrompt(structuredProfile);

  if (provider === "claude") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude role suggestion request failed: ${await response.text()}`);
    }

    const data = (await response.json()) as ClaudeResponse;
    const text = data.content?.find((item) => item.type === "text")?.text;

    if (!text) {
      throw new Error("Claude returned an empty role suggestion response.");
    }

    return safeJsonParse(text);
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      temperature: 0.2,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content: "You are a career intelligence engine. Return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Groq role suggestion request failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned an empty role suggestion response.");
  }

  return safeJsonParse(text);
}

async function analyzeWithClaude(apiKey: string, resumeText: string): Promise<ResumeAnalysis> {
  const prompt = buildAnalysisPrompt(resumeText);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude request failed: ${errorText}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    throw new Error("Claude returned an empty response.");
  }

  const parsed = safeJsonParse(text);
  try {
    parsed.suggested_roles = await suggestRolesFromStructuredProfile(apiKey, "claude", parsed);
  } catch {
    // Fall back to local role expansion if the second step fails.
  }
  return normalizeAnalysis(parsed, resumeText);
}

async function analyzeWithGroq(apiKey: string, resumeText: string): Promise<ResumeAnalysis> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      temperature: 0.2,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content:
            "You are an expert recruiter and career analyst. Always return valid JSON only, with no markdown."
        },
        {
          role: "user",
          content: buildAnalysisPrompt(resumeText)
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq request failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned an empty response.");
  }

  const parsed = safeJsonParse(text);
  try {
    parsed.suggested_roles = await suggestRolesFromStructuredProfile(apiKey, "groq", parsed);
  } catch {
    // Fall back to local role expansion if the second step fails.
  }
  return normalizeAnalysis(parsed, resumeText);
}

function buildAnalysisPrompt(resumeText: string) {
  const prompt = `
You are an advanced resume analysis system.

Extract structured, high-quality information from the resume.

IMPORTANT:
- Do NOT assume the candidate is from a tech background
- Identify REAL skills, not just buzzwords
- Infer domain intelligently (tech, pharma, finance, business, operations, etc.)
- Be strict and structured
- Choose the primary domain from evidence in education, job titles, tools, and repeated responsibilities
- Only include skills clearly supported by the resume text
- Return valid JSON only

{
  "name": "",
  "primary_domain": "",
  "secondary_domains": [],
  "experience_level": "fresher | junior | mid | senior",
  "skills": {
    "technical": [],
    "tools": [],
    "soft": []
  },
  "education": [
    {
      "degree": "",
      "field": "",
      "year": ""
    }
  ],
  "experience": [
    {
      "role": "",
      "company": "",
      "duration": "",
      "key_work": []
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "skills_used": []
    }
  ],
  "certifications": [],
  "keywords_for_matching": []
}

Resume:
${resumeText}
  `.trim();
  return prompt;
}

function buildRoleSuggestionPrompt(structuredResumeJson: Record<string, unknown>) {
  return `
You are a career intelligence engine.

Based on the candidate profile, suggest the most suitable job roles across ALL industries.

IMPORTANT:
- Do NOT bias toward software roles unless strongly justified
- Consider transferable skills
- Match based on skills + education + experience
- Avoid generic roles

Return ONLY JSON.

Candidate:
${JSON.stringify(structuredResumeJson, null, 2)}

Return:
[
  {
    "role": "",
    "confidence": 0,
    "reason": ""
  }
]
  `.trim();
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Could not parse AI JSON response.");
    }

    return JSON.parse(match[0]);
  }
}

function buildMockAnalysis(resumeText: string): ResumeAnalysis {
  const lowerText = resumeText.toLowerCase();
  const inferred = inferResumeDomain(lowerText);
  const candidate = extractCandidateProfile(resumeText);
  const yearsOfExperience = detectExperienceYears(lowerText);
  const experienceLevel =
    yearsOfExperience >= 6 ? "Senior" : yearsOfExperience >= 2 ? "Mid-level" : "Junior";
  const experience = extractExperienceHighlights(lowerText, inferred.domain);
  const education = extractEducationHighlights(lowerText);
  const suggestedRoles = expandRoleSuggestions(inferred.domain, inferred.skills, resumeText);
  const missingSkills = Array.from(
    new Set(suggestedRoles.flatMap((role: SuggestedRole) => role.weaknesses).filter(Boolean))
  ).slice(0, 8);
  const resumeScore = suggestedRoles.length
    ? Math.round(suggestedRoles.slice(0, 5).reduce((total, role) => total + role.score, 0) / Math.min(5, suggestedRoles.length))
    : 55;

  return {
    candidate,
    domain: inferred.domain,
    domainConfidence: inferred.confidence,
    suggestedRoles,
    experience,
    education,
    tools: inferred.tools,
    softSkills: inferred.softSkills,
    summary: `Detected ${inferred.domain.toLowerCase()} signals and expanded ${suggestedRoles.length} relevant job paths.`,
    skills: inferred.skills,
    experienceLevel,
    missingSkills,
    resumeScore
  };
}

function detectExperienceYears(text: string) {
  const match = text.match(/(\d+)\+?\s+years?/);

  if (!match) {
    return 0;
  }

  return Number.parseInt(match[1], 10) || 0;
}

function normalizeAnalysis(parsed: any, resumeText: string): ResumeAnalysis {
  const fallback = buildMockAnalysis(resumeText);
  const inferred = inferResumeDomain(resumeText.toLowerCase());
  const extracted = parsed?.extracted_information ?? {};
  const candidate = normalizeCandidateProfile(
    {
      full_name: parsed?.name ?? parsed?.candidate_profile?.full_name,
      email: parsed?.candidate_profile?.email,
      phone: parsed?.candidate_profile?.phone,
      location: parsed?.candidate_profile?.location,
      headline: parsed?.candidate_profile?.headline
    },
    fallback.candidate
  );
  const aiSeedRoles = Array.isArray(parsed?.suggested_roles)
    ? parsed.suggested_roles.map((role: Partial<SuggestedRole>) => String(role?.role ?? "").trim()).filter(Boolean)
    : [];
  const technicalSkills = normalizeStringArray(parsed?.skills?.technical);
  const extractedSkills = normalizeStringArray(extracted.skills);
  const tools = normalizeStringArray(parsed?.skills?.tools).length
    ? normalizeStringArray(parsed?.skills?.tools)
    : normalizeStringArray(extracted.tools);
  const softSkills = normalizeStringArray(parsed?.skills?.soft).length
    ? normalizeStringArray(parsed?.skills?.soft)
    : normalizeStringArray(extracted.soft_skills);
  const projectSkills = extractSkillsFromProjects(parsed?.projects);
  const keywordsForMatching = normalizeStringArray(parsed?.keywords_for_matching);
  const mergedSkills = Array.from(
    new Set([...technicalSkills, ...extractedSkills, ...projectSkills, ...keywordsForMatching, ...inferred.skills, ...tools])
  );
  const resolvedDomain =
    (typeof parsed?.primary_domain === "string" && parsed.primary_domain.trim()) ||
    (typeof parsed?.domain === "string" && parsed.domain.trim())
      ? String(parsed?.primary_domain ?? parsed?.domain).trim()
      : inferred.domain;
  const parsedExperience = normalizeExperienceItems(parsed?.experience);
  const parsedEducation = normalizeEducationItems(parsed?.education);
  const parsedProjects = normalizeProjectItems(parsed?.projects);
  const certifications = normalizeCertifications(parsed?.certifications);
  const experience = parsedExperience.length
    ? parsedExperience.map((item) => [item.role, item.company, item.startDate || item.endDate].filter(Boolean).join(" at "))
    : normalizeStringArray(extracted.experience);
  const education = parsedEducation.length
    ? parsedEducation.map((item) => [item.degree, item.institution, item.endDate].filter(Boolean).join(" - "))
    : normalizeStringArray(extracted.education);
  const suggestedRoles = expandRoleSuggestions(
    resolvedDomain,
    mergedSkills.length ? mergedSkills : fallback.skills,
    resumeText,
    aiSeedRoles
  ).map((role) => {
    const aiRole = Array.isArray(parsed?.suggested_roles)
      ? parsed.suggested_roles.find(
          (item: { role?: string; confidence?: number; reason?: string }) =>
            typeof item?.role === "string" && item.role.trim().toLowerCase() === role.role.toLowerCase()
        )
      : null;

    return aiRole
      ? {
          ...role,
          score: toClampedScore(aiRole.confidence),
          whyThisRole: typeof aiRole.reason === "string" && aiRole.reason.trim() ? aiRole.reason.trim() : role.whyThisRole
        }
      : role;
  });
  const missingSkills = Array.from(new Set(suggestedRoles.flatMap((role) => role.weaknesses))).slice(0, 8);
  const resumeScore = suggestedRoles.length
    ? Math.round(
        suggestedRoles.slice(0, 5).reduce((sum, role) => sum + role.score, 0) /
          Math.min(5, suggestedRoles.length)
      )
    : fallback.resumeScore;

  return {
    candidate,
    domain: resolvedDomain,
    domainConfidence:
      typeof parsed?.domain_confidence !== "undefined"
        ? toClampedScore(parsed?.domain_confidence)
        : inferred.confidence,
    suggestedRoles,
    experience: experience.length ? experience : fallback.experience,
    education: education.length ? education : fallback.education,
    tools: tools.length ? tools : inferred.tools,
    softSkills: softSkills.length ? softSkills : inferred.softSkills,
    summary: `Detected ${resolvedDomain.toLowerCase()} signals and expanded ${suggestedRoles.length} matching roles.`,
    skills: mergedSkills.length ? mergedSkills : fallback.skills,
    experienceLevel:
      normalizeExperienceLevel(parsed?.experience_level) ||
      inferExperienceLevel(experience.length ? experience : fallback.experience, resumeText),
    missingSkills: missingSkills.length ? missingSkills : fallback.missingSkills,
    resumeScore,
    parsedExperience: parsedExperience.length ? parsedExperience : fallback.parsedExperience,
    parsedEducation: parsedEducation.length ? parsedEducation : fallback.parsedEducation,
    parsedProjects,
    certifications
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeExperienceItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      return {
        company: readString(source.company),
        role: readString(source.role),
        startDate: "",
        endDate: readString(source.duration),
        bullets: normalizeStringArray(source.key_work)
      };
    })
    .filter((item) => item.role || item.company);
}

function normalizeEducationItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      return {
        institution: "",
        degree: readString(source.degree),
        startDate: "",
        endDate: readString(source.year),
        score: readString(source.field)
      };
    })
    .filter((item) => item.degree || item.score);
}

function normalizeProjectItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      return {
        name: readString(source.name),
        description: readString(source.description),
        technologies: normalizeStringArray(source.skills_used),
        bullets: []
      };
    })
    .filter((item) => item.name || item.description);
}

function normalizeCertifications(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { name: item.trim() };
      }

      const source = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      return {
        name: readString(source.name)
      };
    })
    .filter((item) => item.name);
}

function extractSkillsFromProjects(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.flatMap((item) => {
        const source = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
        return normalizeStringArray(source.skills_used);
      })
    )
  );
}

function normalizeExperienceLevel(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized === "fresher") {
    return "Junior";
  }

  if (normalized === "junior") {
    return "Junior";
  }

  if (normalized === "mid") {
    return "Mid-level";
  }

  if (normalized === "senior") {
    return "Senior";
  }

  return "";
}

function normalizeCandidateProfile(value: unknown, fallback: CandidateProfile): CandidateProfile {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const fullName = sanitizeCandidateName(readString(source.full_name)) || fallback.fullName;

  return {
    fullName,
    email: readString(source.email) || fallback.email,
    phone: readString(source.phone) || fallback.phone,
    location: readString(source.location) || fallback.location,
    headline: readString(source.headline) || fallback.headline,
    summary: fallback.summary,
    visibleToRecruiters: fallback.visibleToRecruiters,
    linkedinUrl: fallback.linkedinUrl,
    githubUrl: fallback.githubUrl,
    portfolioUrl: fallback.portfolioUrl
  };
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toClampedScore(value: unknown) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildSummary(domain: string, suggestedRoles: SuggestedRole[]) {
  if (!suggestedRoles.length) {
    return "";
  }

  const topRoles = suggestedRoles.slice(0, 2).map((role) => role.role).join(" and ");
  return `Best aligned with ${domain || "general"} roles, especially ${topRoles}.`;
}

function inferExperienceLevel(experience: string[], resumeText: string) {
  const years = detectExperienceYears(resumeText.toLowerCase());
  const count = experience.length;

  if (years >= 6 || count >= 4) {
    return "Senior";
  }

  if (years >= 2 || count >= 2) {
    return "Mid-level";
  }

  return "Junior";
}

function extractCandidateProfile(resumeText: string): CandidateProfile {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const email = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone =
    resumeText.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/)?.[0] ?? "";
  const location = findLocation(lines);
  const fullName = findCandidateName(lines, email);
  const headline = findHeadline(lines, fullName);

  return {
    fullName,
    email,
    phone,
    location,
    headline,
    summary: "",
    visibleToRecruiters: false,
    linkedinUrl: extractFirstUrl(resumeText, ["linkedin.com/in/"]),
    githubUrl: extractFirstUrl(resumeText, ["github.com/"]),
    portfolioUrl: extractFirstUrl(resumeText, ["streamlit.app", "vercel.app", "netlify.app", "render.com"])
  };
}

function findCandidateName(lines: string[], email: string) {
  const ignored = new Set([
    "resume",
    "curriculum vitae",
    "cv",
    "profile",
    "summary",
    "professional summary",
    "contact"
  ]);

  for (const line of lines.slice(0, 8)) {
    const cleaned = normalizeNameLine(line);

    if (!cleaned || cleaned.length > 50 || /\d/.test(cleaned)) {
      continue;
    }

    if (email && cleaned.toLowerCase().includes(email.toLowerCase())) {
      continue;
    }

    const lower = cleaned.toLowerCase();

    if (ignored.has(lower)) {
      continue;
    }

    const words = cleaned.split(/\s+/).filter(Boolean);

    if (words.length >= 2 && words.length <= 5 && words.every((word) => /^[A-Za-z.'-]+$/.test(word))) {
      return words.map(capitalizeWord).join(" ");
    }
  }

  return deriveNameFromEmail(email);
}

function normalizeNameLine(line: string) {
  return line
    .replace(/\|/g, " ")
    .replace(/[,/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveNameFromEmail(email: string) {
  if (!email) {
    return "";
  }

  const localPart = email.split("@")[0]?.replace(/[0-9]+/g, " ").replace(/[._-]+/g, " ").trim() ?? "";
  const words = localPart.split(/\s+/).filter(Boolean);

  if (words.length >= 2 && words.length <= 4 && words.every((word) => /^[A-Za-z]+$/.test(word))) {
    return words.map(capitalizeWord).join(" ");
  }

  return "";
}

function sanitizeCandidateName(value: string) {
  const cleaned = normalizeNameLine(value);

  if (!cleaned) {
    return "";
  }

  const lower = cleaned.toLowerCase();

  if (["candidate", "resume", "curriculum vitae", "cv"].includes(lower)) {
    return "";
  }

  return cleaned;
}

function findHeadline(lines: string[], fullName: string) {
  for (const line of lines.slice(0, 12)) {
    if (line.length >= 8 && line.length <= 60 && !/@/.test(line) && /[A-Za-z]/.test(line)) {
      const lower = line.toLowerCase();

      if (
        !["resume", "curriculum vitae", "cv", "contact", "education", "experience"].includes(lower) &&
        !/^\+?\d/.test(line) &&
        lower !== fullName.toLowerCase()
      ) {
        return line;
      }
    }
  }

  return "";
}

function findLocation(lines: string[]) {
  for (const line of lines.slice(0, 12)) {
    if (/@/.test(line) || /\d{5,}/.test(line)) {
      continue;
    }

    if (/(india|usa|united states|uk|london|delhi|mumbai|hyderabad|bangalore|bengaluru|chennai|pune|kolkata|remote)/i.test(line)) {
      return line;
    }
  }

  return "";
}

function extractFirstUrl(text: string, domainHints: string[]) {
  const urls = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  return urls.find((url) => domainHints.some((hint) => url.toLowerCase().includes(hint))) ?? "";
}

function capitalizeWord(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function detectDomainProfile(text: string) {
  const profiles = [
    {
      domain: "Pharmaceuticals",
      educationSignals: ["b.pharm", "m.pharm", "pharmacy", "pharmaceutical", "pharmacology", "pharm.d"],
      titleSignals: ["qa executive", "qc analyst", "production pharmacist", "regulatory affairs", "formulation", "chemist"],
      toolSignals: ["hplc", "gc", "uv", "ftir", "lims", "sap", "gmp"],
      skillSignals: ["quality assurance", "quality control", "regulatory compliance", "validation", "documentation", "sop", "batch record"],
      skills: ["gmp", "quality assurance", "quality control", "documentation", "regulatory compliance", "validation", "sop", "batch record"],
      tools: ["HPLC", "GC", "UV", "FTIR", "LIMS", "SAP"],
      softSkills: ["accuracy", "documentation", "cross-functional communication"],
      roles: ["QA Executive", "QC Analyst", "Regulatory Affairs Associate"],
      strengths: ["Quality and compliance awareness", "Documentation rigor", "Laboratory or manufacturing exposure"],
      gaps: ["More instrument-specific depth", "Stronger audit outcomes", "Clearer regulatory ownership"],
      improvements: ["Add GMP or audit examples", "Quantify batch or sample volume", "Highlight instrument and SOP expertise"]
    },
    {
      domain: "Healthcare",
      educationSignals: ["nursing", "b.sc nursing", "gnm", "anm", "mbbs", "medical", "healthcare administration"],
      titleSignals: ["nurse", "clinical coordinator", "patient care", "medical officer", "healthcare administrator"],
      toolSignals: ["ehr", "emr", "meditech", "epic"],
      skillSignals: ["patient care", "clinical documentation", "care coordination", "medical terminology", "triage", "hospital"],
      skills: ["patient care", "clinical documentation", "care coordination", "medical terminology", "compliance"],
      tools: ["EHR", "EMR", "Microsoft Office"],
      softSkills: ["empathy", "communication", "attention to detail"],
      roles: ["Clinical Coordinator", "Healthcare Administrator", "Patient Care Specialist"],
      strengths: ["Patient-facing experience", "Healthcare workflow exposure", "Documentation discipline"],
      gaps: ["More certifications or licenses", "Clearer patient volume metrics", "Specialty-specific experience"],
      improvements: ["Add patient or case-load metrics", "List certifications clearly", "Highlight compliance and safety outcomes"]
    },
    {
      domain: "Customer Support",
      educationSignals: [],
      titleSignals: ["customer support", "customer service", "helpdesk", "call center", "support executive", "customer success"],
      toolSignals: ["zendesk", "freshdesk", "salesforce", "intercom", "crm"],
      skillSignals: ["ticket handling", "issue resolution", "escalation", "customer communication", "client handling", "sla"],
      skills: ["customer support", "ticket handling", "issue resolution", "crm", "communication", "service recovery"],
      tools: ["Zendesk", "Freshdesk", "Salesforce", "Intercom"],
      softSkills: ["active listening", "empathy", "conflict resolution"],
      roles: ["Customer Support Specialist", "Customer Success Associate", "Helpdesk Executive"],
      strengths: ["Customer communication", "Issue ownership", "Service responsiveness"],
      gaps: ["More resolution metrics", "Product expertise detail", "Escalation or retention impact"],
      improvements: ["Add CSAT or ticket metrics", "Highlight retention or SLA outcomes", "Show product or process expertise"]
    },
    {
      domain: "Business Operations",
      educationSignals: ["mba", "bba", "commerce", "business administration", "economics"],
      titleSignals: ["operations executive", "business analyst", "coordinator", "sales operations", "process associate"],
      toolSignals: ["excel", "power bi", "google sheets", "crm", "sap"],
      skillSignals: ["operations", "reporting", "analysis", "stakeholder management", "process improvement", "planning"],
      skills: ["operations", "reporting", "analysis", "stakeholder management", "process improvement", "excel"],
      tools: ["Excel", "Power BI", "CRM", "Google Workspace"],
      softSkills: ["organization", "communication", "problem solving"],
      roles: ["Business Analyst", "Operations Executive", "Sales Operations Associate"],
      strengths: ["Business process awareness", "Reporting capability", "Cross-team coordination"],
      gaps: ["Stronger metrics and business outcomes", "Advanced analytics tooling", "Ownership of initiatives"],
      improvements: ["Add business impact metrics", "Highlight dashboards or reporting automation", "Show process improvement outcomes"]
    },
    {
      domain: "Technology",
      educationSignals: ["computer science", "information technology", "software engineering", "b.tech", "mca"],
      titleSignals: ["software engineer", "developer", "frontend", "backend", "full stack", "web developer"],
      toolSignals: ["javascript", "typescript", "react", "node.js", "python", "docker", "aws", "git"],
      skillSignals: ["sql", "rest api", "api", "cloud", "testing", "next.js"],
      skills: ["javascript", "typescript", "react", "node.js", "python", "sql", "git", "rest api"],
      tools: ["Git", "PostgreSQL", "Docker", "AWS"],
      softSkills: ["problem solving", "collaboration", "communication"],
      roles: ["Software Engineer", "Frontend Developer", "Full Stack Developer"],
      strengths: ["Technical stack alignment", "Hands-on product development", "Engineering problem solving"],
      gaps: ["Stronger quantified project impact", "Cloud or deployment depth", "Testing or system design evidence"],
      improvements: ["Add measurable project outcomes", "Highlight architecture or deployment ownership", "List testing and code quality practices"]
    }
  ];

  const scoredProfiles = profiles.map((profile) => ({
    ...profile,
    score:
      profile.educationSignals.reduce((total, signal) => total + (text.includes(signal) ? 12 : 0), 0) +
      profile.titleSignals.reduce((total, signal) => total + (text.includes(signal) ? 10 : 0), 0) +
      profile.toolSignals.reduce((total, signal) => total + (text.includes(signal) ? 6 : 0), 0) +
      profile.skillSignals.reduce((total, signal) => total + (text.includes(signal) ? 3 : 0), 0)
  }));
  const best = scoredProfiles.sort((a, b) => b.score - a.score)[0];

  if (!best || best.score === 0) {
    return {
      domain: "General Professional",
      skills: extractCommonSkills(text, ["communication", "teamwork", "organization", "coordination", "documentation"]),
      tools: ["Microsoft Office"],
      softSkills: ["communication", "adaptability", "teamwork"],
      roles: ["Operations Associate", "Administrative Executive", "Customer Support Associate"],
      strengths: ["Transferable professional experience", "General workplace readiness", "Adaptability"],
      gaps: ["Role-specific specialization", "Stronger quantified outcomes", "Clearer domain positioning"],
      improvements: ["Tailor the resume to one target role", "Add measurable achievements", "Clarify responsibilities and outcomes"]
    };
  }

  return {
    domain: best.domain,
    skills: extractCommonSkills(text, best.skills),
    tools: extractMatchedTools(text, best.tools),
    softSkills: best.softSkills,
    roles: best.roles,
    strengths: best.strengths,
    gaps: best.gaps,
    improvements: best.improvements
  };
}

function extractCommonSkills(text: string, candidates: string[]) {
  const matches = candidates.filter((skill) => text.includes(skill.toLowerCase()));
  return matches.length ? matches.slice(0, 10) : candidates.slice(0, 4);
}

function extractMatchedTools(text: string, tools: string[]) {
  const matches = tools.filter((tool) => text.includes(tool.toLowerCase()));
  return matches.length ? matches.slice(0, 6) : tools.slice(0, 2);
}

function extractExperienceHighlights(text: string, domain: string) {
  const highlights: string[] = [];

  if (text.includes("intern")) highlights.push("Internship experience");
  if (text.includes("manager")) highlights.push("Team or process management exposure");
  if (text.includes("analyst")) highlights.push("Analyst-style responsibilities");
  if (text.includes("project")) highlights.push("Project-based delivery experience");
  if (text.includes("customer")) highlights.push("Customer-facing experience");
  if (text.includes("clinical")) highlights.push("Clinical environment experience");
  if (text.includes("quality")) highlights.push("Quality or compliance-related work");

  return highlights.length ? highlights.slice(0, 4) : [`Relevant ${domain.toLowerCase()} experience detected`];
}

function extractEducationHighlights(text: string) {
  const educationTerms = ["bachelor", "master", "mba", "pharm", "b.sc", "m.sc", "degree", "university", "college"];
  const matches = educationTerms.filter((term) => text.includes(term));

  return matches.length ? Array.from(new Set(matches)).slice(0, 4) : ["Education details present in resume"];
}







