import { promises as fs } from "node:fs";
import path from "node:path";

/*
 * Specials and their photos. On Vercel they live in a PRIVATE Blob store
 * (BLOB_READ_WRITE_TOKEN): one JSON file per special, photos served back
 * through /api/photo. Without the token (local dev) they go to ./.data.
 */
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const ROOT = process.env.VERCEL ? "/tmp/ebdt-data" : path.join(process.cwd(), ".data");
const safe = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "_");

export function storageLabel() {
  if (useBlob()) return "Vercel Blob";
  return process.env.VERCEL ? "temporary storage (NOT saved: connect a Blob store)" : "local files (dev)";
}

/* Blob list() can lag a put by a few seconds; merge in what this instance just wrote or deleted. */
const recent = new Map();

export async function listSpecials() {
  let docs = [];
  if (useBlob()) {
    const { list, get } = await import("@vercel/blob");
    let cursor;
    do {
      const page = await list({ prefix: "specials/", cursor, limit: 500 });
      const got = await Promise.all(page.blobs.map(async (b) => {
        try {
          const r = await get(b.pathname, { access: "private", useCache: false });
          if (!r || r.statusCode !== 200 || !r.stream) return null;
          return JSON.parse(await new Response(r.stream).text());
        } catch { return null; }
      }));
      docs.push(...got.filter(Boolean));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } else {
    try {
      const dir = path.join(ROOT, "specials");
      const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
      docs = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(dir, f), "utf8"))));
    } catch { docs = []; }
  }
  const byId = new Map(docs.map((d) => [d.id, d]));
  const now = Date.now();
  for (const [id, v] of recent) {
    if (now - v.at > 60_000) { recent.delete(id); continue; }
    if (v.doc) byId.set(id, v.doc); else byId.delete(id);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveSpecial(doc) {
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    await put(`specials/${safe(doc.id)}.json`, JSON.stringify(doc), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
  } else {
    const dir = path.join(ROOT, "specials");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${safe(doc.id)}.json`), JSON.stringify(doc, null, 2));
  }
  recent.set(doc.id, { doc, at: Date.now() });
}

export async function deleteSpecial(id) {
  const doc = (await listSpecials()).find((d) => d.id === id);
  if (useBlob()) {
    const { del } = await import("@vercel/blob");
    await del(`specials/${safe(id)}.json`).catch(() => {});
  } else {
    await fs.unlink(path.join(ROOT, "specials", `${safe(id)}.json`)).catch(() => {});
  }
  if (doc?.photo) await deletePhoto(doc.photo);
  recent.set(id, { doc: null, at: Date.now() });
}

/* Photos: keys always start with "photos/". */
export async function savePhoto(id, data, contentType) {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const r = await put(`photos/${safe(id)}.${ext}`, data, { access: "private", addRandomSuffix: true, contentType });
    return r.pathname;
  }
  const dir = path.join(ROOT, "photos");
  await fs.mkdir(dir, { recursive: true });
  const name = `${safe(id)}-${Date.now().toString(36)}.${ext}`;
  await fs.writeFile(path.join(dir, name), data);
  return `photos/${name}`;
}

export async function getPhoto(key) {
  if (!/^photos\/[a-zA-Z0-9_.-]+$/.test(key)) return null;
  if (useBlob()) {
    const { get } = await import("@vercel/blob");
    const r = await get(key, { access: "private" }).catch(() => null);
    if (!r || r.statusCode !== 200 || !r.stream) return null;
    return { body: r.stream, contentType: r.blob.contentType || "image/jpeg" };
  }
  try {
    const data = await fs.readFile(path.join(ROOT, key));
    return { body: data, contentType: key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg" };
  } catch { return null; }
}

async function deletePhoto(key) {
  if (!key?.startsWith("photos/")) return;
  if (useBlob()) {
    const { del } = await import("@vercel/blob");
    await del(key).catch(() => {});
  } else {
    await fs.unlink(path.join(ROOT, key)).catch(() => {});
  }
}
