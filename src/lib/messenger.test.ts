import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { claimPayload, parseEvents, rentReminderMessages, verifySignature } from "./messenger";
import { shouldRemind } from "./reminder-schedule";

describe("verifySignature", () => {
  const body = '{"object":"page"}';
  const sig = "sha256=" + createHmac("sha256", "s3cret").update(body).digest("hex");
  it("accepts Meta's signature and rejects anything else", () => {
    expect(verifySignature(body, sig, "s3cret")).toBe(true);
    expect(verifySignature(body + " ", sig, "s3cret")).toBe(false);
    expect(verifySignature(body, sig, "other")).toBe(false);
    expect(verifySignature(body, null, "s3cret")).toBe(false);
    expect(verifySignature(body, sig, "")).toBe(false);
  });
});

describe("parseEvents", () => {
  const wrap = (...messaging: object[]) => ({ object: "page", entry: [{ messaging }] });
  it("reads link referrals, answer buttons and receipt photos", () => {
    const events = parseEvents(
      wrap(
        { sender: { id: "P1" }, referral: { ref: "tok123" } },
        { sender: { id: "P2" }, postback: { payload: "GET_STARTED", referral: { ref: "tok456" } } },
        { sender: { id: "P1" }, message: { quick_reply: { payload: claimPayload("gcash", 42) } } },
        { sender: { id: "P1" }, message: { attachments: [{ type: "image", payload: { url: "https://cdn/x.jpg" } }] } },
        { sender: { id: "P1" }, message: { text: "hello" } },
        { sender: { id: "PAGE" }, message: { is_echo: true, text: "our own message" } },
      ),
    );
    expect(events).toEqual([
      { kind: "link", psid: "P1", ref: "tok123" },
      { kind: "link", psid: "P2", ref: "tok456" },
      { kind: "claim", psid: "P1", method: "gcash", chargeId: 42 },
      { kind: "image", psid: "P1", url: "https://cdn/x.jpg" },
      { kind: "text", psid: "P1" },
    ]);
  });
  it("ignores junk", () => {
    expect(parseEvents(null)).toEqual([]);
    expect(parseEvents({ object: "instagram", entry: [] })).toEqual([]);
    expect(parseEvents(wrap({ sender: { id: "P1" }, message: { quick_reply: { payload: "CLAIM:bitcoin:1" } } }))).toEqual([{ kind: "text", psid: "P1" }]);
  });
});

describe("rentReminderMessages", () => {
  const base = { firstName: "Paolo", houseName: "Narra House", amountText: "₱1,500", dueText: "Oct 31", overdue: true, chargeId: 7, gcashName: "A. Bañas", businessName: "5A Rentals" };
  it("sends the QR image first, then text with the two answer buttons", () => {
    const [img, text] = rentReminderMessages({ ...base, qrUrl: "https://5a.example/uploads/qr.png" });
    expect(img).toEqual({ attachment: { type: "image", payload: { url: "https://5a.example/uploads/qr.png", is_reusable: true } } });
    expect("text" in text && text.text).toContain("was due on Oct 31");
    expect("text" in text && text.quick_replies?.map((q) => q.payload)).toEqual(["CLAIM:gcash:7", "CLAIM:cash:7"]);
  });
  it("still works before a QR is uploaded", () => {
    expect(rentReminderMessages({ ...base, qrUrl: null })).toHaveLength(1);
  });
});

describe("shouldRemind", () => {
  it("3 days before, on the day, then every 3 days late", () => {
    const due = "2026-11-10";
    const days = ["2026-11-06", "2026-11-07", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-13", "2026-11-16"];
    expect(days.map((d) => shouldRemind(d, due))).toEqual([false, true, false, true, false, true, true]);
  });
});
