import { JobListing, MatchedJob } from "@/types";

export function matchJobs(
  resumeSkills: string[],
  jobs: JobListing[],
  suggestedRoles: string[] = []
): MatchedJob[] {
  const normalizedResumeSkills = resumeSkills.map(normalize);
  const normalizedRoles = suggestedRoles.map(normalize);

  return jobs
    .map((job) => {
      const requiredSkills = job.skills.map(normalize);
      const matchedSkills = requiredSkills.filter((skill) =>
        normalizedResumeSkills.includes(skill)
      );
      const missingSkills = requiredSkills.filter(
        (skill) => !normalizedResumeSkills.includes(skill)
      );
      const matchedCount = matchedSkills.length;
      const total = requiredSkills.length || 1;
      const haystack = `${job.title} ${job.description}`.toLowerCase();
      const roleAligned = normalizedRoles.some((role) => haystack.includes(role));
      const roleBonus = roleAligned ? 20 : 0;
      const baseScore = Math.round((matchedCount / total) * 100);
      const matchPercentage = Math.min(100, Math.max(baseScore, baseScore + roleBonus));

      return {
        ...job,
        matchPercentage,
        matchedSkills,
        missingSkills,
        strengths: roleAligned ? ["Strong role alignment"] : ["Relevant skill overlap"],
        gaps: missingSkills,
        explanation: roleAligned
          ? "Strong role alignment and relevant skills."
          : "Partial skill match with some missing requirements."
      };
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
