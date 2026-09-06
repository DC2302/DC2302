import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCard, parseIndex, toYards } from '../lib/hrn.js';
import { buildTrackStats, parseOdds, rateRace, scoreCard } from '../lib/model.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('distance strings convert to yards', () => {
  assert.equal(toYards('870Y'), 870);
  assert.equal(toYards('6F'), 1320);
  assert.equal(toYards('5 1/2F'), 1210);
  assert.equal(toYards('1 1/16M'), 1870);
  assert.equal(toYards('About 1 1/8M'), 1980);
  assert.equal(toYards(''), null);
});

test('morning-line odds parse', () => {
  assert.equal(parseOdds('5/2'), 2.5);
  assert.equal(parseOdds('9-2'), 4.5);
  assert.equal(parseOdds('EVN'), 1);
  assert.equal(parseOdds(null), null);
});

test('index page lists tracks with UTC first posts', () => {
  const tracks = parseIndex(fixture('index-2026-09-06.html'), '2026-09-06');
  assert.ok(tracks.length >= 15, `expected many tracks, got ${tracks.length}`);
  const abq = tracks.find((t) => t.slug === 'albuquerque-downs');
  assert.equal(abq.name, 'Albuquerque Downs');
  assert.equal(abq.firstPostUtc, '2026-09-06T19:30:00Z');
  assert.equal(abq.firstPostLocal, '1:30 PM');
  assert.equal(abq.purseTotal, 1949100);
  assert.equal(abq.dirt, 10);
  assert.equal(new Set(tracks.map((t) => t.slug)).size, tracks.length);
});

test('quarter horse card parses entries and results', () => {
  const card = parseCard(fixture('albuquerque-2026-09-06.html'), { slug: 'albuquerque-downs', date: '2026-09-06' });
  assert.equal(card.track.name, 'Albuquerque Downs');
  assert.equal(card.track.location, 'Albuquerque, NM');
  assert.ok(card.dates.includes('2026-08-30'));
  assert.equal(card.races.length, 2);
  const r1 = card.races[0];
  assert.equal(r1.number, 1);
  assert.equal(r1.postUtc, '2026-09-06T19:30:00Z');
  assert.equal(r1.distance, '870Y');
  assert.equal(r1.distanceYards, 870);
  assert.equal(r1.surface, 'Dirt');
  assert.equal(r1.purse, 17800);
  assert.equal(r1.entrants.length, 8);
  const fanboy = r1.entrants[3];
  assert.equal(fanboy.program, '4');
  assert.equal(fanboy.horse, 'Fanboy');
  assert.equal(fanboy.sire, 'Eye Am King');
  assert.equal(fanboy.trainer, 'Jaime G. Aldavaz, Sr.');
  assert.equal(fanboy.jockey, 'Oscar Andrade, Jr.');
  assert.equal(fanboy.ml, '5/2');
  assert.equal(fanboy.status, '');
  assert.equal(r1.results.finishers[0].name, 'Fanboy');
  assert.equal(r1.results.finishers[0].program, '4');
  assert.equal(r1.results.finishers[0].win, 6);
  assert.equal(r1.results.finishers[1].place, 3);
});

test('thoroughbred card parses speed figures, exotics and notes', () => {
  const card = parseCard(fixture('saratoga-2026-09-06.html'), { slug: 'saratoga', date: '2026-09-06' });
  const r1 = card.races[0];
  assert.equal(r1.distanceYards, 1430);
  const torre = r1.entrants.find((e) => e.horse === 'Torre Eiffel');
  assert.equal(torre.lastFig, 91);
  assert.equal(torre.sire, 'Cupid');
  assert.equal(r1.results.finishers[0].name, 'Disparate Impact');
  assert.equal(r1.results.finishers[0].fig, 114);
  assert.equal(r1.results.finishers[0].win, 10.5);
  assert.equal(r1.results.exotics.length, 3);
  assert.equal(r1.results.exotics[0].pool, 'Exacta');
  assert.equal(r1.results.exotics[0].payout, 34.04);
  assert.match(r1.results.fractions, /^:22\.15/);
  assert.match(r1.results.footnotes, /DISPARATE IMPACT/);
  assert.ok(r1.results.alsoRans.includes('Zenoro'));
});

test('ratings sum to one and picks respect the market when no history', () => {
  const card = parseCard(fixture('albuquerque-2026-09-06.html'), { slug: 'albuquerque-downs', date: '2026-09-06' });
  const race = rateRace(card.races[0], null);
  const runners = race.entrants.filter((e) => !e.status);
  const total = runners.reduce((a, e) => a + e.prob, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.equal(race.picks.top[0], '4'); // 5/2 favorite Fanboy
  assert.equal(race.picks.usedHistory, false);
  assert.equal(runners.find((e) => e.program === '4').rank, 1);
});

test('history stats feed the model and the scorecard settles', () => {
  const past = parseCard(fixture('albuquerque-2026-09-06.html'), { slug: 'albuquerque-downs', date: '2026-08-30' });
  const stats = buildTrackStats([past]);
  assert.equal(stats.races, 2);
  assert.equal(stats.jockeys['Oscar Andrade, Jr.'].wins, 1);
  assert.equal(stats.favorite.starts, 2);
  const today = parseCard(fixture('albuquerque-2026-09-06.html'), { slug: 'albuquerque-downs', date: '2026-09-06' });
  today.races.forEach((r) => rateRace(r, stats));
  assert.equal(today.races[0].picks.usedHistory, true);
  const sc = scoreCard(today.races);
  assert.equal(sc.completed, 2);
  assert.equal(sc.topPickWins + sc.secondPickWins + sc.thirdPickWins <= 2, true);
  assert.equal(typeof sc.topPickRoi, 'number');
  assert.equal(today.races[0].outcome.winner, '4');
});

test('date links for a track are collected from a page', async () => {
  const { parseDateLinks } = await import('../lib/hrn.js');
  const dates = parseDateLinks(fixture('albuquerque-2026-09-06.html'), 'albuquerque-downs');
  assert.ok(dates.includes('2026-08-30'));
  assert.ok(dates.includes('2026-09-06'));
  assert.equal(parseDateLinks(fixture('albuquerque-2026-09-06.html'), 'no-such-track').length, 0);
});

test('surfaces normalize into dirt, turf and synth buckets', async () => {
  const { normSurface, raceBucket } = await import('../lib/model.js');
  assert.equal(normSurface('Inner turf'), 'turf');
  assert.equal(normSurface('Tapeta'), 'synth');
  assert.equal(normSurface('Dirt'), 'dirt');
  assert.equal(raceBucket({ distance: '1 3/8 m', distanceYards: 2420, surface: 'Inner turf' }), 'route|turf');
  assert.equal(raceBucket({ distance: '440Y', distanceYards: 440, surface: 'Dirt' }), 'yards-sprint|dirt');
});
