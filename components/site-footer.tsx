import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/70 bg-white/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>RoleMatch AI helps candidates turn one resume into smarter job recommendations.</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link className="transition hover:text-slate-800" href="/about">
            About
          </Link>
          <Link className="transition hover:text-slate-800" href="/contact">
            Contact
          </Link>
          <Link className="transition hover:text-slate-800" href="/help">
            Help
          </Link>
        </div>
      </div>
    </footer>
  );
}
