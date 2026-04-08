import { NextResponse } from "next/server";
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

    const matches = await matchJobsWithAI({
      resumeText,
      domain: domain ?? "",
      suggestedRoles: Array.isArray(suggestedRoles) ? suggestedRoles : [],
      jobs
    });
    const supabase = getSupabaseAdmin();

    const rows = matches.map((job) => ({
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
    }));

    const { error } = await supabase.from("job_matches").insert(rows);

    if (error) {
      return NextResponse.json(
        {
          error: `Database insert failed for table "job_matches": ${error.message}`
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
