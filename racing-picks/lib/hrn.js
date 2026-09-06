// Fetch and parse Horse Racing Nation entries/results pages.
// These are public HTML pages; we read the same tables a person sees.
import { load } from 'cheerio';

export const HRN_BASE = 'https://entries.horseracingnation.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

export const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

export function parseMoney(text) {
  const m = clean(text).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// "870Y" -> 870, "6F" -> 1320, "1 1/16M" -> 1870, "About 1 1/8M" -> 1980
export function toYards(distance) {
  if (!distance) return null;
  const s = clean(distance).replace(/^(about|abt\.?)\s*/i, '');
  const m = s.match(/^(\d+)?\s*(?:(\d+)\/(\d+))?\s*(y|f|m)\b/i);
  if (!m) return null;
  let n = m[1] ? parseFloat(m[1]) : 0;
  if (m[2]) n += parseInt(m[2], 10) / parseInt(m[3], 10);
  const unit = m[4].toUpperCase();
  return Math.round(unit === 'Y' ? n : unit === 'F' ? n * 220 : n * 1760);
}

export const isYards = (distance) => /\d\s*y$/i.test(clean(distance));

export function cardPath(slug, date) {
  return `/entries-results/${slug}/${date}`;
}

// Every /entries-results/<slug>/<date> link on a page (the track landing page
// lists recent result dates and upcoming entry dates).
export function parseDateLinks(html, slug) {
  const $ = load(html);
  const dates = new Set();
  $('a[href^="/entries-results/"]').each((_, a) => {
    const m = ($(a).attr('href') || '').match(/^\/entries-results\/([a-z0-9-]+)\/(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1] === slug) dates.add(m[2]);
  });
  return [...dates].sort();
}

export function todayEastern() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function fetchHtml(path, { revalidate = 60 } = {}) {
  const res = await fetch(HRN_BASE + path, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Upstream returned ${res.status} for ${path}`);
  return res.text();
}

// The date index page: one row per track racing that day.
export function parseIndex(html, date) {
  const $ = load(html);
  const seen = new Set();
  const tracks = [];
  $(`a[href$="/${date}"]`).each((_, a) => {
    const href = $(a).attr('href') || '';
    const m = href.match(/^\/entries-results\/([a-z0-9-]+)\/(\d{4}-\d{2}-\d{2})$/);
    if (!m || seen.has(m[1])) return;
    const tr = $(a).closest('tr');
    const tds = tr.find('td');
    if (!tr.length || tds.length < 4) return;
    seen.add(m[1]);
    const time = tr.find('time.race-time').first();
    const int = (i) => {
      const v = parseInt(clean(tds.eq(i).text()), 10);
      return Number.isFinite(v) ? v : null;
    };
    tracks.push({
      slug: m[1],
      name: clean($(a).text()),
      firstPostUtc: time.attr('datetime') || null,
      firstPostLocal: clean(time.text()) || null,
      purseTotal: parseMoney(tds.eq(2).text()),
      avgField: parseFloat(clean(tds.eq(3).text())) || null,
      dirt: int(4),
      turf: int(5),
      synth: int(6),
    });
  });
  tracks.sort((a, b) => (a.firstPostUtc || '').localeCompare(b.firstPostUtc || ''));
  return tracks;
}

// A track's page for one date: entries for every race, plus results once posted.
export function parseCard(html, { slug = null, date = null } = {}) {
  const $ = load(html);
  const header = clean($('.track-info-header').first().text());
  const [name, location] = header.split(/\s+-\s+/);
  const website = $('a.track-info-link').first().attr('href') || null;

  const dates = new Set();
  $('a[href^="/entries-results/"]').each((_, a) => {
    const m = ($(a).attr('href') || '').match(/^\/entries-results\/([a-z0-9-]+)\/(\d{4}-\d{2}-\d{2})$/);
    if (m && (!slug || m[1] === slug)) dates.add(m[2]);
  });

  const races = [];
  $('a.race-header').each((_, el) => {
    const head = $(el);
    const block = head.closest('div.my-5');
    const number = parseInt((head.text().match(/Race #\s*(\d+)/) || [])[1], 10);
    const time = head.find('time.race-time').first();
    const parts = clean(block.find('.race-distance').first().text()).split(/,\s+/);
    const distance = parts[0] || '';
    const surface = parts[1] || '';
    const type = parts.slice(2).join(', ');

    const entrants = [];
    block.find('tr').each((_, tr) => {
      const row = $(tr);
      const progCell = row.find('td[data-label^="Program Number"]').first();
      if (!progCell.length) return;
      const program =
        clean((progCell.attr('data-label') || '').replace(/Program Number:?/i, '')) ||
        clean(progCell.find('img').attr('alt'));
      const post = parseInt(clean(row.find('td[data-label="Post Position"]').text()), 10);
      const hs = row.find('td[data-label="Horse / Sire"]');
      const h4 = clean(hs.find('h4').text());
      const figMatch = h4.match(/\((\d+)\)\s*$/);
      const tj = row.find('td[data-label="Trainer / Jockey"] p');
      const scrText = clean(row.find('td[data-label="Scratched?"]').text());
      const mlCell = row.find('td[data-label="Morning Line Odds"]');
      const mlText = clean(mlCell.find('p').first().text());
      const abbrTitle = mlCell.find('abbr').attr('title') || '';
      let status = '';
      if (/also.?eligible/i.test(scrText)) status = 'AE';
      else if (/main track/i.test(scrText)) status = 'MTO';
      if (
        /scratch/i.test(scrText) ||
        /scratch/i.test(abbrTitle) ||
        /scratch/i.test(row.attr('class') || '') ||
        /^SCR/i.test(mlText)
      ) {
        status = 'SCR';
      }
      entrants.push({
        program,
        post: Number.isFinite(post) ? post : null,
        horse: h4.replace(/\s*\(\d+\)\s*$/, ''),
        lastFig: figMatch ? parseInt(figMatch[1], 10) : null,
        sire: clean(hs.find('p').first().text()) || null,
        trainer: clean(tj.eq(0).text()) || null,
        jockey: clean(tj.eq(1).text()) || null,
        ml: mlText || null,
        status,
      });
    });

    let results = null;
    const pay = block.find('table.table-payouts').first();
    if (pay.length) {
      const finishers = [];
      pay.find('tbody tr').each((_, tr) => {
        const tds = $(tr).find('td');
        const cell = clean(tds.eq(0).text());
        const fig = cell.match(/\((\d+)\*?\)\s*$/);
        finishers.push({
          name: cell.replace(/\s*\(\d+\*?\)\s*$/, ''),
          fig: fig ? parseInt(fig[1], 10) : null,
          program: clean(tds.eq(1).find('img').attr('alt') || tds.eq(1).text()),
          win: parseMoney(tds.eq(2).text()),
          place: parseMoney(tds.eq(3).text()),
          show: parseMoney(tds.eq(4).text()),
        });
      });
      const exotics = [];
      block.find('table.table-exotic-payouts tbody tr').each((_, tr) => {
        const tds = $(tr).find('td');
        exotics.push({
          pool: clean(tds.eq(0).text()),
          finish: clean(tds.eq(1).text()),
          payout: parseMoney(tds.eq(2).text()),
          totalPool: parseMoney(tds.eq(3).text()),
        });
      });
      if (finishers.length) {
        results = {
          finishers,
          alsoRans: clean(block.find('.race-also-rans').text())
            .replace(/^Also rans:\s*/i, '')
            .split(/,\s*/)
            .filter(Boolean),
          exotics,
          fractions: clean(block.find('.race-fractions').text()).replace(/^Fractions and final time:\s*/i, '') || null,
          connections: clean(block.find('.race-winning-owner-breeder').text()) || null,
          footnotes: clean(block.find('.race-footnotes').text()) || null,
        };
      }
    }

    races.push({
      number,
      postUtc: time.attr('datetime') || null,
      postLocal: clean(time.text()) || null,
      distance,
      distanceYards: toYards(distance),
      surface,
      type,
      restrictions: clean(block.find('.race-restrictions').first().text()),
      purse: parseMoney(block.find('.race-purse').first().text()),
      wagers: clean(block.find('.race-wager-text').first().text()) || null,
      entrants,
      results,
    });
  });

  return {
    slug,
    date,
    track: { name: clean(name) || null, location: clean(location) || null, website },
    dates: [...dates].sort(),
    races,
  };
}
