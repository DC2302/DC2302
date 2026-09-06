// A transparent rating model. Every number it uses is visible in the UI.
//
// score = ln(market prob from the morning line)
//       + W.jockey  * ln(jockey factor)     jockey win rate at this track vs. track average
//       + W.trainer * ln(trainer factor)    trainer win rate at this track vs. track average
//       + W.post    * ln(post factor)       post-group win rate for this race shape vs. average
//       + ln(figure factor)                 last speed figure vs. field median (Thoroughbreds)
// win probability = softmax(score) within the race.
// Factors are shrunk toward 1.0 with a prior so small samples cannot dominate.
import { clean, isYards } from './hrn.js';

export const WEIGHTS = { jockey: 0.5, trainer: 0.5, post: 0.6, figure: 0.02 };
export const SHRINK = { connections: 25, post: 40 };
const FACTOR_MIN = 0.5;
const FACTOR_MAX = 2.0;

export const isRunning = (e) => !e.status; // '' means in the race; SCR/AE/MTO are not

export function parseOdds(text) {
  if (!text) return null;
  const t = clean(text).toUpperCase();
  if (t === 'EVN' || t === 'EVEN' || t === 'EV') return 1;
  const m = t.match(/^(\d+(?:\.\d+)?)\s*[/-]\s*(\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[1]) / parseFloat(m[2]);
  const n = parseFloat(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const impliedProb = (odds) => (odds == null ? null : 1 / (odds + 1));

export function normSurface(surface) {
  const t = (surface || '').toLowerCase();
  if (t.includes('turf')) return 'turf';
  if (t.includes('dirt')) return 'dirt';
  if (/synth|tapeta|poly|all.?weather/.test(t)) return 'synth';
  return t || 'dirt';
}

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

export function favoriteOf(runners) {
  let best = null;
  let bestOdds = Infinity;
  for (const e of runners) {
    const o = parseOdds(e.ml);
    if (o != null && o < bestOdds) {
      bestOdds = o;
      best = e;
    }
  }
  return best;
}

export function findWinner(race) {
  const f = race.results?.finishers?.[0];
  if (!f) return null;
  const byProgram = race.entrants.find((e) => e.program && f.program && e.program === f.program);
  if (byProgram) return byProgram;
  const lc = (f.name || '').toLowerCase();
  return race.entrants.find((e) => (e.horse || '').toLowerCase() === lc) || null;
}

function bump(map, key, won) {
  if (!key) return;
  const s = map[key] || (map[key] = { starts: 0, wins: 0 });
  s.starts += 1;
  if (won) s.wins += 1;
}

const median = (xs) => {
  const a = [...xs].sort((p, q) => p - q);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};

const shrunk = (stat, base, k) => ((stat?.wins || 0) + k * base) / ((stat?.starts || 0) + k);
const clampF = (f) => Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, Number.isFinite(f) && f > 0 ? f : 1));

// Aggregate past results at one track into the stats the model uses.
export function buildTrackStats(cards) {
  const stats = {
    races: 0,
    starts: 0,
    dates: [],
    jockeys: {},
    trainers: {},
    posts: {},
    buckets: {},
    favorite: { starts: 0, wins: 0, roi: 0 },
  };
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
        } else {
          stats.favorite.roi -= 2;
        }
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

// Attach probabilities, factors, ranks and picks to one race (mutates entrants).
export function rateRace(race, stats) {
  const runners = race.entrants.filter(isRunning);
  const n = runners.length;
  const bucket = raceBucket(race);
  const haveStats = !!(stats && stats.races);
  const base = haveStats ? stats.races / stats.starts : n ? 1 / n : 0.1;
  const bStat = haveStats ? stats.buckets[bucket] : null;
  const bucketBase = bStat && bStat.starts ? bStat.races / bStat.starts : base;

  const odds = runners.map((e) => parseOdds(e.ml));
  const known = odds.filter((o) => o != null).map(impliedProb);
  const fill = known.length ? median(known) : 1 / Math.max(n, 1);
  const raw = odds.map((o) => (o == null ? fill : impliedProb(o)));
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  const market = raw.map((p) => p / total);

  const figs = runners.map((e) => e.lastFig).filter((f) => f != null);
  const figMedian = figs.length >= Math.max(3, Math.ceil(n / 2)) ? median(figs) : null;

  const scores = runners.map((e, i) => {
    const jf = haveStats ? clampF(shrunk(stats.jockeys[e.jockey], base, SHRINK.connections) / base) : 1;
    const tf = haveStats ? clampF(shrunk(stats.trainers[e.trainer], base, SHRINK.connections) / base) : 1;
    const pf = haveStats
      ? clampF(shrunk(stats.posts[`${bucket}|${postGroup(e.post, n)}`], bucketBase, SHRINK.post) / bucketBase)
      : 1;
    const ff =
      figMedian != null && e.lastFig != null ? clampF(Math.exp(WEIGHTS.figure * (e.lastFig - figMedian))) : 1;
    e.factors = { market: market[i], jockey: jf, trainer: tf, post: pf, figure: ff };
    return (
      Math.log(Math.max(market[i], 1e-6)) +
      WEIGHTS.jockey * Math.log(jf) +
      WEIGHTS.trainer * Math.log(tf) +
      WEIGHTS.post * Math.log(pf) +
      Math.log(ff)
    );
  });
  const mx = scores.length ? Math.max(...scores) : 0;
  const ex = scores.map((s) => Math.exp(s - mx));
  const z = ex.reduce((a, b) => a + b, 0) || 1;

  runners.forEach((e, i) => {
    e.prob = ex[i] / z;
    e.mlOdds = odds[i];
    e.mlProb = market[i];
    e.fairOdds = e.prob > 0 ? (1 - e.prob) / e.prob : null;
    e.edge = e.prob - market[i];
    e.value = e.prob >= 0.1 && e.prob >= 1.2 * market[i] && (odds[i] == null || odds[i] >= 2);
  });
  race.entrants
    .filter((e) => !isRunning(e))
    .forEach((e) => {
      e.prob = null;
      e.mlOdds = parseOdds(e.ml);
      e.mlProb = null;
      e.fairOdds = null;
      e.edge = null;
      e.value = false;
      e.factors = null;
      e.rank = null;
    });

  const ranked = [...runners].sort((a, b) => b.prob - a.prob);
  ranked.forEach((e, i) => {
    e.rank = i + 1;
  });
  const p1 = ranked[0]?.prob || 0;
  const p2 = ranked[1]?.prob || 0;
  race.picks = {
    top: ranked.slice(0, 3).map((e) => e.program),
    confidence: p1 >= 0.4 && p1 - p2 >= 0.12 ? 'strong' : p1 >= 0.28 ? 'lean' : 'open',
    value: runners.filter((e) => e.value).map((e) => e.program),
    bucket,
    usedHistory: haveStats,
  };
  return race;
}

// How the picks did on races that already have results ($2 flat win bets).
export function scoreCard(races) {
  const sc = {
    completed: 0,
    topPickWins: 0,
    secondPickWins: 0,
    thirdPickWins: 0,
    topPickRoi: 0,
    favWins: 0,
    favRoi: 0,
    valueBets: 0,
    valueWins: 0,
    valueRoi: 0,
  };
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
      } else {
        sc.favRoi -= 2;
      }
    }
    for (const prog of race.picks.value) {
      sc.valueBets += 1;
      if (prog === winner.program) {
        sc.valueWins += 1;
        sc.valueRoi += payoff - 2;
      } else {
        sc.valueRoi -= 2;
      }
    }
    race.outcome = {
      winner: winner.program,
      winnerName: winner.horse,
      winnerMl: winner.ml,
      payoff,
      topPickHit: winner.program === t1,
      winnerRank: winner.rank || null,
    };
  }
  return sc;
}

// Compact view of the stats for the UI.
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
    favorite: {
      starts: stats.favorite.starts,
      wins: stats.favorite.wins,
      rate: stats.favorite.starts ? stats.favorite.wins / stats.favorite.starts : null,
      roi: stats.favorite.roi,
    },
    topJockeys: top(stats.jockeys),
    topTrainers: top(stats.trainers),
    posts,
    weights: WEIGHTS,
    shrink: SHRINK,
  };
}
