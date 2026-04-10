import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Target } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.12),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.92),_rgba(240,253,250,0.9))] px-6 py-12 shadow-[0_35px_120px_rgba(15,23,42,0.12)] sm:px-8 lg:px-12">
        <div className="max-w-4xl">
          <div className="inline-flex items-center rounded-full border border-teal-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            AI Resume To Job Matcher
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-6xl">
            Upload a resume and get clearer job matches.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            RoleMatch AI lives inside your app as a focused hiring product. Candidates upload once, get parsed intelligently,
            see dynamic job recommendations, identify gaps, and move faster toward interviews.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3.5 font-semibold text-white shadow-[0_10px_24px_rgba(13,148,136,0.25)] transition hover:-translate-y-0.5 hover:bg-teal-500" href="/resume-vibe/upload">
              Open RoleMatch AI
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50" href="/resume-vibe/upload">
              Upload Resume
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { icon: Sparkles, title: "AI parsing", copy: "Candidate details, domain, skills, and resume signals extracted into structured results." },
          { icon: Target, title: "Dynamic job recommendations", copy: "India-first job search using JSearch, Mantiks, and Adzuna-backed providers." },
          { icon: ShieldCheck, title: "Clean product flow", copy: "One upload page, one results page, and persistent match data in Supabase." }
        ].map((item) => (
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl" key={item.title}>
            <item.icon className="h-5 w-5 text-teal-600" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
