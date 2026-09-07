// The chart store: one gzipped JSON file per race date under data/charts/,
// written by scripts/crawl-day.mjs and committed to the repo, so the form
// database grows every day without re-crawling old pages.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createFormDb, indexHorses, shiftDate } from './formdb.js';

export const DATA_DIR = process.env.RACING_DATA_DIR || path.join(process.cwd(), 'data');
export const CHARTS_DIR = path.join(DATA_DIR, 'charts');
// A horse's "last figure" on an entries page is rewritten with the figure it
// earned in that race roughly a week later. Figures read later than this many
// days after the race date are dropped so they can never leak a result.
export const FRESH_DAYS = 5;

const dayFile = (dir, date) => path.join(dir, `${date}.json.gz`);

export function listDays(dir = CHARTS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((f) => (f.match(/^(\d{4}-\d{2}-\d{2})\.json\.gz$/) || [])[1])
    .filter(Boolean)
    .sort();
}

export function saveDay(date, races, { crawledAt = new Date().toISOString(), dir = CHARTS_DIR } = {}) {
  mkdirSync(dir, { recursive: true });
  const body = JSON.stringify({ date, crawledAt, races });
  writeFileSync(dayFile(dir, date), gzipSync(Buffer.from(body), { level: 9 }));
  return dayFile(dir, date);
}

export function loadDay(date, dir = CHARTS_DIR) {
  const f = dayFile(dir, date);
  if (!existsSync(f)) return null;
  return JSON.parse(gunzipSync(readFileSync(f)).toString('utf8'));
}

const daysLate = (date, crawledAt) => (new Date(crawledAt) - new Date(`${date}T23:59:59Z`)) / 86400000;

// Build a form database from the store: all days before endDate within `days`.
export function loadStore({ endDate, days = 120, dir = CHARTS_DIR } = {}) {
  const all = listDays(dir);
  const from = shiftDate(endDate, -days);
  const dates = all.filter((d) => d < endDate && d >= from);
  if (!dates.length) return null;
  const db = createFormDb(endDate, days);
  db.source = 'store';
  db.dates = dates;
  db.staleFigureDays = [];
  for (const d of dates) {
    const day = loadDay(d, dir);
    if (!day) continue;
    const stale = !day.crawledAt || daysLate(d, day.crawledAt) > FRESH_DAYS;
    if (stale) db.staleFigureDays.push(d);
    for (const rec of day.races) {
      if (stale) for (const u of rec.runners) u.lastFig = null;
      db.races.push(rec);
      db.tracks.add(rec.track);
    }
    db.fetched += 1;
  }
  return indexHorses(db);
}

export function storeSummary(dir = CHARTS_DIR) {
  const days = listDays(dir);
  return { days: days.length, first: days[0] || null, last: days[days.length - 1] || null };
}
