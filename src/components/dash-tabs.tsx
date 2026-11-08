"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const icon = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    {d}
  </svg>
);

const TABS = [
  { href: "/dashboard", label: "Overview", icon: icon(<path d="M3 11 12 4l9 7v9H3z" />) },
  {
    href: "/dashboard/houses",
    label: "Houses",
    icon: icon(
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>,
    ),
  },
  {
    href: "/dashboard/money",
    label: "Rent & bills",
    icon: icon(
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
      </>,
    ),
  },
  { href: "/dashboard/repairs", label: "Repairs", icon: icon(<path d="M14 7l3-3 3 3-3 3M17 4 9 12M4 20l5-5" />) },
  { href: "/dashboard/inbox", label: "Inbox", icon: icon(<path d="M4 5h16v11H8l-4 4z" />) },
];

/** Bottom tab bar on phones, side menu on desktop. `badge` is the new-inquiry count (streamed in). */
export function DashTabs({ badge }: { badge?: ReactNode }) {
  return <TabList path={usePathname()} badge={badge} />;
}

/** Same tabs with no active one: the instant placeholder while the URL is read. */
export function TabList({ path, badge }: { path: string; badge?: ReactNode }) {
  return (
    <nav className="tabbar" aria-label="Dashboard">
      {TABS.map((t) => {
        const active = t.href === "/dashboard" ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className="tab" aria-current={active ? "page" : undefined}>
            {t.href === "/dashboard/inbox" && badge}
            {t.icon}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
