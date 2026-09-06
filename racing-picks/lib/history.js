// Build a track's recent-results sample from its landing page, which lists the
// dates that already have results.
import { cardPath, fetchHtml, parseCard, parseDateLinks } from './hrn.js';
import { buildTrackStats } from './model.js';

const PAST_REVALIDATE = 6 * 3600; // finished cards do not change
const LANDING_REVALIDATE = 30 * 60;
const memo = new Map(); // slug:date:n -> { at, stats }
const MEMO_MS = 30 * 60 * 1000;

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i], i);
      } catch (err) {
        out[i] = { error: err?.message || String(err) };
      }
    }
  });
  await Promise.all(workers);
  return out;
}

export async function listPastDates(slug, date, firstCard) {
  let dates = [];
  try {
    dates = parseDateLinks(await fetchHtml(`/entries-results/${slug}`, { revalidate: LANDING_REVALIDATE }), slug);
  } catch {
    dates = [];
  }
  if (!dates.length && firstCard) dates = firstCard.dates || [];
  return [...new Set(dates)].filter((d) => d < date).sort();
}

export async function getTrackHistory(slug, date, firstCard, { maxDates = 12 } = {}) {
  const key = `${slug}:${date}:${maxDates}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.stats;

  const dates = (await listPastDates(slug, date, firstCard)).slice(-maxDates);
  const cards = await mapLimit(dates, 6, async (d) =>
    parseCard(await fetchHtml(cardPath(slug, d), { revalidate: PAST_REVALIDATE }), { slug, date: d })
  );
  const stats = buildTrackStats(cards.filter((c) => c && !c.error && Array.isArray(c.races)));
  stats.requestedDates = dates;
  stats.failedDates = dates.filter((_, i) => cards[i]?.error);
  memo.set(key, { at: Date.now(), stats });
  return stats;
}
