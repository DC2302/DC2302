// One form database per process: from the committed chart store when it
// exists, otherwise a live crawl. Rebuilt when the date changes or it ages out.
import { buildFormDb } from './formdb.js';
import { loadStore } from './formstore.js';

const FORM_DAYS = Math.max(3, Math.min(400, parseInt(process.env.FORM_DAYS || '120', 10) || 120));
const LIVE_DAYS = Math.max(3, Math.min(45, parseInt(process.env.LIVE_FORM_DAYS || '10', 10) || 10));
const MAX_AGE_MS = 60 * 60 * 1000;
let cache = null; // { endDate, at, promise }

export function getFormDb(endDate) {
  if (cache && cache.endDate === endDate && Date.now() - cache.at < MAX_AGE_MS) return cache.promise;
  const promise = (async () => {
    const stored = loadStore({ endDate, days: FORM_DAYS });
    if (stored) return stored;
    const live = await buildFormDb({ endDate, days: LIVE_DAYS, concurrency: 8 });
    live.source = 'live';
    return live;
  })().catch((err) => {
    cache = null;
    throw err;
  });
  cache = { endDate, at: Date.now(), promise };
  return promise;
}
