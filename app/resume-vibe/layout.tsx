import Link from "next/link";

export default function ResumeVibeLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-white/70 bg-white/75 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">RoleMatch AI</p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">AI Resume to Job Matcher</h1>
          </div>
          <Link className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700" href="/resume-vibe/upload">
            Upload Resume
          </Link>
        </div>
        {children}
      </section>
    </main>
  );
}
