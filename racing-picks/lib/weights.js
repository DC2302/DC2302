// Fitted weights written by scripts/fit-weights.mjs, if present.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './formstore.js';
import { WEIGHTS } from './model.js';

export const WEIGHTS_FILE = path.join(DATA_DIR, 'weights.json');

export function loadWeights(file = WEIGHTS_FILE) {
  if (!existsSync(file)) return { weights: WEIGHTS, meta: { source: 'built-in' } };
  try {
    const o = JSON.parse(readFileSync(file, 'utf8'));
    if (o && o.weights) return { weights: { ...WEIGHTS, ...o.weights }, meta: { source: 'fitted', fittedAt: o.fittedAt, train: o.train, test: o.test } };
  } catch {
    // fall through to the built-in weights
  }
  return { weights: WEIGHTS, meta: { source: 'built-in' } };
}
