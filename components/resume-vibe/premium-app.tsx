"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, ChefHat, FileUp, Globe, LayoutDashboard, Sparkles, UserRound, Wrench } from "lucide-react";
import { sampleInterviewQuestions, sampleJobs, sampleSkillGaps, sampleTrackerItems } from "@/data/sample-jobs";
import { useAppStore } from "@/store/app-store";
import { JobListing, MatchedJob, ResumeAnalysis, ResumeUploadResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatSalary } from "@/lib/utils";

type View = "overview" | "upload" | "dashboard" | "portfolio";

const menuItems = [
  { href: "/resume-vibe", label: "Overview", icon: Sparkles, view: "overview" },
  { href: "/resume-vibe/upload", label: "Upload", icon: FileUp, view: "upload" },
  { href: "/resume-vibe/dashboard", label: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
  { href: "/resume-vibe/portfolio", label: "Portfolio", icon: Globe, view: "portfolio" }
] as const;

const toolItems = ["Skills gap analyzer", "Resume enhancer", "Interview prep", "Application tracker"];

export function ResumeVibePremiumApp({ initialView = "overview" }: { initialView?: View }) {
  const [file, setFile] = useState<File | null>(null);
  const [quotaWarning, setQuotaWarning] = useState(false);
  const {
    analysis,
    matches,
    portfolio,
    tracker,
    skillGaps,
    upload,
    loading,
    error,
    setAnalysis,
    setMatches,
    setPortfolio,
    setTracker,
    setSkillGaps,
    setUpload,
    setLoading,
    setError
  } = useAppStore();

  const topJobs = useMemo(() => (matches.length ? matches : sampleJobs.slice(0, 4)).slice(0, 4), [matches]);
  const topGap = (skillGaps.length ? skillGaps : sampleSkillGaps)[0];
  const topQuestion = (matches[0]?.interviewQuestions ?? sampleInterviewQuestions)[0];
  const trackerPreview = (tracker.length ? tracker : sampleTrackerItems).slice(0, 2);

  async function handleAnalyze() {
    if (!file) {
      setError("Please choose a PDF resume before continuing.");
      return;
    }

    setLoading(true);
    setError(undefined);
    setQuotaWarning(false);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const uploadRes = await fetch("/api/resumes/upload", { method: "POST", body: formData });
      const uploadData = (await uploadRes.json()) as ResumeUploadResponse | { error: string };
      if (!uploadRes.ok || "error" in uploadData) {
        throw new Error("error" in uploadData ? uploadData.error : "Upload failed.");
      }
      setUpload(uploadData);

      const analysisRes = await fetch("/api/resumes/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resumeId: uploadData.resumeId, text: uploadData.text })
      });
      const analysisData = (await analysisRes.json()) as ResumeAnalysis | { error: string };
      if (!analysisRes.ok || "error" in analysisData) {
        throw new Error("error" in analysisData ? analysisData.error : "Analysis failed.");
      }
      setAnalysis(analysisData);

      const jobsRes = await fetch(
        `/api/jobs?skills=${encodeURIComponent(analysisData.skills.join(","))}&domain=${encodeURIComponent(
          analysisData.domain
        )}&roles=${encodeURIComponent(analysisData.suggestedRoles.map((role) => role.role).join(","))}&location=${encodeURIComponent(
          "Indore"
        )}&remote=true`
      );
      const jobsPayload = (await jobsRes.json()) as { jobs?: JobListing[]; error?: string; quotaWarning?: boolean };
      if (!jobsRes.ok) {
        throw new Error(jobsPayload.error ?? "Job fetch failed.");
      }
      setQuotaWarning(Boolean(jobsPayload.quotaWarning));

      const matchRes = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resumeId: uploadData.resumeId,
          resumeText: uploadData.text,
          resumeSkills: analysisData.skills,
          suggestedRoles: analysisData.suggestedRoles.map((role) => role.role),
          domain: analysisData.domain,
          jobs: jobsPayload.jobs ?? []
        })
      });
      const matchData = (await matchRes.json()) as MatchedJob[] | { error: string };
      if (!matchRes.ok || !Array.isArray(matchData)) {
        throw new Error(Array.isArray(matchData) ? "Matching failed." : matchData.error);
      }

      setMatches(matchData);
      setSkillGaps(sampleSkillGaps);
      setTracker(sampleTrackerItems);
      setPortfolio({
        slug: analysisData.candidate.fullName || "candidate",
        heroTitle: analysisData.candidate.fullName || "Candidate",
        heroSubtitle: analysisData.candidate.headline || analysisData.summary,
        blocks: [
          {
            title: "Best-fit roles",
            subtitle: analysisData.suggestedRoles.slice(0, 2).map((role) => role.role).join(" · "),
            bullets: analysisData.skills.slice(0, 4)
          },
          {
            title: "Live proof",
            subtitle:
              analysisData.externalLinks?.github[0] ??
              analysisData.externalLinks?.liveProjects[0] ??
              "Add project links",
            bullets: analysisData.missingSkills.slice(0, 3)
          }
        ]
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unexpected error while analyzing the resume.");
      setMatches([]);
      setSkillGaps([]);
      setPortfolio(undefined);
      setTracker([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 px-3 py-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="resumevibe-sidebar lg:sticky lg:top-6 lg:h-fit">
        <div className="resumevibe-sidebar-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">ResumeVibe</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">Simple job matching</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Upload once, review results, and open extra tools only when you need them.</p>
        </div>

        <div className="space-y-2">
          {menuItems.map((item) => (
            <Link
              className={initialView === item.view ? "resumevibe-sidebar-link-active" : "resumevibe-sidebar-link"}
              href={item.href}
              key={item.href}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="resumevibe-sidebar-panel">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Wrench className="h-4 w-4 text-cyan-400" />
            Extra tools
          </div>
          <div className="mt-4 space-y-2">
            {toolItems.map((item) => (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        <Card className="resumevibe-panel">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="resumevibe-section-kicker">Get hired</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                Upload your resume and get matching jobs in one clean dashboard.
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                The main screen now stays simple: upload, analyze, and review the best matches. The rest lives in the left menu.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="resumevibe-inline-pill">{analysis ? `${analysis.skills.length} skills found` : "PDF only"}</div>
              <div className="resumevibe-inline-pill">{matches.length ? `${matches.length} jobs matched` : "India-first jobs"}</div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="resumevibe-panel">
            <p className="resumevibe-section-kicker">Upload resume</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Start here</h2>
            <label className="resumevibe-upload-zone mt-6">
              <div className="resumevibe-upload-icon">
                <FileUp className="h-8 w-8" />
              </div>
              <p className="mt-5 text-lg font-semibold text-slate-950">{file ? file.name : "Tap to choose a PDF resume"}</p>
              <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">
                We will detect the candidate, extract skills, and match real jobs.
              </p>
              <input className="sr-only" accept=".pdf,application/pdf" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>

            <div className="mt-5 space-y-3">
              <div className="resumevibe-step-row">
                <div className="resumevibe-step-dot">1</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{file ? "Resume selected" : "Choose your resume"}</p>
                  <p className="mt-1 text-sm text-slate-500">{upload ? upload.fileName : "PDF up to 10 MB"}</p>
                </div>
              </div>
              <div className="resumevibe-step-row">
                <div className="resumevibe-step-dot">2</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">Analyze and match</p>
                  <p className="mt-1 text-sm text-slate-500">{loading ? "Cooking..." : "Ready when you are"}</p>
                </div>
              </div>
            </div>

            <Button className="mt-6 w-full" disabled={loading} onClick={handleAnalyze}>
              {loading ? "Cooking..." : "Analyze Resume"}
            </Button>
            {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}
            {quotaWarning ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Free-tier provider quota is close to the limit. Cached jobs are being used.
              </div>
            ) : null}
          </Card>

          <Card className="resumevibe-panel">
            <p className="resumevibe-section-kicker">Overview</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">What you’ll get</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <SimpleStat
                label="Resume score"
                value={analysis ? `${analysis.resumeScore}` : "--"}
                hint={analysis ? analysis.experienceLevel : "After upload"}
              />
              <SimpleStat
                label="Detected domain"
                value={analysis?.domain ?? "--"}
                hint={analysis ? `${analysis.domainConfidence ?? 72}% confidence` : "Weighted detection"}
              />
              <SimpleStat
                label="Best match"
                value={topJobs[0] ? `${"matchPercentage" in topJobs[0] ? Number(topJobs[0].matchPercentage) : 88}%` : "--"}
                hint={topJobs[0]?.title ?? "Top job appears here"}
              />
            </div>
          </Card>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="resumevibe-panel text-center">
                <div className="flex flex-col items-center justify-center px-4 py-14">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.06, 1] }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.8 }}
                    className="resumevibe-cooking-icon"
                  >
                    <ChefHat className="h-7 w-7" />
                  </motion.div>
                  <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Cooking...</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                    We are reading the resume and preparing the clean dashboard.
                  </p>
                </div>
              </Card>
            </motion.div>
          ) : analysis ? (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <InfoCard
                  icon={<UserRound className="h-5 w-5 text-cyan-500" />}
                  title={analysis.candidate.fullName || "Name not clearly found"}
                  label="Candidate"
                  description={analysis.candidate.headline || analysis.summary}
                />
                <ScoreCard score={analysis.resumeScore} experienceLevel={analysis.experienceLevel} />
                <DomainCard domain={analysis.domain} confidence={analysis.domainConfidence ?? 72} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
                <Card className="resumevibe-panel">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="resumevibe-section-kicker">Matched jobs</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Best jobs for this resume</h2>
                    </div>
                    <BriefcaseBusiness className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div className="mt-6 grid gap-4">
                    {topJobs.map((job) => (
                      <div className="resumevibe-job-card" key={job.adzunaId}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-lg font-semibold text-slate-950">{job.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {job.company} · {job.location}
                            </p>
                            <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{job.description}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {job.skills.slice(0, 4).map((skill) => (
                                <span className="resumevibe-skill-pill" key={skill}>
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-3">
                            <div className="resumevibe-match-ring">
                              <span className="text-sm font-semibold text-slate-950">{"matchPercentage" in job ? Number(job.matchPercentage) : 88}%</span>
                            </div>
                            <span className="resumevibe-inline-pill">{formatSalary(job.salaryMin, job.salaryMax)}</span>
                          </div>
                        </div>
                        {"explanation" in job && typeof job.explanation === "string" && job.explanation ? (<p className="mt-4 text-sm text-slate-600">Why you match: {job.explanation}</p>) : null}
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="grid gap-6">
                  <Card className="resumevibe-panel">
                    <p className="resumevibe-section-kicker">Suggested roles</p>
                    <div className="mt-5 space-y-3">
                      {analysis.suggestedRoles.slice(0, 3).map((role) => (
                        <div className="resumevibe-role-row" key={role.role}>
                          <div>
                            <p className="font-semibold text-slate-950">{role.role}</p>
                            <p className="mt-1 text-sm text-slate-500">{role.strengths[0] ?? "Relevant profile fit"}</p>
                          </div>
                          <span className="resumevibe-inline-pill">{role.score}%</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="resumevibe-panel">
                    <p className="resumevibe-section-kicker">Quick insights</p>
                    <div className="mt-5 space-y-4">
                      <QuickInsight title="Top skill gap" value={topGap?.skill ?? "No major gap found"} meta={topGap ? `${topGap.demandPercentage}% demand` : "Looks strong"} />
                      <QuickInsight title="Interview prep" value={topQuestion?.question ?? "Questions appear here after matching"} meta={topQuestion ? "Prepared from your role match" : "Not ready yet"} />
                      <QuickInsight title="Tracker" value={trackerPreview[0] ? `${trackerPreview[0].role} at ${trackerPreview[0].company}` : "No applications yet"} meta={trackerPreview[0]?.status ?? "Track from the left menu tools"} />
                      <QuickInsight title="Portfolio" value={portfolio?.heroTitle ?? "Portfolio preview ready"} meta={portfolio?.heroSubtitle ?? "Auto-built from resume details"} />
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="resumevibe-panel">
                <p className="resumevibe-section-kicker">Ready</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">The main dashboard will appear here after upload</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  You’ll see only the important parts first: candidate summary, score, domain, and best-matching jobs.
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SimpleStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  title,
  description
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <Card className="resumevibe-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="resumevibe-section-kicker">{label}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        </div>
        {icon}
      </div>
    </Card>
  );
}

function ScoreCard({ score, experienceLevel }: { score: number; experienceLevel: string }) {
  return (
    <Card className="resumevibe-panel">
      <p className="resumevibe-section-kicker">Resume score</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <h3 className="text-5xl font-semibold tracking-[-0.05em] text-slate-950">{score}</h3>
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">{experienceLevel}</span>
      </div>
      <Progress className="mt-5" value={score} />
    </Card>
  );
}

function DomainCard({ domain, confidence }: { domain: string; confidence: number }) {
  return (
    <Card className="resumevibe-panel">
      <p className="resumevibe-section-kicker">Detected domain</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <h3 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">{domain}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{confidence}%</span>
      </div>
    </Card>
  );
}

function QuickInsight({ title, value, meta }: { title: string; value: string; meta: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.15em] text-slate-400">{meta}</p>
    </div>
  );
}

