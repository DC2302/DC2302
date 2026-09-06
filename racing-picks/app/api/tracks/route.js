import { NextResponse } from 'next/server';
import { HRN_BASE, fetchHtml, parseIndex, todayEastern } from '../../../lib/hrn.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request) {
  const date = request.nextUrl.searchParams.get('date') || todayEastern();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  try {
    const html = await fetchHtml(`/entries-results/${date}`, { revalidate: 120 });
    const tracks = parseIndex(html, date);
    return NextResponse.json({
      date,
      tracks,
      source: `${HRN_BASE}/entries-results/${date}`,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'fetch failed' }, { status: 502 });
  }
}
