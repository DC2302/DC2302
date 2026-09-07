// A form database built from the public results pages of every track over a
// window of past dates: each horse's recent finishes, final times, speed
// figures, trip notes, connections and sire. No odds are stored or used.
import { cardPath, clean, fetchHtml, parseCard, parseIndex } from './hrn.js';
import { favoriteOf, findWinner, isRunning, normSurface } from './util.js';

const PAST_REVALIDATE = 6 * 3600;
const TROUBLE =
  /broke (slow|poorly|in the air|through|out|inward|sideways)|bump|checked|steadied|shuffled|blocked|lost (his|her|the) (rider|action|footing)|stumbl|forced (out|wide|in)|impeded|clipped heels|no room|bobbled|hopped|dwelt|off slow|slow(ly)? (to )?(start|begin|break)|awkward|squeezed|pinched|interfer|drift|bore (in|out)|lugged|saddle slipped|floundered|in tight|lacked room|altered course|taken up|fractious|reared/i;

export const nameKey = (s) =>
  clean(s)
    .toLowerCase()
    .replace(/\s*\([a-z]{2,3}\)\s*$/i, '')
    .replace(/[^a-z0-9]/g, '');

export function shiftDate(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);

// "Fractions and final time: :22.15, :45.61, 1:10.98, 1:17.75" -> 77.75 seconds
export function parseFinalTime(fractions) {
  if (!fractions) return null;
  const parts = clean(fractions).split(/,\s*/);
  const last = parts[parts.length - 1] || '';
  const m = last.match(/^(?:(\d+):)?:?(\d{1,2}(?:\.\d+)?)$/);
  if (!m) return null;
  const secs = (m[1] ? parseInt(m[1], 10) * 60 : 0) + parseFloat(m[2]);
  return secs > 0 ? secs : null;
}

// Chart footnotes name each horse in capitals at the start of its comment.
export function splitFootnotes(text, names) {
  const out = {};
  if (!text) return out;
  const up = text.toUpperCase();
  const hits = [];
  for (const n of names) {
    const key = clean(n).toUpperCase();
    if (!key) continue;
    let i = up.indexOf(key);
    while (i >= 0) {
      const before = up.slice(Math.max(0, i - 2), i);
      if (i === 0 || /[.;]\s?$/.test(before)) {
        hits.push({ n, i });
        break;
      }
      i = up.indexOf(key, i + 1);
    }
  }
  hits.sort((a, b) => a.i - b.i);
  hits.forEach((h, k) => {
    const end = k + 1 < hits.length ? hits[k + 1].i : text.length;
    out[nameKey(h.n)] = clean(text.slice(h.i, end));
  });
  return out;
}

export const hasTrouble = (note) => !!(note && TROUBLE.test(note));

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

export function createFormDb(endDate, days) {
  return { endDate, days, races: [], horses: {}, fetched: 0, failed: 0, tracks: new Set(), _agg: new Map() };
}

// Fold one track-date card into the database.
export function ingestCard(db, card, trackName) {
  if (!card || !Array.isArray(card.races)) return;
  db.tracks.add(card.slug);
  for (const race of card.races) {
    const winner = findWinner(race);
    if (!winner || !race.results) continue;
    const entrants = race.entrants.filter((e) => e.horse);
    const finishers = race.results.finishers || [];
    const alsoRans = race.results.alsoRans || [];
    const pos = {};
    finishers.forEach((f, i) => {
      pos[nameKey(f.name)] = { pos: i + 1, fig: f.fig };
    });
    alsoRans.forEach((n, i) => {
      const k = nameKey(n);
      if (!pos[k]) pos[k] = { pos: finishers.length + i + 1, fig: null };
    });
    const field = Math.max(Object.keys(pos).length, entrants.filter(isRunning).length, 2);
    const winTime = parseFinalTime(race.results.fractions);
    const notes = splitFootnotes(race.results.footnotes, entrants.map((e) => e.horse));
    const isYards = /\d\s*y$/i.test(clean(race.distance));
    const surface = normSurface(race.surface);
    const fav = favoriteOf(entrants.filter(isRunning));
    const rec = {
      date: card.date,
      track: card.slug,
      trackName: trackName || card.track?.name || card.slug,
      raceNo: race.number,
      yards: race.distanceYards,
      isYards,
      surface,
      purse: race.purse,
      type: race.type,
      field,
      winTime,
      winner: nameKey(winner.horse),
      winPayoff: finishers[0].win ?? null,
      favorite: fav ? nameKey(fav.horse) : null, // benchmark only, never used by the model
      runners: [],
    };
    for (const e of entrants) {
      const k = nameKey(e.horse);
      const p = pos[k];
      const runner = {
        key: k,
        name: e.horse,
        program: e.program,
        lastFig: e.lastFig ?? null,
        post: e.post,
        jockey: e.jockey,
        trainer: e.trainer,
        sire: e.sire,
        pos: p ? p.pos : null,
        fig: p && p.fig != null ? p.fig : null,
        note: notes[k] || null,
      };
      rec.runners.push(runner);
    }
    db.races.push(rec);
  }
}

// Derive each horse's record list (newest first) from the race records.
export function indexHorses(db) {
  const horses = {};
  for (const rec of db.races) {
    for (const u of rec.runners) {
      if (u.pos == null) continue;
      (horses[u.key] || (horses[u.key] = [])).push({
        date: rec.date,
        track: rec.track,
        trackName: rec.trackName,
        raceNo: rec.raceNo,
        yards: rec.yards,
        isYards: rec.isYards,
        surface: rec.surface,
        purse: rec.purse,
        type: rec.type,
        field: rec.field,
        pos: u.pos,
        fig: u.fig,
        winTime: rec.winTime,
        post: u.post,
        jockey: u.jockey,
        trainer: u.trainer,
        note: u.note,
        trouble: hasTrouble(u.note),
      });
    }
  }
  for (const k of Object.keys(horses)) horses[k].sort((a, b) => (a.date < b.date ? 1 : -1));
  db.horses = horses;
  db._agg = new Map();
  return db;
}

// Read every track's card for the given dates. Returns [{ date, slug, name, card }].
export async function crawlDates(dates, { concurrency = 8, log = () => {} } = {}) {
  const indexes = await mapLimit(dates, concurrency, async (d) => ({
    d,
    tracks: parseIndex(await fetchHtml(`/entries-results/${d}`, { revalidate: PAST_REVALIDATE }), d),
  }));
  const jobs = [];
  for (const ix of indexes) {
    if (!ix || ix.error || !ix.tracks) continue;
    for (const t of ix.tracks) jobs.push({ date: ix.d, slug: t.slug, name: t.name });
  }
  log(`reading ${jobs.length} track-dates`);
  let done = 0;
  const cards = await mapLimit(jobs, concurrency, async (j) => {
    const card = parseCard(await fetchHtml(cardPath(j.slug, j.date), { revalidate: PAST_REVALIDATE }), { slug: j.slug, date: j.date });
    done += 1;
    if (done % 50 === 0) log(`${done}/${jobs.length}`);
    return card;
  });
  return jobs.map((j, i) => ({ ...j, card: cards[i] && !cards[i].error ? cards[i] : null, error: cards[i]?.error || null }));
}

// Crawl every track for `days` dates before endDate.
export async function buildFormDb({ endDate, days = 35, concurrency = 8, log = () => {} } = {}) {
  const db = createFormDb(endDate, days);
  const dates = [];
  for (let k = 1; k <= days; k++) dates.push(shiftDate(endDate, -k));
  const results = await crawlDates(dates, { concurrency, log });
  for (const r of results) {
    db.fetched += 1;
    if (!r.card) {
      db.failed += 1;
      continue;
    }
    ingestCard(db, r.card, r.name);
  }
  return indexHorses(db);
}

export function serializeFormDb(db) {
  return JSON.stringify({ endDate: db.endDate, days: db.days, races: db.races, fetched: db.fetched, failed: db.failed, tracks: [...db.tracks] });
}

export function loadFormDb(json) {
  const o = typeof json === 'string' ? JSON.parse(json) : json;
  const db = createFormDb(o.endDate, o.days);
  db.races = o.races;
  db.fetched = o.fetched;
  db.failed = o.failed;
  db.tracks = new Set(o.tracks || db.races.map((r) => r.track));
  return indexHorses(db);
}

// A horse's records strictly before `beforeDate`, newest first.
export function lookupHorse(db, name, beforeDate) {
  const recs = db.horses[nameKey(name)] || [];
  return recs.filter((r) => r.date < beforeDate);
}

const median = (xs) => {
  const a = [...xs].sort((p, q) => p - q);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};

// Aggregates computed only from races before `beforeDate` (no leakage when
// scoring a past card): par times, sire / trainer / jockey win rates.
export function aggregates(db, beforeDate) {
  const hit = db._agg.get(beforeDate);
  if (hit) return hit;
  const parsBy = {};
  const sires = {};
  const trainers = {};
  const jockeys = {};
  let races = 0;
  let starts = 0;
  const bump = (map, key, won) => {
    if (!key) return;
    const s = map[key] || (map[key] = { starts: 0, wins: 0 });
    s.starts += 1;
    if (won) s.wins += 1;
  };
  for (const r of db.races) {
    if (r.date >= beforeDate) continue;
    races += 1;
    if (r.winTime && r.yards) {
      for (const key of [`${r.track}|${r.yards}|${r.surface}`, `*|${r.yards}|${r.surface}`]) {
        (parsBy[key] || (parsBy[key] = [])).push(r.winTime);
      }
    }
    for (const u of r.runners) {
      if (u.pos == null) continue;
      starts += 1;
      const won = u.pos === 1;
      bump(sires, u.sire, won);
      bump(trainers, u.trainer, won);
      bump(jockeys, u.jockey, won);
    }
  }
  const pars = {};
  for (const [k, xs] of Object.entries(parsBy)) pars[k] = { par: median(xs), n: xs.length };
  const agg = { races, starts, base: starts ? races / starts : 0.1, pars, sires, trainers, jockeys };
  db._agg.set(beforeDate, agg);
  return agg;
}

export function parFor(agg, track, yards, surface) {
  const local = agg.pars[`${track}|${yards}|${surface}`];
  if (local && local.n >= 3) return { ...local, scope: 'track' };
  const global = agg.pars[`*|${yards}|${surface}`];
  if (global && global.n >= 5) return { ...global, scope: 'all tracks' };
  return local && local.n >= 1 ? { ...local, scope: 'track' } : null;
}

export function formSummary(db) {
  return {
    endDate: db.endDate,
    days: db.days,
    races: db.races.length,
    horses: Object.keys(db.horses).length,
    tracks: db.tracks.size,
    fetched: db.fetched,
    failed: db.failed,
  };
}

// Track-level stats (jockey, trainer, post group) rebuilt from the form
// database for one track, using only races before `beforeDate`.
export function trackStatsFromForm(db, slug, beforeDate) {
  const stats = { races: 0, starts: 0, dates: [], jockeys: {}, trainers: {}, posts: {}, buckets: {}, favorite: { starts: 0, wins: 0, roi: 0 } };
  const dates = new Set();
  const bump = (map, key, won) => {
    if (!key) return;
    const s = map[key] || (map[key] = { starts: 0, wins: 0 });
    s.starts += 1;
    if (won) s.wins += 1;
  };
  for (const r of db.races) {
    if (r.track !== slug || r.date >= beforeDate) continue;
    const runners = r.runners.filter((u) => u.pos != null);
    if (runners.length < 2) continue;
    const cls = r.isYards ? (r.yards > 550 ? 'yards-long' : 'yards-sprint') : r.yards >= 1760 ? 'route' : 'sprint';
    const bucket = `${cls}|${r.surface}`;
    stats.races += 1;
    stats.starts += runners.length;
    const b = stats.buckets[bucket] || (stats.buckets[bucket] = { races: 0, starts: 0 });
    b.races += 1;
    b.starts += runners.length;
    dates.add(r.date);
    for (const u of runners) {
      const won = u.pos === 1;
      bump(stats.jockeys, u.jockey, won);
      bump(stats.trainers, u.trainer, won);
      let group = 'unknown';
      if (u.post && r.field > 1) {
        const rel = (u.post - 1) / (r.field - 1);
        group = u.post === 1 ? 'rail' : rel <= 0.34 ? 'inside' : rel <= 0.67 ? 'middle' : 'outside';
      }
      bump(stats.posts, `${bucket}|${group}`, won);
    }
  }
  stats.dates = [...dates].sort();
  return stats;
}

// Rebuild a rateable race object from a stored race record (runners that ran).
export function raceFromRecord(rec) {
  const entrants = rec.runners
    .filter((u) => u.pos != null)
    .map((u) => ({ program: u.program || u.name, horse: u.name, sire: u.sire, trainer: u.trainer, jockey: u.jockey, post: u.post, lastFig: u.lastFig ?? null, ml: null, status: '' }));
  return { number: rec.raceNo, distance: rec.isYards ? `${rec.yards}Y` : `${rec.yards / 220}F`, distanceYards: rec.yards, surface: rec.surface, purse: rec.purse, type: rec.type, entrants };
}
