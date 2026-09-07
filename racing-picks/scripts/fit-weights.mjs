// Fit the model's feature weights by conditional logit on charted races.
// usage: node scripts/fit-weights.mjs <formdb.json> <trainFrom> <trainTo> <testDate>
import { readFileSync } from 'node:fs';
import { loadFormDb, nameKey, trackStatsFromForm } from '../lib/formdb.js';
import { FEATURES, WEIGHTS, rateRace } from '../lib/model.js';

const [, , dbPath, trainFrom, trainTo, testDate] = process.argv;
if (!dbPath || !trainFrom || !trainTo) {
  console.error('usage: node scripts/fit-weights.mjs <formdb.json> <trainFrom> <trainTo> [testDate]');
  process.exit(1);
}
const db = loadFormDb(readFileSync(dbPath, 'utf8'));
const unit = Object.fromEntries(FEATURES.map((k) => [k, 1]));
const statsMemo = new Map();
const statsFor = (track, date) => {
  const key = `${track}|${date}`;
  if (!statsMemo.has(key)) statsMemo.set(key, trackStatsFromForm(db, track, date));
  return statsMemo.get(key);
};

function toRace(rec) {
  const entrants = rec.runners
    .filter((u) => u.pos != null)
    // The stored lastFig comes from an entries page read after the race ran; about a
    // week later the source overwrites it with the figure earned in that race, so
    // training uses only figures from the horse's earlier charts.
    .map((u) => ({ program: u.program || u.name, horse: u.name, sire: u.sire, trainer: u.trainer, jockey: u.jockey, post: u.post, lastFig: null, ml: null, status: '' }));
  return { number: rec.raceNo, distance: rec.isYards ? `${rec.yards}Y` : `${rec.yards / 220}F`, distanceYards: rec.yards, surface: rec.surface, purse: rec.purse, type: rec.type, entrants };
}

function build(dateFrom, dateTo) {
  const out = [];
  for (const rec of db.races) {
    if (rec.date < dateFrom || rec.date > dateTo) continue;
    const race = toRace(rec);
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
  return { races: races.length, hitRate: hits / races.length, llPerRace: ll / races.length, llUniformPerRace: llUniform / races.length };
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
console.log(`train: ${train.length} races from ${trainFrom} to ${trainTo}, avg form coverage ${(train.reduce((a, r) => a + r.coverage, 0) / train.length).toFixed(2)}`);
const hand = FEATURES.map((k) => WEIGHTS[k]);
const fitted = fit(train);
const show = (w) => Object.fromEntries(FEATURES.map((k, i) => [k, +w[i].toFixed(3)]));
console.log('hand weights  ', JSON.stringify(show(hand)));
console.log('fitted weights', JSON.stringify(show(fitted)));
console.log('train hand   ', JSON.stringify(evaluate(train, hand)));
console.log('train fitted ', JSON.stringify(evaluate(train, fitted)));
if (testDate) {
  const test = build(testDate, testDate);
  console.log(`test: ${test.length} races on ${testDate}`);
  console.log('test hand    ', JSON.stringify(evaluate(test, hand)));
  console.log('test fitted  ', JSON.stringify(evaluate(test, fitted)));
}
