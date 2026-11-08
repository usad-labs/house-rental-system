import { readUpload, UPLOAD_TYPES } from "@/lib/storage";

/** Serves uploaded house photos (public: they are shown on the website). */
export async function GET(_req: Request, { params }: RouteContext<"/uploads/[name]">) {
  const { name } = await params;
  const body = await readUpload(name);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": UPLOAD_TYPES[name.split(".").pop() ?? ""] ?? "application/octet-stream",
      // File names are random and never reused, so they can be cached forever.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
