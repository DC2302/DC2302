# Racing Picks

A phone-friendly web app that shows every track racing on a given day, the full
card at each track (entries, morning lines, results and payoffs as they post),
and a transparent model pick for every race. It scores itself: once results
post, the app shows how the top picks, the morning-line favorites and the
flagged value plays would have done on flat $2 win bets.

## Where the data comes from

- Entries, morning lines, jockeys, trainers, sires, last speed figures, post
  times, results, payoffs, exotics, fractions and chart notes are read from the
  public pages at entries.horseracingnation.com. Post times arrive as UTC, so
  the app can show track time and your local time side by side.
- Track form for the model is built from that track's recent result pages,
  found through the dates listed on the track's landing page (up to 12 past
  dates, roughly 90 to 120 races).
- Nothing is stored server-side. Pages are cached for a minute (today) or six
  hours (past dates) to keep the load on the source light.

## How a pick is made (`lib/model.js`)

No odds and no favorites. The morning line is parsed only so the scorecard can
benchmark the picks against the crowd; it never enters the rating.

Every runner is scored on seven components built from its own record and the
track's recent results:

| Component | Source | Fitted weight |
|---|---|---|
| Speed | last and best HRN speed figure; for timed sprints (Quarter Horses) the final time against the par for that track, distance and surface, estimated from finishing position; z-scored within the race | 0.26 (missing: −0.05) |
| Form | share of the field beaten in the last five races, recency weighted, a troubled trip excused; z-scored | 0.18 (no recent race: +0.02) |
| Class | log of recent purses over today's purse | 0.51 |
| Fitness | flags for 7–45 days since the last race and for under 7 days | −0.03 and −0.01 (no real effect) |
| Connections | log trainer and jockey win-rate factors, at this track when known, otherwise across the form database | 0.44 and 0.56 |
| Post | log post-group win-rate factor for this race shape at this track | 0.21 |
| Pedigree | log sire win-rate factor across the form database | 0.13 |
| Distance and surface | average finish at today's distance and surface | 0.19 |

`rating = weighted sum`, `win probability = softmax(rating)` within the race.
Rates are shrunk toward neutral with a prior (25 starts for people, 30 for
sires, 40 for post groups) and clamped to 0.5–2.0. Fitted on 5,525 charted
races from July 20 to September 5, 2026; on the held-out September 6 cards the
top pick won 45 of 146 races (31%) against a 12.6% uniform baseline and the
crowd favorite's 41%. Confidence is **strong**
when the top choice is 35%+ and 10 points clear with form on at least half the
field, **lean** at 22%+, **wide open** otherwise, and **thin data** when fewer
than a third of the runners have a recent race on record. Every horse carries
its full breakdown in `detail` and `parts`, and the UI shows it on tap.

The weights are fitted, not guessed: `npm run fit -- <formdb.json> <trainFrom>
<trainTo> [testDate]` fits them by conditional logit (softmax over each race's
runners, maximizing the likelihood of the actual winner) on the crawled
charts, and reports top-pick hit rate and log-likelihood on the training days
and a held-out day against the uniform baseline. Re-fit when the form window
or the features change and paste the result into `WEIGHTS`. Training ignores
the entries' last figure: about a week after a race the source overwrites that
field with the figure earned in the race itself, which would leak the result.

## The form database (`lib/formdb.js`)

The model's per-horse history comes from a crawl of every track's results
pages over a window of past dates (`FORM_DAYS`, default 14 on the server; the
snapshot builder uses 35). For each charted race it keeps every runner's
finishing position, field size, purse, final time, speed figure, post,
jockey, trainer, sire and the chart note about that horse, and flags trouble
words (bumped, checked, broke slowly, wide and so on). From that it derives par
times per track, distance and surface, and win rates for sires, trainers and
jockeys. Lookups are always restricted to races before the card being rated, so
scoring a past day never sees that day's results.

Horses that last raced before the window, or first-time starters, have no form
rows; they are rated on connections, post and pedigree and the race is marked
thin when that is most of the field.

## Run it

```
cd racing-picks
npm install
npm run dev        # http://localhost:3000
npm test           # parser and model tests against saved page fixtures
```

Deploy on Vercel with **Root Directory** set to `racing-picks/`. Optional:
`FORM_DAYS` (default 14) sets how many past days of results feed the form
database; the first request after a cold start crawls them, later requests
reuse the in-memory copy for six hours.

## API

- `GET /api/tracks?date=YYYY-MM-DD` — tracks racing that day with UTC first posts.
- `GET /api/card?track=<slug>&date=YYYY-MM-DD&history=12` — the card with model
  ratings, the track-form summary and the scorecard for races already official.

## Limits worth knowing

- The form window is short, so a horse returning from a longer layoff shows no
  recent form and is rated on connections, post and pedigree alone.
- Beaten margins are not published on the source pages; a non-winner's time
  is estimated from its finishing position.
- Quarter Horse entries carry no speed figures, so their speed component is the
  final time against par, which needs at least one timed race in the window.
- Scratches and rider changes show only when the source page updates.
- This is a rating tool, not betting advice. Favorites lose most races and a
  good model still misses most winners outright.
