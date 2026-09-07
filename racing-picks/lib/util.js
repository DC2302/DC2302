// Small helpers shared by the parser, the form database and the model.
import { clean } from './hrn.js';

export const isRunning = (e) => !e.status; // '' means in the race; SCR/AE/MTO are not

export function normSurface(surface) {
  const t = (surface || '').toLowerCase();
  if (t.includes('turf')) return 'turf';
  if (t.includes('dirt')) return 'dirt';
  if (/synth|tapeta|poly|all.?weather/.test(t)) return 'synth';
  return t || 'dirt';
}

// Morning-line odds are parsed only so the scorecard can benchmark the picks
// against the crowd's favorite. They play no part in the rating.
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

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const sd = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
export const median = (xs) => {
  const a = [...xs].sort((p, q) => p - q);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};
export const ordinal = (n) => (n == null ? '–' : n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]));
export const moneyShort = (n) => (n == null ? '–' : n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`);
