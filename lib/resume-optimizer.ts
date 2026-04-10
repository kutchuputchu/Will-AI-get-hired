import { ResumeOptimization } from "@/types";

type ClaudeResponse = {
  content?: Array<{ type: string; text?: string }>;
};

export async function optimizeResumeContent(resumeText: string): Promise<ResumeOptimization> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (anthropicKey) {
    return optimizeWithClaude(anthropicKey, resumeText);
  }

  if (groqKey) {
    return optimizeWithGroq(groqKey, resumeText);
  }

  return buildFallbackOptimization(resumeText);
}

async function optimizeWithClaude(apiKey: string, resumeText: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: buildResumeOptimizationPrompt(resumeText) }]
    })
  });

  if (!response.ok) {
    return buildFallbackOptimization(resumeText);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    return buildFallbackOptimization(resumeText);
  }

  return normalizeResumeOptimization(safeJsonParse(text), resumeText);
}

async function optimizeWithGroq(apiKey: string, resumeText: string) {
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
          content: "You are a professional resume optimizer. Return valid JSON only."
        },
        {
          role: "user",
          content: buildResumeOptimizationPrompt(resumeText)
        }
      ]
    })
  });

  if (!response.ok) {
    return buildFallbackOptimization(resumeText);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    return buildFallbackOptimization(resumeText);
  }

  return normalizeResumeOptimization(safeJsonParse(text), resumeText);
}

function buildResumeOptimizationPrompt(resumeText: string) {
  return `
You are a professional resume optimizer.

Improve the resume content for better job matching.

Return ONLY JSON.

Resume:
${resumeText}

Return:
{
  "improved_summary": "",
  "improved_bullets": [],
  "missing_keywords": []
}
  `.trim();
}

function normalizeResumeOptimization(parsed: any, resumeText: string): ResumeOptimization {
  const fallback = buildFallbackOptimization(resumeText);

  return {
    improvedSummary:
      typeof parsed?.improved_summary === "string" && parsed.improved_summary.trim()
        ? parsed.improved_summary.trim()
        : fallback.improvedSummary,
    improvedBullets: normalizeStringArray(parsed?.improved_bullets).slice(0, 6).length
      ? normalizeStringArray(parsed?.improved_bullets).slice(0, 6)
      : fallback.improvedBullets,
    missingKeywords: normalizeStringArray(parsed?.missing_keywords).slice(0, 8).length
      ? normalizeStringArray(parsed?.missing_keywords).slice(0, 8)
      : fallback.missingKeywords
  };
}

function buildFallbackOptimization(resumeText: string): ResumeOptimization {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const summarySeed = lines.find((line) => line.length > 40 && line.length < 220) ?? "";
  const bullets = lines.filter((line) => /^[-*•]/.test(line)).slice(0, 3);
  const dictionary = [
    "leadership",
    "stakeholder management",
    "problem solving",
    "documentation",
    "cross-functional collaboration",
    "project delivery",
    "quality assurance",
    "customer support",
    "operations",
    "analytics"
  ];
  const lowerText = resumeText.toLowerCase();
  const missingKeywords = dictionary.filter((keyword) => !lowerText.includes(keyword.toLowerCase())).slice(0, 5);

  return {
    improvedSummary:
      summarySeed ||
      "Results-focused professional with relevant experience, domain knowledge, and stronger role-targeted positioning.",
    improvedBullets: bullets.length
      ? bullets.map((bullet) => bullet.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)
      : [
          "Highlight measurable outcomes in recent experience.",
          "Lead each bullet with a strong action verb.",
          "Tailor achievements to the target role."
        ],
    missingKeywords
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

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Could not parse AI resume optimization response.");
    }

    return JSON.parse(match[0]);
  }
}
