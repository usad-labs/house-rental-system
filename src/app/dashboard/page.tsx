import { Banknote, CalendarClock, Droplet, Zap } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { describeReminder } from "@/components/dash";
import { formatPeriod, formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { phoneHref } from "@/lib/text";
import type { Reminder } from "@/lib/reminders";
import { confirmClaim, rejectClaim } from "@/server/dashboard-actions";
import { getOverview, type ClaimRow } from "@/server/dashboard-data";

export default function OverviewPage() {
  return (
    <Suspense fallback={<p className="sub">Loading…</p>}>
      <Overview />
    </Suspense>
  );
}

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(new Date(`${iso}T00:00:00Z`));

function ReminderIcon({ r }: { r: Reminder }) {
  const size = 20;
  if (r.kind === "utility_due" || r.kind === "utility_overdue") return r.utilityKind === "water" ? <Droplet size={size} /> : <Zap size={size} />;
  if (r.kind === "lease_ending" || r.kind === "lease_ended") return <CalendarClock size={size} />;
  return <Banknote size={size} />;
}

type Tile = Awaited<ReturnType<typeof getOverview>>["tiles"][number];

/** Big-card wording for the first task. */
function primaryLabel(r: Reminder): string {
  if (r.kind === "rent_overdue" || r.kind === "rent_due") return "Record payment";
  if (r.kind === "utility_due" || r.kind === "utility_overdue") return "Mark bill paid";
  return "Open tenant";
}

async function Overview() {
  const { today, reminders, tiles, toCollect, collected, phoneByHouse, claims } = await getOverview();
  const monthName = formatPeriod(today.slice(0, 7)).split(" ")[0];
  const dueSoFar = collected + toCollect;
  const pct = dueSoFar === 0 ? 100 : Math.round((collected / dueSoFar) * 100);
  // Messenger answers come first; then every reminder goes under "See more".
  const first = claims.length ? undefined : reminders[0];
  const rest = claims.length ? reminders : reminders.slice(1);
  const firstDesc = first && describeReminder(first);
  const firstPhone = first && (first.paidBy !== "owner" ? phoneByHouse[first.houseId] : undefined);

  return (
    <div className="ov">
      <section className="ov-hero" aria-label="This month">
        <h1>{longDate(today)}</h1>
        <div className="ov-hero-row">
          <div className="ring" style={{ "--p": `${pct}%` } as React.CSSProperties} role="img" aria-label={`${pct}% of rent collected`}>
            <div>
              {pct}%<small>collected</small>
            </div>
          </div>
          <p className="ov-line">
            <b>{formatMoney(collected)}</b> of {formatMoney(dueSoFar)} rent collected in {monthName}
          </p>
        </div>
      </section>

      <div className="ov-grid">
        <div>
          {claims.map((c) => (
            <ClaimCard key={c.id} c={c} />
          ))}
          {claims.length > 0 ? null : first && firstDesc ? (
            <section className={`do-first do-first--${first.severity}`} aria-labelledby="do-first-title">
              <p className="do-first-kicker">Do this first</p>
              <h2 id="do-first-title" className="do-first-title">
                <span className="todo-icon">
                  <ReminderIcon r={first} />
                </span>
                {firstDesc.title}
              </h2>
              <p className="do-first-detail">{firstDesc.detail}</p>
              <div className="do-first-actions">
                <Link className="btn btn-navy" href={firstDesc.href}>
                  {primaryLabel(first)}
                </Link>
                {firstPhone && (
                  <a className="btn btn-outline" href={`sms:${phoneHref(firstPhone)}`}>
                    Text {first.tenantName.split(" ")[0]}
                  </a>
                )}
              </div>
            </section>
          ) : (
            <section className="do-first do-first--clear">
              <p className="do-first-kicker">All clear</p>
              <h2 className="do-first-title">Nothing is overdue or due soon.</h2>
            </section>
          )}

          {rest.length > 0 && (
            <details className="more">
              <summary>
                <span className="more-open">
                  See {rest.length} more {rest.length === 1 ? "thing" : "things"} to do
                </span>
                <span className="more-close">Hide the list</span>
              </summary>
              <ul className="todo-list">
                {rest.map((r) => {
                  const d = describeReminder(r);
                  return (
                    <li key={`${r.kind}-${r.chargeId ?? r.billId ?? r.houseId}`}>
                      <Link className={`todo todo--${r.severity}`} href={d.href}>
                        <span className="todo-icon">
                          <ReminderIcon r={r} />
                        </span>
                        <span className="todo-text">
                          <b>{d.title}</b>
                          <span>{r.houseName}</span>
                        </span>
                        <span className="todo-go">{d.action} →</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </div>

        <section aria-labelledby="compound-title">
          <h2 id="compound-title" className="sec-title">
            Houses
          </h2>
          <div className="compound">
            <div className="compound-lots">
              {tiles.map((h) => (
                <Lot key={h.id} h={h} />
              ))}
            </div>
            <div className="compound-gate">
              <span>Gate</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Lot({ h }: { h: Tile }) {
  return (
    <Link className={`lot lot--${h.status}`} href={`/dashboard/houses/${h.id}`}>
      <span className="lot-name">{h.name.replace(/ House$/, "")}</span>
      <LotLine h={h} />
    </Link>
  );
}

function LotLine({ h }: { h: Tile }) {
  if (h.charge) {
    const s = h.charge.status;
    if (s.state === "paid") return <span className="lot-line ok">{formatPeriod(h.charge.period).split(" ")[0]} paid ✓</span>;
    if (s.state === "overdue") return <span className="lot-line late">{formatMoney(s.balance)} overdue</span>;
    return <span className="lot-line soon">Due {formatShortDate(h.charge.dueDate)}</span>;
  }
  if (h.status === "under_repair") return <span className="lot-line">Under repair</span>;
  return <span className="lot-line">Vacant</span>;
}

/** A tenant tapped "Paid via GCash" or "Will pay cash" in Messenger: the owner confirms or not. */
function ClaimCard({ c }: { c: ClaimRow }) {
  const name = c.tenantName.split(" ")[0];
  return (
    <section className="do-first do-first--claim">
      <p className="do-first-kicker">Do this first · from Messenger</p>
      <h2 className="do-first-title">
        {c.method === "gcash" ? `${name} says: paid ${formatMoney(c.balance)} by GCash` : `${name} will pay ${formatMoney(c.balance)} in cash`}
      </h2>
      <p className="do-first-detail">
        {c.houseName} · {formatPeriod(c.period)} rent
        {c.proofUrl && (
          <>
            {" · "}
            <a href={c.proofUrl} target="_blank">
              See receipt
            </a>
          </>
        )}
        {c.method === "gcash" && !c.proofUrl && " · no receipt yet"}
      </p>
      <div className="do-first-actions">
        <form action={confirmClaim.bind(null, c.id)}>
          <button className="btn btn-navy" type="submit">
            {c.method === "gcash" ? "Yes, I got it" : "Got the cash"}
          </button>
        </form>
        <form action={rejectClaim.bind(null, c.id)}>
          <button className="btn btn-outline" type="submit">
            Not received
          </button>
        </form>
      </div>
    </section>
  );
}
