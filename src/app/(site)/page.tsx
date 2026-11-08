import Link from "next/link";
import { Footer, HomeNav, StatusBadge, utilitiesLabel } from "@/components/site";
import { siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/money";
import type { HouseStatus } from "@/lib/status";
import { getPublicHouses } from "@/server/public-data";

// Available first, then "available soon", then occupied.
const statusOrder: Record<HouseStatus, number> = { vacant: 0, under_repair: 1, occupied: 2 };

export default async function Home() {
  const houses = (await getPublicHouses()).toSorted((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  const lowestRent = houses.length ? Math.min(...houses.map((h) => h.monthlyRent)) : null;
  const { location } = siteConfig;

  return (
    <>
      <HomeNav />
      <main>
        <section className="hero" style={{ backgroundImage: `url("${siteConfig.hero.image}")` }}>
          <div className="wrap">
            <h1>{siteConfig.hero.title}</h1>
            <p>
              {lowestRent !== null && `From ${formatMoney(lowestRent)} a month. `}Walking distance to {location.nearLandmarkShort}.
            </p>
            <a className="btn btn-cream" href="#houses">
              See the houses
            </a>
          </div>
        </section>

        <section className="section" id="houses">
          <div className="wrap">
            <h2 className="section-title">Available and coming soon</h2>
            {houses.length === 0 ? (
              <p>No houses listed right now. Message us to ask about the next opening.</p>
            ) : (
              <div className="list">
                {houses.map((h) => (
                  <Link key={h.slug} className={`card${h.status === "occupied" ? " is-muted" : ""}`} href={`/houses/${h.slug}`}>
                    <div className="card-photo">
                      {h.coverUrl && <img src={h.coverUrl} alt="" loading="lazy" />}
                      <StatusBadge status={h.status} />
                    </div>
                    <div className="card-body">
                      <h3>{h.name}</h3>
                      <div className="card-foot">
                        <p className="price">
                          {formatMoney(h.monthlyRent)} <small>/ month</small>
                        </p>
                        <span className="util">{utilitiesLabel[h.utilities]}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="section nearby" id="location">
          <div className="wrap">
            <h2 className="section-title">One jeep ride away</h2>
            <ul className="boards">
              <li className="board board--home">
                <b>{location.nearLandmarkShort}</b>
                <span>Walking distance</span>
              </li>
              {location.oneRideTo.map((p) => (
                <li key={p.name} className="board" title={p.note}>
                  <b>{p.name}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" id="questions">
          <div className="wrap faq">
            <h2 className="section-title">Questions</h2>
            {siteConfig.faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
