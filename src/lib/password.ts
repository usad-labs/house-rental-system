/**
 * Password hashing with Node's built-in scrypt (no native dependencies).
 * Stored format: scrypt$N$r$p$<salt base64>$<hash base64>
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LENGTH = 64;
const DEFAULTS = { N: 16384, r: 8, p: 1 };

function scrypt(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password.normalize("NFKC"), salt, KEY_LENGTH, options, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, DEFAULTS);
  return ["scrypt", DEFAULTS.N, DEFAULTS.r, DEFAULTS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** A random password that is easy to type on a phone, e.g. "kite-7392-moss-1185". */
export function generatePassword(): string {
  const words = [
    "acacia", "bamboo", "coral", "delta", "ember", "fern", "harbor", "island",
    "jade", "kite", "lotus", "mango", "nipa", "orchid", "pearl", "river",
    "sampaguita", "tide", "umbrella", "vine", "willow", "yakal", "zinnia", "moss",
  ];
  const pick = () => words[randomBytes(1)[0] % words.length];
  const num = () => String(1000 + (randomBytes(2).readUInt16BE(0) % 9000));
  return `${pick()}-${num()}-${pick()}-${num()}`;
}
