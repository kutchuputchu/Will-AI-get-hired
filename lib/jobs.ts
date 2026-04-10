import { JobListing } from "@/types";

type JobSearchOptions = {
  domain?: string;
  roles?: string[];
};

type AdzunaJob = {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  location?: { display_name?: string };
  company?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
};

type AdzunaResponse = {
  results?: AdzunaJob[];
};

export async function fetchRelevantJobs(skills: string[], options: JobSearchOptions = {}) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY ?? "gb";

  if (!appId || !appKey) {
    return fetchTheMuseJobs(skills, options);
  }

  return fetchAdzunaJobs(skills, { appId, appKey, country }, options);
}

async function fetchAdzunaJobs(
  skills: string[],
  credentials: { appId: string; appKey: string; country: string },
  options: JobSearchOptions
) {
  const query = encodeURIComponent(buildSearchTerms(skills, options).slice(0, 6).join(" "));
  const url = `https://api.adzuna.com/v1/api/jobs/${credentials.country}/search/1?app_id=${credentials.appId}&app_key=${credentials.appKey}&results_per_page=10&what=${query}&content-type=application/json`;

  const response = await fetch(url, {
    method: "GET",
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Adzuna request failed: ${errorText}`);
  }

  const data = (await response.json()) as AdzunaResponse;
  const jobs = (data.results ?? []).map(normalizeAdzunaJob);
  return jobs.length ? jobs : buildMockJobs(skills, options);
}

async function fetchTheMuseJobs(skills: string[], options: JobSearchOptions) {
  try {
    const apiKey = process.env.THE_MUSE_API_KEY;
    const baseUrl = new URL("https://www.themuse.com/api/public/jobs");
    baseUrl.searchParams.set("page", "0");

    if (apiKey) {
      baseUrl.searchParams.set("api_key", apiKey);
    }

    const response = await fetch(baseUrl.toString(), {
      method: "GET",
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`The Muse request failed: ${errorText}`);
    }

    const data = (await response.json()) as {
      results?: Array<{
        id: number;
        name: string;
        contents?: string;
        refs?: { landing_page?: string };
        company?: { name?: string };
        locations?: Array<{ name?: string }>;
        categories?: Array<{ name?: string }>;
        levels?: Array<{ name?: string }>;
      }>;
    };

    const normalizedSearchTerms = buildSearchTerms(skills, options).map((term) => term.toLowerCase());
    const jobs = (data.results ?? []).map((job) => {
      const description = stripHtml(job.contents ?? "");
      const categoryTerms = (job.categories ?? []).map((category) => category.name?.toLowerCase() ?? "");
      const extractedSkills = extractKeywords(
        `${job.name} ${description} ${categoryTerms.join(" ")} ${(job.levels ?? []).map((level) => level.name).join(" ")}`
      );

      return {
        adzunaId: `themuse-${job.id}`,
        title: job.name,
        company: job.company?.name ?? "Unknown company",
        location: job.locations?.map((location) => location.name).filter(Boolean).join(", ") || "Remote / Flexible",
        description,
        applyUrl: job.refs?.landing_page ?? "https://www.themuse.com",
        salaryMin: null,
        salaryMax: null,
        skills: extractedSkills.length ? extractedSkills : categoryTerms.filter(Boolean)
      } satisfies JobListing;
    });

    const rankedJobs = jobs
      .map((job) => ({
        job,
        score: scoreJobAgainstTerms(job, normalizedSearchTerms)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.job);

    return rankedJobs.length ? rankedJobs : buildMockJobs(skills, options);
  } catch {
    return buildMockJobs(skills, options);
  }
}

function normalizeAdzunaJob(job: AdzunaJob): JobListing {
  const extractedSkills = extractKeywords(`${job.title} ${job.description}`);

  return {
    adzunaId: job.id,
    title: job.title,
    company: job.company?.display_name ?? "Unknown company",
    location: job.location?.display_name ?? "Remote / Flexible",
    description: job.description,
    applyUrl: job.redirect_url,
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
    skills: extractedSkills
  };
}

function buildMockJobs(skills: string[], options: JobSearchOptions): JobListing[] {
  const normalizedSkills = skills.length ? skills : ["communication"];
  const domain = (options.domain ?? "").toLowerCase();

  if (domain.includes("health")) {
    return [
      {
        adzunaId: "demo-health-1",
        title: "Clinical Coordinator",
        company: "CareAxis Hospital",
        location: "Bangalore",
        description: "Coordinate patient scheduling, maintain clinical documentation, and support care teams in daily operations.",
        applyUrl: "https://example.com/jobs/clinical-coordinator",
        salaryMin: 35000,
        salaryMax: 50000,
        skills: uniqueTerms(["patient care", "clinical documentation", "care coordination", ...normalizedSkills.slice(0, 2)])
      },
      {
        adzunaId: "demo-health-2",
        title: "Healthcare Administrator",
        company: "Nova Health Services",
        location: "Remote / Hybrid",
        description: "Support hospital workflows, patient records, compliance tasks, and coordination across healthcare departments.",
        applyUrl: "https://example.com/jobs/healthcare-administrator",
        salaryMin: 30000,
        salaryMax: 48000,
        skills: uniqueTerms(["healthcare operations", "compliance", "medical terminology", ...normalizedSkills.slice(0, 2)])
      }
    ];
  }

  if (domain.includes("pharma")) {
    return [
      {
        adzunaId: "demo-pharma-1",
        title: "QC Analyst",
        company: "Aster Pharma",
        location: "Hyderabad",
        description: "Perform sample analysis, maintain GMP documentation, and support quality control processes in a regulated environment.",
        applyUrl: "https://example.com/jobs/qc-analyst",
        salaryMin: 32000,
        salaryMax: 52000,
        skills: uniqueTerms(["quality control", "gmp", "documentation", ...normalizedSkills.slice(0, 2)])
      },
      {
        adzunaId: "demo-pharma-2",
        title: "QA Executive",
        company: "BioSphere Labs",
        location: "Pune",
        description: "Review SOP compliance, assist audits, and track quality assurance tasks across production and laboratory teams.",
        applyUrl: "https://example.com/jobs/qa-executive",
        salaryMin: 35000,
        salaryMax: 55000,
        skills: uniqueTerms(["quality assurance", "regulatory compliance", "validation", ...normalizedSkills.slice(0, 2)])
      }
    ];
  }

  if (domain.includes("customer")) {
    return [
      {
        adzunaId: "demo-support-1",
        title: "Customer Support Specialist",
        company: "ClearDesk",
        location: "Remote",
        description: "Handle customer tickets, resolve product issues, and maintain strong service quality across chat and email channels.",
        applyUrl: "https://example.com/jobs/customer-support-specialist",
        salaryMin: 25000,
        salaryMax: 40000,
        skills: uniqueTerms(["customer support", "ticket handling", "issue resolution", ...normalizedSkills.slice(0, 2)])
      },
      {
        adzunaId: "demo-support-2",
        title: "Customer Success Associate",
        company: "AssistFlow",
        location: "Remote / Hybrid",
        description: "Support onboarding, answer account questions, and improve client experience through proactive communication.",
        applyUrl: "https://example.com/jobs/customer-success-associate",
        salaryMin: 30000,
        salaryMax: 45000,
        skills: uniqueTerms(["customer communication", "crm", "retention", ...normalizedSkills.slice(0, 2)])
      }
    ];
  }

  if (domain.includes("business") || domain.includes("operations")) {
    return [
      {
        adzunaId: "demo-biz-1",
        title: "Business Analyst",
        company: "Northstar Ops",
        location: "Remote",
        description: "Analyze reports, improve workflows, and support stakeholders with structured business insights and process tracking.",
        applyUrl: "https://example.com/jobs/business-analyst",
        salaryMin: 40000,
        salaryMax: 60000,
        skills: uniqueTerms(["analysis", "reporting", "stakeholder management", ...normalizedSkills.slice(0, 2)])
      },
      {
        adzunaId: "demo-biz-2",
        title: "Operations Executive",
        company: "MetricLane",
        location: "Chennai",
        description: "Manage operations workflows, coordinate across teams, and improve day-to-day business processes using data and reporting.",
        applyUrl: "https://example.com/jobs/operations-executive",
        salaryMin: 30000,
        salaryMax: 50000,
        skills: uniqueTerms(["operations", "excel", "process improvement", ...normalizedSkills.slice(0, 2)])
      }
    ];
  }

  if (domain.includes("general") || domain.includes("professional") || domain.includes("administrative")) {
    return [
      {
        adzunaId: "demo-general-1",
        title: "Operations Associate",
        company: "CoreBridge Services",
        location: "Remote / Hybrid",
        description: "Support daily coordination, documentation, reporting, and cross-team operations in a structured business environment.",
        applyUrl: "https://example.com/jobs/operations-associate",
        salaryMin: 25000,
        salaryMax: 42000,
        skills: uniqueTerms(["coordination", "documentation", "reporting", ...normalizedSkills.slice(0, 2)])
      },
      {
        adzunaId: "demo-general-2",
        title: "Administrative Executive",
        company: "Northfield Group",
        location: "Chennai",
        description: "Manage office workflows, maintain records, support communication, and help teams stay organized and on schedule.",
        applyUrl: "https://example.com/jobs/administrative-executive",
        salaryMin: 22000,
        salaryMax: 38000,
        skills: uniqueTerms(["organization", "communication", "documentation", ...normalizedSkills.slice(0, 2)])
      }
    ];
  }

  return [
    {
      adzunaId: "demo-tech-1",
      title: "Frontend Developer",
      company: "DemoTech Labs",
      location: "Remote",
      description: "Build responsive web interfaces with React, TypeScript, Tailwind CSS, and REST APIs. Collaborate closely with product and design.",
      applyUrl: "https://example.com/jobs/frontend-developer",
      salaryMin: 45000,
      salaryMax: 65000,
      skills: uniqueTerms(["react", "typescript", "tailwind", "rest api", ...normalizedSkills.slice(0, 2)])
    },
    {
      adzunaId: "demo-tech-2",
      title: "Full Stack Developer",
      company: "LaunchLayer",
      location: "Bangalore / Hybrid",
      description: "Work across Next.js, Node.js, PostgreSQL, Supabase, and API integrations to ship product features end to end.",
      applyUrl: "https://example.com/jobs/full-stack-developer",
      salaryMin: 60000,
      salaryMax: 85000,
      skills: uniqueTerms(["next.js", "node.js", "sql", "postgresql", "supabase", ...normalizedSkills.slice(0, 3)])
    }
  ];
}

function buildSearchTerms(skills: string[], options: JobSearchOptions) {
  const roleTerms = options.roles ?? [];
  const domainTerms = getDomainTerms(options.domain ?? "");
  return uniqueTerms([...roleTerms, ...domainTerms, ...skills]).slice(0, 10);
}

function getDomainTerms(domain: string) {
  const lower = domain.toLowerCase();

  if (lower.includes("health")) return ["healthcare", "clinical", "patient care"];
  if (lower.includes("pharma")) return ["pharmaceutical", "quality control", "quality assurance"];
  if (lower.includes("customer")) return ["customer support", "customer success", "helpdesk"];
  if (lower.includes("business") || lower.includes("operations")) return ["business analyst", "operations", "reporting"];
  if (lower.includes("general") || lower.includes("professional") || lower.includes("administrative")) {
    return ["operations associate", "administrative executive", "customer support associate"];
  }

  return [];
}

function extractKeywords(text: string) {
  const dictionary = [
    "javascript",
    "typescript",
    "react",
    "next.js",
    "node.js",
    "python",
    "sql",
    "postgresql",
    "aws",
    "docker",
    "tailwind",
    "supabase",
    "rest api",
    "graphql",
    "git",
    "patient care",
    "clinical documentation",
    "medical terminology",
    "care coordination",
    "gmp",
    "quality assurance",
    "quality control",
    "regulatory compliance",
    "validation",
    "customer support",
    "ticket handling",
    "issue resolution",
    "crm",
    "customer success",
    "operations",
    "reporting",
    "stakeholder management",
    "process improvement",
    "excel",
    "power bi"
  ];

  const lower = text.toLowerCase();
  return dictionary.filter((term) => lower.includes(term));
}

function scoreJobAgainstTerms(job: JobListing, terms: string[]) {
  const haystack = `${job.title} ${job.description} ${job.skills.join(" ")}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function uniqueTerms(values: string[]) {
  return Array.from(new Set(values.map((value) => value.toLowerCase())));
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
