/**
 * Uploaded house photos, saved to data/uploads and served by /uploads/[name].
 * shortcut: local disk only; on Vercel switch this module to Vercel Blob (spec §2), callers stay the same.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "uploads");
const NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const UPLOAD_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Saves an image and returns its public URL. Throws on a wrong type or size. */
export async function saveUpload(file: File): Promise<string> {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Photos must be JPG, PNG or WebP.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Photo is too big (max 5 MB).");
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

/** Reads an upload by file name; null for anything that isn't one of ours (blocks ../ tricks). */
export async function readUpload(name: string): Promise<Buffer | null> {
  if (!NAME.test(name)) return null;
  return readFile(path.join(DIR, name)).catch(() => null);
}

export async function deleteUpload(url: string): Promise<void> {
  const name = url.replace(/^\/uploads\//, "");
  if (NAME.test(name)) await unlink(path.join(DIR, name)).catch(() => {});
}
