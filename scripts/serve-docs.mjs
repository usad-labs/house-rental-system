// Tiny static server for the design docs (mockup + sample images).
// Serves only /docs and /public, never other project files. Usage: node scripts/serve-docs.mjs
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Project root = the folder above /scripts (works no matter where it's started from).
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const allowed = [path.join(root, "docs"), path.join(root, "public")];
const port = Number(process.env.PORT || 4310);
const types = {
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".css": "text/css",
  ".md": "text/plain; charset=utf-8",
};

http
  .createServer(async (req, res) => {
    let pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    if (pathname === "/") pathname = "/docs/design/mockup.html";
    const file = path.resolve(root, `.${pathname}`);
    if (!allowed.some((dir) => file.startsWith(dir + path.sep))) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () => console.log(`Design docs: http://localhost:${port}`));
