import { NextResponse } from "next/server";
import { analyzeResumeWithAI } from "@/lib/ai";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resumeId = body.resumeId as string | undefined;
    const text = body.text as string | undefined;

    if (!resumeId || !text) {
      return NextResponse.json({ error: "resumeId and text are required." }, { status: 400 });
    }

    const analysis = await analyzeResumeWithAI(text);
    const supabase = getSupabaseAdmin();

    const { error: updateError } = await supabase
      .from("resumes")
      .update({ extracted_skills: analysis.skills })
      .eq("id", resumeId);

    if (updateError) {
      return NextResponse.json(
        {
          error: `Database update failed for table "resumes": ${updateError.message}`
        },
        { status: 500 }
      );
    }

    await supabase.from("parsed_resumes").upsert({
      resume_id: resumeId,
      file_name: `${analysis.candidate.fullName || "candidate"}.pdf`,
      raw_text: text,
      parsed_payload: analysis
    });

    const { error: analysisError } = await supabase.from("resume_analyses").upsert({
      resume_id: resumeId,
      domain: analysis.domain,
      domain_confidence: analysis.domainConfidence ?? 0,
      summary: analysis.summary,
      skills: analysis.skills,
      experience: analysis.experience,
      education: analysis.education,
      missing_skills: analysis.missingSkills,
      resume_score: analysis.resumeScore
    });

    if (analysisError) {
      await supabase.from("resume_analyses").insert({
        resume_id: resumeId,
        summary: analysis.summary,
        skills: analysis.skills,
        experience_level: analysis.experienceLevel,
        missing_skills: analysis.missingSkills,
        resume_score: analysis.resumeScore
      });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Unexpected analysis error: ${error instanceof Error ? error.message : "Unknown error."}`
      },
      { status: 500 }
    );
  }
}
