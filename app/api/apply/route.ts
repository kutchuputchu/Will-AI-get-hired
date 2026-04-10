import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { company?: string; role?: string; resumeId?: string };

    if (!body.company || !body.role) {
      return NextResponse.json({ error: "company and role are required." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Mock application sent to ${body.company} for ${body.role}.`,
      resumeId: body.resumeId ?? null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Application request failed." },
      { status: 500 }
    );
  }
}
