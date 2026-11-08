/**
 * Daily rent reminders (Vercel Cron, see vercel.json: 00:00 UTC = 8 AM Manila).
 * Vercel sends "Authorization: Bearer <CRON_SECRET>"; anything else is refused.
 */
import { timingSafeEqual } from "node:crypto";
import { syncCharges } from "@/server/dashboard-data";
import { runDailyReminders } from "@/server/messenger";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) return new Response("Unauthorized", { status: 401 });
  await syncCharges();
  return Response.json(await runDailyReminders());
}
