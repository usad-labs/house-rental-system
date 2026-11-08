/** Small server-side display helpers shared by the dashboard pages. */
import { formatMoney } from "@/lib/money";
import { formatShortDate, relativeDays } from "@/lib/dates";
import { utilityKindLabel } from "@/lib/options";
import type { Reminder } from "@/lib/reminders";
import { chargeStateLabel, type ChargeStatus } from "@/lib/rent";
import { houseStatusLabel, type HouseStatus } from "@/lib/status";

export function StatusChip({ status }: { status: HouseStatus }) {
  return <span className={`chip ${status}`}>{houseStatusLabel[status]}</span>;
}

export function ChargeChip({ status }: { status: ChargeStatus }) {
  return (
    <span className={`chip ${status.state}`}>
      {status.partial && status.state !== "paid" ? "Partly paid" : chargeStateLabel[status.state]}
    </span>
  );
}

/** Reminder → short title + detail line + where the button goes. */
export function describeReminder(r: Reminder): { title: string; detail: string; href: string; action: string } {
  const who = [r.houseName, r.tenantName].filter(Boolean).join(", ");
  const house = `/dashboard/houses/${r.houseId}`;
  switch (r.kind) {
    case "rent_overdue":
      return { title: `${formatMoney(r.amount ?? 0)} rent overdue`, detail: `${who} · due ${formatShortDate(r.date)}, ${relativeDays(r.days)}`, href: `${house}#rent`, action: "Record" };
    case "rent_due":
      return { title: `${formatMoney(r.amount ?? 0)} rent due ${relativeDays(r.days)}`, detail: `${who} · ${formatShortDate(r.date)}`, href: `${house}#rent`, action: "Record" };
    case "lease_ended":
      return { title: "Lease ended, tenant still in", detail: `${who} · ended ${formatShortDate(r.date)}`, href: `${house}#tenant`, action: "Open" };
    case "lease_ending":
      return { title: `Lease ends ${relativeDays(r.days)}`, detail: `${who} · ${formatShortDate(r.date)}`, href: `${house}#tenant`, action: "Open" };
    case "utility_overdue":
    case "utility_due": {
      const kind = utilityKindLabel[r.utilityKind ?? "electric"];
      const payer = r.paidBy === "owner" ? "you pay" : "tenant pays";
      const cutoff = r.cutoffDate ? ` · cut-off ${formatShortDate(r.cutoffDate)}` : "";
      return {
        title: r.kind === "utility_overdue" ? `${kind} bill unpaid, ${relativeDays(r.days)}` : `${kind} bill due ${relativeDays(r.days)}`,
        detail: `${r.houseName} · ${formatMoney(r.amount ?? 0)} · ${payer}${cutoff}`,
        href: `/dashboard/money#bills`,
        action: "Open",
      };
    }
  }
}

/** A delete/undo button that asks first (no JavaScript needed): tap → "Yes, …" → runs the action. */
export function ConfirmButton({ action, label, confirm, ariaLabel }: { action: () => Promise<void>; label: string; confirm: string; ariaLabel?: string }) {
  return (
    <details className="confirm">
      <summary className="link-btn danger" aria-label={ariaLabel}>
        {label}
      </summary>
      <form action={action}>
        <button className="btn btn-sm btn-danger" type="submit">
          {confirm}
        </button>
      </form>
    </details>
  );
}
