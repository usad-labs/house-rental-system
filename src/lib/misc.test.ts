import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";
import { generatePassword, hashPassword, verifyPassword } from "./password";
import { isHouseStatus, publicStatus } from "./status";
import { linesToList, phoneHref, plural, slugify } from "./text";

describe("formatMoney", () => {
  it("formats whole pesos", () => {
    expect(formatMoney(12000)).toBe("₱12,000");
    expect(formatMoney(0)).toBe("₱0");
  });
});

describe("publicStatus", () => {
  it("maps dashboard status to the public label", () => {
    expect(publicStatus("vacant").label).toBe("Available");
    expect(publicStatus("occupied").label).toBe("Occupied");
    expect(publicStatus("under_repair").label).toBe("Available soon");
  });

  it("validates status values", () => {
    expect(isHouseStatus("vacant")).toBe(true);
    expect(isHouseStatus("sold")).toBe(false);
    expect(isHouseStatus(undefined)).toBe(false);
  });
});

describe("text helpers", () => {
  it("slugifies names", () => {
    expect(slugify("Acacia House #2")).toBe("acacia-house-2");
    expect(slugify("  Casa Niño  ")).toBe("casa-nino");
  });

  it("builds tel/sms values", () => {
    expect(phoneHref("0917 123 4567")).toBe("09171234567");
    expect(phoneHref("+63 917-123-4567")).toBe("+639171234567");
  });

  it("splits feature lines", () => {
    expect(linesToList("- Parking\n\n• Gated  \r\nWater heater")).toEqual(["Parking", "Gated", "Water heater"]);
  });

  it("pluralizes", () => {
    expect(plural(1, "bedroom")).toBe("1 bedroom");
    expect(plural(3, "bedroom")).toBe("3 bedrooms");
  });
});

describe("passwords", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });

  it("rejects malformed hashes", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });

  it("generates phone-friendly passwords", () => {
    expect(generatePassword()).toMatch(/^[a-z]+-\d{4}-[a-z]+-\d{4}$/);
  });
});
