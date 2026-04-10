import { NextResponse } from "next/server";
import { analyzeResumeWithAI } from "@/lib/ai";
import { matchJobsWithAI } from "@/lib/job-match-ai";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { JobListing } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resumeId = body.resumeId as string | undefined;
    const resumeSkills = body.resumeSkills as string[] | undefined;
    const resumeText = body.resumeText as string | undefined;
    const jobs = body.jobs as JobListing[] | undefined;
    const suggestedRoles = body.suggestedRoles as string[] | undefined;
    const domain = body.domain as string | undefined;

    if (!resumeId || !resumeText || !Array.isArray(resumeSkills) || !Array.isArray(jobs)) {
      return NextResponse.json(
        { error: "resumeId, resumeText, resumeSkills, and jobs are required." },
        { status: 400 }
      );
    }

    const structuredResume = await analyzeResumeWithAI(resumeText);

    const matches = await matchJobsWithAI({
      resumeText,
      domain: domain ?? "",
      suggestedRoles: Array.isArray(suggestedRoles) ? suggestedRoles : [],
      jobs,
      structuredResume: {
        name: structuredResume.candidate.fullName,
        primary_domain: structuredResume.domain,
        experience_level: structuredResume.experienceLevel,
        skills: {
          technical: structuredResume.skills,
          tools: structuredResume.tools,
          soft: structuredResume.softSkills
        },
        education: structuredResume.parsedEducation ?? structuredResume.education,
        experience: structuredResume.parsedExperience ?? structuredResume.experience,
        projects: structuredResume.parsedProjects ?? [],
        certifications: structuredResume.certifications ?? [],
        keywords_for_matching: structuredResume.skills
      }
    });

    const supabase = getSupabaseAdmin();
    await supabase.from("job_matches").delete().eq("resume_id", resumeId);

    const modernRows = matches.map((job) => ({
      resume_id: resumeId,
      provider: job.domain ?? "aggregated",
      provider_job_id: job.adzunaId,
      title: job.title,
      company: job.company,
      location: job.location,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      apply_url: job.applyUrl,
      match_percentage: job.matchPercentage,
      matched_skills: job.matchedSkills,
      missing_skills: job.missingSkills,
      why_match: job.explanation ?? "",
      payload: job,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }));

    const { error: modernInsertError } = await supabase.from("job_matches").insert(modernRows);

    if (modernInsertError) {
      const fallbackAttempts = [
        modernRows.map(({ expires_at: _expiresAt, ...rest }) => rest),
        matches.map((job) => ({
          resume_id: resumeId,
          adzuna_id: job.adzunaId,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          apply_url: job.applyUrl,
          required_skills: job.skills,
          missing_skills: job.missingSkills,
          match_percentage: job.matchPercentage
        }))
      ];

      for (const rows of fallbackAttempts) {
        const { error: retryError } = await supabase.from("job_matches").insert(rows);

        if (!retryError) {
          return NextResponse.json(matches);
        }
      }

      return NextResponse.json(
        {
          error: `Database insert failed for table "job_matches": ${modernInsertError.message}`
        },
        { status: 500 }
      );
    }

    return NextResponse.json(matches);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Unexpected matching error: ${error instanceof Error ? error.message : "Unknown error."}`
      },
      { status: 500 }
    );
  }
}
