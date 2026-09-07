import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { DATA_DIR, storeSummary } from '../../../lib/formstore.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const file = path.join(DATA_DIR, 'scorecard.json');
  if (!existsSync(file)) {
    return NextResponse.json({ error: 'No season scorecard yet; the daily data job has not run.', store: storeSummary() }, { status: 404 });
  }
  try {
    const body = JSON.parse(readFileSync(file, 'utf8'));
    return NextResponse.json({ ...body, store: storeSummary() });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'unreadable scorecard' }, { status: 500 });
  }
}
