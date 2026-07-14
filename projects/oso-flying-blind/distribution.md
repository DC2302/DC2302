# Distribution: Flying Blind

## Virality pre-flight
**Automated predictor skipped this run** (per instruction) — `virality_predictor` only accepts videos ≤16s and this asset is 40s (4×10s blocks). Manual hook/retention read substitutes below; treat it as lower-confidence than the tool would give. As with the Sleepless Nights packaging, running the predictor on the Block 1 hook clip alone (~7s, under the 16s ceiling) would be a cheap data point before spending media budget on posting.

**Hook (0-2s):** Strong, and structurally different in kind from Sleepless Nights' hook. Where the partner ad opens on a specific human moment (3:14 AM, payroll due Friday), this one opens on a visual system metaphor made literal: a dark, cracked, wildly-spinning instrument panel inside a truck cab at night, hand gripping the wheel tighter as the view fogs over, on-screen text "Flying blind?" It doesn't need a number to land — the dead-gauge imagery *is* the claim ("you have no read on your business") in one frame. This is a legitimate scroll-stopper for the same trades/field-service audience, and it reads as a distinct visual language from the partner ad (cockpit/gauges/dusk vs. bedroom/clock/night), which was a brief requirement. No re-cut signal here.

**Retention (2-40s):** Moderate risk, structural — same category of risk as Sleepless Nights but a different shape.
- Block 2 (diagnostic montage, 10-20s) is the ad's engine: fast, matter-of-fact naming of blind spots (no real grasp on numbers, back office not optimized, workflows that need streamlining). Because the brief calls for "confident and specific, not panicked," there's a real risk this reads flatter/slower than a panic-cut montage would — worth confirming in the final edit that the cuts are genuinely brisk and not just a list read over static shots. If it drags, it's a pacing/edit issue, not something captions can fix.
- Block 3 (the turn, 20-30s) is the payoff beat and should be the strongest retention moment in the ad — dark panel snapping into focus, needles settling, ice-blue readouts coming alive is a visually rewarding release after two blocks of "broken." This is the mirror-image of Sleepless Nights' Block 3 (which was the *risk* beat because it downshifted energy); here the beat should *add* energy, which works in this ad's favor structurally.
- Block 4 (CTA, 30-40s) plus the burned-in shield end-card in the final 3s: same collision risk flagged on the partner ad — confirm "Stop guessing. Book your free consultation" and the "Book your free consultation" on-screen text are fully readable before the end-card overlay begins, per whatever timing the downstream compositing uses.
- Overall: 40s is on the long side for TikTok/Shorts consumption, same trade-off the brief for Sleepless Nights already made deliberately for arc completeness and runtime parity between the two ads. Packaging below leans on strong per-block on-screen text (matching the script's suggestions) to carry viewers through Block 2's more procedural pacing.

**Note on the asset packaged below:** the CloudFront URL supplied is the pre-end-card assembled file per `deliverables.md` (logo end-card compositing handled downstream by the orchestrator). Per instructions, this packaging assumes the end-card variant (OSO shield burned into the final 3s) is the version actually posted — do not publish the raw URL below without confirming the end-card pass has been applied.

---

## TikTok
- **File:** End-card variant of the 9:16 720×1280 video (assembly job `396bc3ec-c6fe-45bb-847c-8d0dac76bc59` + shield end-card overlay, once produced)
- **Caption:**
  "Flying blind in your own business?
  Dark gauges. No real read on your numbers. A back office running on guesswork.
  OSO gives you the instruments back — book your free 30-minute consultation today. Link in bio."
- **Hashtags:** #FieldServiceBusiness #TradesBusinessOwner #OilfieldBusiness #BusinessOperations #SmallBusinessOwner #OSOConsulting #BackOfficeOptimization
- **Title/cover:** First frame keeps the burned-in on-screen text "Flying blind?" as the native cover — no extra overlay needed, TikTok surfaces in-video text as the scroll thumbnail.

## Instagram Reels
- **File:** Same end-card variant, 9:16
- **Caption:**
  "Flying blind in your own business?
  Every gauge dark. Trusting instinct where you need instruments — no real grasp on your actual numbers, a back office that isn't optimized, workflows that could clearly be tighter.
  OSO gives you the instruments back: the panel lights up, the needles settle, you can see again.
  Stop guessing — book your free 30-minute consultation with OSO. Link in bio."
  (Note: Instagram captions don't render clickable links — pair this post with a link sticker on the Reel and/or an updated bio link pointing to osoptimization.com/en before publishing.)
- **Hashtags:** #FieldServiceBusiness #TradesBusiness #OilfieldOperations #OperationsConsulting #SmallBusinessOwnerLife #OSOConsulting #BusinessOptimization
- **Title/cover:** Use "Flying blind?" as the cover/first-frame text (same as TikTok) — pin Reels cover selection to that frame rather than an auto-generated middle frame, since the instrument-panel image is the whole hook.

## YouTube Shorts
- **File:** Same end-card variant, 9:16 (Shorts requires vertical, under 60s — 40s fits)
- **Caption/description:**
  "Flying blind in your own business? If you're a trades or field-service owner running the back office on gut feel because no one ever handed you a dashboard, this one's for you.
  No real grasp on your actual numbers. A back office that isn't optimized. Workflows and processes that need streamlining but no clear path to fix them.
  OSO gives you the instruments back — starting with a free 30-minute consultation. Stop guessing: https://www.osoptimization.com/en"
- **Hashtags:** #shorts #FieldServiceBusiness #TradesBusinessOwner #OilfieldBusiness #OSOConsulting #BusinessOperations #SmallBusinessOwner
- **Title:** "Flying Blind? Get Your Instruments Back." — under 100 characters, leads with the hook line verbatim (matching the Sleepless Nights title convention of quoting the hook directly) rather than a generic benefit statement.
- **Cover:** Same "Flying blind?" first-frame text; YouTube Shorts pulls from the video itself, so cover framing should be pinned to that opening beat.

---

## Posting plan (this ad, standalone)
1. **TikTok first**, same-day. Fastest read on completion-rate for Block 2's pacing risk (flagged above) before pushing to the other two platforms.
2. **Instagram Reels 2-4 hours later**, same day — avoids simultaneous cross-posting to overlapping followings and gives time to sanity-check TikTok's early numbers.
3. **YouTube Shorts last**, same day or next morning — its discovery window is longer-tailed, and posting last lets the fully-clickable description link carry a finalized UTM for lead-gen attribution.

## Campaign note: spacing against Sleepless Nights
These two ads are the same lead-gen campaign, same audience, same CTA, same runtime, same mascot and end-card — the risk isn't underperformance, it's the audience clocking them as "the same ad twice" if posted back-to-back with no differentiation. Recommendations:

- **Don't post both ads' first platform slot on the same calendar day.** Give the campaign 3-4 days of separation between the *lead* platform posts (e.g., Sleepless Nights kicks off the campaign on TikTok Monday; Flying Blind kicks off on TikTok the following Thursday/Friday). This lets each ad's own three-platform rollout (TikTok → Reels → Shorts, staggered by hours) finish before the next ad starts its own rollout, rather than interleaving two three-part sequences.
- **Sequence the narrative deliberately: Sleepless Nights first, Flying Blind second.** Sleepless Nights is the emotional entry point (3 AM, exhaustion, "you're not alone") — it's the wider net. Flying Blind is the diagnostic follow-up (naming the actual blind spots, showing the fix) — it reads better as "OK, now here's what we actually do about it" to an audience that's already seen the first ad, rather than as a cold, competing open.
- **Let captions and covers do the differentiation work, not just spacing.** Sleepless Nights leans on a specific time-and-deadline hook ("3:14 AM. Payroll's due Friday."); Flying Blind leans on a visual-system hook ("Flying blind?"). Keep these two hook lines as the respective covers/thumbnails on every platform so a viewer who saw one in-feed recognizes the second as a companion piece, not a re-run — this is already how both packages above are built (each pins its own distinct on-screen text as the cover).
- **If retargeting/paid boosting is used later,** sequence ad spend the same way: Sleepless Nights as top-of-funnel awareness, Flying Blind as the retargeting follow-up to warm viewers 1-2 weeks later — this mirrors the organic spacing above and reinforces "series" rather than "duplicate creative" to the ad platforms' own fatigue/frequency signals.

No posting will be performed by this agent — these are ready-to-publish packages for manual posting. No auto-posting integration is connected in this session, so the auto-posting question is not being raised.
