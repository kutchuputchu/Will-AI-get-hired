import "./globals.css";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

export const metadata: Metadata = {
  metadataBase: new URL("https://rolematchai.app"),
  title: "RoleMatch AI",
  description: "Upload your resume and get clearer job matches, missing skills, and domain-aware recommendations.",
  openGraph: {
    title: "RoleMatch AI",
    description: "AI-powered resume parsing and job matching for cleaner, domain-aware recommendations.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteNavbar />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
