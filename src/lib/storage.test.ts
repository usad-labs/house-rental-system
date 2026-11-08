import { expect, test } from "vitest";
import { deleteUpload, MAX_UPLOAD_BYTES, readUpload, saveUpload } from "./storage";

test("saves an image, serves it back, then deletes it", async () => {
  const url = await saveUpload(new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
  expect(url).toMatch(/^\/uploads\/[a-f0-9]{24}\.jpg$/);
  const name = url.replace("/uploads/", "");
  expect(await readUpload(name)).toEqual(Buffer.from([1, 2, 3]));
  await deleteUpload(url);
  expect(await readUpload(name)).toBeNull();
});

test("rejects non-images and files over the size limit", async () => {
  await expect(saveUpload(new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }))).rejects.toThrow(/JPG, PNG or WebP/);
  await expect(saveUpload(new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "big.jpg", { type: "image/jpeg" }))).rejects.toThrow(/too big/);
});

test("never reads files outside the uploads folder", async () => {
  expect(await readUpload("../rental.db")).toBeNull();
  expect(await readUpload("..%2Frental.db")).toBeNull();
  expect(await readUpload("package.json")).toBeNull();
});
