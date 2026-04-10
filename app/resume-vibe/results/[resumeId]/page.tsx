import { ResumeMatcherResultsPage } from "@/components/resume-vibe/results-page";

export default async function ResumeVibeResultsRoute({
  params
}: {
  params: Promise<{ resumeId: string }>;
}) {
  const { resumeId } = await params;
  return <ResumeMatcherResultsPage resumeId={resumeId} />;
}
