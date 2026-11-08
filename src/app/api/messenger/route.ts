/**
 * Facebook Messenger webhook (set this URL in the Meta app: https://<site>/api/messenger).
 * GET  = Meta's one-time verification. POST = messages, only accepted with a valid signature.
 */
import { messengerConfig, parseEvents, sendMessages, verifySignature } from "@/lib/messenger";
import { attachProof, createClaim, linkTenant } from "@/server/messenger";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { verifyToken } = messengerConfig();
  if (verifyToken && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === verifyToken) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

const reply = (psid: string, text: string) => sendMessages(psid, [{ text }]);

export async function POST(req: Request) {
  const raw = await req.text();
  const { appSecret } = messengerConfig();
  if (!appSecret) return new Response("Messenger not set up", { status: 503 });
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), appSecret)) return new Response("Bad signature", { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  for (const e of parseEvents(body)) {
    if (e.kind === "link") {
      const name = await linkTenant(e.psid, e.ref);
      if (name) await reply(e.psid, `Hi ${name}! You're connected. Rent reminders will come here.`);
    } else if (e.kind === "claim") {
      if (await createClaim(e.psid, e.method, e.chargeId)) {
        await reply(e.psid, e.method === "gcash" ? "Thank you! Please send your GCash receipt screenshot here." : "Thank you! We'll collect the cash from you.");
      }
    } else if (e.kind === "image") {
      if (await attachProof(e.psid, e.url)) await reply(e.psid, "Receipt received. Salamat!");
    }
  }
  // Always 200 for a valid, signed request, so Meta doesn't retry.
  return new Response("OK", { status: 200 });
}
