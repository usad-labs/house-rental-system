/** Shared pieces of the public website (mockup v22). */
import Link from "next/link";
import { messengerUrl, siteConfig } from "@/config/site";
import { publicStatus, type HouseStatus } from "@/lib/status";
import { phoneHref } from "@/lib/text";

const phone = phoneHref(siteConfig.contact.phone);

export function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" />
    </svg>
  );
}

export function MessengerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.4 2 2 6.1 2 11.4c0 2.8 1.2 5.2 3.2 6.9V22l3-1.7c1.2.3 2.4.5 3.8.5 5.6 0 10-4.1 10-9.4S17.6 2 12 2zm1 12.6-2.6-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.3 5.7z" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#EDEDCE" />
      <path d="M6 10.5l2.6 2.6L14.2 7" fill="none" stroke="#296374" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Plaque({ small }: { small?: boolean }) {
  return <span className={`plaque plaque--light${small ? " plaque--sm" : ""}`}>{siteConfig.logoText}</span>;
}

const brandWord = siteConfig.businessName.replace(siteConfig.logoText, "").trim();

/** Home page header: brand, Call, Message, menu. */
export function HomeNav() {
  return (
    <>
      <header className="nav">
        <div className="wrap">
          <Link className="nav-brand" href="/">
            <Plaque />
            <span>{brandWord}</span>
          </Link>
          <nav className="nav-links" aria-label="Contact">
            <a className="nav-icon" href={`tel:${phone}`} aria-label={`Call ${siteConfig.contact.phone}`}>
              <PhoneIcon />
            </a>
            <a className="nav-msg" href={messengerUrl()} target="_blank" rel="noopener noreferrer">
              <MessengerIcon />
              Message
            </a>
            <details className="nav-menu">
              <summary aria-label="Menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </summary>
              <div className="menu-panel">
                <a href="#houses">Houses</a>
                <a href="#location">Location</a>
                <a href="#questions">Questions</a>
                <a href={`sms:${phone}`}>Text us</a>
                <Link href="/login" className="muted-link">
                  Owner login
                </Link>
              </div>
            </details>
          </nav>
        </div>
      </header>
      <div className="locstrip">
        <div className="wrap">
          <PinIcon />
          {siteConfig.location.city}, near {siteConfig.location.nearLandmarkShort}
        </div>
      </div>
    </>
  );
}

/** House page header: back link + brand. */
export function BackNav() {
  return (
    <header className="nav">
      <div className="wrap">
        <Link className="nav-back" href="/#houses">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All houses
        </Link>
        <Link className="nav-brand" href="/">
          <Plaque small />
          <span>{brandWord}</span>
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <span className="brand">
          <Plaque />
          {brandWord}
        </span>
        {siteConfig.aboutLine}
        <br />
        <Link href="/login">Owner login</Link>
      </div>
    </footer>
  );
}

export function StatusBadge({ status }: { status: HouseStatus }) {
  const s = publicStatus(status);
  return <span className={`badge badge--${s.tone}`}>{s.label}</span>;
}

export const utilitiesLabel = { own: "Own meter", shared: "Shared utilities" } as const;
