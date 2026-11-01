// Local stand-in for Vercel: serves the static site and runs api/*.js with Web Request/Response.
// Usage: ADMIN_PASSWORD=... node scripts/dev.mjs [port]   (data goes to ./.data)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const port = Number(process.argv[2] || 4875);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".xml": "application/xml", ".txt": "text/plain" };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, "");
      const mod = await import(pathToFileURL(path.join(root, "api", `${name}.js`)).href);
      const handler = mod[req.method];
      if (!handler) { res.writeHead(405).end(); return; }
      const chunks = []; for await (const c of req) chunks.push(c);
      const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) });
      const out = await handler(request);
      const headers = {}; out.headers.forEach((v, k) => { headers[k] = v; });
      res.writeHead(out.status, headers);
      res.end(Buffer.from(await out.arrayBuffer()));
      return;
    }
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, "index.html");
    else if (!path.extname(file)) file += ".html";
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }).end(data);
  } catch (e) {
    if (e.code === "ENOENT" || e.code === "ERR_MODULE_NOT_FOUND") { res.writeHead(404).end("Not found"); return; }
    console.error(e); res.writeHead(500).end(String(e));
  }
}).listen(port, () => console.log(`En Boca dev on http://localhost:${port}`));
