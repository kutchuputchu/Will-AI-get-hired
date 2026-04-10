import { JobListing, MatchedJob } from "@/types";

type MatchAiInput = {
  resumeText: string;
  domain: string;
  suggestedRoles: string[];
  jobs: JobListing[];
  structuredResume?: Record<string, unknown>;
};

type ClaudeResponse = {
  content?: Array<{ type: string; text?: string }>;
};

export async function matchJobsWithAI(input: MatchAiInput): Promise<MatchedJob[]> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (anthropicKey) {
    return matchWithClaude(anthropicKey, input);
  }

  if (groqKey) {
    return matchWithGroq(groqKey, input);
  }

  return buildFallbackMatches(input);
}

async function matchWithClaude(apiKey: string, input: MatchAiInput) {
  const aiMatches = await batchMatchWithClaude(apiKey, input);
  const matches: MatchedJob[] = [];

  for (const job of input.jobs) {
    const normalizedMatch = normalizeMatchResult(
      job,
      aiMatches.find((item: { job_id?: string; title?: string }) => item.job_id === job.adzunaId || item.title === job.title)
    );
    normalizedMatch.improvements = await generateImprovementsWithClaude(
      apiKey,
      input.resumeText,
      job,
      normalizedMatch.missingSkills,
      normalizedMatch.gaps
    );
    normalizedMatch.plan30Days = await generate30DayPlanWithClaude(
      apiKey,
      job,
      normalizedMatch.missingSkills,
      input.domain
    );
    normalizedMatch.betterAlternative = await generateBetterRoleWithClaude(
      apiKey,
      job,
      input.resumeText,
      input.domain
    );
    normalizedMatch.resumeFixes = await generateResumeFixesWithClaude(apiKey, input.resumeText, job);
    matches.push(normalizedMatch);
  }

  return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

async function matchWithGroq(apiKey: string, input: MatchAiInput) {
  const aiMatches = await batchMatchWithGroq(apiKey, input);
  const matches: MatchedJob[] = [];

  for (const job of input.jobs) {
    const normalizedMatch = normalizeMatchResult(
      job,
      aiMatches.find((item: { job_id?: string; title?: string }) => item.job_id === job.adzunaId || item.title === job.title)
    );
    normalizedMatch.improvements = await generateImprovementsWithGroq(
      apiKey,
      input.resumeText,
      job,
      normalizedMatch.missingSkills,
      normalizedMatch.gaps
    );
    normalizedMatch.plan30Days = await generate30DayPlanWithGroq(
      apiKey,
      job,
      normalizedMatch.missingSkills,
      input.domain
    );
    normalizedMatch.betterAlternative = await generateBetterRoleWithGroq(
      apiKey,
      job,
      input.resumeText,
      input.domain
    );
    normalizedMatch.resumeFixes = await generateResumeFixesWithGroq(apiKey, input.resumeText, job);
    matches.push(normalizedMatch);
  }

  return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

async function batchMatchWithClaude(apiKey: string, input: MatchAiInput) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1400,
      messages: [{ role: "user", content: buildBatchMatchPrompt(input) }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude matching request failed: ${await response.text()}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    throw new Error("Claude returned an empty matching response.");
  }

  return safeJsonArrayParse(text);
}

async function batchMatchWithGroq(apiKey: string, input: MatchAiInput) {
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
          content: "You are an intelligent job matching system. Return valid JSON only."
        },
        {
          role: "user",
          content: buildBatchMatchPrompt(input)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Groq matching request failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned an empty matching response.");
  }

  return safeJsonArrayParse(text);
}

function buildFallbackMatches(input: MatchAiInput): MatchedJob[] {
  const normalizedRoles = input.suggestedRoles.map(normalize);

  return input.jobs
    .map((job) => {
      const requiredSkills = job.skills.map(normalize);
      const matchedSkills = requiredSkills.filter((skill) => input.resumeText.toLowerCase().includes(skill));
      const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));
      const titleAndDescription = `${job.title} ${job.description}`.toLowerCase();
      const roleAligned = normalizedRoles.some((role) => titleAndDescription.includes(role));
      const domainAligned = input.domain ? titleAndDescription.includes(input.domain.toLowerCase()) : false;
      const score = Math.min(
        100,
        Math.round(
          matchedSkills.length * 12 +
            (roleAligned ? 24 : 0) +
            (domainAligned ? 16 : 0) +
            (input.resumeText.toLowerCase().includes("year") ? 8 : 0)
        )
      );

      return {
        ...job,
        matchPercentage: Math.max(score, matchedSkills.length ? 45 : 28),
        matchedSkills,
        missingSkills,
        strengths: buildFallbackStrengths(matchedSkills, roleAligned, domainAligned),
        gaps: missingSkills.slice(0, 3),
        explanation: buildFallbackExplanation(roleAligned, domainAligned, matchedSkills.length),
        improvements: buildFallbackImprovements(missingSkills),
        plan30Days: buildFallback30DayPlan(job.title, missingSkills, input.domain),
        betterAlternative: buildFallbackBetterRole(job.title, input.resumeText, input.domain),
        resumeFixes: buildFallbackResumeFixes(job.title)
      };
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

async function generateImprovementsWithClaude(
  apiKey: string,
  resumeText: string,
  job: JobListing,
  missingSkills: string[],
  gaps: string[]
) {
  if (!missingSkills.length && !gaps.length) {
    return [];
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 250,
      messages: [{ role: "user", content: buildImprovementPrompt(resumeText, job, missingSkills, gaps) }]
    })
  });

  if (!response.ok) {
    return buildFallbackImprovements(missingSkills.length ? missingSkills : gaps);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    return buildFallbackImprovements(missingSkills.length ? missingSkills : gaps);
  }

  return normalizeImprovementResult(safeJsonParse(text), missingSkills, gaps);
}

async function generateImprovementsWithGroq(
  apiKey: string,
  resumeText: string,
  job: JobListing,
  missingSkills: string[],
  gaps: string[]
) {
  if (!missingSkills.length && !gaps.length) {
    return [];
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
          content: "You are a career coach. Return valid JSON only."
        },
        {
          role: "user",
          content: buildImprovementPrompt(resumeText, job, missingSkills, gaps)
        }
      ]
    })
  });

  if (!response.ok) {
    return buildFallbackImprovements(missingSkills.length ? missingSkills : gaps);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    return buildFallbackImprovements(missingSkills.length ? missingSkills : gaps);
  }

  return normalizeImprovementResult(safeJsonParse(text), missingSkills, gaps);
}

async function generate30DayPlanWithClaude(apiKey: string, job: JobListing, missingSkills: string[], domain: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 250,
      messages: [{ role: "user", content: build30DayPlanPrompt(job, missingSkills, domain) }]
    })
  });

  if (!response.ok) {
    return buildFallback30DayPlan(job.title, missingSkills, domain);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    return buildFallback30DayPlan(job.title, missingSkills, domain);
  }

  return normalizePlanResult(safeJsonParse(text), job.title, missingSkills, domain);
}

async function generate30DayPlanWithGroq(apiKey: string, job: JobListing, missingSkills: string[], domain: string) {
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
          content: "You are a career strategist. Return valid JSON only."
        },
        {
          role: "user",
          content: build30DayPlanPrompt(job, missingSkills, domain)
        }
      ]
    })
  });

  if (!response.ok) {
    return buildFallback30DayPlan(job.title, missingSkills, domain);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    return buildFallback30DayPlan(job.title, missingSkills, domain);
  }

  return normalizePlanResult(safeJsonParse(text), job.title, missingSkills, domain);
}

async function generateBetterRoleWithClaude(apiKey: string, job: JobListing, resumeText: string, domain: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 180,
      messages: [{ role: "user", content: buildBetterRolePrompt(job, extractResumeTerms(resumeText), domain) }]
    })
  });

  if (!response.ok) {
    return buildFallbackBetterRole(job.title, resumeText, domain);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    return buildFallbackBetterRole(job.title, resumeText, domain);
  }

  return normalizeBetterRoleResult(safeJsonParse(text), job.title, resumeText, domain);
}

async function generateBetterRoleWithGroq(apiKey: string, job: JobListing, resumeText: string, domain: string) {
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
          content: "You are a career advisor. Return valid JSON only."
        },
        {
          role: "user",
          content: buildBetterRolePrompt(job, extractResumeTerms(resumeText), domain)
        }
      ]
    })
  });

  if (!response.ok) {
    return buildFallbackBetterRole(job.title, resumeText, domain);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    return buildFallbackBetterRole(job.title, resumeText, domain);
  }

  return normalizeBetterRoleResult(safeJsonParse(text), job.title, resumeText, domain);
}

async function generateResumeFixesWithClaude(apiKey: string, resumeText: string, job: JobListing) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 180,
      messages: [{ role: "user", content: buildResumeFixPrompt(resumeText, job) }]
    })
  });

  if (!response.ok) {
    return buildFallbackResumeFixes(job.title);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    return buildFallbackResumeFixes(job.title);
  }

  return normalizeResumeFixResult(safeJsonParse(text), job.title);
}

async function generateResumeFixesWithGroq(apiKey: string, resumeText: string, job: JobListing) {
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
          content: "You are an ATS resume expert. Return valid JSON only."
        },
        {
          role: "user",
          content: buildResumeFixPrompt(resumeText, job)
        }
      ]
    })
  });

  if (!response.ok) {
    return buildFallbackResumeFixes(job.title);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    return buildFallbackResumeFixes(job.title);
  }

  return normalizeResumeFixResult(safeJsonParse(text), job.title);
}

function normalizeMatchResult(job: JobListing, parsed: any): MatchedJob {
  return {
    ...job,
    matchPercentage: clampScore(parsed?.match_score ?? parsed?.matchScore),
    matchedSkills: normalizeStringArray(parsed?.matched_skills ?? parsed?.matchedSkills),
    missingSkills: normalizeStringArray(parsed?.missing_skills ?? parsed?.missingSkills),
    strengths: normalizeStringArray(parsed?.matched_skills ?? parsed?.strengths),
    gaps: normalizeStringArray(parsed?.missing_skills ?? parsed?.gaps),
    explanation:
      typeof parsed?.reason === "string"
        ? parsed.reason.trim()
        : typeof parsed?.explanation === "string"
          ? parsed.explanation.trim()
          : ""
  };
}

function buildBatchMatchPrompt(input: MatchAiInput) {
  return `
You are an intelligent job matching system.

Match a candidate with jobs based on deep understanding, not keyword matching.

IMPORTANT:
- Use skills, domain, and experience
- Penalize irrelevant matches
- Consider transferable skills
- Avoid tech bias unless appropriate
- Return JSON only

Candidate:
${JSON.stringify(input.structuredResume ?? {
    domain: input.domain,
    suggested_roles: input.suggestedRoles,
    resume_text: input.resumeText
  }, null, 2)}

Jobs:
${JSON.stringify(
    input.jobs.map((job) => ({
      job_id: job.adzunaId,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      skills: job.skills
    })),
    null,
    2
  )}

Return:
[
  {
    "job_id": "",
    "title": "",
    "match_score": 0,
    "matched_skills": [],
    "missing_skills": [],
    "reason": ""
  }
]
  `.trim();
}

function buildImprovementPrompt(resumeText: string, job: JobListing, missingSkills: string[], gaps: string[]) {
  return `
You are a career coach and ATS optimization expert.

Your task is to help the candidate improve their match for a job.

INPUT:
- Resume
- Job title
- Missing skills
- Gaps identified

STEP 1:
Identify the MOST IMPORTANT gaps (max 3)

STEP 2:
Convert each gap into a SPECIFIC ACTION

IMPORTANT RULES:
- Keep each suggestion under 12 words
- Be practical, not theoretical
- Avoid vague advice like "improve skills"
- Focus on fast improvement (within weeks)
- Return JSON only

RETURN JSON:
{
  "improvements": [
    "",
    "",
    ""
  ]
}

DATA:

Resume:
${resumeText}

Job Title:
${job.title}

Missing Skills:
${missingSkills.join(", ")}

Gaps:
${gaps.join(", ")}
  `.trim();
}

function build30DayPlanPrompt(job: JobListing, missingSkills: string[], domain: string) {
  return `
You are a career strategist.

Create a 30-day plan to improve the candidate's chances for the target job.

IMPORTANT:
- Keep it realistic for a beginner
- Focus on high-impact skills only
- Break into weekly steps
- Return JSON only

RETURN JSON:
{
  "week1": "",
  "week2": "",
  "week3": "",
  "week4": ""
}

DATA:

Target Job:
${job.title}

Missing Skills:
${missingSkills.join(", ")}

Candidate Domain:
${domain}
  `.trim();
}

function buildBetterRolePrompt(job: JobListing, skills: string[], domain: string) {
  return `
You are a career advisor.

If a job is a poor match, suggest a BETTER alternative role.

IMPORTANT:
- Must be realistically achievable
- Must align with candidate's current skills
- Keep explanation under 12 words
- Return JSON only

RETURN JSON:
{
  "betterRole": "",
  "reason": ""
}

DATA:

Current Job:
${job.title}

Candidate Skills:
${skills.join(", ")}

Domain:
${domain}
  `.trim();
}

function buildResumeFixPrompt(resumeText: string, job: JobListing) {
  return `
You are an ATS resume expert.

Suggest improvements to make the resume stronger for the target job.

IMPORTANT:
- Focus on structure and content
- Keep each suggestion under 15 words
- Return JSON only

RETURN JSON:
{
  "resumeFixes": [
    "",
    "",
    ""
  ]
}

DATA:

Resume:
${resumeText}

Target Job:
${job.title}
  `.trim();
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Could not parse AI job match response.");
    }

    return JSON.parse(match[0]);
  }
}

function safeJsonArrayParse(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed?.matches)) {
      return parsed.matches;
    }
    throw new Error("Could not parse AI job match array response.");
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);

    if (!match) {
      throw new Error("Could not parse AI job match array response.");
    }

    return JSON.parse(match[0]);
  }
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

function clampScore(value: unknown) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function buildFallbackStrengths(matchedSkills: string[], roleAligned: boolean, domainAligned: boolean) {
  const strengths = [...matchedSkills.slice(0, 3)];

  if (roleAligned) strengths.push("role alignment");
  if (domainAligned) strengths.push("domain relevance");

  return strengths.length ? strengths : ["general profile alignment"];
}

function buildFallbackExplanation(roleAligned: boolean, domainAligned: boolean, matchedSkillCount: number) {
  if (matchedSkillCount >= 3 && roleAligned) return "Strong skill overlap and role fit.";
  if (domainAligned) return "Relevant domain background with partial fit.";
  if (matchedSkillCount >= 1) return "Some overlap, but key requirements are missing.";
  return "Low direct overlap with this role.";
}

function normalizeImprovementResult(parsed: any, missingSkills: string[], gaps: string[]) {
  const improvements = normalizeStringArray(parsed?.improvements).slice(0, 3);
  return improvements.length ? improvements : buildFallbackImprovements(missingSkills.length ? missingSkills : gaps);
}

function buildFallbackImprovements(items: string[]) {
  return items
    .slice(0, 3)
    .map((item) => `Add ${item} project evidence to resume`)
    .map((line) => (line.length > 60 ? `${line.slice(0, 57).trim()}...` : line));
}

function normalizePlanResult(parsed: any, jobTitle: string, missingSkills: string[], domain: string) {
  const fallback = buildFallback30DayPlan(jobTitle, missingSkills, domain);

  return {
    week1: normalizePlanLine(parsed?.week1) || fallback.week1,
    week2: normalizePlanLine(parsed?.week2) || fallback.week2,
    week3: normalizePlanLine(parsed?.week3) || fallback.week3,
    week4: normalizePlanLine(parsed?.week4) || fallback.week4
  };
}

function normalizePlanLine(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildFallback30DayPlan(jobTitle: string, missingSkills: string[], domain: string) {
  const topSkill = missingSkills[0] ?? "core role skills";
  const secondSkill = missingSkills[1] ?? "practical examples";
  const domainText = domain || "target";

  return {
    week1: `Study ${topSkill} basics for ${jobTitle} roles.`,
    week2: `Build one small ${domainText.toLowerCase()}-relevant practice project.`,
    week3: `Add ${secondSkill} evidence and measurable resume bullets.`,
    week4: `Tailor applications and practice interview answers weekly.`
  };
}

function normalizeBetterRoleResult(parsed: any, currentJobTitle: string, resumeText: string, domain: string) {
  const fallback = buildFallbackBetterRole(currentJobTitle, resumeText, domain);

  return {
    betterRole:
      typeof parsed?.betterRole === "string" && parsed.betterRole.trim() ? parsed.betterRole.trim() : fallback.betterRole,
    reason: typeof parsed?.reason === "string" && parsed.reason.trim() ? parsed.reason.trim() : fallback.reason
  };
}

function buildFallbackBetterRole(currentJobTitle: string, resumeText: string, domain: string) {
  const lowerDomain = domain.toLowerCase();
  const lowerResume = resumeText.toLowerCase();

  if (lowerDomain.includes("health")) {
    return { betterRole: "Patient Care Coordinator", reason: "Closer to current healthcare experience." };
  }

  if (lowerDomain.includes("pharma")) {
    return { betterRole: "QA Executive", reason: "Uses current compliance and documentation skills." };
  }

  if (lowerDomain.includes("customer")) {
    return { betterRole: "Customer Support Specialist", reason: "Matches communication and service experience." };
  }

  if (lowerDomain.includes("business") || lowerDomain.includes("operations")) {
    return { betterRole: "Operations Executive", reason: "Fits reporting and coordination strengths." };
  }

  if (lowerResume.includes("react") || lowerResume.includes("javascript")) {
    return { betterRole: "Junior Frontend Developer", reason: "Better aligned with current technical skills." };
  }

  return { betterRole: currentJobTitle, reason: "Current role remains the closest fit." };
}

function normalizeResumeFixResult(parsed: any, jobTitle: string) {
  const fixes = normalizeStringArray(parsed?.resumeFixes).slice(0, 3);
  return fixes.length ? fixes : buildFallbackResumeFixes(jobTitle);
}

function buildFallbackResumeFixes(jobTitle: string) {
  return [
    `Tailor headline directly to ${jobTitle}.`,
    "Add quantified achievements in recent experience.",
    "Move strongest relevant skills near the top."
  ];
}

function extractResumeTerms(resumeText: string) {
  const dictionary = [
    "javascript",
    "typescript",
    "react",
    "node.js",
    "python",
    "sql",
    "patient care",
    "clinical documentation",
    "medical terminology",
    "gmp",
    "quality assurance",
    "quality control",
    "customer support",
    "ticket handling",
    "crm",
    "operations",
    "reporting",
    "excel",
    "communication",
    "teamwork"
  ];

  const lower = resumeText.toLowerCase();
  const found = dictionary.filter((term) => lower.includes(term));
  return found.length ? found : ["communication", "teamwork"];
}
