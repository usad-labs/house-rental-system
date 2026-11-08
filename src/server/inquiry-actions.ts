"use server";
/** Public "Book a viewing" form. Anyone can call this, so validate everything. */
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { db } from "@/db";
import { houses, inquiries } from "@/db/schema";
import { isISODate, todayISO } from "@/lib/dates";
import { PREFERRED_TIMES } from "@/lib/options";
import { rateLimit } from "@/lib/rate-limit";

export type InquiryState = {
  ok: boolean;
  message: string;
  errors?: Partial<Record<"name" | "phone" | "preferredDate" | "preferredTime" | "message", string>>;
  /** What was typed, so the form can refill after React resets it. */
  values?: Record<string, string>;
};

const optional = (s: z.ZodString) => s.optional().transform((v) => v || undefined);

const schema = z.object({
  slug: z.string().max(80),
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{10,16}$/, "Please enter a mobile number, e.g. 0917 123 4567."),
  preferredDate: optional(z.string()).refine((v) => !v || isISODate(v), "Please pick a date."),
  preferredTime: z.enum(PREFERRED_TIMES).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().trim().max(1000).optional().default(""),
});

export async function submitInquiry(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  // Honeypot: real people never fill the hidden "website" field. Pretend it worked.
  if (formData.get("website")) return { ok: true, message: "Thanks! We'll get back to you soon." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`inquiry:${ip}`, 5, 60 * 60 * 1000)) {
    return { ok: false, message: "Too many requests from this device. Please message us on Messenger instead." };
  }

  const values = Object.fromEntries(
    ["name", "phone", "preferredDate", "preferredTime"].map((k) => [k, String(formData.get(k) ?? "").slice(0, 200)]),
  );
  const parsed = schema.safeParse({
    slug: formData.get("slug") ?? "",
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    preferredDate: formData.get("preferredDate") ?? undefined,
    preferredTime: formData.get("preferredTime") ?? undefined,
    message: formData.get("message") ?? undefined,
  });
  if (!parsed.success) {
    const errors: InquiryState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<InquiryState["errors"]>;
      errors[key] ??= issue.message;
    }
    return { ok: false, message: "Please check the form.", errors, values };
  }
  const data = parsed.data;
  if (data.preferredDate && data.preferredDate < todayISO(siteConfig.timeZone)) {
    return { ok: false, message: "Please check the form.", errors: { preferredDate: "Please pick today or a later date." }, values };
  }

  const [house] = await db
    .select({ id: houses.id })
    .from(houses)
    .where(and(eq(houses.slug, data.slug), eq(houses.isPublished, true)))
    .limit(1);

  await db.insert(inquiries).values({
    houseId: house?.id ?? null,
    name: data.name,
    phone: data.phone,
    preferredDate: data.preferredDate ?? null,
    preferredTime: data.preferredTime ?? null,
    message: data.message,
  });

  return { ok: true, message: `Thanks, ${data.name.split(" ")[0]}! ${siteConfig.contact.replyTime}` };
}
