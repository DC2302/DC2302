/*
 * One "special" is anything the owners post to the site: a plate of the day,
 * a notice (closed early, holiday hours) or an event. Every text field is
 * bilingual {en, es}. startsAt / endsAt are epoch ms; endsAt null = until removed.
 */
export const KINDS = ["special", "notice", "event"];
export const LIMITS = { kicker: 36, title: 80, body: 320, price: 12, alt: 140 };

const clip = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const bi = (v, n) => {
  const en = clip(v?.en, n), es = clip(v?.es, n);
  return { en: en || es, es: es || en };
};
const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : null);

export function cleanFields(raw = {}) {
  return {
    kind: KINDS.includes(raw.kind) ? raw.kind : "special",
    kicker: bi(raw.kicker, LIMITS.kicker),
    title: bi(raw.title, LIMITS.title),
    body: bi(raw.body, LIMITS.body),
    price: clip(raw.price, LIMITS.price).replace(/^\$/, "") || null,
    alt: bi(raw.alt, LIMITS.alt),
  };
}

export function cleanSpecial(raw = {}) {
  const startsAt = num(raw.startsAt) ?? Date.now();
  const endsAt = num(raw.endsAt);
  return { ...cleanFields(raw), startsAt, endsAt: endsAt && endsAt > startsAt ? endsAt : null };
}

export function isLive(doc, now = Date.now()) {
  return doc.startsAt <= now && (doc.endsAt == null || doc.endsAt > now);
}

/* What the public page gets: live posts only, no internal fields. */
export function publicView(doc) {
  return {
    id: doc.id, kind: doc.kind, kicker: doc.kicker, title: doc.title, body: doc.body,
    price: doc.price, alt: doc.alt, endsAt: doc.endsAt,
    photo: doc.photo ? `/api/photo?k=${encodeURIComponent(doc.photo)}` : null,
  };
}
