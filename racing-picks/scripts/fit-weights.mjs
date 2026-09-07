// Fit the model's feature weights by conditional logit on charted races.
//
//   node scripts/fit-weights.mjs                          store mode: data/charts, last 7 days held out
//   node scripts/fit-weights.mjs --holdout 7 --warmup 14 --out data/weights.json
//   node scripts/fit-weights.mjs <formdb.json> <trainFrom> <trainTo> [testDate]   legacy file mode
import { readFileSync, writeFileSync } from 'node:fs';
import { loadFormDb, nameKey, raceFromRecord, shiftDate, trackStatsFromForm } from '../lib/formdb.js';
import { listDays, loadStore } from '../lib/formstore.js';
import { FEATURES, WEIGHTS, rateRace } from '../lib/model.js';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));

let db;
let trainFrom;
let trainTo;
let testFrom;
let testTo;
if (positional[0] && positional[0].endsWith('.json')) {
  db = loadFormDb(readFileSync(positional[0], 'utf8'));
  [, trainFrom, trainTo, testFrom] = positional;
  testTo = testFrom;
} else {
  const days = listDays();
  if (!days.length) {
    console.error('no chart days in the store; run scripts/crawl-day.mjs first');
    process.exit(1);
  }
  const holdout = parseInt(flag('--holdout', '7'), 10);
  const warmup = parseInt(flag('--warmup', '14'), 10);
  db = loadStore({ endDate: shiftDate(days[days.length - 1], 1), days: 400 });
  trainFrom = days[Math.min(warmup, days.length - 1)];
  trainTo = days[Math.max(0, days.length - holdout - 1)];
  testFrom = days[Math.max(0, days.length - holdout)];
  testTo = days[days.length - 1];
}

const unit = Object.fromEntries(FEATURES.map((k) => [k, 1]));
const statsMemo = new Map();
const statsFor = (track, date) => {
  const key = `${track}|${date}`;
  if (!statsMemo.has(key)) statsMemo.set(key, trackStatsFromForm(db, track, date));
  return statsMemo.get(key);
};

function build(dateFrom, dateTo) {
  const out = [];
  for (const rec of db.races) {
    if (rec.date < dateFrom || rec.date > dateTo) continue;
    const race = raceFromRecord(rec);
    if (race.entrants.length < 3) continue;
    rateRace(race, { stats: statsFor(rec.track, rec.date), form: db, date: rec.date, slug: rec.track, weights: unit });
    const winIdx = race.entrants.findIndex((e) => nameKey(e.horse) === rec.winner);
    if (winIdx < 0) continue;
    out.push({ X: race.entrants.map((e) => FEATURES.map((k) => e.features[k])), win: winIdx, n: race.entrants.length, coverage: race.picks.coverage });
  }
  return out;
}

function evaluate(races, w) {
  let ll = 0;
  let hits = 0;
  let llUniform = 0;
  for (const r of races) {
    const s = r.X.map((x) => x.reduce((a, v, k) => a + v * w[k], 0));
    const mx = Math.max(...s);
    const ex = s.map((v) => Math.exp(v - mx));
    const z = ex.reduce((a, b) => a + b, 0);
    const p = ex.map((v) => v / z);
    ll += Math.log(p[r.win]);
    llUniform += Math.log(1 / r.n);
    if (p.indexOf(Math.max(...p)) === r.win) hits += 1;
  }
  const n = races.length || 1;
  return { races: races.length, hitRate: +(hits / n).toFixed(4), llPerRace: +(ll / n).toFixed(4), llUniformPerRace: +(llUniform / n).toFixed(4) };
}

function fit(races, { iters = 600, lr = 0.3, l2 = 0.02 } = {}) {
  const K = FEATURES.length;
  let w = new Array(K).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array(K).fill(0);
    for (const r of races) {
      const s = r.X.map((x) => x.reduce((a, v, k) => a + v * w[k], 0));
      const mx = Math.max(...s);
      const ex = s.map((v) => Math.exp(v - mx));
      const z = ex.reduce((a, b) => a + b, 0);
      for (let k = 0; k < K; k++) {
        let expect = 0;
        for (let i = 0; i < r.n; i++) expect += (ex[i] / z) * r.X[i][k];
        grad[k] += r.X[r.win][k] - expect;
      }
    }
    w = w.map((v, k) => v + lr * (grad[k] / races.length - l2 * v));
  }
  return w;
}

const train = build(trainFrom, trainTo);
if (!train.length) {
  console.error('no training races in range');
  process.exit(1);
}
console.log(`train: ${train.length} races from ${trainFrom} to ${trainTo}, avg form coverage ${(train.reduce((a, r) => a + r.coverage, 0) / train.length).toFixed(2)}${db.staleFigureDays ? `, ${db.staleFigureDays.length} day(s) with figures dropped as post-race` : ''}`);
const hand = FEATURES.map((k) => WEIGHTS[k]);
const fitted = fit(train);
const show = (w) => Object.fromEntries(FEATURES.map((k, i) => [k, +w[i].toFixed(3)]));
console.log('current weights', JSON.stringify(show(hand)));
console.log('fitted weights ', JSON.stringify(show(fitted)));
const trainEval = { from: trainFrom, to: trainTo, current: evaluate(train, hand), fitted: evaluate(train, fitted) };
console.log('train', JSON.stringify(trainEval));
let testEval = null;
if (testFrom) {
  const test = build(testFrom, testTo);
  testEval = { from: testFrom, to: testTo, current: evaluate(test, hand), fitted: evaluate(test, fitted) };
  console.log('test ', JSON.stringify(testEval));
}
const out = flag('--out', null);
if (out) {
  writeFileSync(out, JSON.stringify({ weights: show(fitted), fittedAt: new Date().toISOString(), train: trainEval, test: testEval }, null, 1));
  console.log('wrote', out);
}
