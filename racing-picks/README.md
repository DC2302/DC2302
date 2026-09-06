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

```
score = ln(morning-line probability)
      + 0.5 · ln(jockey factor)      win rate at this track vs. track average
      + 0.5 · ln(trainer factor)     same idea for trainers
      + 0.6 · ln(post-group factor)  rail / inside / middle / outside, by race shape
      + ln(figure factor)            exp(0.02 · (last speed figure − field median)), Thoroughbreds only
win probability = softmax(score) within the race
```

Each factor is shrunk toward neutral with a prior (25 starts for people, 40 for
post groups) and clamped to 0.5–2.0, so a hot jockey with three wins from four
mounts moves the number a little, not a lot. A **value** flag means the model's
probability beats the morning line by at least 20% at 2-1 or better.
Confidence: **strong** when the top choice is 40%+ and 12 points clear,
**lean** at 28%+, otherwise **wide open**.

The weights are starting points chosen by hand, not fitted. The scorecard is
how you find out whether they earn their keep; tune `WEIGHTS` and `SHRINK` in
`lib/model.js` and compare.

## Run it

```
cd racing-picks
npm install
npm run dev        # http://localhost:3000
npm test           # parser and model tests against saved page fixtures
```

Deploy on Vercel with **Root Directory** set to `racing-picks/`. No environment
variables are needed.

## API

- `GET /api/tracks?date=YYYY-MM-DD` — tracks racing that day with UTC first posts.
- `GET /api/card?track=<slug>&date=YYYY-MM-DD&history=12` — the card with model
  ratings, the track-form summary and the scorecard for races already official.

## Limits worth knowing

- Morning lines are the strongest single input. On tracks without them the
  model leans entirely on track form and will be flatter.
- Quarter Horse entries carry no speed figures on these pages, so those picks
  rest on the line, the connections and the post.
- Scratches and rider changes show only when the source page updates.
- This is a rating tool, not betting advice. Favorites lose most races and a
  good model still misses most winners outright.
