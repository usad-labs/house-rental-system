import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/gallery";
import { InquiryForm } from "@/components/inquiry-form";
import { BackNav, CheckIcon, Footer, StatusBadge, utilitiesLabel } from "@/components/site";
import { messengerUrl, siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/money";
import { plural } from "@/lib/text";
import { getPublicHouse, getPublicHouses } from "@/server/public-data";

export async function generateStaticParams() {
  return (await getPublicHouses()).map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: PageProps<"/houses/[slug]">): Promise<Metadata> {
  const house = await getPublicHouse((await params).slug);
  return house ? { title: `${house.name}, ${formatMoney(house.monthlyRent)} a month` } : {};
}

export default function HousePage({ params }: PageProps<"/houses/[slug]">) {
  // The nav renders instantly; the house (which depends on the URL) streams in behind Suspense.
  return (
    <>
      <BackNav />
      <Suspense fallback={<main className="wrap house-layout" aria-busy="true"><div className="gallery" /></main>}>
        <House slug={params.then((p) => p.slug)} />
      </Suspense>
      <Footer />
    </>
  );
}

async function House({ slug }: { slug: Promise<string> }) {
  const house = await getPublicHouse(await slug);
  if (!house) notFound();
  const occupied = house.status === "occupied";

  return (
    <>
      <main className="wrap house-layout">
        <div>
          <Gallery photos={house.photos}>
            <StatusBadge status={house.status} />
          </Gallery>
          <div className="detail">
            <h1>{house.name}</h1>
            <p className="loc">{house.type}</p>
            <div className="price-big">
              {formatMoney(house.monthlyRent)} <small>a month</small>
            </div>
            {house.terms && <p className="terms">{house.terms}</p>}
            <div className="fact-grid">
              <div>
                <b>{house.bedrooms}</b>
                <span>{plural(house.bedrooms, "bedroom").replace(/^\d+ /, "")}</span>
              </div>
              <div>
                <b>{house.bathrooms}</b>
                <span>{plural(house.bathrooms, "bathroom").replace(/^\d+ /, "")}</span>
              </div>
              {house.floorAreaSqm && (
                <div>
                  <b>{house.floorAreaSqm} m²</b>
                  <span>floor area</span>
                </div>
              )}
              <div>
                <b>{utilitiesLabel[house.utilities].split(" ")[0]}</b>
                <span>{house.utilities === "own" ? "water + electric meter" : "water + electricity"}</span>
              </div>
            </div>
            {house.features.length > 0 && (
              <>
                <h2 className="h2">What you get</h2>
                <ul className="checks">
                  {house.features.map((f) => (
                    <li key={f}>
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {house.description && <p className="prose">{house.description}</p>}
            {house.mapUrl && (
              <p className="prose">
                <a href={house.mapUrl} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps
                </a>
              </p>
            )}
          </div>
        </div>
        <aside className="house-aside">
          <h2 id="book" className="h2">
            {occupied ? "Occupied right now" : "Book a viewing"}
          </h2>
          {occupied && <p className="hint" style={{ marginBottom: 10 }}>Leave your number and we&apos;ll tell you when it frees up.</p>}
          <InquiryForm slug={house.slug} occupied={occupied} />
        </aside>
      </main>
      <div className="sticky-bar">
        <a className="btn btn-outline btn-block" href={messengerUrl()} target="_blank" rel="noopener noreferrer">
          Message
        </a>
        <a className="stamp-btn" href="#book">
          <span className="stamp">
            <span className="stamp-in">
              <small>{siteConfig.logoText}</small>
              {occupied ? "Get notified" : "Book a viewing"}
            </span>
          </span>
        </a>
      </div>
    </>
  );
}
