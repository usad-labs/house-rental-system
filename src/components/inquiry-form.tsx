"use client";
import { useActionState } from "react";
import { siteConfig } from "@/config/site";
import { PREFERRED_TIMES, preferredTimeLabel } from "@/lib/options";
import { submitInquiry, type InquiryState } from "@/server/inquiry-actions";

const initial: InquiryState = { ok: false, message: "" };

/** "Book a viewing" form. For an occupied house it becomes "tell me when it's free". */
export function InquiryForm({ slug, occupied }: { slug: string; occupied: boolean }) {
  const [state, action, pending] = useActionState(submitInquiry, initial);

  if (state.ok) return <p className="notice notice--ok" role="status">{state.message}</p>;
  const err = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form className="form" action={action} noValidate>
      <input type="hidden" name="slug" value={slug} />
      {occupied && <input type="hidden" name="message" value="Please tell me when this house is free." />}
      <label className="hp" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {state.message && <p className="notice notice--err" role="alert">{state.message}</p>}
      <label className="field">
        Your name
        <input name="name" defaultValue={v.name} autoComplete="name" placeholder="Juan Dela Cruz" required aria-invalid={!!err.name} />
        {err.name && <span className="err">{err.name}</span>}
      </label>
      <label className="field">
        Mobile number
        <input name="phone" defaultValue={v.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="09XX XXX XXXX" required aria-invalid={!!err.phone} />
        {err.phone && <span className="err">{err.phone}</span>}
      </label>
      {!occupied && (
        <div className="pair">
          <label className="field">
            Preferred date
            <input name="preferredDate" defaultValue={v.preferredDate} type="date" aria-invalid={!!err.preferredDate} />
            {err.preferredDate && <span className="err">{err.preferredDate}</span>}
          </label>
          <label className="field">
            Time of day
            <select name="preferredTime" defaultValue={v.preferredTime || "afternoon"}>
              {PREFERRED_TIMES.map((t) => (
                <option key={t} value={t}>
                  {preferredTimeLabel[t].split(" (")[0]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <button className="stamp-btn" type="submit" disabled={pending}>
        <span className="stamp">
          <span className="stamp-in">
            <small>{siteConfig.logoText}</small>
            {pending ? "Sending…" : occupied ? "Tell me when it's free" : "Send viewing request"}
          </span>
        </span>
      </button>
      <p className="hint">{siteConfig.contact.replyTime}</p>
    </form>
  );
}
