import { NextResponse } from "next/server";
import { sampleTrackerItems } from "@/data/sample-jobs";

export async function GET() {
  return NextResponse.json(sampleTrackerItems);
}
