// Read every track's charts for the given dates into the store (data/charts).
// usage: node scripts/crawl-day.mjs [YYYY-MM-DD | YYYY-MM-DD..YYYY-MM-DD ...]
// Default: yesterday and the day before (US Eastern), which re-reads the
// day before to pick up late results.
import { crawlDates, createFormDb, ingestCard, shiftDate } from '../lib/formdb.js';
import { todayEastern } from '../lib/hrn.js';
import { CHARTS_DIR, saveDay } from '../lib/formstore.js';

function expand(args) {
  const out = [];
  for (const a of args) {
    const m = a.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
    if (m) {
      for (let d = m[1]; d <= m[2]; d = shiftDate(d, 1)) out.push(d);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) out.push(a);
  }
  return [...new Set(out)].sort();
}

let dates = expand(process.argv.slice(2));
if (!dates.length) {
  const t = todayEastern();
  dates = [shiftDate(t, -2), shiftDate(t, -1)];
}
const t0 = Date.now();
const results = await crawlDates(dates, { concurrency: 8, log: (m) => console.log(new Date().toISOString(), m) });
let saved = 0;
for (const date of dates) {
  const mine = results.filter((r) => r.date === date);
  const db = createFormDb(date, 1);
  let tracks = 0;
  let failed = 0;
  for (const r of mine) {
    if (!r.card) {
      failed += 1;
      continue;
    }
    tracks += 1;
    ingestCard(db, r.card, r.name);
  }
  if (!tracks) {
    console.log(date, 'no cards found');
    continue;
  }
  const races = db.races.filter((r) => r.date === date);
  saveDay(date, races);
  saved += 1;
  console.log(date, `${tracks} tracks, ${races.length} charted races${failed ? `, ${failed} pages failed` : ''}`);
}
console.log(`saved ${saved} day file(s) to ${CHARTS_DIR} in ${Math.round((Date.now() - t0) / 1000)}s`);
