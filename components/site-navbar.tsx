"use client";

import Link from "next/link";

export function SiteNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link className="text-lg font-semibold tracking-tight text-slate-950" href="/">
          RoleMatch AI
        </Link>
        <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href="/">
            Home
          </Link>
          <Link className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href="/resume-vibe/upload">
            AI Job Matcher
          </Link>
          <Link className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href="/about">
            About
          </Link>
          <Link className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href="/contact">
            Contact
          </Link>
          <Link className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href="/help">
            Help
          </Link>
        </nav>
      </div>
    </header>
  );
}
