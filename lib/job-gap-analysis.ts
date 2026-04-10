import { JobGapAnalysis } from "@/types";

type ClaudeResponse = {
  content?: Array<{ type: string; text?: string }>;
};

export async function analyzeJobSkillGap(
  structuredResumeJson: Record<string, unknown>,
  jobDescription: string
): Promise<JobGapAnalysis> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (anthropicKey) {
    return analyzeWithClaude(anthropicKey, structuredResumeJson, jobDescription);
  }

  if (groqKey) {
    return analyzeWithGroq(groqKey, structuredResumeJson, jobDescription);
  }

  return buildFallbackGapAnalysis(structuredResumeJson, jobDescription);
}

async function analyzeWithClaude(
  apiKey: string,
  structuredResumeJson: Record<string, unknown>,
  jobDescription: string
) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: buildGapPrompt(structuredResumeJson, jobDescription) }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude skill-gap request failed: ${await response.text()}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    throw new Error("Claude returned an empty skill-gap response.");
  }

  return normalizeGapAnalysis(safeJsonParse(text), structuredResumeJson, jobDescription);
}

async function analyzeWithGroq(
  apiKey: string,
  structuredResumeJson: Record<string, unknown>,
  jobDescription: string
) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      temperature: 0.1,
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
          content: buildGapPrompt(structuredResumeJson, jobDescription)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Groq skill-gap request failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned an empty skill-gap response.");
  }

  return normalizeGapAnalysis(safeJsonParse(text), structuredResumeJson, jobDescription);
}

function buildGapPrompt(structuredResumeJson: Record<string, unknown>, jobDescription: string) {
  return `
You are a career advisor.

Compare candidate skills with job requirements and identify gaps.

Return ONLY JSON.

Candidate:
${JSON.stringify(structuredResumeJson, null, 2)}

Job:
${jobDescription}

Return:
{
  "missing_skills": [],
  "learning_suggestions": [],
  "readiness_score": 0
}
  `.trim();
}

function normalizeGapAnalysis(
  parsed: any,
  structuredResumeJson: Record<string, unknown>,
  jobDescription: string
): JobGapAnalysis {
  const fallback = buildFallbackGapAnalysis(structuredResumeJson, jobDescription);

  return {
    missingSkills: normalizeStringArray(parsed?.missing_skills).length
      ? normalizeStringArray(parsed?.missing_skills)
      : fallback.missingSkills,
    learningSuggestions: normalizeStringArray(parsed?.learning_suggestions).length
      ? normalizeStringArray(parsed?.learning_suggestions)
      : fallback.learningSuggestions,
    readinessScore: clampScore(parsed?.readiness_score, fallback.readinessScore)
  };
}

function buildFallbackGapAnalysis(
  structuredResumeJson: Record<string, unknown>,
  jobDescription: string
): JobGapAnalysis {
  const candidateSkills = extractCandidateSkills(structuredResumeJson);
  const jobSkills = extractJobSkills(jobDescription);
  const matched = jobSkills.filter((skill) => candidateSkills.includes(skill));
  const missing = jobSkills.filter((skill) => !candidateSkills.includes(skill)).slice(0, 6);
  const readinessScore = Math.max(
    20,
    Math.min(100, Math.round((matched.length / Math.max(jobSkills.length, 1)) * 100))
  );

  return {
    missingSkills: missing,
    learningSuggestions: missing.slice(0, 3).map((skill) => `Build one practical example using ${skill}`),
    readinessScore
  };
}

function extractCandidateSkills(structuredResumeJson: Record<string, unknown>) {
  const skills = structuredResumeJson.skills as Record<string, unknown> | undefined;
  const technical = normalizeStringArray(skills?.technical);
  const tools = normalizeStringArray(skills?.tools);
  const keywords = normalizeStringArray(structuredResumeJson.keywords_for_matching);

  return Array.from(new Set([...technical, ...tools, ...keywords].map((item) => item.toLowerCase())));
}

function extractJobSkills(jobDescription: string) {
  const dictionary = [
    "python",
    "pytorch",
    "langchain",
    "llamaindex",
    "fastapi",
    "react",
    "typescript",
    "node.js",
    "sql",
    "docker",
    "aws",
    "excel",
    "power bi",
    "tally",
    "gmp",
    "quality assurance",
    "quality control",
    "hplc",
    "customer support",
    "crm",
    "operations",
    "reporting",
    "patient care",
    "clinical documentation"
  ];

  const lower = jobDescription.toLowerCase();
  return dictionary.filter((skill) => lower.includes(skill));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((item) => readString(item)).filter(Boolean)));
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function clampScore(value: unknown, fallback: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Could not parse skill-gap JSON.");
    }

    return JSON.parse(match[0]);
  }
}
