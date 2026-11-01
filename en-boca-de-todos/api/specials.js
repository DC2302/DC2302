import { randomUUID } from "node:crypto";
import { isAdmin } from "./_lib/auth.js";
import { body, json, parseImage } from "./_lib/http.js";
import { cleanSpecial, isLive, publicView } from "./_lib/specials.js";
import { deleteSpecial, listSpecials, savePhoto, saveSpecial } from "./_lib/store.js";

/* GET: live posts for the public page. GET ?all=1 (owners): everything. */
export async function GET(request) {
  const all = new URL(request.url).searchParams.get("all") === "1";
  const docs = await listSpecials();
  if (all) {
    if (!isAdmin(request)) return json({ error: "Log in first." }, 401);
    const now = Date.now();
    return json({ specials: docs.map((d) => ({ ...publicView(d), startsAt: d.startsAt, createdAt: d.createdAt, live: isLive(d, now), upcoming: d.startsAt > now })) });
  }
  const live = docs.filter((d) => isLive(d)).map(publicView);
  return json({ specials: live }, 200, { "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" });
}

export async function POST(request) {
  if (!isAdmin(request)) return json({ error: "Log in first." }, 401);
  const b = await body(request);
  const doc = { id: randomUUID(), createdAt: Date.now(), ...cleanSpecial(b), photo: null };
  if (!doc.title.en) return json({ error: "A post needs a title." }, 400);
  if (b.image) {
    const img = parseImage(b.image);
    if (!img) return json({ error: "That photo couldn't be read. Try a JPG or PNG." }, 400);
    doc.photo = await savePhoto(doc.id, img.bytes, img.mediaType);
  }
  await saveSpecial(doc);
  return json({ ok: true, special: publicView(doc) });
}

export async function DELETE(request) {
  if (!isAdmin(request)) return json({ error: "Log in first." }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing id." }, 400);
  await deleteSpecial(id);
  return json({ ok: true });
}
