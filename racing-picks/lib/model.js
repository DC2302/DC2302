// A fundamentals rating. Odds and favorites play no part in it.
//
// For every runner the model builds seven components from the horse's own
// record and the track's recent results, each explained in plain words:
//   speed      last / best speed figure, or final time against par (Quarter Horses)
//   form       recent finishes as a share of the field beaten, recency weighted,
//              with a troubled trip excused
//   class      purse of recent races against today's purse
//   fitness    days since the last race
//   connections trainer and jockey win rates, at this track when known
//   post       post-group win rate for this race shape at this track
//   pedigree   sire's win rate across the form database (weighted up for
//              horses with no recent record)
// rating = weighted sum; win probability = softmax(rating) within the race.
import { clean, isYards } from './hrn.js';
import { aggregates, daysBetween, lookupHorse, parFor } from './formdb.js';
import { favoriteOf, findWinner, impliedProb, isRunning, mean, moneyShort, normSurface, ordinal, parseOdds, sd } from './util.js';

export { favoriteOf, findWinner, impliedProb, isRunning, normSurface, parseOdds };

// Feature weights. Speed and form are z-scored within the race; the "no..."
// flags mark missing data; recent / quick are days-since-last-race flags;
// trainer, jockey, post and sire are log win-rate factors; fit is the average
// finish at today's distance and surface. Fit with scripts/fit-weights.mjs.
// Fitted by conditional logit on 5,525 charted races (Jul 20 to Sep 5, 2026)
// with the entries' last figure excluded from training (see scripts/fit-weights.mjs).
// Holdout Sep 6, 2026: top pick won 45 of 146 (31%), log-likelihood -1.75 per
// race against -1.90 for a uniform guess.
export const WEIGHTS = { speed: 0.26, noSpeed: -0.05, form: 0.18, noForm: 0.02, klass: 0.51, recent: -0.03, quick: -0.01, trainer: 0.44, jockey: 0.56, post: 0.21, sire: 0.13, fit: 0.19 };
export const FEATURES = Object.keys(WEIGHTS);
export const SHRINK = { connections: 25, post: 40, sire: 30 };
export const TEMPERATURE = 1.0;
const FACTOR_MIN = 0.5;
const FACTOR_MAX = 2.0;
const POS_PENALTY = { yards: 0.35, other: 0.4 }; // % of par per finishing position behind the winner
const RECENCY = 0.6;

export function raceBucket(race) {
  const y = race.distanceYards;
  let cls;
  if (isYards(race.distance)) cls = y != null && y > 550 ? 'yards-long' : 'yards-sprint';
  else cls = y != null && y >= 1760 ? 'route' : 'sprint';
  return `${cls}|${normSurface(race.surface)}`;
}

export function postGroup(post, fieldSize) {
  if (!post || !fieldSize || fieldSize < 2) return 'unknown';
  if (post === 1) return 'rail';
  const r = (post - 1) / (fieldSize - 1);
  return r <= 0.34 ? 'inside' : r <= 0.67 ? 'middle' : 'outside';
}

function bump(map, key, won) {
  if (!key) return;
  const s = map[key] || (map[key] = { starts: 0, wins: 0 });
  s.starts += 1;
  if (won) s.wins += 1;
}

const shrunk = (stat, base, k) => ((stat?.wins || 0) + k * base) / ((stat?.starts || 0) + k);
const clampF = (f) => Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, Number.isFinite(f) && f > 0 ? f : 1));
const fmtPct = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;

function zscores(values) {
  const xs = values.filter((v) => v != null);
  if (xs.length < 2) return values.map(() => 0);
  const m = mean(xs);
  const s = sd(xs) || 1;
  return values.map((v) => (v == null ? 0 : (v - m) / s));
}

// Track-level stats from that track's recent cards (jockey, trainer, post groups).
export function buildTrackStats(cards) {
  const stats = { races: 0, starts: 0, dates: [], jockeys: {}, trainers: {}, posts: {}, buckets: {}, favorite: { starts: 0, wins: 0, roi: 0 } };
  for (const card of cards) {
    let used = false;
    for (const race of card.races) {
      const winner = findWinner(race);
      if (!winner) continue;
      const runners = race.entrants.filter(isRunning);
      if (!runners.includes(winner)) runners.push(winner);
      if (runners.length < 2) continue;
      used = true;
      const bucket = raceBucket(race);
      stats.races += 1;
      stats.starts += runners.length;
      const b = stats.buckets[bucket] || (stats.buckets[bucket] = { races: 0, starts: 0 });
      b.races += 1;
      b.starts += runners.length;
      const payoff = race.results.finishers[0].win || 0;
      const fav = favoriteOf(runners);
      if (fav) {
        stats.favorite.starts += 1;
        if (fav === winner) {
          stats.favorite.wins += 1;
          stats.favorite.roi += payoff - 2;
        } else stats.favorite.roi -= 2;
      }
      for (const e of runners) {
        const won = e === winner;
        bump(stats.jockeys, e.jockey, won);
        bump(stats.trainers, e.trainer, won);
        bump(stats.posts, `${bucket}|${postGroup(e.post, runners.length)}`, won);
      }
    }
    if (used && card.date) stats.dates.push(card.date);
  }
  stats.dates.sort();
  return stats;
}

function speedFromFigures(e, recs) {
  const figs = [e.lastFig, ...recs.map((r) => r.fig)].filter((f) => f != null);
  if (!figs.length) return null;
  const last = e.lastFig != null ? e.lastFig : recs.find((r) => r.fig != null).fig;
  const best = Math.max(...figs);
  return { value: 0.6 * last + 0.4 * best, text: `speed figure ${last} last, ${best} best` };
}

function speedFromPar(recs, agg) {
  const ratings = [];
  for (const r of recs.slice(0, 4)) {
    if (!r.winTime || !r.yards) continue;
    const par = parFor(agg, r.track, r.yards, r.surface);
    if (!par) continue;
    const k = r.isYards ? POS_PENALTY.yards : POS_PENALTY.other;
    const est = r.winTime * (1 + (k * (r.pos - 1)) / 100);
    ratings.push(((par.par - est) / par.par) * 100);
  }
  if (!ratings.length) return null;
  const last = ratings[0];
  const best = Math.max(...ratings);
  return { value: 0.6 * last + 0.4 * best, text: `time ${fmtPct(last)} vs par last out, ${fmtPct(best)} best (estimated from finish position)` };
}

function formValue(recs) {
  const rs = recs.slice(0, 5);
  if (!rs.length) return null;
  let num = 0;
  let den = 0;
  rs.forEach((r, i) => {
    let pctl = r.field > 1 ? (r.field - r.pos) / (r.field - 1) : 0.5;
    if (r.trouble && r.pos > 3) pctl = Math.max(pctl, 0.5);
    const w = RECENCY ** i;
    num += w * pctl;
    den += w;
  });
  const text = rs.slice(0, 3).map((r) => `${ordinal(r.pos)} of ${r.field}${r.trouble ? ' (trouble)' : ''} at ${r.trackName} ${r.date.slice(5)}`).join('; ');
  return { value: num / den, text };
}

function classValue(recs, purse) {
  const ps = recs.slice(0, 3).map((r) => r.purse).filter((p) => p > 0);
  if (!ps.length || !purse) return null;
  const recent = mean(ps);
  const v = Math.max(-1, Math.min(1, Math.log(recent / purse)));
  const text = recent > purse * 1.15 ? `drops in class from ${moneyShort(recent)} races` : recent < purse / 1.15 ? `steps up from ${moneyShort(recent)} races` : 'same class as recent races';
  return { value: v, text };
}

function fitnessValue(recs, date) {
  if (!recs.length) return { recent: 0, quick: 0, days: null, text: 'no race in the form window' };
  const d = daysBetween(recs[0].date, date);
  return { recent: d >= 7 && d <= 45 ? 1 : 0, quick: d < 7 ? 1 : 0, days: d, text: `${d} days since last race` };
}

function fitValue(recs, race) {
  const y = race.distanceYards;
  const surf = normSurface(race.surface);
  const yards = isYards(race.distance);
  const rs = recs.filter((r) => r.isYards === yards && r.surface === surf && r.yards && y && Math.abs(r.yards - y) / y <= 0.15);
  if (!rs.length) return null;
  const pctl = mean(rs.map((r) => (r.field > 1 ? (r.field - r.pos) / (r.field - 1) : 0.5)));
  return { value: pctl - 0.5, text: `${rs.length} recent race${rs.length > 1 ? 's' : ''} at this distance and surface, average finish beat ${Math.round(pctl * 100)}% of the field` };
}

// Rate one race. ctx = { stats: track stats or null, form: form db or null, date, slug }.
export function rateRace(race, ctx = {}) {
  const { stats = null, form = null, date = null, slug = null } = ctx;
  const runners = race.entrants.filter(isRunning);
  const n = runners.length;
  const bucket = raceBucket(race);
  const haveStats = !!(stats && stats.races);
  const agg = form && date ? aggregates(form, date) : null;
  const base = haveStats ? stats.races / stats.starts : agg && agg.starts ? agg.base : n ? 1 / n : 0.1;
  const bStat = haveStats ? stats.buckets[bucket] : null;
  const bucketBase = bStat && bStat.starts ? bStat.races / bStat.starts : base;

  const recsOf = runners.map((e) => (form && date ? lookupHorse(form, e.horse, date) : []));
  const figCount = runners.filter((e, i) => e.lastFig != null || recsOf[i].some((r) => r.fig != null)).length;
  const useFigs = !isYards(race.distance) && figCount >= Math.max(2, Math.ceil(n / 2));

  const comp = runners.map((e, i) => {
    const recs = recsOf[i];
    const speed = useFigs ? speedFromFigures(e, recs) : agg ? speedFromPar(recs, agg) : null;
    const formV = formValue(recs);
    const klass = classValue(recs, race.purse);
    const fitness = fitnessValue(recs, date || '9999-12-31');
    const fit = fitValue(recs, race);
    const jTrack = haveStats ? stats.jockeys[e.jockey] : null;
    const tTrack = haveStats ? stats.trainers[e.trainer] : null;
    const jStat = jTrack && jTrack.starts ? jTrack : agg ? agg.jockeys[e.jockey] : null;
    const tStat = tTrack && tTrack.starts ? tTrack : agg ? agg.trainers[e.trainer] : null;
    const jf = clampF(shrunk(jStat, base, SHRINK.connections) / base);
    const tf = clampF(shrunk(tStat, base, SHRINK.connections) / base);
    const pf = haveStats ? clampF(shrunk(stats.posts[`${bucket}|${postGroup(e.post, n)}`], bucketBase, SHRINK.post) / bucketBase) : 1;
    const sStat = agg ? agg.sires[e.sire] : null;
    const sf = agg ? clampF(shrunk(sStat, agg.base, SHRINK.sire) / agg.base) : 1;
    return { recs, speed, form: formV, klass, fitness, fit, jf, tf, pf, sf, jStat, tStat, sStat };
  });

  const zSpeed = zscores(comp.map((c) => (c.speed ? c.speed.value : null)));
  const zForm = zscores(comp.map((c) => (c.form ? c.form.value : null)));
  const weights = ctx.weights || WEIGHTS;

  const rated = comp.map((c, i) => {
    const features = {
      speed: zSpeed[i],
      noSpeed: c.speed ? 0 : 1,
      form: zForm[i],
      noForm: c.recs.length ? 0 : 1,
      klass: c.klass ? c.klass.value : 0,
      recent: c.fitness.recent,
      quick: c.fitness.quick,
      trainer: Math.log(c.tf),
      jockey: Math.log(c.jf),
      post: Math.log(c.pf),
      sire: Math.log(c.sf),
      fit: c.fit ? c.fit.value : 0,
    };
    let total = 0;
    for (const k of FEATURES) total += (weights[k] || 0) * features[k];
    const w = (k) => (weights[k] || 0) * features[k];
    const parts = {
      speed: w('speed') + w('noSpeed'),
      form: w('form') + w('noForm'),
      klass: w('klass'),
      fitness: w('recent') + w('quick'),
      connections: w('trainer') + w('jockey'),
      post: w('post'),
      sire: w('sire'),
      fit: w('fit'),
    };
    return { features, parts, total };
  });

  const mx = rated.length ? Math.max(...rated.map((r) => r.total)) : 0;
  const ex = rated.map((r) => Math.exp((r.total - mx) * TEMPERATURE));
  const z = ex.reduce((a, b) => a + b, 0) || 1;

  runners.forEach((e, i) => {
    const c = comp[i];
    const r = rated[i];
    e.prob = ex[i] / z;
    e.rating = r.total;
    e.parts = r.parts;
    e.features = r.features;
    e.hasForm = c.recs.length > 0;
    e.mlOdds = parseOdds(e.ml); // reference only, never used above
    e.detail = {
      speed: c.speed ? c.speed.text : useFigs ? 'no speed figure on record' : 'no timed race in the window',
      form: c.form ? c.form.text : 'no recent race found in the form window',
      klass: c.klass ? c.klass.text : null,
      fitness: c.fitness.text,
      fit: c.fit ? c.fit.text : null,
      connections: `${e.trainer || 'trainer'} ${c.tStat && c.tStat.starts ? `${c.tStat.wins}/${c.tStat.starts}` : 'no starts on record'}, ${e.jockey || 'jockey'} ${c.jStat && c.jStat.starts ? `${c.jStat.wins}/${c.jStat.starts}` : 'no starts on record'}`,
      post: haveStats ? `${postGroup(e.post, n)} post, factor ×${c.pf.toFixed(2)}` : 'no post data',
      sire: c.sStat && c.sStat.starts ? `${e.sire}: ${c.sStat.wins}/${c.sStat.starts} winners in the window` : `${e.sire || 'sire'}: no runners in the window`,
      lastNote: c.recs[0] && c.recs[0].note ? c.recs[0].note : null,
      trouble: !!(c.recs[0] && c.recs[0].trouble),
      records: c.recs.slice(0, 5),
    };
    e.speedText = c.speed ? (useFigs ? `${e.lastFig ?? '–'}` : fmtPct(c.speed.value)) : '–';
    e.formText = c.recs.length ? c.recs.slice(0, 3).map((x) => `${x.pos}/${x.field}`).join(' ') : '–';
    e.days = c.fitness.days;
  });
  race.entrants.filter((e) => !isRunning(e)).forEach((e) => {
    e.prob = null;
    e.rating = null;
    e.parts = null;
    e.features = null;
    e.rank = null;
    e.mlOdds = parseOdds(e.ml);
    e.detail = null;
    e.speedText = '–';
    e.formText = '–';
    e.days = null;
  });

  const ranked = [...runners].sort((a, b) => b.prob - a.prob);
  ranked.forEach((e, i) => {
    e.rank = i + 1;
  });
  const p1 = ranked[0]?.prob || 0;
  const p2 = ranked[1]?.prob || 0;
  const coverage = n ? runners.filter((e) => e.hasForm).length / n : 0;
  race.picks = {
    top: ranked.slice(0, 3).map((e) => e.program),
    confidence: coverage < 0.34 ? 'thin' : p1 >= 0.35 && p1 - p2 >= 0.1 && coverage >= 0.5 ? 'strong' : p1 >= 0.22 ? 'lean' : 'open',
    coverage,
    basis: useFigs ? 'speed figures' : 'final times against par',
    bucket,
    usedHistory: haveStats,
    usedForm: !!(form && date),
  };
  return race;
}

// How the picks did on races that already have results ($2 flat win bets).
// The morning-line favorite is scored alongside purely as a benchmark.
export function scoreCard(races) {
  const sc = { completed: 0, topPickWins: 0, secondPickWins: 0, thirdPickWins: 0, topPickRoi: 0, favWins: 0, favRoi: 0, valueBets: 0, valueWins: 0, valueRoi: 0 };
  for (const race of races) {
    const winner = findWinner(race);
    if (!winner || !race.picks) continue;
    const payoff = race.results.finishers[0].win || 0;
    sc.completed += 1;
    const [t1, t2, t3] = race.picks.top;
    if (winner.program === t1) {
      sc.topPickWins += 1;
      sc.topPickRoi += payoff - 2;
    } else {
      sc.topPickRoi -= 2;
      if (winner.program === t2) sc.secondPickWins += 1;
      else if (winner.program === t3) sc.thirdPickWins += 1;
    }
    const fav = favoriteOf(race.entrants.filter(isRunning));
    if (fav) {
      if (fav === winner) {
        sc.favWins += 1;
        sc.favRoi += payoff - 2;
      } else sc.favRoi -= 2;
    }
    race.outcome = { winner: winner.program, winnerName: winner.horse, winnerMl: winner.ml, payoff, topPickHit: winner.program === t1, winnerRank: winner.rank || null };
  }
  return sc;
}

// Compact view of the track stats for the UI.
export function summarizeStats(stats, card) {
  if (!stats || !stats.races) return null;
  const top = (map, k = 5) =>
    Object.entries(map)
      .map(([name, s]) => ({ name, starts: s.starts, wins: s.wins, rate: s.starts ? s.wins / s.starts : 0 }))
      .filter((r) => r.starts >= 3)
      .sort((a, b) => b.wins - a.wins || b.rate - a.rate)
      .slice(0, k);
  const buckets = new Set((card?.races || []).map(raceBucket));
  const posts = {};
  for (const [key, s] of Object.entries(stats.posts)) {
    const [cls, surf, group] = key.split('|');
    const b = `${cls}|${surf}`;
    if (!buckets.has(b)) continue;
    (posts[b] || (posts[b] = {}))[group] = { starts: s.starts, wins: s.wins, rate: s.starts ? s.wins / s.starts : 0 };
  }
  return {
    races: stats.races,
    starts: stats.starts,
    dates: stats.dates,
    favorite: { starts: stats.favorite.starts, wins: stats.favorite.wins, rate: stats.favorite.starts ? stats.favorite.wins / stats.favorite.starts : null, roi: stats.favorite.roi },
    topJockeys: top(stats.jockeys),
    topTrainers: top(stats.trainers),
    posts,
    weights: WEIGHTS,
    shrink: SHRINK,
  };
}
