export type SkillTag = {
  name: string;
  level?: "beginner" | "intermediate" | "advanced" | "expert";
  source?: "resume" | "github" | "ai";
};

export type CandidateProfile = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  visibleToRecruiters: boolean;
};

export type ExperienceItem = {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  location?: string;
  bullets: string[];
};

export type ProjectItem = {
  name: string;
  description: string;
  technologies: string[];
  bullets: string[];
  githubUrl?: string;
  liveUrl?: string;
};

export type EducationItem = {
  institution: string;
  degree: string;
  startDate?: string;
  endDate?: string;
  score?: string;
};

export type CertificationItem = {
  name: string;
  issuer?: string;
  issuedAt?: string;
};

export type SuggestedRole = {
  role: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  whyThisRole?: string;
};

export type ResumeUploadResponse = {
  resumeId: string;
  fileName: string;
  text: string;
  storagePath: string;
};

export type ResumeAnalysis = {
  candidate: CandidateProfile;
  domain: string;
  domainConfidence?: number;
  suggestedRoles: SuggestedRole[];
  experience: string[];
  education: string[];
  tools: string[];
  softSkills: string[];
  summary: string;
  skills: string[];
  skillTags?: SkillTag[];
  experienceLevel: string;
  missingSkills: string[];
  resumeScore: number;
  parsedExperience?: ExperienceItem[];
  parsedProjects?: ProjectItem[];
  parsedEducation?: EducationItem[];
  certifications?: CertificationItem[];
  externalLinks?: {
    github: string[];
    linkedin: string[];
    liveProjects: string[];
  };
};

export type JobListing = {
  adzunaId: string;
  slug?: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  description: string;
  applyUrl: string;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
  domain?: string;
  level?: "entry" | "mid" | "senior";
  easyApply?: boolean;
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
  interviewQuestions?: InterviewQuestion[];
};

export type TrackerStatus = "Applied" | "In Review" | "Interview" | "Offer";

export type ApplicationTrackerItem = {
  id: string;
  company: string;
  role: string;
  status: TrackerStatus;
  appliedAt: string;
  notes?: string;
};

export type InterviewQuestion = {
  question: string;
  sampleAnswer: string;
};

export type LearningResource = {
  title: string;
  provider: string;
  url: string;
};

export type SkillGapInsight = {
  skill: string;
  demandPercentage: number;
  learningResources: LearningResource[];
};

export type PortfolioBlock = {
  title: string;
  subtitle: string;
  bullets: string[];
  href?: string;
};

export type PortfolioPreview = {
  slug: string;
  heroTitle: string;
  heroSubtitle: string;
  blocks: PortfolioBlock[];
};

export type JobSearchFilters = {
  keywords: string[];
  location: string;
  experienceLevel: string;
  jobType: "remote" | "onsite" | "hybrid" | "";
  salaryExpectation: string;
  domain: string;
};

export type JobSummary = {
  shortDescription: string;
  keySkills: string[];
  experienceRequired: string;
  salaryRange: string;
};

export type JobGapAnalysis = {
  missingSkills: string[];
  learningSuggestions: string[];
  readinessScore: number;
};

export type ResumeOptimization = {
  improvedSummary: string;
  improvedBullets: string[];
  missingKeywords: string[];
};
