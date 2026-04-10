import { NextResponse } from "next/server";
import { sampleInterviewQuestions } from "@/data/sample-jobs";
import { InterviewQuestion } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { role?: string; candidateName?: string };

    const questions: InterviewQuestion[] = sampleInterviewQuestions.map((item) => ({
      question: body.role ? `${item.question} (${body.role})` : item.question,
      sampleAnswer: body.candidateName
        ? `${body.candidateName} should anchor the answer in resume evidence. ${item.sampleAnswer}`
        : item.sampleAnswer
    }));

    return NextResponse.json({ questions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Interview prep generation failed." },
      { status: 500 }
    );
  }
}
