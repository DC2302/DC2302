import Anthropic from "@anthropic-ai/sdk";
import { cleanFields, LIMITS } from "./specials.js";

/*
 * Turns the owner's quick note ("enchiladas suizas hoy 11.99") and an optional
 * plate photo into a finished bilingual post. With no key, or if the call
 * fails, it lays the owner's own words out as-is; every field stays editable.
 */
const MODEL = "claude-opus-5-5";

const SYSTEM = `You write the posts that appear on the website of En Boca de Todos Mexican Food, a homestyle Mexican breakfast and lunch restaurant at 703 S Terrell St in Midland, Texas. Phone (432) 218-7078. Open Tuesday to Saturday 6 a.m. to 2 p.m. and Sunday 7 a.m. to 2 p.m.; closed Monday. The name means "on everyone's lips". Regulars are local families, oilfield crews grabbing breakfast burritos, and people craving food that tastes like home.

The owner sends a quick note, often in Spanish, Spanglish or shorthand, sometimes with a photo of the plate. You turn it into a post.

Kinds:
- "special": a dish or deal (plate of the day, weekly special, new item).
- "notice": practical news (closed a day, hours change, sold out, holiday schedule).
- "event": something happening (catering, a celebration, a fundraiser).

For a special, make people hungry and make them not want to miss it. If there is a photo, describe what you actually see on the plate in vivid, appetizing words. Say it's for today only or until it runs out ONLY if the owner said so or the post runs today only. For a notice, be clear and friendly; say what changed and when. Never be cutesy for a notice.

Voice: warm, proud, homestyle, a little playful; plain words. No corporate phrases, no hashtags, no emoji, at most one exclamation point in the whole post.

NEVER invent facts. No prices, dates, times, ingredients, sides or discounts the owner didn't give you or that you can't plainly see in the photo. If a detail isn't there, leave it out.

Write both languages. Spanish is natural Mexican Spanish as spoken in West Texas, using tú (the site says "Llama para ordenar"), not a word-for-word translation. Keep dish names as the owner wrote them.

Return ONLY a JSON object, no other text:
{
  "kind": "special" | "notice" | "event",
  "kicker": {"en": "...", "es": "..."},   short label, max ${LIMITS.kicker} chars, e.g. "Today's special" / "Especial de hoy"
  "title":  {"en": "...", "es": "..."},   the dish or the news, max ${LIMITS.title} chars
  "body":   {"en": "...", "es": "..."},   1 to 3 sentences, max ${LIMITS.body} chars
  "price":  "11.99" or null,              only if the owner gave a price; digits only
  "alt":    {"en": "...", "es": "..."}    photo description for screen readers, max ${LIMITS.alt} chars; empty strings if no photo
}`;

function plain(note, kind, price) {
  const text = note.replace(/\s+/g, " ").trim();
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  const rest = text.slice(first.length).trim();
  const kicker = kind === "notice" ? { en: "Heads up", es: "Aviso" } : kind === "event" ? { en: "Coming up", es: "Próximamente" } : { en: "Today's special", es: "Especial de hoy" };
  return cleanFields({ kind, kicker, title: { en: first, es: first }, body: { en: rest, es: rest }, price });
}

function userContent({ note, kind, price, runs, image }) {
  const lines = [
    `The owner chose: ${kind || "let you decide"}.`,
    price ? `Price the owner entered: $${price}` : "No price entered.",
    runs ? `It runs: ${runs}.` : "",
    image ? "A photo of the plate is attached." : "No photo.",
    "",
    "The owner's note:",
    note,
  ].filter((l) => l !== "");
  const content = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  content.push({ type: "text", text: lines.join("\n") });
  return content;
}

async function ask(client, content, withFallbacks) {
  const params = {
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  };
  if (withFallbacks) return client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
  return client.messages.create(params);
}

export async function draft(input) {
  const kind = input.kind || "special";
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return { draft: plain(input.note, kind, input.price), ai: false, note: "Your words are laid out as-is. Add ANTHROPIC_API_KEY to the Vercel project and the writer will polish and translate them." };
  try {
    const client = new Anthropic({ apiKey: key, timeout: 45_000, maxRetries: 1 });
    const content = userContent(input);
    let res;
    try { res = await ask(client, content, true); }
    catch (e) {
      // An account without the fallback beta gets a 400; retry once without it.
      if (e instanceof Anthropic.BadRequestError) res = await ask(client, content, false);
      else throw e;
    }
    if (res.stop_reason === "refusal") throw new Error("refused");
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const out = cleanFields({ ...parsed, kind: input.kind || parsed.kind, price: input.price || parsed.price });
    if (!out.title.en) throw new Error("no title");
    return { draft: out, ai: true };
  } catch (e) {
    console.error("writer failed:", e?.status ?? "", e?.message ?? e);
    return { draft: plain(input.note, kind, input.price), ai: false, note: "The writer is unavailable right now, so these are your words as-is. Edit anything before publishing." };
  }
}
