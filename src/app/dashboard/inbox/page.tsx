import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { siteConfig } from "@/config/site";
import { formatDate, formatTimestamp } from "@/lib/dates";
import { INQUIRY_STATUSES, inquiryStatusLabel, preferredTimeLabel } from "@/lib/options";
import { phoneHref } from "@/lib/text";
import { updateInquiry } from "@/server/dashboard-actions";
import { getInbox } from "@/server/dashboard-data";

export const metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <>
      <h1>Inbox</h1>
      <p className="sub">Viewing requests and questions from the website, newest first.</p>
      <Suspense fallback={<p className="sub">Loading…</p>}>
        <Inbox />
      </Suspense>
    </>
  );
}

async function Inbox() {
  const rows = await getInbox();
  if (rows.length === 0) return <p className="panel muted">No messages yet.</p>;

  return (
    <div className="list-rows">
      {rows.map(({ inquiry: q, houseName, houseSlug }) => {
        const tel = phoneHref(q.phone);
        return (
          <div key={q.id} className={`panel row-card${q.status === "closed" ? " is-closed" : ""}`}>
            <div className="split">
              <b>{q.name}</b>
              <span className={`chip ${q.status}`}>{inquiryStatusLabel[q.status]}</span>
            </div>
            <span className="hint">
              {houseName ? (
                <>
                  About <Link href={`/houses/${houseSlug}`} target="_blank">{houseName}</Link>
                </>
              ) : (
                "General question"
              )}{" "}
              · {formatTimestamp(q.createdAt, siteConfig.timeZone)}
            </span>
            {q.preferredDate && (
              <span>
                Wants to view: <b>{formatDate(q.preferredDate)}</b>
                {q.preferredTime && `, ${preferredTimeLabel[q.preferredTime].split(" (")[0].toLowerCase()}`}
              </span>
            )}
            {q.message && <p className="quote">{q.message}</p>}
            <div className="btn-row">
              <a className="btn btn-sm btn-navy" href={`tel:${tel}`}>
                Call {q.phone}
              </a>
              <a className="btn btn-sm btn-outline" href={`sms:${tel}`}>
                Text
              </a>
            </div>
            <ActionForm action={updateInquiry.bind(null, q.id)} submit="Save" className="inline-form wrap-form">
              <label className="field">
                Status
                <select name="status" defaultValue={q.status}>
                  {INQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {inquiryStatusLabel[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field grow">
                Note <span className="hint">(only you see this)</span>
                <input name="ownerNote" defaultValue={q.ownerNote} />
              </label>
            </ActionForm>
          </div>
        );
      })}
    </div>
  );
}
