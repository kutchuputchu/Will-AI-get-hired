import { NextResponse } from "next/server";
import { expandRoleSuggestions, inferResumeDomain } from "@/lib/resume-vibe/role-graph";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { MatchedJob, ResumeAnalysis } from "@/types";

export async function GET(_: Request, context: { params: Promise<{ resumeId: string }> }) {
  try {
    const { resumeId } = await context.params;

    if (!resumeId) {
      return NextResponse.json({ error: "resumeId is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let analysis: ResumeAnalysis | null = null;

    try {
      const { data: parsedResume } = await supabase
        .from("parsed_resumes")
        .select("parsed_payload")
        .eq("resume_id", resumeId)
        .limit(1)
        .maybeSingle();

      analysis = ((parsedResume?.parsed_payload as ResumeAnalysis | undefined) ?? null);
    } catch {
      analysis = null;
    }

    if (!analysis) {
      const { data: analysisRow } = await supabase
        .from("resume_analyses")
        .select("domain, domain_confidence, summary, skills, experience, education, missing_skills, resume_score, experience_level")
        .eq("resume_id", resumeId)
        .limit(1)
        .maybeSingle();

      const { data: resumeRow } = await supabase
        .from("resumes")
        .select("raw_text, extracted_skills")
        .eq("id", resumeId)
        .limit(1)
        .maybeSingle();

      const rawText = typeof resumeRow?.raw_text === "string" ? resumeRow.raw_text : "";
      const inferred = inferResumeDomain(rawText.toLowerCase());
      const skills = toStringArray(analysisRow?.skills).length
        ? toStringArray(analysisRow?.skills)
        : toStringArray(resumeRow?.extracted_skills).length
          ? toStringArray(resumeRow?.extracted_skills)
          : inferred.skills;
      const domain = readString(analysisRow?.domain) || inferred.domain;
      const experience = toStringArray(analysisRow?.experience);
      const education = toStringArray(analysisRow?.education);
      const missingSkills = toStringArray(analysisRow?.missing_skills);
      const summary = readString(analysisRow?.summary) || `Detected ${domain.toLowerCase()} resume signals.`;

      analysis = {
        candidate: {
          fullName: "",
          email: "",
          phone: "",
          location: "",
          headline: "",
          summary: "",
          visibleToRecruiters: false
        },
        domain,
        domainConfidence: toNumber(analysisRow?.domain_confidence, inferred.confidence),
        suggestedRoles: expandRoleSuggestions(domain, skills, rawText).slice(0, 12),
        experience,
        education,
        tools: inferred.tools,
        softSkills: inferred.softSkills,
        summary,
        skills,
        experienceLevel: readString(analysisRow?.experience_level) || "Mid-level",
        missingSkills,
        resumeScore: toNumber(analysisRow?.resume_score, 60)
      };
    }

    const matches = await loadMatches(supabase, resumeId);

    return NextResponse.json({ resumeId, analysis, matches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected resume results error." },
      { status: 500 }
    );
  }
}

async function loadMatches(supabase: ReturnType<typeof getSupabaseAdmin>, resumeId: string): Promise<MatchedJob[]> {
  try {
    const { data } = await supabase
      .from("job_matches")
      .select("payload, title, company, location, salary_min, salary_max, apply_url, match_percentage, why_match, matched_skills, missing_skills")
      .eq("resume_id", resumeId)
      .order("match_percentage", { ascending: false });

    return (data ?? []).map((row) => {
      const payload = (row.payload as MatchedJob | null) ?? null;

      if (payload) {
        return payload;
      }

      return {
        adzunaId: `${row.company}-${row.title}`,
        title: row.title,
        company: row.company,
        location: row.location,
        description: "",
        applyUrl: row.apply_url,
        salaryMin: row.salary_min,
        salaryMax: row.salary_max,
        skills: [],
        matchPercentage: toNumber(row.match_percentage, 0),
        matchedSkills: toStringArray(row.matched_skills),
        missingSkills: toStringArray(row.missing_skills),
        strengths: toStringArray(row.matched_skills),
        gaps: toStringArray(row.missing_skills),
        explanation: readString(row.why_match)
      } satisfies MatchedJob;
    });
  } catch {
    const { data } = await supabase
      .from("job_matches")
      .select("adzuna_id, title, company, location, description, apply_url, required_skills, missing_skills, match_percentage")
      .eq("resume_id", resumeId)
      .order("match_percentage", { ascending: false });

    return (data ?? []).map((row) => ({
      adzunaId: readString(row.adzuna_id) || `${row.company}-${row.title}`,
      title: row.title,
      company: row.company,
      location: row.location,
      description: readString(row.description),
      applyUrl: row.apply_url,
      salaryMin: null,
      salaryMax: null,
      skills: toStringArray(row.required_skills),
      matchPercentage: toNumber(row.match_percentage, 0),
      matchedSkills: [],
      missingSkills: toStringArray(row.missing_skills),
      strengths: toStringArray(row.required_skills).slice(0, 3),
      gaps: toStringArray(row.missing_skills),
      explanation: "Matched from saved role overlap and extracted skills."
    })) as MatchedJob[];
  }
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  return [];
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
