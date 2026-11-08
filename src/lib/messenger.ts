/**
 * Facebook Messenger: pure helpers (signature check, event parsing, reminder messages) plus a small sender.
 * Setup lives in env vars (see .env.example); without a page token, sending is a dry run.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const messengerConfig = () => ({
  pageToken: process.env.MESSENGER_PAGE_TOKEN ?? "",
  appSecret: process.env.MESSENGER_APP_SECRET ?? "",
  verifyToken: process.env.MESSENGER_VERIFY_TOKEN ?? "",
  apiVersion: process.env.MESSENGER_API_VERSION || "v21.0",
});

/** Meta signs each webhook body: header "sha256=<hex HMAC of the raw body with the app secret>". */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody).digest("hex"));
  const got = Buffer.from(header.slice("sha256=".length));
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export type MessengerEvent =
  | { kind: "link"; psid: string; ref: string }
  | { kind: "claim"; psid: string; method: "gcash" | "cash"; chargeId: number }
  | { kind: "image"; psid: string; url: string }
  | { kind: "text"; psid: string };

const CLAIM = /^CLAIM:(gcash|cash):(\d+)$/;
export const claimPayload = (method: "gcash" | "cash", chargeId: number) => `CLAIM:${method}:${chargeId}`;

type RawMessaging = {
  sender?: { id?: string };
  referral?: { ref?: string };
  postback?: { payload?: string; referral?: { ref?: string } };
  message?: { is_echo?: boolean; quick_reply?: { payload?: string }; attachments?: { type?: string; payload?: { url?: string } }[] };
};

/** Turns a webhook body into the few events we care about. Unknown shapes are ignored, never thrown. */
export function parseEvents(body: unknown): MessengerEvent[] {
  const events: MessengerEvent[] = [];
  const entries = (body as { object?: string; entry?: { messaging?: RawMessaging[] }[] })?.entry ?? [];
  if ((body as { object?: string })?.object !== "page") return events;
  for (const entry of entries) {
    for (const m of entry.messaging ?? []) {
      const psid = m.sender?.id;
      if (!psid || m.message?.is_echo) continue;
      // m.me/<page>?ref=<token>: arrives as a referral (existing chat) or with the Get Started postback (new chat).
      const ref = m.referral?.ref ?? m.postback?.referral?.ref;
      if (ref) events.push({ kind: "link", psid, ref });
      const payload = m.message?.quick_reply?.payload ?? m.postback?.payload ?? "";
      const claim = CLAIM.exec(payload);
      if (claim) {
        events.push({ kind: "claim", psid, method: claim[1] as "gcash" | "cash", chargeId: Number(claim[2]) });
        continue;
      }
      const images = (m.message?.attachments ?? []).filter((a) => a.type === "image" && a.payload?.url);
      for (const a of images) events.push({ kind: "image", psid, url: a.payload!.url! });
      if (m.message && !images.length && !ref) events.push({ kind: "text", psid });
    }
  }
  return events;
}

export type OutMessage = { text: string; quick_replies?: { content_type: "text"; title: string; payload: string }[] } | { attachment: { type: "image"; payload: { url: string; is_reusable: true } } };

/** The rent reminder: GCash QR image first, then the text with the two answer buttons (spec §10.2). */
export function rentReminderMessages(r: {
  firstName: string;
  houseName: string;
  amountText: string;
  dueText: string;
  overdue: boolean;
  chargeId: number;
  qrUrl: string | null;
  gcashName: string;
  businessName: string;
}): OutMessage[] {
  const when = r.overdue ? `was due on ${r.dueText}` : `is due on ${r.dueText}`;
  const pay = r.qrUrl ? `You can pay with the GCash QR above${r.gcashName ? ` (${r.gcashName})` : ""}, or in cash.` : "You can pay by GCash or in cash.";
  const text = `Hi ${r.firstName}! Your ${r.houseName} rent of ${r.amountText} ${when}. ${pay} Tap a button below when you pay. Salamat! - ${r.businessName}`;
  const out: OutMessage[] = [];
  if (r.qrUrl) out.push({ attachment: { type: "image", payload: { url: r.qrUrl, is_reusable: true } } });
  out.push({
    text,
    quick_replies: [
      { content_type: "text", title: "Paid via GCash", payload: claimPayload("gcash", r.chargeId) },
      { content_type: "text", title: "Will pay cash", payload: claimPayload("cash", r.chargeId) },
    ],
  });
  return out;
}

export type SendResult = { status: "sent" | "dry_run" | "failed"; detail: string };

/** Sends messages in order. No page token = dry run (nothing leaves the computer). */
export async function sendMessages(psid: string, messages: OutMessage[]): Promise<SendResult> {
  const { pageToken, apiVersion } = messengerConfig();
  if (!pageToken) return { status: "dry_run", detail: "Messenger not set up yet (no page token)" };
  for (const message of messages) {
    const res = await fetch(`https://graph.facebook.com/${apiVersion}/me/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${pageToken}` },
      body: JSON.stringify({ recipient: { id: psid }, messaging_type: "UPDATE", message }),
    }).catch((e: unknown) => ({ ok: false, json: async () => ({ error: { message: String(e) } }) }) as const);
    if (!res.ok) {
      const err = ((await res.json().catch(() => ({}))) as { error?: { message?: string; error_subcode?: number } }).error;
      // shortcut: outside Meta's 24-hour window a pre-approved Utility template is needed; until one is approved,
      // the reminder is marked failed and the dashboard offers "Copy message" instead.
      const outside = err?.error_subcode === 2018278;
      return { status: "failed", detail: outside ? "Outside Messenger's 24-hour window (needs approved template)" : (err?.message ?? "Send failed") };
    }
  }
  return { status: "sent", detail: "" };
}

/** Plain-text version for the "Copy message" fallback. */
export function reminderPlainText(messages: OutMessage[], qrNote: string): string {
  const text = messages.map((m) => ("text" in m ? m.text : "")).join("");
  return qrNote ? `${text}\n${qrNote}` : text;
}
