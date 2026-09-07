// One form database per process, rebuilt when the date changes or it ages out.
import { buildFormDb } from './formdb.js';

const FORM_DAYS = Math.max(3, Math.min(45, parseInt(process.env.FORM_DAYS || '14', 10) || 14));
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
let cache = null; // { endDate, at, promise }

export function getFormDb(endDate) {
  if (cache && cache.endDate === endDate && Date.now() - cache.at < MAX_AGE_MS) return cache.promise;
  const promise = buildFormDb({ endDate, days: FORM_DAYS, concurrency: 8 }).catch((err) => {
    cache = null;
    throw err;
  });
  cache = { endDate, at: Date.now(), promise };
  return promise;
}
