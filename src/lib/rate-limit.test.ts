import { expect, test } from "vitest";
import { rateLimit } from "./rate-limit";

test("allows up to the limit, blocks after, resets after the window", () => {
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, t)).toBe(true);
  expect(rateLimit("k", 3, 1000, t + 500)).toBe(false);
  expect(rateLimit("k", 3, 1000, t + 1000)).toBe(true);
  expect(rateLimit("other", 3, 1000, t)).toBe(true);
});
