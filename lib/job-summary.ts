import { JobSummary } from "@/types";

type ClaudeResponse = {
  content?: Array<{ type: string; text?: string }>;
};

export async function summarizeJobForUi(jobDescription: string): Promise<JobSummary> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (anthropicKey) {
    return summarizeWithClaude(anthropicKey, jobDescription);
  }

  if (groqKey) {
    return summarizeWithGroq(groqKey, jobDescription);
  }

  return buildFallbackSummary(jobDescription);
}

async function summarizeWithClaude(apiKey: string, jobDescription: string) {
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
      messages: [{ role: "user", content: buildSummaryPrompt(jobDescription) }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude job summary failed: ${await response.text()}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    throw new Error("Claude returned an empty job summary response.");
  }

  return normalizeJobSummary(safeJsonParse(text), jobDescription);
}

async function summarizeWithGroq(apiKey: string, jobDescription: string) {
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
          content: "Summarize jobs for UI display. Return valid JSON only."
        },
        {
          role: "user",
          content: buildSummaryPrompt(jobDescription)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Groq job summary failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned an empty job summary response.");
  }

  return normalizeJobSummary(safeJsonParse(text), jobDescription);
}

function buildSummaryPrompt(jobDescription: string) {
  return `
Summarize the job in a short, clean format for UI display.

Return ONLY JSON.

Job Description:
${jobDescription}

Return:
{
  "short_description": "",
  "key_skills": [],
  "experience_required": "",
  "salary_range": ""
}
  `.trim();
}

function normalizeJobSummary(parsed: any, jobDescription: string): JobSummary {
  const fallback = buildFallbackSummary(jobDescription);

  return {
    shortDescription: readString(parsed?.short_description) || fallback.shortDescription,
    keySkills: normalizeStringArray(parsed?.key_skills).length ? normalizeStringArray(parsed?.key_skills) : fallback.keySkills,
    experienceRequired: readString(parsed?.experience_required) || fallback.experienceRequired,
    salaryRange: readString(parsed?.salary_range) || fallback.salaryRange
  };
}

function buildFallbackSummary(jobDescription: string): JobSummary {
  const clean = stripWhitespace(jobDescription);
  const shortDescription = clean.length > 160 ? `${clean.slice(0, 157).trim()}...` : clean;
  const keySkills = extractSkills(clean);
  const experienceRequired = extractExperience(clean);
  const salaryRange = extractSalary(clean);

  return {
    shortDescription,
    keySkills,
    experienceRequired,
    salaryRange
  };
}

function extractSkills(text: string) {
  const dictionary = [
    "python",
    "react",
    "next.js",
    "typescript",
    "node.js",
    "sql",
    "docker",
    "aws",
    "fastapi",
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

  const lower = text.toLowerCase();
  return dictionary.filter((skill) => lower.includes(skill)).slice(0, 6);
}

function extractExperience(text: string) {
  const match = text.match(/(\d+\+?\s*(?:to\s*\d+\s*)?years?)/i);
  return match?.[0]?.trim() ?? "Not clearly specified";
}

function extractSalary(text: string) {
  const match = text.match(/(?:₹|rs\.?|inr)\s?\d+[\d,]*(?:\s*[-to]+\s*(?:₹|rs\.?|inr)?\s?\d+[\d,]*)?/i);
  return match?.[0]?.trim() ?? "Not listed";
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

function stripWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Could not parse job summary JSON.");
    }

    return JSON.parse(match[0]);
  }
}
