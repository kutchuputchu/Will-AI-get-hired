import { NextResponse } from "next/server";
import { fetchRelevantJobs } from "@/lib/jobs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const skillsParam = searchParams.get("skills");
    const domain = searchParams.get("domain") ?? "";
    const rolesParam = searchParams.get("roles") ?? "";

    if (!skillsParam) {
      return NextResponse.json({ error: "skills query parameter is required." }, { status: 400 });
    }

    const skills = skillsParam
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (!skills.length) {
      return NextResponse.json({ error: "At least one skill is required." }, { status: 400 });
    }

    const roles = rolesParam
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);

    const jobs = await fetchRelevantJobs(skills, { domain, roles });
    return NextResponse.json(jobs);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected job fetch error."
      },
      { status: 500 }
    );
  }
}
