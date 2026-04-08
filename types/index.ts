export type SuggestedRole = {
  role: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
};

export type ResumeUploadResponse = {
  resumeId: string;
  fileName: string;
  text: string;
  storagePath: string;
};

export type ResumeAnalysis = {
  domain: string;
  suggestedRoles: SuggestedRole[];
  experience: string[];
  education: string[];
  tools: string[];
  softSkills: string[];
  summary: string;
  skills: string[];
  experienceLevel: string;
  missingSkills: string[];
  resumeScore: number;
};

export type JobListing = {
  adzunaId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
};

export type MatchedJob = JobListing & {
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  explanation?: string;
  improvements?: string[];
  plan30Days?: {
    week1: string;
    week2: string;
    week3: string;
    week4: string;
  };
  betterAlternative?: {
    betterRole: string;
    reason: string;
  };
  resumeFixes?: string[];
};
