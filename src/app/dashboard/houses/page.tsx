import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { StatusChip } from "@/components/dash";
import { formatMoney } from "@/lib/money";
import { createHouse } from "@/server/dashboard-actions";
import { getHouseList } from "@/server/dashboard-data";

export const metadata = { title: "Houses" };

export default function HousesPage() {
  return (
    <>
      <h1>Houses</h1>
      <p className="sub">Tap a house to change its status, tenant, rent, bills, repairs, listing or photos.</p>
      <Suspense fallback={<p className="sub">Loading…</p>}>
        <HouseList />
      </Suspense>
    </>
  );
}

async function HouseList() {
  const list = await getHouseList();
  return (
    <>
      <div className="tiles">
        {list.map((h) => (
          <Link key={h.id} className="tile" href={`/dashboard/houses/${h.id}`}>
            {h.coverUrl ? <img src={h.coverUrl} alt="" /> : <span className="tile-noimg" />}
            <div>
              <b>{h.name}</b>
              <StatusChip status={h.status} />
              <span className="who">{h.tenantName ?? "No tenant"}</span>
              <span className="rent-line muted">
                {formatMoney(h.monthlyRent)}/month{h.isPublished ? "" : " · hidden from website"}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <details className="panel" style={{ marginTop: 18 }}>
        <summary>+ Add a house</summary>
        <ActionForm action={createHouse} submit="Add house" className="stack">
          <div className="pair">
            <label className="field">
              Name
              <input name="name" placeholder="e.g. Mahogany House" required />
            </label>
            <label className="field">
              Rent per month (₱)
              <input name="monthlyRent" type="number" inputMode="numeric" min={0} required />
            </label>
          </div>
          <p className="hint">It starts hidden from the website. Add details and photos, then tick &ldquo;Show on website&rdquo;.</p>
        </ActionForm>
      </details>
    </>
  );
}
