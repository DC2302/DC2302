import { NextResponse } from 'next/server';
import { HRN_BASE, cardPath, fetchHtml, parseCard, todayEastern } from '../../../lib/hrn.js';
import { getTrackHistory } from '../../../lib/history.js';
import { rateRace, scoreCard, summarizeStats } from '../../../lib/model.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  const sp = request.nextUrl.searchParams;
  const slug = sp.get('track') || '';
  const date = sp.get('date') || todayEastern();
  const history = Math.max(0, Math.min(20, parseInt(sp.get('history') || '12', 10) || 0));
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'track must be a slug like albuquerque-downs' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  const warnings = [];
  let card;
  try {
    card = parseCard(await fetchHtml(cardPath(slug, date), { revalidate: 60 }), { slug, date });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'fetch failed' }, { status: 502 });
  }
  let stats = null;
  if (history > 0) {
    try {
      stats = await getTrackHistory(slug, date, card, { maxDates: history });
      if (stats.failedDates?.length) warnings.push(`Could not load ${stats.failedDates.length} past date(s).`);
      if (!stats.races) warnings.push('No past results found for this track yet; picks use the morning line only.');
    } catch (err) {
      warnings.push(`History unavailable (${err?.message || err}); picks use the morning line only.`);
    }
  }
  card.races.forEach((race) => rateRace(race, stats));
  const scorecard = scoreCard(card.races);
  return NextResponse.json({
    ...card,
    stats: summarizeStats(stats, card),
    scorecard,
    warnings,
    source: HRN_BASE + cardPath(slug, date),
    fetchedAt: new Date().toISOString(),
  });
}
