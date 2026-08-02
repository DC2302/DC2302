# Distribution: We Don't Hand You a Binder (OSO — what we do and why it matters)

**Asset for all five platforms (one master, five packages):**
https://d2ol7oe51mr4n9.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/3b8c25d6-1deb-482c-8800-b4a1f2030094.mp4
9:16, 1080×1920, 40s, OSO shield end-card from t=37. No aspect variants exist and none are needed.
Local: `/home/user/DC2302/projects/oso-what-we-do/oso-what-we-do-final-9x16-1080.mp4`

Goal is **brand-trust**, so every caption below is written conversational — explaining, not closing. The CTA
is a single soft ask (see the whole system) and the free 30-minute consultation appears only as a
"if you'd rather just talk to someone" aside, never as a second CTA.

---

## Virality pre-flight

**The predictor ran this time.** `virality_predictor` caps at ~16s and the master is 40s, so the full cut
still cannot be scored — but the Block 1 hook clip is 10.005s and went through clean. Job
`10cd63de-2006-417f-9c0c-5247f4f48616`, source clip `86da1df1-2de7-43a9-8273-f124fe0a85e8`.
Dashboard: https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_024629_10cd63de-2006-417f-9c0c-5247f4f48616.html

**Read this as a hook score only. It says nothing about the whole video's retention** — blocks 2, 3 and 4 were
never scored, so there is no data on the 20–30s credibility beat or the CTA landing.

| Metric | Score | Note |
|---|---|---|
| **Hook (0–3s window)** | **35 / 100** | Weak. This is the headline finding. |
| Overall | 50 (`scores`) / 42 (`summary`) | Tool returned two different values; reporting both rather than picking. |
| Viral potential | 47 / 100 | |
| Brain engagement | 42 / 100 | |
| Sustain | 100 (`scores`) / 1 (`summary`) | Same disagreement, and on a single 10s block sustain is close to meaningless. Discount it. |
| Peak | 0.449 at **t=10s** | The block's strongest moment is its last, not its first. |

**The shape of the curve matters more than the headline number.**

- **Visual cortex peaks at t=0 (0.567) and then decays monotonically to 0.393 at t=10.** Whatever the frame is
  doing visually, it is doing the most of it immediately and less every second after. The dust punch is the
  visual peak of the block.
- **Global engagement dips from 0.443 at t=0 to 0.411 at t=3** — it goes *down* across exactly the hook window
  — sits flat around 0.415 through t=9, then jumps to 0.449 at t=10.
- **Default Mode Network (lower is better) sits at 0.62–0.63 for the entire ten seconds** and only breaks at
  t=10, dropping to 0.46. High DMN through the whole block means attention drifting inward rather than being
  held by the frame.
- Auditory and language networks climb steadily into t=10, peaking there.

So the payoff of the hook block registers (the paw sweep and the cut, ~t=8–10) and the opening does not.

**What this does and does not license.**

The clip that was scored has **no narration and no on-screen text** — it is the raw generated visual, and the
video's actual hook line ("This is what most consultants leave you with") does not exist in the scored file.
Its first three frames are also the empty desk the producer flagged. So 35/100 is a **floor on the visual
alone**, not a verdict on the finished hook. It should not be read as "the hook is broken."

But it corroborates the producer's finding hard, and it changes the status of two packaging steps:

1. **The on-screen text pass is now blocking, not recommended.** The measurement says the visual does not hold
   the 0–3s window by itself. The hook line is what has to hold it. Do not publish this anywhere without it.
2. **The manual cover pin is non-negotiable** for the same reason, and the cover must carry the hook text
   (see the note under "On-screen text pass" — the supplied still is a clean frame with no text on it).

**Re-cut recommendation: no re-render of Block 1.** The scored deficit is concentrated in the seconds where
the missing text belongs, and the block is otherwise correct (2D style locked, paw action present, on-palette).
Re-rolling it would risk the three drift failures that already cost it one retry.

**One cheap optional trim, for the producer to weigh — not a blocker.** Cutting the first ~0.4s off the head of
the master would open the video on the binder impact instead of on three frames of empty desk, attacking the
measured 0–3s deficit at its source and removing the dead-cover problem entirely rather than papering over it.
Cost: the file becomes ~39.6s, every downstream timing below shifts 0.4s earlier, and the cover pin moves to
t≈1.0s. Narration would still sit cleanly inside its blocks (Block 1 speech moves 1.37→0.97s). It is a real
improvement but a modest one, and the manual cover already solves the thumbnail half of the problem. **Ship as
is unless the producer wants it.**

---

## On-screen text pass — REQUIRED before any upload

Per `deliverables.md`, the script's on-screen text was **not burned in**. Narration is not the sole carrier
(playbook rule, and the predictor read above is the evidence). Someone has to add this.

**Do it once, as a single render, before uploading — not five times in five composers.** Three reasons: the
five platforms then carry identical text; the composer text tools on TikTok/Instagram cannot reliably hold
type in a tight pixel band across a 40s timeline; and — the load-bearing one — **the supplied cover still
`cover-frame-recommended.jpg` is a clean frame with no text on it.** The brief requires the hook line to be
legible at thumbnail size. That only happens if the text is in the video before the cover frame is taken. So:
render the text pass, then re-export the t=1.4s frame from the texted file, and use *that* as the cover on all
five platforms.

**Safe zones, in 1080×1920 pixels:** all text between **y = 230** (top 12%) and **y = 1536** (bottom 20%).
From **t=37.0** the shield end-card occupies roughly **y 307–1147**, centered — so any text still on screen
after t=37 must sit in the **y 1147–1536** band.

Exact text and timing (timings derived from the producer's measured speech windows; nudge to the waveform):

| In | Out | Text | Placement |
|---|---|---|---|
| 0.6s | 8.0s | **This is what most consultants leave you with.** | Large, centered, two lines max. Must be fully up by **t=1.2s** so it is on the t=1.4s cover frame. This is the thumbnail — size it to read at 200px wide. |
| 14.3s | 19.5s | **RUNS.** | Hard cut in on the beat, hold |
| 15.5s | 19.5s | **FOUND.** | Hard cut in, stacks under RUNS. |
| 16.7s | 19.5s | **PAID.** | Hard cut in, stacks under FOUND. |
| 21.5s | 28.8s | **Installed with your crew.**<br>**Not handed over.** | Two lines, centered |
| 32.2s | 36.0s | **Smarter Workflows. Stronger Bottom Line.** | Centered |
| 35.2s | 40.0s | **osoptimization.com/en** | Must sit in the **y 1147–1536** band so it survives the end-card fade at t=37 and holds to the last frame |

Block speech windows for reference: B1 1.37–7.78 · B2 11.28–17.91 · B3 21.08–28.76 · B4 32.00–38.29.
The three-word triad timing is estimated from B2's window — the narration hits "How the work runs / How you
get found / How you get paid" across roughly 14.3–17.9s.

---

## TikTok

- **File:** the 1080×1920 master, after the text pass. Posted first.
- **Caption:**

> Most consultants hand you a binder. It sits on a shelf and gathers dust.
>
> We rebuild the three systems your business actually runs on — how the work runs, how you get found, how you get paid — then install them with your crew, on your jobs, inside the way they already work.
>
> Not handed over. That's why it keeps running after we leave.
>
> Smarter workflows, stronger bottom line. Whole system's at the link in our bio.

- **Hashtags (8):** `#fieldservicebusiness #tradesbusinessowner #contractorlife #bluecollarbusiness #businesssystems #sopdevelopment #dispatchtoinvoice #osoconsulting`
- **Link:** bio only. **Update the bio link to https://www.osoptimization.com/en before this goes live** — the
  playbook's rule is never to say "link in bio" against a stale bio.
- **Cover:** set manually to the **t=1.4s** frame (binder landed, dust plume at full height, hook line up).
  TikTok will otherwise default to frame 0, which is an empty steel desk — a dead thumbnail. Use the
  re-exported texted still, or `/home/user/DC2302/projects/oso-what-we-do/cover-frame-recommended.jpg` if the
  text is being added in-composer.
- **Pin to profile** — this is the profile-intro asset.

## Instagram Reels

- **File:** same master, same text pass.
- **Caption:**

> Most consultants hand you a binder.
>
> A document. Delivered to your desk, read once, and then it lives on a shelf. Nothing in the business actually changes — because a document isn't a system, it's a description of one.
>
> That's not what we do.
>
> We rebuild the three systems a field-service business runs on:
>
> RUNS — operational assessment, SOPs, process, compliance, the numbers.
> FOUND — website, SEO, Google Business Profile, the reputation infrastructure that's working before the phone rings.
> PAID — dispatch to field ticket to same-day invoice to money in the account. One platform.
>
> Then we install it with your crew, on your jobs, inside the way they already work. Not handed over. That's why it keeps running after we leave.
>
> Smarter workflows, stronger bottom line. Tap the link sticker to see the whole system — it's in our bio too.

- **Hashtags (7):** `#fieldservicebusiness #tradesbusinessowner #contractorlife #businesssystems #standardoperatingprocedures #operationsconsulting #osoconsulting`
- **Link:** **not clickable in the caption.** Add the **link sticker on the Reel** pointing to
  https://www.osoptimization.com/en *and* make sure the bio link matches. The caption already tells people
  where to tap — that line is dead copy if the sticker isn't placed.
- **Cover:** set manually to **t=1.4s**. Instagram's auto-pick grabs a middle frame and will not surface the
  hook line. Also choose the grid crop deliberately — the hook text must survive the 1:1 grid centre-crop.
- **Pin to profile.**

## Facebook Reels — PRIMARY

The brief's primary platform: the owner-operator audience over-indexes here, and it is the only one of the five
where the CTA URL is clickable inline — which matters when the CTA *is* a URL. Longest, most explanatory
caption of the set, written as plain sentences per the playbook.

- **File:** same master, same text pass.
- **Caption:**

> Most consultants hand you a binder.
>
> You pay for the engagement, you sit through the interviews, and what lands on your desk at the end is a document. It gets read once. Then it goes on a shelf, and six months later the business is running exactly the way it always did.
>
> We do the opposite of that.
>
> There are three systems a field-service business runs on, and we rebuild all three. How the work runs — operational assessment, SOPs, process implementation, workflow, compliance, reporting, automation. How you get found — website, SEO, Google Business Profile and Maps, branding, the reputation infrastructure that's working before the phone ever rings. And how you get paid — dispatch, bilingual field tickets, same-day invoicing, live GPS, job costing, straight through to your books. One platform.
>
> Then the part that actually matters: we install it with your crew. On your jobs, in your trucks, inside the way your people already work. Not handed over in a binder. That's the difference between a system that runs and a document about one, and it's why it keeps running after we're gone.
>
> Smarter workflows. Stronger bottom line.
>
> See the whole system: https://www.osoptimization.com/en
>
> (The free 30-minute consultation and the phone number are both on that page, if you'd rather just talk to someone.)

- **Hashtags: none.** Deliberate, per the playbook — hashtags do very little on Facebook and plain sentences
  outperform. If the page's own convention requires them, two is the ceiling:
  `#fieldservice #tradesbusiness`.
- **Link:** full URL inline in the caption, as written above. This is the one surface where that works.
- **Cover:** set manually to **t=1.4s** in the Reels composer.
- **48h rule:** do **not** also cross-post this to the page's regular feed at launch. Only cross-post if the
  Reel underperforms after 48 hours.

## LinkedIn

Own register, per the playbook: first person as the operator, payload in the first two lines before the
"…more" fold, no emoji stacking, link in the first comment. This is not the TikTok caption with the emojis
stripped out.

- **File:** same 9:16 master, same text pass. **No 4:5 variant** — LinkedIn isn't primary here, so per the
  playbook it isn't produced.
- **Caption:**

> The most expensive deliverable in consulting is a three-ring binder.
> Not because of the price — because nothing changes after it lands.
>
> I've seen the same pattern on enough job sites to stop treating it as a one-off. An operator brings someone in, pays for the assessment, sits through the interviews, and what arrives at the end is a document. It gets read once. Six months on, dispatch is still a whiteboard, invoices still go out on Friday if somebody remembers, and the binder is on the shelf behind the desk.
>
> The document was never the problem. The handover was.
>
> We build OSO around three systems, because in a field-service business there are only three that matter:
>
> How the work runs — operational assessment, SOPs, process implementation, compliance, reporting, automation.
> How you get found — website, SEO, Google Business Profile, the reputation infrastructure that works before the phone rings.
> How you get paid — dispatch to field ticket to same-day invoice to money in the account, on one platform.
>
> And we install all three with the crew. In their trucks, on their jobs, inside the way they already work — so the SOP describes how your people actually do it, instead of instructing them to do it differently. That is the entire reason it survives the day we leave.
>
> Smarter workflows. Stronger bottom line.
>
> Link to the full system is in the first comment.
>
> #FieldService #OperationsConsulting #SmallBusinessOperations #Trades

- **Hashtags (4):** as above, at the end, professional register only. Playbook cap is 3–5.
- **Link — first comment, posted within a minute of the post going live:**

> See the whole system: https://www.osoptimization.com/en — the free 30-minute consultation is on that page.

  An outbound link in the post body suppresses reach; that is why it goes in the comment, and why the post
  says so out loud.
- **First-two-lines check:** the two opening lines are 68 and 66 characters, ~135 total — they clear the mobile
  "…more" fold with room. Keep them as the first two lines if the copy is edited.
- **Cover:** LinkedIn's video thumbnail picker — select the **t=1.4s** frame, or upload the exported still.
- **Feature on profile** (Featured section) — this is the intro asset.

## YouTube Shorts

- **File:** same master, same text pass. 40s, well under the 3-minute Shorts ceiling.
- **Title:** `This Is What Most Consultants Leave You With` — 43 characters, the hook line verbatim, per the
  playbook. (If a brand tag is wanted: `This Is What Most Consultants Leave You With | OSO`, 50 characters.
  Both are well under 100.)
- **Description:**

> Most consultants hand you a binder. A document that sits on a shelf and gathers dust. That's not this.
>
> OSO rebuilds the three systems a field-service business runs on — how the work runs, how you get found, and how you get paid — and installs them with your crew, on your jobs, inside the way they already work. Not handed over. That's why it keeps running after we leave.
>
> RUNS — operational assessment, SOP development, process implementation, workflow optimization, compliance integration, data and reporting, AI and automation.
> FOUND — website design and development, SEO and content, Google Business Profile and Maps, social media, branding, marketing automation.
> PAID — OSO Command: dispatch, bilingual field tickets, same-day invoicing, live GPS, job costing, QuickBooks integration.
>
> Smarter workflows. Stronger bottom line.
>
> See the whole system: https://www.osoptimization.com/en

  The service enumeration is deliberate *here and only here*. The brief bans service-menu drift in the video,
  but the YouTube description is indexed and searched — this is where those terms earn their keep, and they
  cost nothing in the viewing experience.
- **Hashtags (5 + shorts):** `#shorts #FieldServiceBusiness #OperationsConsulting #TradesBusiness #SmallBusinessOperations`
- **Link:** full clickable URL in the description, as written. Add campaign UTMs before publishing if the user
  wants attribution.
- **Cover:** in the Shorts composer, use the frame selector and pick **t=1.4s**. If the channel has custom
  Shorts thumbnail upload available, upload the exported still instead. Do not accept the default.
- **Set as channel trailer.**
- **No 16:9 variant** — no main-channel requirement in the brief.

---

## Posting plan

Playbook default order, unedited — and worth saying why, since Facebook is the primary platform here and the
obvious instinct is to lead with it. The brief already resolved this: TikTok still goes first because it gives
the fastest retention read, and that read is what tells us whether the hook fix landed. Given the predictor
scored the hook at 35/100, TikTok's completion rate in the first few hours is the single most valuable
diagnostic in this launch. Posting Facebook first would spend the primary surface before we know.

Start on a **Tuesday, Wednesday or Thursday** so the LinkedIn slot on day 2 lands in its best window.

1. **TikTok — immediately.** Cover pinned to t=1.4s, bio link updated first. **Pin to profile.** Then watch
   completion rate and 3-second view-through for 2–4 hours.
2. **Instagram Reels — 2–4h later, same day.** Link sticker placed, bio link matching, cover pinned.
   **Pin to profile.** If TikTok's 3-second retention came in poor, this is the checkpoint to swap the cover
   or tighten the first caption line before the primary platform goes live.
3. **Facebook Reels — same day, after Instagram.** Late afternoon or early evening skews toward the
   owner-operator audience. This is the primary surface: full URL inline, and this is the one to monitor
   properly for the first week. No feed cross-post for 48h.
4. **LinkedIn — next morning, business hours in the audience's timezone.** Tue–Thu mornings outperform for B2B.
   Post, then add the first comment with the link within a minute. **Feature on profile.**
5. **YouTube Shorts — same day as LinkedIn or the day after.** Longest discovery tail, timing least critical,
   and posting last means UTMs can be finalized. **Set as channel trailer.**

Stagger rather than blast — overlapping followings otherwise see the same asset twice in a minute, and the
gaps are what buy the chance to fix a cover or a caption mid-launch.

**No posting has been performed and none will be.** These are prepared packages for the user to publish. No
posting integration is connected in this session, so auto-posting is not being raised as an option.

---

## Two write-backs for the brand profile

Not my file to change, flagging for the orchestrator:

1. **`brand/brand-profile.md` → Standing CTAs → Brand trust** is still `TBD`. This run establishes it:
   **"See the whole system — osoptimization.com/en"**. The brief recommends exactly this.
2. **Platforms & handles table** is `TBD` for all five. Every package above needs a real handle and a real bio
   link at post time; the TikTok and Instagram captions in particular reference a bio link that has to exist.
