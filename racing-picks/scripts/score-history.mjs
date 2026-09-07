// Rate every stored day using only the data available before it, with the
// current weights, and write the running scorecard to data/scorecard.json.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { nameKey, raceFromRecord, shiftDate, trackStatsFromForm } from '../lib/formdb.js';
import { DATA_DIR, listDays, loadStore } from '../lib/formstore.js';
import { rateRace } from '../lib/model.js';
import { loadWeights } from '../lib/weights.js';

const WARMUP = 14; // days of history a day needs before its picks are scored
const days = listDays();
if (!days.length) {
  console.log('no chart days in the store');
  process.exit(0);
}
const db = loadStore({ endDate: shiftDate(days[days.length - 1], 1), days: 400 });
const { weights, meta } = loadWeights();
const statsMemo = new Map();
const statsFor = (track, date) => {
  const key = `${track}|${date}`;
  if (!statsMemo.has(key)) statsMemo.set(key, trackStatsFromForm(db, track, date));
  return statsMemo.get(key);
};
const round = (n) => Math.round(n * 100) / 100;
const out = { generatedAt: new Date().toISOString(), weights: meta, warmupDays: WARMUP, days: [], tiers: {} };
const tier = (name) => out.tiers[name] || (out.tiers[name] = { races: 0, hits: 0, roi: 0 });
for (const d of days.slice(WARMUP)) {
  const row = { date: d, races: 0, hits: 0, second: 0, third: 0, roi: 0, favRaces: 0, favHits: 0, favRoi: 0 };
  for (const rec of db.races) {
    if (rec.date !== d) continue;
    const race = raceFromRecord(rec);
    if (race.entrants.length < 3) continue;
    rateRace(race, { stats: statsFor(rec.track, d), form: db, date: d, slug: rec.track, weights });
    const [p1, p2, p3] = race.picks.top.map((p) => race.entrants.find((e) => e.program === p));
    const payoff = rec.winPayoff ?? 0;
    const hit = !!(p1 && nameKey(p1.horse) === rec.winner);
    row.races += 1;
    if (hit) {
      row.hits += 1;
      row.roi += payoff - 2;
    } else {
      row.roi -= 2;
      if (p2 && nameKey(p2.horse) === rec.winner) row.second += 1;
      else if (p3 && nameKey(p3.horse) === rec.winner) row.third += 1;
    }
    if (rec.favorite) {
      row.favRaces += 1;
      if (rec.favorite === rec.winner) {
        row.favHits += 1;
        row.favRoi += payoff - 2;
      } else row.favRoi -= 2;
    }
    const t = tier(race.picks.confidence);
    t.races += 1;
    if (hit) {
      t.hits += 1;
      t.roi += payoff - 2;
    } else t.roi -= 2;
  }
  row.roi = round(row.roi);
  row.favRoi = round(row.favRoi);
  out.days.push(row);
}
const sum = (k) => out.days.reduce((a, r) => a + r[k], 0);
out.totals = { from: out.days[0]?.date || null, to: out.days[out.days.length - 1]?.date || null, races: sum('races'), hits: sum('hits'), second: sum('second'), third: sum('third'), roi: round(sum('roi')), favRaces: sum('favRaces'), favHits: sum('favHits'), favRoi: round(sum('favRoi')) };
for (const t of Object.values(out.tiers)) t.roi = round(t.roi);
const file = path.join(DATA_DIR, 'scorecard.json');
writeFileSync(file, JSON.stringify(out, null, 1));
const T = out.totals;
console.log(`scored ${T.races} races over ${out.days.length} days (${T.from} to ${T.to}): top pick ${T.hits} (${((T.hits / T.races) * 100).toFixed(1)}%), $2 win net ${T.roi}; crowd favorite ${T.favHits}/${T.favRaces} (${((T.favHits / (T.favRaces || 1)) * 100).toFixed(1)}%), net ${T.favRoi}`);
console.log('tiers', JSON.stringify(out.tiers));
console.log('wrote', file);
