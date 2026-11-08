import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Owner login", robots: { index: false } };

/** Owner login, styled as the compound's own signboard (same photo, plaque and stamp as the website). */
export default function LoginPage() {
  return (
    <main className="gate" style={{ backgroundImage: `url("${siteConfig.hero.image}")` }}>
      <div className="gate-sign">
        <span className="gate-tag">Owners only</span>
        <div className="gate-brand">
          <span className="plaque gate-plaque">{siteConfig.logoText}</span>
          <span>{siteConfig.businessName.replace(siteConfig.logoText, "").trim()}</span>
        </div>
        <Suspense fallback={<div className="gate-form" aria-busy="true" style={{ minHeight: 236 }} />}>
          <SkipIfLoggedIn />
          <LoginForm />
        </Suspense>
      </div>
      <Link className="gate-back" href="/">
        ← Back to the website
      </Link>
    </main>
  );
}

/** Already logged in? Go straight to the dashboard. */
async function SkipIfLoggedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
  return null;
}
