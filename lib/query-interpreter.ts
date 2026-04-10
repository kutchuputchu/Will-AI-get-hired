import { JobSearchFilters } from "@/types";

type ClaudeResponse = {
  content?: Array<{ type: string; text?: string }>;
};

export async function interpretJobSearchQuery(userQuery: string): Promise<JobSearchFilters> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (anthropicKey) {
    return interpretWithClaude(anthropicKey, userQuery);
  }

  if (groqKey) {
    return interpretWithGroq(groqKey, userQuery);
  }

  return buildFallbackFilters(userQuery);
}

async function interpretWithClaude(apiKey: string, userQuery: string) {
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
      messages: [{ role: "user", content: buildInterpreterPrompt(userQuery) }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude query interpreter failed: ${await response.text()}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    throw new Error("Claude returned an empty query interpreter response.");
  }

  return normalizeFilters(safeJsonParse(text), userQuery);
}

async function interpretWithGroq(apiKey: string, userQuery: string) {
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
          content: "You are a job search query interpreter. Return valid JSON only."
        },
        {
          role: "user",
          content: buildInterpreterPrompt(userQuery)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Groq query interpreter failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned an empty query interpreter response.");
  }

  return normalizeFilters(safeJsonParse(text), userQuery);
}

function buildInterpreterPrompt(userQuery: string) {
  return `
You are a job search query interpreter.

Convert the user's search query into structured filters.

Return ONLY JSON.

Query:
${userQuery}

Return:
{
  "keywords": [],
  "location": "",
  "experience_level": "",
  "job_type": "remote | onsite | hybrid",
  "salary_expectation": "",
  "domain": ""
}
  `.trim();
}

function normalizeFilters(parsed: any, userQuery: string): JobSearchFilters {
  const fallback = buildFallbackFilters(userQuery);
  const jobType = readJobType(parsed?.job_type);

  return {
    keywords: normalizeStringArray(parsed?.keywords).length ? normalizeStringArray(parsed?.keywords) : fallback.keywords,
    location: readString(parsed?.location) || fallback.location,
    experienceLevel: readString(parsed?.experience_level) || fallback.experienceLevel,
    jobType,
    salaryExpectation: readString(parsed?.salary_expectation) || fallback.salaryExpectation,
    domain: readString(parsed?.domain) || fallback.domain
  };
}

function buildFallbackFilters(userQuery: string): JobSearchFilters {
  const lower = userQuery.toLowerCase();
  const keywords = extractKeywords(lower);

  return {
    keywords,
    location: extractLocation(lower),
    experienceLevel: extractExperienceLevel(lower),
    jobType: readJobType(lower),
    salaryExpectation: extractSalary(lower),
    domain: extractDomain(lower)
  };
}

function extractKeywords(query: string) {
  const ignored = new Set(["jobs", "job", "role", "roles", "in", "for", "with", "remote", "onsite", "hybrid"]);
  return Array.from(
    new Set(
      query
        .split(/[^a-z0-9.+-]+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 2 && !ignored.has(part))
    )
  ).slice(0, 8);
}

function extractLocation(query: string) {
  const knownLocations = [
    "indore",
    "remote",
    "bangalore",
    "bengaluru",
    "hyderabad",
    "pune",
    "mumbai",
    "delhi",
    "chennai",
    "kolkata"
  ];

  return knownLocations.find((location) => query.includes(location)) ?? "";
}

function extractExperienceLevel(query: string) {
  if (query.includes("fresher") || query.includes("entry")) return "fresher";
  if (query.includes("junior") || query.includes("1 year") || query.includes("2 year")) return "junior";
  if (query.includes("mid") || query.includes("3 year") || query.includes("4 year") || query.includes("5 year")) return "mid";
  if (query.includes("senior") || query.includes("lead") || query.includes("6 year") || query.includes("7 year")) return "senior";
  return "";
}

function extractSalary(query: string) {
  const match = query.match(/(?:rs\.?|inr)?\s?\d+[kklakhc]?(?:\s?[-to]+\s?(?:rs\.?|inr)?\s?\d+[kklakhc]?)?/i);
  return match?.[0]?.trim() ?? "";
}

function extractDomain(query: string) {
  if (/(ai|ml|machine learning|llm|data scientist)/i.test(query)) return "AI & Machine Learning";
  if (/(frontend|backend|full stack|software|developer|next.js|react)/i.test(query)) return "Software Engineering";
  if (/(pharma|qc|qa|gmp|regulatory|hplc)/i.test(query)) return "Pharmaceuticals";
  if (/(finance|accounting|audit|banking|analyst)/i.test(query)) return "Finance";
  if (/(operations|business analyst|mis|process)/i.test(query)) return "Business Operations";
  if (/(customer support|helpdesk|customer success|service desk)/i.test(query)) return "Customer Support";
  if (/(healthcare|nursing|clinical|patient care)/i.test(query)) return "Healthcare";
  return "";
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

function readJobType(value: unknown): JobSearchFilters["jobType"] {
  const normalized = readString(value).toLowerCase();

  if (normalized.includes("remote")) return "remote";
  if (normalized.includes("hybrid")) return "hybrid";
  if (normalized.includes("onsite") || normalized.includes("on-site")) return "onsite";
  return "";
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Could not parse job search filter JSON.");
    }

    return JSON.parse(match[0]);
  }
}
