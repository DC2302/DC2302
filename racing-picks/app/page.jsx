'use client';

import { useEffect, useMemo, useState } from 'react';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function shiftDate(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function prettyDate(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
const yourTime = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');
const pct = (p) => (p == null ? '–' : `${Math.round(p * 100)}%`);
const money = (n) =>
  n == null ? '–' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const oddsText = (o) => (o == null ? '–' : `${(o >= 10 ? o.toFixed(0) : o.toFixed(1)).replace(/\.0$/, '')}-1`);
const signed = (n) => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toFixed(2)}`;
const roiPct = (net, bets) => (bets ? `${net >= 0 ? '+' : '−'}${Math.abs((net / (bets * 2)) * 100).toFixed(0)}%` : '–');

function relTime(iso, now) {
  if (!iso) return '';
  const mins = (new Date(iso).getTime() - now) / 60000;
  if (mins > 90) return `in ${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
  if (mins > 1) return `in ${Math.round(mins)}m`;
  if (mins > -10) return 'at the gate';
  return 'run, awaiting result';
}

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

async function getJson(url) {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

export default function Page() {
  const [date, setDate] = useState(localToday);
  const [slug, setSlug] = useState(null);
  const [tracks, setTracks] = useState(null);
  const [tracksErr, setTracksErr] = useState(null);
  const [card, setCard] = useState(null);
  const [cardErr, setCardErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const now = useNow();

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const d = sp.get('date');
    const t = sp.get('track');
    if (d && DATE_RE.test(d)) setDate(d);
    if (t && /^[a-z0-9-]+$/.test(t)) setSlug(t);
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams();
    sp.set('date', date);
    if (slug) sp.set('track', slug);
    window.history.replaceState(null, '', `?${sp.toString()}`);
  }, [date, slug]);

  useEffect(() => {
    let alive = true;
    setTracks(null);
    setTracksErr(null);
    getJson(`/api/tracks?date=${date}`)
      .then((j) => alive && setTracks(j.tracks))
      .catch((e) => alive && setTracksErr(e.message));
    return () => {
      alive = false;
    };
  }, [date]);

  useEffect(() => {
    if (!slug) {
      setCard(null);
      setCardErr(null);
      return undefined;
    }
    let alive = true;
    const run = () => {
      setLoading(true);
      getJson(`/api/card?track=${slug}&date=${date}`)
        .then((j) => {
          if (!alive) return;
          setCard(j);
          setCardErr(null);
        })
        .catch((e) => alive && setCardErr(e.message))
        .finally(() => alive && setLoading(false));
    };
    run();
    const t = setInterval(run, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [slug, date, tick]);

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Racing Picks</h1>
          <p className="sub">Every track running on {prettyDate(date)}, with model picks you can audit.</p>
        </div>
        <div className="datebar">
          <button onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">‹</button>
          <input type="date" value={date} onChange={(e) => DATE_RE.test(e.target.value) && setDate(e.target.value)} />
          <button onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day">›</button>
          <button className="ghost" onClick={() => setDate(localToday())}>Today</button>
        </div>
      </header>

      {slug ? (
        <TrackView
          slug={slug}
          date={date}
          card={card}
          error={cardErr}
          loading={loading}
          now={now}
          onBack={() => setSlug(null)}
          onRefresh={() => setTick((t) => t + 1)}
          trackMeta={tracks?.find((t) => t.slug === slug)}
        />
      ) : (
        <TrackList date={date} tracks={tracks} error={tracksErr} now={now} onPick={setSlug} />
      )}

      <p className="foot">
        Entries, morning lines and results come from Horse Racing Nation's public pages and refresh every minute while
        a track is open. Picks are a statistical rating, not a guarantee; favorites lose most races. Times show track
        local time and your local time.
      </p>
    </main>
  );
}

function trackStatus(t, now) {
  if (!t.firstPostUtc) return { cls: '', text: 'time unknown' };
  const start = new Date(t.firstPostUtc).getTime();
  const mins = (start - now) / 60000;
  if (mins > 0) return { cls: 'soon', text: `first post ${relTime(t.firstPostUtc, now)}` };
  const races = (t.dirt || 0) + (t.turf || 0) + (t.synth || 0);
  const expectedEnd = start + Math.max(races, 6) * 30 * 60000;
  if (now < expectedEnd) return { cls: 'live', text: 'underway' };
  return { cls: 'done', text: 'likely complete' };
}

function TrackList({ date, tracks, error, now, onPick }) {
  const [summary, setSummary] = useState(null);
  const [scoring, setScoring] = useState(false);

  useEffect(() => {
    setSummary(null);
  }, [date]);

  async function scoreAll() {
    if (!tracks?.length) return;
    setScoring(true);
    const rows = [];
    const queue = [...tracks];
    const worker = async () => {
      while (queue.length) {
        const t = queue.shift();
        try {
          const c = await getJson(`/api/card?track=${t.slug}&date=${date}&history=8`);
          rows.push({ slug: t.slug, name: t.name, races: c.races.length, ...c.scorecard });
        } catch (e) {
          rows.push({ slug: t.slug, name: t.name, error: e.message });
        }
        setSummary([...rows]);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setScoring(false);
  }

  if (error) return <p className="card err">Could not load the track list: {error}</p>;
  if (!tracks) return <p className="card muted">Loading tracks…</p>;
  if (!tracks.length) return <p className="card">No racing listed for this date.</p>;

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="muted small">{tracks.length} tracks · tap one for entries, picks and results</span>
        <button className="ghost" onClick={scoreAll} disabled={scoring}>
          {scoring ? 'Scoring…' : 'Score every track for this date'}
        </button>
      </div>
      {summary && <Summary rows={summary} total={tracks.length} />}
      <ul className="tracklist">
        {tracks.map((t) => {
          const s = trackStatus(t, now);
          return (
            <li key={t.slug}>
              <button className="track" onClick={() => onPick(t.slug)}>
                <h3>{t.name}</h3>
                <div className="meta">
                  First post {t.firstPostLocal} track time · {yourTime(t.firstPostUtc)} yours
                </div>
                <div className="meta">
                  {(t.dirt || 0) + (t.turf || 0) + (t.synth || 0)} races · purses {money(t.purseTotal)} · avg field{' '}
                  {t.avgField ?? '–'}
                  {t.turf ? ` · ${t.turf} turf` : ''}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className={`badge ${s.cls}`}>{s.text}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Summary({ rows, total }) {
  const done = rows.filter((r) => !r.error);
  const sum = (k) => done.reduce((a, r) => a + (r[k] || 0), 0);
  const completed = sum('completed');
  return (
    <div className="card">
      <h3 style={{ margin: '0 0 6px' }}>
        Scorecard across {rows.length} of {total} tracks · {completed} races with results
      </h3>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Track</th>
              <th className="num">Done</th>
              <th className="num">Top pick won</th>
              <th className="num">$2 win ROI</th>
              <th className="num">ML fav won</th>
              <th className="num">Fav ROI</th>
              <th className="num">Value plays</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice()
              .sort((a, b) => (b.completed || 0) - (a.completed || 0))
              .map((r) => (
                <tr key={r.slug}>
                  <td>{r.name}</td>
                  {r.error ? (
                    <td colSpan={6} className="err small">{r.error}</td>
                  ) : (
                    <>
                      <td className="num">{r.completed}/{r.races}</td>
                      <td className="num">{r.topPickWins}</td>
                      <td className={`num ${r.topPickRoi >= 0 ? 'pos' : 'neg'}`}>{roiPct(r.topPickRoi, r.completed)}</td>
                      <td className="num">{r.favWins}</td>
                      <td className={`num ${r.favRoi >= 0 ? 'pos' : 'neg'}`}>{roiPct(r.favRoi, r.completed)}</td>
                      <td className="num">
                        {r.valueWins}/{r.valueBets} {r.valueBets ? `(${roiPct(r.valueRoi, r.valueBets)})` : ''}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            {done.length > 1 && (
              <tr>
                <td><b>All tracks</b></td>
                <td className="num"><b>{completed}</b></td>
                <td className="num"><b>{sum('topPickWins')} ({completed ? Math.round((sum('topPickWins') / completed) * 100) : 0}%)</b></td>
                <td className={`num ${sum('topPickRoi') >= 0 ? 'pos' : 'neg'}`}><b>{roiPct(sum('topPickRoi'), completed)}</b></td>
                <td className="num"><b>{sum('favWins')} ({completed ? Math.round((sum('favWins') / completed) * 100) : 0}%)</b></td>
                <td className={`num ${sum('favRoi') >= 0 ? 'pos' : 'neg'}`}><b>{roiPct(sum('favRoi'), completed)}</b></td>
                <td className="num"><b>{sum('valueWins')}/{sum('valueBets')} {sum('valueBets') ? `(${roiPct(sum('valueRoi'), sum('valueBets'))})` : ''}</b></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrackView({ slug, date, card, error, loading, now, onBack, onRefresh, trackMeta }) {
  const nextRace = useMemo(() => {
    if (!card) return null;
    const pending = card.races.filter((r) => !r.results);
    const upcoming = pending.find((r) => r.postUtc && new Date(r.postUtc).getTime() > now - 10 * 60000);
    return (upcoming || pending[0])?.number ?? null;
  }, [card, now]);

  const name = card?.track?.name || trackMeta?.name || slug;
  return (
    <>
      <div className="row sticky">
        <button className="ghost" onClick={onBack}>‹ All tracks</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{name}</h2>
        {card?.track?.location && <span className="muted">{card.track.location}</span>}
        <span className="muted small">
          {loading ? 'refreshing…' : card ? `updated ${new Date(card.fetchedAt).toLocaleTimeString()}` : ''}
        </span>
        <button className="ghost" onClick={onRefresh} disabled={loading}>Refresh</button>
        {nextRace && (
          <a href={`#race-${nextRace}`} className="small">Jump to race {nextRace}</a>
        )}
      </div>
      {error && <p className="card err">Could not load this card: {error}</p>}
      {!card && !error && <p className="card muted">Loading entries, results and the track's recent form…</p>}
      {card && (
        <>
          {card.warnings?.map((w) => (
            <p key={w} className="card warn small">{w}</p>
          ))}
          <Scorecard sc={card.scorecard} stats={card.stats} />
          <StatsPanel stats={card.stats} card={card} />
          {card.races.length === 0 && <p className="card">No entries posted for this date.</p>}
          {card.races.map((race) => (
            <Race key={race.number} race={race} now={now} isNext={race.number === nextRace} />
          ))}
          <p className="muted small">
            Source: <a href={card.source} target="_blank" rel="noreferrer">Horse Racing Nation</a>
            {card.track?.website && (
              <>
                {' '}· <a href={card.track.website} target="_blank" rel="noreferrer">track website</a>
              </>
            )}
            {' '}· live video needs a wagering account (FanDuel Racing, TwinSpires, Xpressbet).
          </p>
        </>
      )}
    </>
  );
}

function Scorecard({ sc }) {
  if (!sc || !sc.completed) return null;
  const line = (label, bets, wins, roi) => (
    <tr key={label}>
      <td>{label}</td>
      <td className="num">{bets}</td>
      <td className="num">{wins}</td>
      <td className="num">{bets ? `${Math.round((wins / bets) * 100)}%` : '–'}</td>
      <td className={`num ${roi >= 0 ? 'pos' : 'neg'}`}>{signed(roi)} ({roiPct(roi, bets)})</td>
    </tr>
  );
  return (
    <div className="card">
      <h3 style={{ margin: '0 0 6px' }}>Today so far · {sc.completed} races official</h3>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>$2 win bet on…</th>
              <th className="num">Bets</th>
              <th className="num">Wins</th>
              <th className="num">Hit rate</th>
              <th className="num">Net (ROI)</th>
            </tr>
          </thead>
          <tbody>
            {line('Model top pick', sc.completed, sc.topPickWins, sc.topPickRoi)}
            {line('Morning-line favorite', sc.completed, sc.favWins, sc.favRoi)}
            {sc.valueBets > 0 && line('Flagged value plays', sc.valueBets, sc.valueWins, sc.valueRoi)}
          </tbody>
        </table>
      </div>
      <p className="muted small" style={{ margin: '6px 0 0' }}>
        Winner was the model's 2nd choice {sc.secondPickWins}× and 3rd choice {sc.thirdPickWins}×.
      </p>
    </div>
  );
}

function StatsPanel({ stats, card }) {
  if (!stats) {
    return (
      <p className="card warn small">
        No recent results were available for this track, so these picks are the morning line re-normalized. They will
        sharpen as results accumulate.
      </p>
    );
  }
  const fav = stats.favorite;
  return (
    <details className="card">
      <summary>
        Track form behind the picks: {stats.races} races over {stats.dates.length} dates ({stats.dates[0]} to{' '}
        {stats.dates[stats.dates.length - 1]}) · ML favorites won {pct(fav.rate)}
      </summary>
      <div className="grid2" style={{ marginTop: 10 }}>
        <div>
          <b>Jockeys (wins / starts at this track)</b>
          <ul className="small">
            {stats.topJockeys.map((j) => (
              <li key={j.name}>{j.name}: {j.wins}/{j.starts} ({pct(j.rate)})</li>
            ))}
          </ul>
        </div>
        <div>
          <b>Trainers</b>
          <ul className="small">
            {stats.topTrainers.map((t) => (
              <li key={t.name}>{t.name}: {t.wins}/{t.starts} ({pct(t.rate)})</li>
            ))}
          </ul>
        </div>
        <div>
          <b>Win rate by post group, for today's race shapes</b>
          <ul className="small">
            {Object.entries(stats.posts).map(([bucket, groups]) => (
              <li key={bucket}>
                {bucket.replace('|', ' · ')}:{' '}
                {['rail', 'inside', 'middle', 'outside']
                  .filter((g) => groups[g])
                  .map((g) => `${g} ${pct(groups[g].rate)} (${groups[g].starts})`)
                  .join(', ')}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <b>How the rating works</b>
          <p className="small" style={{ margin: '4px 0' }}>
            Start from the morning line as a probability. Multiply by jockey, trainer and post-group win-rate factors
            measured on this track's recent results, each shrunk toward neutral (prior of {stats.shrink.connections}{' '}
            starts for people, {stats.shrink.post} for posts) and weighted {stats.weights.jockey}/{stats.weights.trainer}
            /{stats.weights.post}. Thoroughbreds also get a factor from their last speed figure versus the field median.
            Re-normalize so the field sums to 100%. A value flag means the model's number beats the morning line by 20%
            or more at 2-1 or better.
          </p>
          <p className="small muted" style={{ margin: 0 }}>
            Favorites' flat-bet result over the sample: {signed(fav.roi)} on {fav.starts} bets.
          </p>
        </div>
      </div>
    </details>
  );
}

function Race({ race, now, isNext }) {
  const byProg = useMemo(() => Object.fromEntries(race.entrants.map((e) => [e.program, e])), [race]);
  const sorted = useMemo(
    () => [...race.entrants].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || (a.post ?? 99) - (b.post ?? 99)),
    [race]
  );
  const picks = race.picks || { top: [], value: [], confidence: 'open' };
  const confLabel = { strong: 'Strong pick', lean: 'Lean', open: 'Wide open' }[picks.confidence];
  const status = race.results ? 'Official' : relTime(race.postUtc, now);
  const hasFig = race.entrants.some((e) => e.lastFig != null);

  return (
    <section className={`race ${isNext ? 'next' : ''}`} id={`race-${race.number}`}>
      <div className="race-head">
        <div>
          <h3>
            Race {race.number}
            <span className="time">
              {race.postLocal} track time · {yourTime(race.postUtc)} yours
            </span>
          </h3>
          <p className="conds">
            {race.distance} · {race.surface} · {race.type || 'Race'} · {race.restrictions} · Purse {money(race.purse)}
          </p>
        </div>
        <span className={`status ${race.results ? 'official' : ''}`}>{isNext && !race.results ? 'Next · ' : ''}{status}</span>
      </div>

      <div className="picks">
        <span className={`conf ${picks.confidence}`}>{confLabel}</span>
        {picks.top.map((p) => (
          <span key={p} className="pick">
            <b>#{p}</b> {byProg[p]?.horse} <em>{pct(byProg[p]?.prob)}</em>
          </span>
        ))}
        {picks.value.length > 0 && (
          <span className="value">Value: {picks.value.map((p) => `#${p} ${byProg[p]?.horse}`).join(', ')}</span>
        )}
      </div>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>PP</th>
              <th>Horse / sire</th>
              <th>Trainer / jockey</th>
              {hasFig && <th className="num">Last fig</th>}
              <th className="num">ML</th>
              <th className="num">Model</th>
              <th className="num">Fair odds</th>
              <th className="num">Edge</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => {
              const f = e.factors;
              const title = f
                ? `market ${pct(f.market)} · jockey ×${f.jockey.toFixed(2)} · trainer ×${f.trainer.toFixed(2)} · post ×${f.post.toFixed(2)} · figure ×${f.figure.toFixed(2)}`
                : e.status;
              return (
                <tr key={`${e.program}-${e.horse}`} className={e.status === 'SCR' ? 'out' : e.status ? 'ae' : e.rank === 1 ? 'top1' : ''} title={title}>
                  <td className="tag">
                    {e.status ? <span className="badge">{e.status}</span> : <span className={`rank r${e.rank}`}>{e.rank}</span>}
                  </td>
                  <td>{e.program}</td>
                  <td>
                    {e.horse}
                    <span className="sire">{e.sire}</span>
                  </td>
                  <td>
                    {e.trainer}
                    <span className="jockey">{e.jockey}</span>
                  </td>
                  {hasFig && <td className="num">{e.lastFig ?? '–'}</td>}
                  <td className="num">{e.ml ?? '–'}</td>
                  <td className="num">{pct(e.prob)}</td>
                  <td className="num">{oddsText(e.fairOdds)}</td>
                  <td className={`num ${e.edge > 0 ? 'pos' : e.edge < 0 ? 'neg' : ''}`}>
                    {e.edge == null ? '–' : `${e.edge > 0 ? '+' : ''}${Math.round(e.edge * 100)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {race.results && <Results race={race} />}
    </section>
  );
}

function Results({ race }) {
  const r = race.results;
  const o = race.outcome;
  return (
    <div className="results">
      <h4>Result</h4>
      {o && (
        <p className={`outcome ${o.topPickHit ? 'hit' : 'miss'}`} style={{ margin: '0 0 6px' }}>
          Winner #{o.winner} {o.winnerName} (ML {o.winnerMl || '–'}) paid {money(o.payoff)} ·{' '}
          {o.topPickHit ? 'top pick ✓' : o.winnerRank ? `model rank ${o.winnerRank}` : 'not rated'}
        </p>
      )}
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Fin</th>
              <th>#</th>
              <th>Horse</th>
              {r.finishers.some((f) => f.fig != null) && <th className="num">Fig</th>}
              <th className="num">Win</th>
              <th className="num">Place</th>
              <th className="num">Show</th>
            </tr>
          </thead>
          <tbody>
            {r.finishers.map((f, i) => (
              <tr key={`${f.program}-${f.name}`}>
                <td>{i + 1}</td>
                <td>{f.program}</td>
                <td>{f.name}</td>
                {r.finishers.some((x) => x.fig != null) && <td className="num">{f.fig ?? '–'}</td>}
                <td className="num">{f.win != null ? money(f.win) : '–'}</td>
                <td className="num">{f.place != null ? money(f.place) : '–'}</td>
                <td className="num">{f.show != null ? money(f.show) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(r.exotics?.length > 0 || r.fractions || r.footnotes) && (
        <details className="small" style={{ marginTop: 6 }}>
          <summary>Exotics, fractions and chart notes</summary>
          {r.exotics?.length > 0 && (
            <ul>
              {r.exotics.map((x) => (
                <li key={`${x.pool}-${x.finish}`}>
                  {x.pool} {x.finish}: {money(x.payout)} (pool {money(x.totalPool)})
                </li>
              ))}
            </ul>
          )}
          {r.fractions && <p>Fractions and final time: {r.fractions}</p>}
          {r.alsoRans?.length > 0 && <p>Also ran: {r.alsoRans.join(', ')}</p>}
          {r.footnotes && <p className="muted">{r.footnotes}</p>}
        </details>
      )}
    </div>
  );
}
