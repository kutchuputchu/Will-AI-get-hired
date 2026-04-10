import { NextResponse } from "next/server";
import { ResumeAnalysis } from "@/types";

export async function POST(request: Request) {
  try {
    const analysis = (await request.json()) as ResumeAnalysis;

    return NextResponse.json({
      slug: analysis.candidate.fullName
        ? analysis.candidate.fullName.toLowerCase().replace(/\s+/g, "-")
        : "candidate",
      heroTitle: analysis.candidate.fullName || "Candidate",
      heroSubtitle: analysis.candidate.headline || analysis.summary,
      blocks: [
        {
          title: "Best-fit roles",
          subtitle: analysis.suggestedRoles.slice(0, 2).map((role) => role.role).join(" · "),
          bullets: analysis.skills.slice(0, 5)
        },
        {
          title: "Project proof",
          subtitle: analysis.parsedProjects?.[0]?.name ?? "No linked project found yet",
          bullets: analysis.parsedProjects?.[0]?.technologies ?? []
        }
      ]
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Portfolio generation failed." },
      { status: 500 }
    );
  }
}
