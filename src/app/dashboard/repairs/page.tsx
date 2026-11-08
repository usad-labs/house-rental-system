import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { REPAIR_STATUSES, repairStatusLabel } from "@/lib/options";
import { addRepair, updateRepair } from "@/server/dashboard-actions";
import { getRepairs } from "@/server/dashboard-data";

export const metadata = { title: "Repairs" };

export default function RepairsPage() {
  return (
    <>
      <h1>Repairs</h1>
      <Suspense fallback={<p className="sub">Loading…</p>}>
        <Repairs />
      </Suspense>
    </>
  );
}

async function Repairs() {
  const { rows, houses, today } = await getRepairs();
  const open = rows.filter((r) => r.repair.status !== "done");
  const done = rows.filter((r) => r.repair.status === "done");

  return (
    <>
      <p className="sub">{open.length === 0 ? "No open repairs." : `${open.length} open`}</p>

      <details className="panel">
        <summary>+ Log a repair</summary>
        <ActionForm action={addRepair} submit="Add repair" className="stack" reset>
          <div className="pair">
            <label className="field">
              House
              <select name="houseId" required defaultValue="">
                <option value="" disabled>
                  Pick a house
                </option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Reported on
              <input name="reportedOn" type="date" defaultValue={today} required />
            </label>
          </div>
          <label className="field">
            What needs fixing
            <input name="title" placeholder="e.g. Leaking kitchen faucet" required />
          </label>
          <label className="field">
            Details <span className="hint">(optional)</span>
            <textarea name="details" rows={2} />
          </label>
          <label className="field">
            Who will fix it <span className="hint">(optional)</span>
            <input name="handledBy" />
          </label>
        </ActionForm>
      </details>

      <h2>Open</h2>
      <div className="list-rows">
        {open.map(({ repair: r, houseName }) => (
          <div key={r.id} className="panel row-card">
            <b>{r.title}</b>
            <span className="hint">
              <Link href={`/dashboard/houses/${r.houseId}#repairs`}>{houseName}</Link> · reported {formatShortDate(r.reportedOn)}
              {r.details && ` · ${r.details}`}
            </span>
            <ActionForm action={updateRepair.bind(null, r.id)} submit="Save" className="inline-form wrap-form">
              <label className="field">
                Status
                <select name="status" defaultValue={r.status}>
                  {REPAIR_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {repairStatusLabel[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Cost (₱)
                <input name="cost" type="number" inputMode="numeric" min={0} defaultValue={r.cost ?? ""} />
              </label>
              <label className="field">
                Fixed by
                <input name="handledBy" defaultValue={r.handledBy} />
              </label>
            </ActionForm>
          </div>
        ))}
        {open.length === 0 && <p className="panel muted">Nothing to fix right now.</p>}
      </div>

      {done.length > 0 && (
        <details className="panel" style={{ marginTop: 18 }}>
          <summary>Done ({done.length})</summary>
          <ul className="plain-list">
            {done.map(({ repair: r, houseName }) => (
              <li key={r.id} className="split">
                <span>
                  {r.title} <span className="hint">· {houseName}</span>
                </span>
                <span className="hint">
                  {r.completedOn && formatShortDate(r.completedOn)}
                  {r.cost != null && ` · ${formatMoney(r.cost)}`}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
