import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCard, parseDateLinks, parseIndex, toYards } from '../lib/hrn.js';
import { buildTrackStats, normSurface, parseOdds, raceBucket, rateRace, scoreCard } from '../lib/model.js';
import { createFormDb, hasTrouble, ingestCard, lookupHorse, nameKey, parseFinalTime, splitFootnotes, trackStatsFromForm } from '../lib/formdb.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('distance strings convert to yards', () => {
  assert.equal(toYards('870Y'), 870);
  assert.equal(toYards('6F'), 1320);
  assert.equal(toYards('5 1/2F'), 1210);
  assert.equal(toYards('1 1/16M'), 1870);
  assert.equal(toYards('About 1 1/8M'), 1980);
  assert.equal(toYards(''), null);
});

test('morning-line odds parse (benchmark use only)', () => {
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
  assert.equal(abq.purseTotal, 1949100);
  assert.equal(abq.dirt, 10);
  assert.equal(new Set(tracks.map((t) => t.slug)).size, tracks.length);
});

test('quarter horse card parses entries and results', () => {
  const card = parseCard(fixture('albuquerque-2026-09-06.html'), { slug: 'albuquerque-downs', date: '2026-09-06' });
  assert.equal(card.track.name, 'Albuquerque Downs');
  assert.equal(card.races.length, 2);
  const r1 = card.races[0];
  assert.equal(r1.distanceYards, 870);
  assert.equal(r1.entrants.length, 8);
  const fanboy = r1.entrants[3];
  assert.equal(fanboy.horse, 'Fanboy');
  assert.equal(fanboy.sire, 'Eye Am King');
  assert.equal(fanboy.jockey, 'Oscar Andrade, Jr.');
  assert.equal(r1.results.finishers[0].name, 'Fanboy');
  assert.equal(r1.results.finishers[0].win, 6);
  assert.match(r1.results.fractions, /^:45/);
});

test('thoroughbred card parses speed figures, exotics and notes', () => {
  const card = parseCard(fixture('saratoga-2026-09-06.html'), { slug: 'saratoga', date: '2026-09-06' });
  const r1 = card.races[0];
  const torre = r1.entrants.find((e) => e.horse === 'Torre Eiffel');
  assert.equal(torre.lastFig, 91);
  assert.equal(r1.results.finishers[0].fig, 114);
  assert.equal(r1.results.exotics.length, 3);
  assert.match(r1.results.fractions, /^:22\.15/);
  assert.match(r1.results.footnotes, /DISPARATE IMPACT/);
  assert.ok(r1.results.alsoRans.includes('Zenoro'));
});

test('date links for a track are collected from a page', () => {
  const dates = parseDateLinks(fixture('albuquerque-2026-09-06.html'), 'albuquerque-downs');
  assert.ok(dates.includes('2026-08-30'));
  assert.ok(dates.includes('2026-09-07'));
  assert.equal(parseDateLinks(fixture('albuquerque-2026-09-06.html'), 'no-such-track').length, 0);
});

test('surfaces normalize and race shapes bucket', () => {
  assert.equal(normSurface('Inner turf'), 'turf');
  assert.equal(normSurface('Tapeta'), 'synth');
  assert.equal(raceBucket({ distance: '1 3/8 m', distanceYards: 2420, surface: 'Inner turf' }), 'route|turf');
  assert.equal(raceBucket({ distance: '440Y', distanceYards: 440, surface: 'Dirt' }), 'yards-sprint|dirt');
});

test('form helpers: final times, footnotes, trouble, name keys', () => {
  assert.equal(parseFinalTime('Fractions and final time: :22.15, :45.61, 1:10.98, 1:17.75'), 77.75);
  assert.equal(parseFinalTime(':21.196'), 21.196);
  assert.equal(parseFinalTime(''), null);
  const notes = splitFootnotes('DISPARATE IMPACT shook off THE STANDARD in mid-stretch. THE STANDARD chased, bumped at the start.', ['Disparate Impact', 'The Standard']);
  assert.match(notes.thestandard, /^THE STANDARD chased/);
  assert.equal(hasTrouble(notes.thestandard), true);
  assert.equal(hasTrouble(notes.disparateimpact), false);
  assert.equal(nameKey("Bolt d'Oro (IRE)"), 'boltdoro');
});

test('with no data every runner is rated evenly and the race is flagged thin', () => {
  const card = parseCard(fixture('albuquerque-2026-09-06.html'), { slug: 'albuquerque-downs', date: '2026-09-06' });
  const race = rateRace(card.races[0], { stats: null, form: null, date: '2026-09-06', slug: 'albuquerque-downs' });
  const runners = race.entrants.filter((e) => !e.status);
  const total = runners.reduce((a, e) => a + e.prob, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.ok(Math.abs(runners[0].prob - 1 / runners.length) < 1e-9);
  assert.equal(race.picks.confidence, 'thin');
  assert.equal(race.picks.usedForm, false);
});

test('the form database drives the rating and the scorecard settles', () => {
  const past = parseCard(fixture('albuquerque-2026-09-06.html'), { slug: 'albuquerque-downs', date: '2026-08-30' });
  const db = createFormDb('2026-09-06', 7);
  ingestCard(db, past, 'Albuquerque Downs');
  assert.equal(db.races.length, 2);
  const fanboy = lookupHorse(db, 'Fanboy', '2026-09-06');
  assert.equal(fanboy.length, 1);
  assert.equal(fanboy[0].pos, 1);
  assert.equal(fanboy[0].winTime, 45.919);
  assert.equal(lookupHorse(db, 'Fanboy', '2026-08-30').length, 0, 'records on or after the date are hidden');
  const stats = trackStatsFromForm(db, 'albuquerque-downs', '2026-09-06');
  assert.equal(stats.races, 2);
  assert.equal(stats.jockeys['Oscar Andrade, Jr.'].wins, 1);
  const today = parseCard(fixture('albuquerque-2026-09-06.html'), { slug: 'albuquerque-downs', date: '2026-09-06' });
  today.races.forEach((r) => rateRace(r, { stats, form: db, date: '2026-09-06', slug: 'albuquerque-downs' }));
  const r1 = today.races[0];
  assert.equal(r1.picks.usedForm, true);
  assert.ok(r1.picks.coverage >= 0.5, `coverage ${r1.picks.coverage}`);
  assert.equal(r1.entrants.find((e) => e.horse === 'Fanboy').rank, 1, 'last-out winner with the fastest time rates on top');
  assert.equal(r1.entrants.find((e) => e.horse === 'Fanboy').detail.records.length, 1);
  const sc = scoreCard(today.races);
  assert.equal(sc.completed, 2);
  assert.equal(r1.outcome.winner, '4');
  assert.equal(typeof sc.favRoi, 'number');
  assert.equal(buildTrackStats([past]).races, 2);
});
