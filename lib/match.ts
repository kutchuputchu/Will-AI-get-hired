import { JobListing, MatchedJob } from "@/types";

export function matchJobs(
  resumeSkills: string[],
  jobs: JobListing[],
  suggestedRoles: string[] = []
): MatchedJob[] {
  const normalizedResumeSkills = resumeSkills.map(normalize);
  const normalizedRoles = suggestedRoles.map(normalize);

  return jobs
    .map((job): MatchedJob => {
      // 1. Logic for skills
      const matchedSkills = job.skills.filter((skill) =>
        normalizedResumeSkills.includes(normalize(skill))
      );
      
      const missingSkills = job.skills.filter(
        (skill) => !normalizedResumeSkills.includes(normalize(skill))
      );

      // 2. Logic for scoring
      const matchedCount = matchedSkills.length;
      const total = job.skills.length || 1;
      const haystack = `${job.title} ${job.description || ""}`.toLowerCase();
      const roleAligned = normalizedRoles.some((role) => haystack.includes(role));
      
      const roleBonus = roleAligned ? 20 : 0;
      const baseScore = Math.round((matchedCount / total) * 100);
      const matchPercentage = Math.min(100, Math.max(baseScore, baseScore + roleBonus));

      // 3. Explicitly return a MatchedJob object
      return {
        ...job,
        matchPercentage,
        matchedSkills,
        missingSkills,
        strengths: roleAligned ? ["Strong role alignment"] : ["Relevant skill overlap"],
        gaps: missingSkills,
        explanation: roleAligned
          ? "Strong role alignment and relevant skills."
          : "Partial skill match with some missing requirements.",
        // These are often required in the interface even if empty
        improvements: [],
        resumeFixes: [],
        plan30Days: undefined,
        betterAlternative: undefined
      };
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

function normalize(value: string) {
  return (value || "").trim().toLowerCase();
}