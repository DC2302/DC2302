import { isAdmin } from "./_lib/auth.js";
import { body, json, parseImage } from "./_lib/http.js";
import { KINDS } from "./_lib/specials.js";
import { draft } from "./_lib/writer.js";

export async function POST(request) {
  if (!isAdmin(request)) return json({ error: "Log in first." }, 401);
  const b = await body(request);
  const note = String(b.note ?? "").trim().slice(0, 1500);
  if (!note) return json({ error: "Write a few words about the special first." }, 400);
  const image = b.image ? parseImage(b.image) : null;
  if (b.image && !image) return json({ error: "That photo couldn't be read. Try a JPG or PNG." }, 400);
  const result = await draft({
    note,
    kind: KINDS.includes(b.kind) ? b.kind : null,
    price: String(b.price ?? "").replace(/[^0-9.]/g, "").slice(0, 8) || null,
    runs: String(b.runs ?? "").slice(0, 80) || null,
    image,
  });
  return json(result);
}
