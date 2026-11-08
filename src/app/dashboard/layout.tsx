import type { Metadata } from "next";
import { Settings } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DashTabs, TabList } from "@/components/dash-tabs";
import { siteConfig } from "@/config/site";
import { logout } from "@/server/auth-actions";
import { countNewInquiries } from "@/server/dashboard-data";

export const metadata: Metadata = { title: { default: "Owner dashboard", template: `%s | ${siteConfig.businessName} dashboard` }, robots: { index: false } };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <>
      <header className="dash-top">
        <div className="wrap">
          <Link className="brand" href="/dashboard">
            <span className="plaque plaque--light">{siteConfig.logoText}</span>
            Owner dashboard
          </Link>
          <div className="dash-top-links">
            <Link href="/" target="_blank">
              View website
            </Link>
            <Link className="settings-link" href="/dashboard/settings" aria-label="Settings">
              <Settings size={22} aria-hidden="true" />
              <span>Settings</span>
            </Link>
            <form action={logout}>
              <button className="btn btn-sm btn-ghost-light" type="submit">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="wrap dash-shell">
        <Suspense fallback={<TabList path="" />}>
          <DashTabs
            badge={
              <Suspense fallback={null}>
                <InboxBadge />
              </Suspense>
            }
          />
        </Suspense>
        <main className="dash-main">{children}</main>
      </div>
    </>
  );
}

async function InboxBadge() {
  const n = await countNewInquiries();
  return n > 0 ? <span className="badge2" aria-label={`${n} new`}>{n}</span> : null;
}
