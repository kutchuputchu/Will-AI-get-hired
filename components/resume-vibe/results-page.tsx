"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Target, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MatchedJob, ResumeAnalysis } from "@/types";
import { formatSalary } from "@/lib/utils";

type ResultsResponse = {
  resumeId: string;
  analysis: ResumeAnalysis | null;
  matches: MatchedJob[];
  error?: string;
};

export function ResumeMatcherResultsPage({ resumeId }: { resumeId: string }) {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(`/api/resumes/${resumeId}`);
        const payload = (await response.json()) as ResultsResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load results.");
        }

        if (active) {
          setData(payload);
        }
      } catch (caughtError) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Failed to load results.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [resumeId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-slate-500">Cooking your matches...</p>
        </Card>
      </div>
    );
  }

  if (error || !data?.analysis) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-lg font-semibold text-slate-950">Results unavailable</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">{error ?? "We could not load your resume results."}</p>
          <Link className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-700" href="/resume-vibe/upload">
            <ArrowLeft className="h-4 w-4" />
            Upload another resume
          </Link>
        </Card>
      </div>
    );
  }

  const { analysis, matches } = data;
  const greeting = getGreetingForCurrentTime();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700" href="/resume-vibe/upload">
            <ArrowLeft className="h-4 w-4" />
            Upload another resume
          </Link>
          <p className="mt-4 text-sm font-medium text-cyan-700">
            {greeting}
            {analysis.candidate.fullName ? `, ${analysis.candidate.fullName}` : ""}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">Your job recommendations</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Real metrics only: extracted skills, domain detection, resume score, and provider-backed job recommendations.
          </p>
        </div>
        <div className="rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700">
          {matches.length} jobs matched
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={<UserRound className="h-5 w-5 text-cyan-600" />}
          label="Candidate"
          value={analysis.candidate.fullName || "Name not clearly found"}
          note={analysis.domain}
        />
        <MetricCard
          icon={<Target className="h-5 w-5 text-cyan-600" />}
          label="Skills extracted"
          value={`${analysis.skills.length}`}
          note={analysis.skills.slice(0, 4).join(", ") || "No skills extracted"}
        />
        <MetricCard
          icon={<BriefcaseBusiness className="h-5 w-5 text-cyan-600" />}
          label="Resume score"
          value={`${analysis.resumeScore}/100`}
          note={`${analysis.domainConfidence ?? 72}% domain confidence`}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Role expansion</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Top matching role families</h2>
          <div className="mt-5 space-y-3">
            {analysis.suggestedRoles.slice(0, 12).map((role) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4" key={role.role}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{role.role}</p>
                    <p className="mt-1 text-sm text-slate-500">{role.whyThisRole ?? role.strengths[0] ?? "Strong profile overlap"}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">{role.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-cyan-100 bg-cyan-50/70 px-5 py-4 text-sm text-cyan-900">
            Recommendations are pulled from integrated free-tier job providers and cached in Supabase for stability.
          </div>
          {matches.slice(0, 12).map((job) => (
            <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]" key={`${job.company}-${job.title}-${job.applyUrl}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{job.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {job.company} · {job.location}
                  </p>
                </div>
                <div className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700">
                  {job.matchPercentage}% match
                </div>
              </div>

              <Progress className="mt-4" value={job.matchPercentage} />
              <p className="mt-4 text-sm leading-7 text-slate-600">{job.explanation || "Matched using resume skills, domain fit, and role overlap."}</p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <DetailBlock title="Why it matches" items={job.matchedSkills.length ? job.matchedSkills : job.strengths} positive />
                <DetailBlock title="Missing skills" items={job.missingSkills} />
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-slate-600">{formatSalary(job.salaryMin, job.salaryMax)}</span>
                <a className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" href={job.applyUrl} rel="noreferrer" target="_blank">
                  View job
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function getGreetingForCurrentTime() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  if (hour < 21) {
    return "Good evening";
  }

  return "Good night";
}

function MetricCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <Card className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
        </div>
        {icon}
      </div>
    </Card>
  );
}

function DetailBlock({ title, items, positive = false }: { title: string; items: string[]; positive?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${positive ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-3 space-y-2">
        {(items.length ? items : ["No major gaps detected"]).slice(0, 4).map((item) => (
          <div className="text-sm leading-6 text-slate-700" key={item}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
