import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { ChargeChip, ConfirmButton } from "@/components/dash";
import { PaymentFields } from "@/components/payment-fields";
import { formatDate, formatPeriod, formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { paymentMethodLabel, UTILITY_KINDS, utilityKindLabel } from "@/lib/options";
import { addBill, deleteBill, markBillPaid, recordPayment } from "@/server/dashboard-actions";
import { getMoney } from "@/server/dashboard-data";

export const metadata = { title: "Rent & bills" };

export default function MoneyPage() {
  return (
    <>
      <h1>Rent &amp; bills</h1>
      <Suspense fallback={<p className="sub">Loading…</p>}>
        <Money />
      </Suspense>
    </>
  );
}

async function Money() {
  const { today, charges, bills, recent, houses } = await getMoney();
  const unpaid = charges.filter((c) => c.status.state !== "paid" && c.status.state !== "upcoming").toReversed();
  const unpaidTotal = unpaid.reduce((sum, c) => sum + c.status.balance, 0);
  const openBills = bills.filter((b) => !b.paidOn).toReversed();
  const paidBills = bills.filter((b) => b.paidOn).slice(0, 10);

  return (
    <>
      <p className="sub">
        {unpaid.length === 0 ? "All rent is paid." : `${formatMoney(unpaidTotal)} rent to collect from ${unpaid.length} charge${unpaid.length > 1 ? "s" : ""}.`}
      </p>

      <h2 id="rent">Rent to collect</h2>
      {unpaid.length === 0 ? (
        <p className="panel muted">Nothing due right now.</p>
      ) : (
        <div className="list-rows">
          {unpaid.map((c) => (
            <div key={c.id} className="panel row-card">
              <div className="split">
                <b>
                  <Link href={`/dashboard/houses/${c.houseId}#rent`}>{c.houseName}</Link> · {formatMoney(c.status.balance)}
                </b>
                <ChargeChip status={c.status} />
              </div>
              <span className="hint">
                {c.tenantName} · {formatPeriod(c.period)} · due {formatDate(c.dueDate)}
                {c.paidTotal > 0 && ` · ${formatMoney(c.paidTotal)} already paid`}
              </span>
              <details>
                <summary className="link-summary">Record payment</summary>
                <ActionForm action={recordPayment.bind(null, c.id)} submit="Save payment" className="stack" reset>
                  <PaymentFields amount={c.status.balance} day={today} />
                </ActionForm>
              </details>
            </div>
          ))}
        </div>
      )}

      <h2 id="bills">Utility bills</h2>
      {openBills.length === 0 ? (
        <p className="panel muted">No unpaid bills.</p>
      ) : (
        <div className="list-rows">
          {openBills.map((b) => (
            <div key={b.id} className="panel row-card">
              <div className="split">
                <b>
                  {b.houseName} · {utilityKindLabel[b.kind]} · {formatMoney(b.amount)}
                </b>
                <span className={`chip ${b.dueDate < today ? "overdue" : "due_soon"}`}>{b.dueDate < today ? "Overdue" : "Unpaid"}</span>
              </div>
              <span className="hint">
                {formatPeriod(b.period)} · due {formatDate(b.dueDate)}
                {b.cutoffDate && ` · cut-off ${formatDate(b.cutoffDate)}`} · {b.paidBy === "owner" ? "you pay" : "tenant pays"}
              </span>
              <div className="split">
                <ActionForm action={markBillPaid.bind(null, b.id)} submit="Mark paid" className="inline-form">
                  <label className="field">
                    Paid on
                    <input name="paidOn" type="date" defaultValue={today} required />
                  </label>
                </ActionForm>
                <ConfirmButton action={deleteBill.bind(null, b.id)} label="Delete" confirm="Yes, delete bill" />
              </div>
            </div>
          ))}
        </div>
      )}

      <details className="panel" style={{ marginTop: 10 }}>
        <summary>+ Add a bill</summary>
        <ActionForm action={addBill} submit="Add bill" className="stack" reset>
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
              Bill
              <select name="kind" defaultValue="electric">
                {UTILITY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {utilityKindLabel[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="pair">
            <label className="field">
              Billing month
              <input name="period" type="month" defaultValue={today.slice(0, 7)} required />
            </label>
            <label className="field">
              Amount (₱)
              <input name="amount" type="number" inputMode="numeric" min={0} required />
            </label>
          </div>
          <div className="pair">
            <label className="field">
              Due date
              <input name="dueDate" type="date" required />
            </label>
            <label className="field">
              Cut-off date <span className="hint">(if on bill)</span>
              <input name="cutoffDate" type="date" />
            </label>
          </div>
          <label className="field">
            Who pays it
            <select name="paidBy" defaultValue="tenant">
              <option value="tenant">Tenant (own meter)</option>
              <option value="owner">We pay (shared meter)</option>
            </select>
          </label>
          <input type="hidden" name="note" value="" />
        </ActionForm>
      </details>

      {paidBills.length > 0 && (
        <details className="panel" style={{ marginTop: 10 }}>
          <summary>Paid bills ({paidBills.length})</summary>
          <ul className="plain-list">
            {paidBills.map((b) => (
              <li key={b.id} className="split">
                <span>
                  {b.houseName} · {utilityKindLabel[b.kind]} · {formatPeriod(b.period)}
                </span>
                <span className="hint">
                  {formatMoney(b.amount)} · paid {formatShortDate(b.paidOn!)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <h2>Recent payments</h2>
      <div className="panel scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>House</th>
              <th>For</th>
              <th>Amount</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((p) => (
              <tr key={p.id}>
                <td>{formatShortDate(p.paidOn)}</td>
                <td>{p.houseName}</td>
                <td>{formatPeriod(p.period).split(" ")[0]}</td>
                <td>{formatMoney(p.amount)}</td>
                <td>
                  {paymentMethodLabel[p.method]}
                  {p.reference && <span className="hint"> · {p.reference}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
