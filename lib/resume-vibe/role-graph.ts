import { SuggestedRole } from "@/types";

type RoleTemplate = {
  title: string;
  keywords: string[];
};

type DomainProfile = {
  domain: string;
  educationSignals: string[];
  titleSignals: string[];
  toolSignals: string[];
  skillSignals: string[];
  canonicalSkills: string[];
  tools: string[];
  softSkills: string[];
  roleTemplates: RoleTemplate[];
};

type DomainInference = {
  domain: string;
  confidence: number;
  skills: string[];
  tools: string[];
  softSkills: string[];
  roleTitles: string[];
};

const DOMAIN_PROFILES: DomainProfile[] = [
  {
    domain: "AI & Machine Learning",
    educationSignals: ["artificial intelligence", "machine learning", "computer science", "data science", "b.tech", "m.tech", "mca"],
    titleSignals: ["ai engineer", "ml engineer", "data scientist", "nlp engineer", "llm engineer", "python developer"],
    toolSignals: ["python", "pytorch", "langchain", "llamaindex", "fastapi", "rag", "transformers", "vector db", "docker"],
    skillSignals: ["machine learning", "deep learning", "nlp", "rag", "agents", "prompt engineering", "model serving"],
    canonicalSkills: ["python", "pytorch", "fastapi", "langchain", "llamaindex", "rag", "llm", "agents", "docker", "api design", "vector databases", "mlops"],
    tools: ["Python", "PyTorch", "FastAPI", "LangChain", "LlamaIndex", "Docker", "Git"],
    softSkills: ["problem solving", "research", "communication"],
    roleTemplates: [
      { title: "AI Engineer", keywords: ["python", "llm", "agents", "rag"] },
      { title: "Machine Learning Engineer", keywords: ["python", "pytorch", "deep learning", "mlops"] },
      { title: "LLM Engineer", keywords: ["llm", "langchain", "prompt engineering", "rag"] },
      { title: "Applied AI Engineer", keywords: ["python", "fastapi", "llm", "api design"] },
      { title: "NLP Engineer", keywords: ["nlp", "transformers", "python", "pytorch"] },
      { title: "RAG Engineer", keywords: ["rag", "vector databases", "langchain", "llamaindex"] },
      { title: "MLOps Engineer", keywords: ["docker", "mlops", "deployment", "cloud"] },
      { title: "Data Scientist", keywords: ["python", "analytics", "machine learning", "statistics"] },
      { title: "Python Backend Engineer", keywords: ["python", "fastapi", "api design", "sql"] },
      { title: "AI Product Engineer", keywords: ["llm", "fastapi", "product", "experimentation"] },
      { title: "Research Engineer", keywords: ["research", "python", "models", "evaluation"] },
      { title: "Automation Engineer", keywords: ["python", "agents", "workflows", "integration"] }
    ]
  },
  {
    domain: "Software Engineering",
    educationSignals: ["computer science", "information technology", "software engineering", "b.tech", "mca"],
    titleSignals: ["software engineer", "frontend developer", "backend developer", "full stack developer", "web developer"],
    toolSignals: ["typescript", "javascript", "react", "next.js", "node.js", "docker", "postgresql", "supabase"],
    skillSignals: ["rest api", "backend", "frontend", "testing", "sql", "deployment"],
    canonicalSkills: ["typescript", "javascript", "react", "next.js", "node.js", "postgresql", "sql", "docker", "rest api", "git", "tailwind", "supabase"],
    tools: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Docker"],
    softSkills: ["collaboration", "ownership", "problem solving"],
    roleTemplates: [
      { title: "Frontend Engineer", keywords: ["react", "typescript", "css", "tailwind"] },
      { title: "Backend Engineer", keywords: ["node.js", "api", "sql", "postgresql"] },
      { title: "Full Stack Engineer", keywords: ["react", "node.js", "sql", "typescript"] },
      { title: "Next.js Developer", keywords: ["next.js", "react", "typescript", "tailwind"] },
      { title: "Platform Engineer", keywords: ["docker", "deployment", "api", "automation"] },
      { title: "Product Engineer", keywords: ["react", "product", "api", "experimentation"] },
      { title: "Web Application Developer", keywords: ["javascript", "react", "node.js", "sql"] },
      { title: "API Developer", keywords: ["api", "node.js", "sql", "testing"] },
      { title: "JavaScript Developer", keywords: ["javascript", "typescript", "react", "node.js"] },
      { title: "Cloud Application Developer", keywords: ["deployment", "docker", "cloud", "api"] },
      { title: "Software Developer", keywords: ["typescript", "sql", "testing", "git"] },
      { title: "Systems Integration Developer", keywords: ["api", "integration", "node.js", "automation"] }
    ]
  },
  {
    domain: "Pharmaceuticals",
    educationSignals: ["b.pharm", "m.pharm", "pharmacy", "pharmaceutical", "pharmacology", "pharm.d"],
    titleSignals: ["qc analyst", "qa executive", "pharmacist", "production executive", "regulatory affairs", "formulation"],
    toolSignals: ["hplc", "gc", "uv", "ftir", "lims", "gmp", "glp", "stability"],
    skillSignals: ["quality control", "quality assurance", "validation", "documentation", "batch record", "sop"],
    canonicalSkills: ["quality control", "quality assurance", "gmp", "glp", "validation", "documentation", "hplc", "gc", "stability", "sop", "audit readiness"],
    tools: ["HPLC", "GC", "UV", "FTIR", "LIMS", "SAP"],
    softSkills: ["accuracy", "documentation", "compliance awareness"],
    roleTemplates: [
      { title: "QC Analyst", keywords: ["quality control", "hplc", "gc", "documentation"] },
      { title: "QA Executive", keywords: ["quality assurance", "gmp", "audit", "sop"] },
      { title: "Regulatory Affairs Associate", keywords: ["regulatory", "documentation", "compliance", "submission"] },
      { title: "Validation Analyst", keywords: ["validation", "protocol", "qualification", "gmp"] },
      { title: "Stability Analyst", keywords: ["stability", "sample analysis", "gmp", "documentation"] },
      { title: "Production Executive", keywords: ["manufacturing", "batch record", "gmp", "quality"] },
      { title: "Microbiology Analyst", keywords: ["microbiology", "testing", "documentation", "quality"] },
      { title: "Formulation Executive", keywords: ["formulation", "development", "documentation", "quality"] },
      { title: "IPQA Executive", keywords: ["ipqa", "line clearance", "gmp", "compliance"] },
      { title: "Compliance Coordinator", keywords: ["compliance", "audit", "documentation", "quality"] },
      { title: "Lab Analyst", keywords: ["sample analysis", "instrumentation", "documentation", "quality"] },
      { title: "Pharma Documentation Specialist", keywords: ["documentation", "sop", "compliance", "batch record"] }
    ]
  },
  {
    domain: "Finance",
    educationSignals: ["b.com", "m.com", "finance", "accounting", "ca", "cfa", "mba finance"],
    titleSignals: ["accountant", "financial analyst", "audit", "accounts executive", "credit analyst"],
    toolSignals: ["excel", "tally", "sap", "power bi", "quickbooks"],
    skillSignals: ["financial reporting", "reconciliation", "audit", "tax", "accounts payable", "accounts receivable"],
    canonicalSkills: ["financial reporting", "reconciliation", "excel", "tally", "accounts payable", "accounts receivable", "audit", "tax", "budgeting", "analysis"],
    tools: ["Excel", "Tally", "SAP", "Power BI"],
    softSkills: ["accuracy", "analysis", "stakeholder communication"],
    roleTemplates: [
      { title: "Financial Analyst", keywords: ["financial reporting", "analysis", "excel", "budgeting"] },
      { title: "Accounts Executive", keywords: ["accounts payable", "reconciliation", "tally", "reporting"] },
      { title: "Audit Associate", keywords: ["audit", "compliance", "reporting", "documentation"] },
      { title: "FP&A Analyst", keywords: ["budgeting", "forecasting", "analysis", "excel"] },
      { title: "Tax Analyst", keywords: ["tax", "compliance", "reporting", "reconciliation"] },
      { title: "Credit Analyst", keywords: ["analysis", "credit", "risk", "excel"] },
      { title: "Payroll Specialist", keywords: ["payroll", "compliance", "excel", "documentation"] },
      { title: "Banking Operations Analyst", keywords: ["operations", "finance", "reporting", "compliance"] },
      { title: "Risk Analyst", keywords: ["risk", "analysis", "reporting", "compliance"] },
      { title: "Investment Operations Associate", keywords: ["operations", "reporting", "reconciliation", "analysis"] },
      { title: "Accounts Payable Specialist", keywords: ["accounts payable", "invoice", "reconciliation", "sap"] },
      { title: "Revenue Analyst", keywords: ["revenue", "analysis", "reporting", "excel"] }
    ]
  },
  {
    domain: "Business Operations",
    educationSignals: ["mba", "bba", "business administration", "commerce", "economics"],
    titleSignals: ["operations executive", "business analyst", "coordinator", "process associate", "sales operations"],
    toolSignals: ["excel", "power bi", "crm", "sap", "google sheets"],
    skillSignals: ["operations", "reporting", "stakeholder management", "process improvement", "coordination"],
    canonicalSkills: ["operations", "reporting", "excel", "stakeholder management", "process improvement", "coordination", "analysis", "crm", "power bi"],
    tools: ["Excel", "Power BI", "CRM", "SAP", "Google Sheets"],
    softSkills: ["organization", "communication", "problem solving"],
    roleTemplates: [
      { title: "Business Analyst", keywords: ["analysis", "reporting", "excel", "stakeholder management"] },
      { title: "Operations Executive", keywords: ["operations", "coordination", "reporting", "excel"] },
      { title: "Process Analyst", keywords: ["process improvement", "analysis", "reporting", "operations"] },
      { title: "Sales Operations Associate", keywords: ["crm", "reporting", "operations", "excel"] },
      { title: "Project Coordinator", keywords: ["coordination", "planning", "communication", "reporting"] },
      { title: "MIS Executive", keywords: ["excel", "mis", "reporting", "analysis"] },
      { title: "Operations Analyst", keywords: ["operations", "analysis", "excel", "process improvement"] },
      { title: "Program Coordinator", keywords: ["coordination", "stakeholders", "reporting", "planning"] },
      { title: "Business Operations Associate", keywords: ["operations", "reporting", "crm", "coordination"] },
      { title: "Workflow Specialist", keywords: ["process improvement", "operations", "reporting", "analysis"] },
      { title: "Support Operations Analyst", keywords: ["operations", "support", "reporting", "coordination"] },
      { title: "Planning Associate", keywords: ["planning", "analysis", "reporting", "stakeholders"] }
    ]
  },
  {
    domain: "Customer Support",
    educationSignals: [],
    titleSignals: ["customer support", "customer service", "customer success", "helpdesk", "support executive"],
    toolSignals: ["zendesk", "freshdesk", "salesforce", "intercom", "crm"],
    skillSignals: ["ticket handling", "issue resolution", "sla", "customer communication", "retention"],
    canonicalSkills: ["customer support", "ticket handling", "issue resolution", "crm", "customer communication", "sla management", "retention", "service recovery"],
    tools: ["Zendesk", "Freshdesk", "Salesforce", "Intercom", "CRM"],
    softSkills: ["empathy", "active listening", "conflict resolution"],
    roleTemplates: [
      { title: "Customer Support Specialist", keywords: ["customer support", "ticket handling", "issue resolution", "sla"] },
      { title: "Customer Success Associate", keywords: ["customer communication", "retention", "crm", "onboarding"] },
      { title: "Helpdesk Executive", keywords: ["helpdesk", "ticket handling", "issue resolution", "documentation"] },
      { title: "Support Analyst", keywords: ["support", "analysis", "customer support", "tickets"] },
      { title: "Client Services Executive", keywords: ["client handling", "communication", "crm", "resolution"] },
      { title: "Technical Support Executive", keywords: ["support", "issue resolution", "documentation", "sla"] },
      { title: "Support Operations Associate", keywords: ["support", "operations", "tickets", "reporting"] },
      { title: "Onboarding Specialist", keywords: ["onboarding", "customer communication", "crm", "success"] },
      { title: "Escalation Specialist", keywords: ["escalation", "resolution", "support", "sla"] },
      { title: "Customer Experience Associate", keywords: ["customer experience", "communication", "retention", "support"] },
      { title: "Service Desk Analyst", keywords: ["service desk", "ticket handling", "support", "documentation"] },
      { title: "Account Support Associate", keywords: ["account support", "crm", "communication", "resolution"] }
    ]
  },
  {
    domain: "Healthcare",
    educationSignals: ["nursing", "b.sc nursing", "gnm", "anm", "mbbs", "medical", "healthcare"],
    titleSignals: ["nurse", "clinical coordinator", "patient care", "medical officer", "healthcare administrator"],
    toolSignals: ["ehr", "emr", "epic", "meditech"],
    skillSignals: ["patient care", "clinical documentation", "care coordination", "triage", "medical terminology"],
    canonicalSkills: ["patient care", "clinical documentation", "care coordination", "triage", "medical terminology", "compliance", "hospital operations"],
    tools: ["EHR", "EMR", "Epic", "Microsoft Office"],
    softSkills: ["empathy", "attention to detail", "communication"],
    roleTemplates: [
      { title: "Clinical Coordinator", keywords: ["clinical documentation", "care coordination", "patient care", "compliance"] },
      { title: "Patient Care Specialist", keywords: ["patient care", "communication", "triage", "documentation"] },
      { title: "Healthcare Administrator", keywords: ["healthcare operations", "documentation", "compliance", "coordination"] },
      { title: "Medical Records Executive", keywords: ["documentation", "medical terminology", "records", "compliance"] },
      { title: "Nursing Coordinator", keywords: ["nursing", "patient care", "coordination", "clinical"] },
      { title: "Hospital Operations Associate", keywords: ["hospital operations", "coordination", "reporting", "compliance"] },
      { title: "Care Navigator", keywords: ["patient care", "coordination", "communication", "support"] },
      { title: "Clinical Support Executive", keywords: ["clinical", "documentation", "patient care", "support"] },
      { title: "Medical Office Coordinator", keywords: ["medical", "documentation", "coordination", "office"] },
      { title: "Patient Experience Associate", keywords: ["patient", "communication", "support", "care"] },
      { title: "Healthcare Support Specialist", keywords: ["healthcare", "support", "documentation", "coordination"] },
      { title: "Medical Administration Associate", keywords: ["medical", "administration", "coordination", "records"] }
    ]
  },
  {
    domain: "General Professional",
    educationSignals: [],
    titleSignals: [],
    toolSignals: ["excel", "word", "powerpoint", "outlook"],
    skillSignals: ["communication", "teamwork", "coordination", "documentation", "organization"],
    canonicalSkills: ["communication", "teamwork", "coordination", "documentation", "organization", "excel"],
    tools: ["Microsoft Office", "Google Workspace"],
    softSkills: ["communication", "adaptability", "teamwork"],
    roleTemplates: [
      { title: "Operations Associate", keywords: ["coordination", "documentation", "organization", "reporting"] },
      { title: "Administrative Executive", keywords: ["documentation", "organization", "communication", "office"] },
      { title: "Process Associate", keywords: ["coordination", "process", "documentation", "teamwork"] },
      { title: "Support Associate", keywords: ["support", "communication", "coordination", "service"] },
      { title: "Office Coordinator", keywords: ["organization", "communication", "documentation", "office"] },
      { title: "Program Assistant", keywords: ["coordination", "documentation", "planning", "support"] },
      { title: "Client Support Associate", keywords: ["communication", "support", "coordination", "service"] },
      { title: "Executive Assistant", keywords: ["organization", "calendar", "communication", "documentation"] },
      { title: "Scheduling Coordinator", keywords: ["coordination", "scheduling", "communication", "organization"] },
      { title: "Back Office Executive", keywords: ["documentation", "coordination", "data entry", "organization"] },
      { title: "Service Coordinator", keywords: ["service", "communication", "coordination", "support"] },
      { title: "Documentation Specialist", keywords: ["documentation", "accuracy", "organization", "compliance"] }
    ]
  }
];

const GLOBAL_SOFT_SKILLS = [
  "communication",
  "teamwork",
  "leadership",
  "problem solving",
  "attention to detail",
  "adaptability",
  "stakeholder management",
  "customer communication",
  "documentation"
];

export function inferResumeDomain(text: string): DomainInference {
  const lower = text.toLowerCase();
  const scored = DOMAIN_PROFILES.map((profile) => {
    const high = scoreSignals(lower, profile.educationSignals, 12) + scoreSignals(lower, profile.titleSignals, 10);
    const medium = scoreSignals(lower, profile.toolSignals, 6);
    const low = scoreSignals(lower, profile.skillSignals, 3);
    const total = high + medium + low;
    return { profile, total };
  }).sort((a, b) => b.total - a.total);

  const best = scored[0] ?? { profile: DOMAIN_PROFILES[DOMAIN_PROFILES.length - 1], total: 0 };
  const second = scored[1]?.total ?? 0;
  const confidence = Math.max(40, Math.min(96, 55 + best.total - second));
  const skills = unique(best.profile.canonicalSkills.filter((skill) => lower.includes(skill.toLowerCase())));
  const tools = unique(best.profile.tools.filter((tool) => lower.includes(tool.toLowerCase())));
  const softSkills = unique(GLOBAL_SOFT_SKILLS.filter((skill) => lower.includes(skill.toLowerCase())));

  return {
    domain: best.total > 0 ? best.profile.domain : "General Professional",
    confidence,
    skills: skills.length ? skills : best.profile.canonicalSkills.slice(0, 6),
    tools: tools.length ? tools : best.profile.tools.slice(0, 3),
    softSkills: softSkills.length ? softSkills : best.profile.softSkills.slice(0, 3),
    roleTitles: best.profile.roleTemplates.map((role) => role.title)
  };
}

export function expandRoleSuggestions(domain: string, skills: string[], resumeText: string, seedRoles: string[] = []): SuggestedRole[] {
  const profile = DOMAIN_PROFILES.find((item) => item.domain.toLowerCase() === domain.toLowerCase()) ?? DOMAIN_PROFILES[DOMAIN_PROFILES.length - 1];
  const lower = resumeText.toLowerCase();
  const seedSet = new Set(seedRoles.map((role) => role.toLowerCase()));
  const normalizedSkills = unique(skills.map((skill) => skill.toLowerCase()));

  const ranked = profile.roleTemplates
    .map((role) => {
      const matched = role.keywords.filter((keyword) => lower.includes(keyword.toLowerCase()) || normalizedSkills.includes(keyword.toLowerCase()));
      const missing = role.keywords.filter((keyword) => !matched.includes(keyword));
      const score = Math.max(38, Math.min(97, 42 + matched.length * 14 + (seedSet.has(role.title.toLowerCase()) ? 8 : 0) - missing.length * 2));
      return {
        role: role.title,
        score,
        strengths: matched.length ? matched.slice(0, 3).map(toSentenceCase) : [`Relevant ${domain.toLowerCase()} background`],
        weaknesses: missing.slice(0, 3).map(toSentenceCase),
        improvements: missing.slice(0, 3).map((item) => `Add ${item} evidence in resume`),
        whyThisRole: matched.length
          ? `Strong overlap in ${matched.slice(0, 2).join(" and ")}.`
          : `Aligned with ${domain.toLowerCase()} experience.`
      } satisfies SuggestedRole;
    })
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 12);
}

export function extractJobSkills(text: string, fallback: string[] = []) {
  const lower = text.toLowerCase();
  const allKeywords = unique(
    DOMAIN_PROFILES.flatMap((profile) => [...profile.canonicalSkills, ...profile.roleTemplates.flatMap((role) => role.keywords)])
  );
  const matched = allKeywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
  return matched.length ? matched.slice(0, 8).map(toSentenceCase) : fallback.slice(0, 6).map(toSentenceCase);
}

export function relatedRoleTitles(domain: string, skills: string[]) {
  const profile = DOMAIN_PROFILES.find((item) => item.domain.toLowerCase() === domain.toLowerCase()) ?? DOMAIN_PROFILES[DOMAIN_PROFILES.length - 1];
  const skillSet = new Set(skills.map((skill) => skill.toLowerCase()));
  const sorted = profile.roleTemplates
    .map((role) => ({
      title: role.title,
      score: role.keywords.reduce((total, keyword) => total + (skillSet.has(keyword.toLowerCase()) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.title);

  return unique([...sorted, ...profile.roleTemplates.map((role) => role.title)]).slice(0, 12);
}

function scoreSignals(text: string, signals: string[], weight: number) {
  return signals.reduce((total, signal) => total + (text.includes(signal.toLowerCase()) ? weight : 0), 0);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function toSentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
