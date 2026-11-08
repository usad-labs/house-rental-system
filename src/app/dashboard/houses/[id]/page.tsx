import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { ChargeChip, ConfirmButton, StatusChip } from "@/components/dash";
import { PaymentFields } from "@/components/payment-fields";
import { CopyButton } from "@/components/copy-button";
import { PhotoUpload } from "@/components/photo-upload";
import { messengerUrl } from "@/config/site";
import { formatDate, formatPeriod, formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { paymentMethodLabel, repairStatusLabel, utilityKindLabel } from "@/lib/options";
import { HOUSE_STATUSES, houseStatusLabel } from "@/lib/status";
import { phoneHref } from "@/lib/text";
import type { Tenant } from "@/db/schema";
import {
  addTenant,
  deletePayment,
  deletePhoto,
  makeCover,
  markBillPaid,
  moveOut,
  recordPayment,
  sendReminderNow,
  setHouseStatus,
  updateListing,
  updateTenant,
  uploadPhoto,
} from "@/server/dashboard-actions";
import { getHouseDetail, today } from "@/server/dashboard-data";

export default function HousePage({ params }: PageProps<"/dashboard/houses/[id]">) {
  return (
    <>
      <Link className="back-link" href="/dashboard/houses">
        ← All houses
      </Link>
      <Suspense fallback={<p className="sub">Loading…</p>}>
        <House id={params.then((p) => Number(p.id))} />
      </Suspense>
    </>
  );
}

async function House({ id }: { id: Promise<number> }) {
  const data = await getHouseDetail(await id);
  if (!data) notFound();
  const { house, photos, tenant, pastTenants, charges, payments, bills, repairs, linkToken, copyTexts, lastReminders } = data;
  const connectLink = linkToken ? `${messengerUrl()}?ref=${linkToken}` : null;
  const day = today();
  const paymentsByCharge = Map.groupBy(payments, (p) => p.chargeId);

  return (
    <>
      <header className={`house-head house-head--${house.status}`}>
        {photos[0] ? <img src={photos[0].url} alt="" /> : <span className="house-head-noimg" />}
        <div className="house-head-body">
          <StatusChip status={house.status} />
          <h1>{house.name}</h1>
          <p className="house-head-facts">
            <b>{formatMoney(house.monthlyRent)}</b>/month · {tenant ? tenant.fullName : "No tenant"}
          </p>
          <p className="hint">
            {house.isPublished ? (
              <Link href={`/houses/${house.slug}`} target="_blank">
                See it on the website ↗
              </Link>
            ) : (
              "Hidden from the website"
            )}
          </p>
        </div>
      </header>

      <div className="house-cols">
        <div className="house-col">
          {/* Status */}
          <ActionForm action={setHouseStatus.bind(null, house.id)} submit="Save status" className="panel inline-form">
            <label className="field">
              Status
              <select name="status" defaultValue={house.status}>
                {HOUSE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {houseStatusLabel[s]}
                  </option>
                ))}
              </select>
            </label>
          </ActionForm>

          {/* Tenant */}
          <h2 id="tenant">Tenant</h2>
          {tenant ? (
            <div className="panel stack">
              <dl className="kv">
                <dt>Name</dt>
                <dd>{tenant.fullName}</dd>
                <dt>Mobile</dt>
                <dd>
                  <a href={`tel:${phoneHref(tenant.phone)}`}>{tenant.phone}</a> · <a href={`sms:${phoneHref(tenant.phone)}`}>Text</a>
                </dd>
                <dt>Moved in</dt>
                <dd>{formatDate(tenant.moveInDate)}</dd>
                <dt>Lease ends</dt>
                <dd>{tenant.leaseEndDate ? formatDate(tenant.leaseEndDate) : "No end date"}</dd>
                <dt>Rent</dt>
                <dd>
                  {formatMoney(tenant.monthlyRent)}, due every {ordinal(tenant.dueDay)}
                </dd>
                {tenant.depositAmount != null && (
                  <>
                    <dt>Deposit</dt>
                    <dd>{formatMoney(tenant.depositAmount)}</dd>
                  </>
                )}
                {tenant.notes && (
                  <>
                    <dt>Notes</dt>
                    <dd>{tenant.notes}</dd>
                  </>
                )}
              </dl>
              <div className="messenger-row">
                {tenant.messengerPsid ? (
                  <p className="messenger-ok">✓ On Messenger: reminders go there automatically</p>
                ) : (
                  <>
                    <p className="hint">
                      Not on Messenger yet. Send this link to {tenant.fullName.split(" ")[0]} once; when they open it and say hi, reminders start.
                    </p>
                    {connectLink && <CopyButton text={connectLink} label="Copy connect link" />}
                  </>
                )}
                {lastReminders[0] && (
                  <p className="hint">
                    Last reminder: {formatShortDate(lastReminders[0].sentOn)} · {reminderStatusLabel[lastReminders[0].status] ?? lastReminders[0].status}
                  </p>
                )}
              </div>
              <details>
                <summary className="link-summary">Edit tenant</summary>
                <ActionForm action={updateTenant.bind(null, tenant.id)} submit="Save tenant" className="stack">
                  <TenantFields t={tenant} />
                </ActionForm>
              </details>
              <details>
                <summary className="link-summary danger">Move out</summary>
                <ActionForm action={moveOut.bind(null, tenant.id)} submit="Confirm move-out" className="stack">
                  <label className="field">
                    Move-out date
                    <input name="movedOutDate" type="date" defaultValue={day} required />
                  </label>
                  <p className="hint">The tenant is kept as a past tenant and the house becomes Vacant.</p>
                </ActionForm>
              </details>
            </div>
          ) : (
            <details className="panel" open={house.status !== "under_repair"}>
              <summary>+ Add a tenant</summary>
              <ActionForm action={addTenant.bind(null, house.id)} submit="Add tenant" className="stack" reset>
                <TenantFields defaults={{ monthlyRent: house.monthlyRent, moveInDate: day }} />
              </ActionForm>
            </details>
          )}
          {pastTenants.length > 0 && (
            <p className="hint" style={{ marginTop: 8 }}>
              Past tenants: {pastTenants.map((t) => `${t.fullName} (${formatShortDate(t.moveInDate)} – ${formatShortDate(t.movedOutDate!)})`).join(", ")}
            </p>
          )}

          {/* Rent */}
          <h2 id="rent">Rent</h2>
          {charges.length === 0 ? (
            <p className="panel muted">No rent charges yet.</p>
          ) : (
            <div className="list-rows">
              {charges.slice(0, 6).map((c) => (
                <div key={c.id} className="panel row-card">
                  <div className="split">
                    <b>
                      {formatPeriod(c.period)} · {formatMoney(c.amount)}
                    </b>
                    <ChargeChip status={c.status} />
                  </div>
                  <span className="hint">
                    Due {formatDate(c.dueDate)}
                    {c.paidTotal > 0 && ` · paid ${formatMoney(c.paidTotal)}`}
                    {c.status.balance > 0 && c.paidTotal > 0 && ` · ${formatMoney(c.status.balance)} left`}
                  </span>
                  {(paymentsByCharge.get(c.id) ?? []).map((p) => (
                    <div key={p.id} className="pay-line">
                      <span>
                        {formatMoney(p.amount)} on {formatShortDate(p.paidOn)} · {paymentMethodLabel[p.method]}
                        {p.reference && ` · ${p.reference}`}
                      </span>
                      <ConfirmButton
                        action={deletePayment.bind(null, p.id)}
                        label="Undo"
                        confirm="Yes, delete payment"
                        ariaLabel={`Undo payment of ${formatMoney(p.amount)}`}
                      />
                    </div>
                  ))}
                  {c.status.balance > 0 && c.tenantId === tenant?.id && (
                    <div className="reminder-actions">
                      <ActionForm action={sendReminderNow.bind(null, c.id)} submit="Send reminder" className="inline-form">
                        <span />
                      </ActionForm>
                      {copyTexts[c.id] && <CopyButton text={copyTexts[c.id]!} />}
                    </div>
                  )}
                  {c.status.balance > 0 && (
                    <details>
                      <summary className="link-summary">Record payment</summary>
                      <ActionForm action={recordPayment.bind(null, c.id)} submit="Save payment" className="stack" reset>
                        <PaymentFields amount={c.status.balance} day={day} />
                      </ActionForm>
                    </details>
                  )}
                </div>
              ))}
              {charges.length > 6 && <p className="hint">Older months: see Rent &amp; bills.</p>}
            </div>
          )}
        </div>
        <div className="house-col">
          {/* Utility bills */}
          <h2 id="bills">Utility bills</h2>
          {bills.length === 0 ? (
            <p className="panel muted">
              No bills yet. <Link href="/dashboard/money#bills">Add one in Rent &amp; bills</Link>.
            </p>
          ) : (
            <div className="list-rows">
              {bills.slice(0, 6).map((b) => (
                <div key={b.id} className="panel row-card">
                  <div className="split">
                    <b>
                      {utilityKindLabel[b.kind]} · {formatPeriod(b.period)} · {formatMoney(b.amount)}
                    </b>
                    {b.paidOn ? <span className="chip paid">Paid</span> : <span className={`chip ${b.dueDate < day ? "overdue" : "due_soon"}`}>Unpaid</span>}
                  </div>
                  <span className="hint">
                    Due {formatDate(b.dueDate)}
                    {b.cutoffDate && ` · cut-off ${formatDate(b.cutoffDate)}`} · {b.paidBy === "owner" ? "you pay" : "tenant pays"}
                    {b.paidOn && ` · paid ${formatShortDate(b.paidOn)}`}
                  </span>
                  {!b.paidOn && (
                    <ActionForm action={markBillPaid.bind(null, b.id)} submit="Mark paid" className="inline-form">
                      <label className="field">
                        Paid on
                        <input name="paidOn" type="date" defaultValue={day} required />
                      </label>
                    </ActionForm>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Repairs */}
          <h2 id="repairs">Repairs</h2>
          {repairs.length === 0 ? (
            <p className="panel muted">No repairs logged.</p>
          ) : (
            <ul className="panel plain-list">
              {repairs.map((r) => (
                <li key={r.id} className="split">
                  <span>
                    {r.title} <span className="hint">· {formatShortDate(r.reportedOn)}</span>
                  </span>
                  <span className={`chip ${r.status}`}>{repairStatusLabel[r.status]}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="hint" style={{ marginTop: 6 }}>
            <Link href="/dashboard/repairs">Add or update repairs →</Link>
          </p>

          {/* Listing */}
          <h2 id="listing">Website listing</h2>
          <details className="panel">
            <summary>Edit what visitors see</summary>
            <ActionForm action={updateListing.bind(null, house.id)} submit="Save listing" className="stack">
              <label className="check">
                <input type="checkbox" name="isPublished" defaultChecked={house.isPublished} /> Show on website
              </label>
              <div className="pair">
                <label className="field">
                  Name
                  <input name="name" defaultValue={house.name} required />
                </label>
                <label className="field">
                  Type
                  <input name="type" defaultValue={house.type} placeholder="1-bedroom house" />
                </label>
              </div>
              <div className="pair">
                <label className="field">
                  Rent per month (₱)
                  <input name="monthlyRent" type="number" inputMode="numeric" min={0} defaultValue={house.monthlyRent} required />
                </label>
                <label className="field">
                  Floor area (m²)
                  <input name="floorAreaSqm" type="number" inputMode="numeric" min={0} defaultValue={house.floorAreaSqm ?? ""} />
                </label>
              </div>
              <div className="pair">
                <label className="field">
                  Bedrooms
                  <input name="bedrooms" type="number" min={0} defaultValue={house.bedrooms} />
                </label>
                <label className="field">
                  Bathrooms
                  <input name="bathrooms" type="number" min={0} defaultValue={house.bathrooms} />
                </label>
              </div>
              <label className="field">
                Utilities
                <select name="utilities" defaultValue={house.utilities}>
                  <option value="own">Own meter</option>
                  <option value="shared">Shared utilities</option>
                </select>
              </label>
              <label className="field">
                Location shown on the website
                <input name="publicLocation" defaultValue={house.publicLocation} required />
              </label>
              <label className="field">
                Full address <span className="hint">(only you see this)</span>
                <input name="fullAddress" defaultValue={house.fullAddress} />
              </label>
              <label className="field">
                Google Maps link
                <input name="mapUrl" type="url" defaultValue={house.mapUrl} placeholder="https://maps.app.goo.gl/…" />
              </label>
              <label className="field">
                Rental terms
                <input name="terms" defaultValue={house.terms} placeholder="1 month advance + 1 month deposit." />
              </label>
              <label className="field">
                What you get <span className="hint">(one per line)</span>
                <textarea name="features" rows={4} defaultValue={house.features.join("\n")} />
              </label>
              <label className="field">
                Description
                <textarea name="description" rows={3} defaultValue={house.description} />
              </label>
            </ActionForm>
          </details>

          {/* Photos */}
          <h2 id="photos">Photos</h2>
          <div className="panel stack">
            {photos.length === 0 ? (
              <p className="muted">No photos yet. The first photo is the cover on the website.</p>
            ) : (
              <ul className="photo-grid">
                {photos.map((p, i) => (
                  <li key={p.id}>
                    <img src={p.url} alt={p.alt} />
                    <div className="photo-actions">
                      {i === 0 ? (
                        <span className="chip paid">Cover</span>
                      ) : (
                        <form action={makeCover.bind(null, p.id)}>
                          <button className="link-btn" type="submit">
                            Make cover
                          </button>
                        </form>
                      )}
                      <ConfirmButton action={deletePhoto.bind(null, p.id)} label="Delete" confirm="Yes, delete" ariaLabel={`Delete photo ${i + 1}`} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <PhotoUpload action={uploadPhoto.bind(null, house.id)} />
          </div>
        </div>
      </div>
    </>
  );
}

const reminderStatusLabel: Record<string, string> = {
  sent: "sent on Messenger",
  not_connected: "not sent (not on Messenger)",
  failed: "not sent",
  dry_run: "practice run (Messenger not set up)",
};

function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

function TenantFields({ t, defaults }: { t?: Tenant; defaults?: { monthlyRent: number; moveInDate: string } }) {
  return (
    <>
      <div className="pair">
        <label className="field">
          Full name
          <input name="fullName" defaultValue={t?.fullName} required />
        </label>
        <label className="field">
          Mobile number
          <input name="phone" type="tel" inputMode="tel" defaultValue={t?.phone} required />
        </label>
      </div>
      <label className="field">
        Email <span className="hint">(optional)</span>
        <input name="email" type="email" defaultValue={t?.email} />
      </label>
      <div className="pair">
        <label className="field">
          Move-in date
          <input name="moveInDate" type="date" defaultValue={t?.moveInDate ?? defaults?.moveInDate} required />
        </label>
        <label className="field">
          Lease ends <span className="hint">(optional)</span>
          <input name="leaseEndDate" type="date" defaultValue={t?.leaseEndDate ?? ""} />
        </label>
      </div>
      <div className="pair">
        <label className="field">
          Rent per month (₱)
          <input name="monthlyRent" type="number" inputMode="numeric" min={0} defaultValue={t?.monthlyRent ?? defaults?.monthlyRent} required />
        </label>
        <label className="field">
          Rent due day (1–31)
          <input name="dueDay" type="number" inputMode="numeric" min={1} max={31} defaultValue={t?.dueDay ?? 5} required />
        </label>
      </div>
      <label className="field">
        Deposit (₱) <span className="hint">(optional)</span>
        <input name="depositAmount" type="number" inputMode="numeric" min={0} defaultValue={t?.depositAmount ?? ""} />
      </label>
      <label className="field">
        Notes
        <textarea name="notes" rows={2} defaultValue={t?.notes} />
      </label>
    </>
  );
}
