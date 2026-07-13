# Distribution: Sleepless Nights (OSO)

## Virality pre-flight
**Automated predictor skipped this run.** `virality_predictor` only accepts videos ≤16s; this asset is 40s (4×10s blocks), so the tool was not called. Manual hook/retention read below substitutes for it — treat this as a lower-confidence read than the tool would give, and consider running the predictor on the Block 1 hook clip alone (it's ~8.55s, under the 16s ceiling) if a data point is wanted before spending media budget on posting.

**Hook (0-2s):** Strong. The brief's own ranking calls this the strongest of three hook options, and the read holds up: extreme close-up on a clock hitting 3:14 AM, pulling back to an exhausted owner staring at the ceiling, on-screen text "3:14 AM. Payroll's due Friday." — specific, visceral, no narration needed to land "this is about me." This is a scroll-stopper for the target audience (blue-collar/trades owners) specifically because it names a real number and a real deadline instead of a generic "stressed business owner" cliché. No re-cut signal here.

**Retention (2-40s):** Moderate risk, structural rather than a hook problem.
- Block 2 (problem montage, 10-20s) is built to be fast-cut and specific (unpaid customer, invoice backlog, trucks on the road, crew issue) — this should hold attention if the edit is genuinely rapid; if any of those four beats lingers, it reads as padding.
- Block 3 (honest reframe, 20-30s) is the highest retention-risk beat: tone deliberately downshifts from visceral/fast to calm and reflective ("we can't promise to fix everything..."). That's the right creative choice for credibility (per brief, this line is a trust asset, not a hook), but tonal deceleration at the 20-30s mark is exactly where platform algorithms start dropping viewers who came in on hook energy alone. This is a pacing/edit risk to watch in the cut, not a caption-fixable issue — flagging per instructions, not treating it as something copy can patch.
- Block 4 (CTA, 30-40s) plus the burned-in shield end-card in the final 3s: the CTA line and "Free 30-Minute Consultation" text need to be fully visible before the end-card overlay begins (~37s per the deliverables.md ffmpeg spec) — confirm in final QC that the two don't visually collide.
- Overall: 40s is on the long side for TikTok/Shorts-style consumption (vs. the ~15-25s sweet spot for these surfaces), which the brief already weighed and accepted deliberately for arc completeness. Given the trade-off was made deliberately, the packaging below leans on strong per-block on-screen text to carry viewers through the slower Block 3, rather than recommending a re-cut.

**Note on the asset packaged below:** the CloudFront URL supplied is the no-logo assembled file (per `deliverables.md`, the logo end-card was blocked in the video-producer's sandbox due to a CDN network restriction). Per instructions, this packaging assumes the end-card variant (OSO shield burned into the final 3s) is the version actually posted — do not publish the raw URL below without confirming the end-card pass has been applied.

---

## TikTok
- **File:** End-card variant of the 9:16 720×1280 video (job `cd097de8-1255-4845-92d4-fa5e307b6b25` + shield end-card overlay, once produced)
- **Caption:**
  "3:14 AM. Payroll's due Friday. Sound familiar?
  You learned the trade. Nobody taught you the back office.
  You don't have to carry it alone — book your free 30-minute consultation with OSO. Link in bio."
- **Hashtags:** #FieldServiceBusiness #TradesBusinessOwner #SmallBusinessOwner #PayrollStress #ContractorLife #BusinessBurnout #OSOConsulting #BlueCollarBusiness
- **Title/cover:** First frame keeps the burned-in on-screen text "3:14 AM. Payroll's due Friday." as the native cover — no extra text overlay needed, TikTok surfaces the in-video text as the thumbnail automatically on scroll.

## Instagram Reels
- **File:** Same end-card variant, 9:16
- **Caption:**
  "3:14 AM. Payroll's due Friday. The mind won't stop running the business, even when everyone else is asleep.
  You've mastered the trade — nobody handed you a manual for the finances, the compliance, the tech side.
  We can't promise to fix everything overnight. But we'll help surface what's keeping you up, and start addressing it.
  You don't have to carry it alone — book your free 30-minute consultation with OSO. Link in bio."
  (Note: Instagram captions don't render clickable links — pair this post with a link sticker on the Reel and/or an updated bio link pointing to osoptimization.com/en before publishing.)
- **Hashtags:** #FieldServiceBusiness #TradesBusiness #SmallBusinessOwnerLife #PayrollStress #OperationsConsulting #BusinessOwnerBurnout #OSOConsulting
- **Title/cover:** Use "3:14 AM. Payroll's due Friday." as the cover frame/first-frame text (same as TikTok) — Reels cover selection should be pinned to that frame rather than an auto-generated middle frame, since the specificity is the whole hook.

## YouTube Shorts
- **File:** Same end-card variant, 9:16 (Shorts requires vertical, under 60s — 40s fits)
- **Caption/description:**
  "3:14 AM. Payroll's due Friday. If you're a trades or field-service owner lying awake running the numbers in your head, this one's for you.
  You mastered the trade — nobody taught you the back office. OSO helps surface the problems keeping you up at night and start addressing them, beginning with a free 30-minute consultation.
  You don't have to carry it alone — book your free 30-minute consultation with OSO: https://www.osoptimization.com/en"
- **Hashtags:** #shorts #FieldServiceBusiness #TradesBusinessOwner #SmallBusinessOwner #PayrollStress #OSOConsulting #BusinessOperations
- **Title:** "3:14 AM. Payroll's Due Friday. (Sound Familiar?)" — under 100 characters, leads with the hook line verbatim rather than a generic benefit title, since the specificity is what earns the click for this audience.
- **Cover:** Same "3:14 AM. Payroll's due Friday." first-frame text; YouTube Shorts pulls from the video itself (no separate custom thumbnail upload for Shorts), so cover framing should again be pinned to that opening beat.

---

## Posting plan
1. **TikTok first.** Post immediately/same slot — TikTok's discovery algorithm rewards freshness and this audience (trades/field-service owners) is well-represented there; also gives the fastest read on whether the Block 3 tonal dip (flagged above) is costing retention in practice, via TikTok's completion-rate analytics, before the other two platforms go live.
2. **Instagram Reels 2-4 hours later**, same day. Staggering avoids cross-posting the identical asset to overlapping followings at the same moment (relevant if OSO's own audience follows across both), and gives time to sanity-check TikTok's early completion/retention numbers and swap the caption or cover if Block 3 is bleeding viewers harder than expected.
3. **YouTube Shorts last, same day or next morning.** Shorts' discovery window is longer-tailed than TikTok/Reels, so timing is less urgent; posting last also means the CTA link (fully clickable in the YouTube description, unlike Instagram) can be finalized with whatever landing-page/UTM the user wants for lead-gen attribution before it goes live.

No posting will be performed by this agent — these are ready-to-publish packages for manual posting. No auto-posting integration is connected in this session, so the auto-posting question is not being raised.
