# Platform Playbook

One video, five platforms. This file is the shared reference for the
`video-producer` (what files to cut) and the `social-media-manager` (how to
package each one). Agents read it alongside `brand/brand-profile.md`.

The rule: **one master cut, five packages.** We do not shoot or generate a
different video per platform — we generate one 9:16 master and change the
wrapper (caption register, hashtags, cover, link handling, and where needed the
aspect ratio).

> Specs below were checked August 2026. Platform limits move; if a value looks
> wrong at post time, trust the platform's own uploader over this file and
> update this file.

## The master

- **Primary master:** 9:16, 1080×1920 (generate at 720×1280 and `upscale_video`
  only if a deliverable needs it), MP4 / H.264 / AAC.
- **Length target:** 20–45s. Four 10s blocks (40s) is the pipeline's default and
  fits every platform below. Under 60s keeps YouTube Shorts and Facebook Reels
  eligible without a second cut.
- **Captions:** burn on-screen text into the video. Most feed views start muted
  and LinkedIn in particular punishes voice-only, so narration must never be the
  only carrier of the message.
- **Safe zone:** keep text and the logo out of the top ~12% and bottom ~20% of
  the 9:16 frame — that is where platform UI (handle, caption, CTA buttons) sits.

## Per-platform

| Platform | Aspect / file | Max length | Sweet spot | Links | Hashtags |
|---|---|---|---|---|---|
| TikTok | 9:16 master | 60 min upload | 15–35s | Bio link only | 4–8, niche > generic |
| Instagram Reels | 9:16 master | 3 min | 15–35s | Not clickable in caption — use link sticker + bio | 4–8 |
| Facebook Reels | 9:16 master | 90s | 15–45s | Clickable in caption | 0–3, low value here |
| LinkedIn | 9:16 master (4:5 alt) | 15 min | 15–60s, under 90s | Clickable, but prefer first comment | 3–5 max, professional |
| YouTube Shorts | 9:16 master | 3 min | 20–60s | Clickable in description | 3–5 + `#shorts` |

### TikTok
Freshest-first algorithm — post here first, it gives the fastest retention read
before the other four go live. Cover = the first frame; the burned-in hook text
is the thumbnail, so the hook line must be legible at thumbnail size. Caption is
short and native — hook restated, then the CTA. Never mention "link in bio"
without the bio link actually being updated.

### Instagram Reels
Same file, longer caption than TikTok — Instagram tolerates a fuller story under
the fold. **Captions are not clickable**; every lead-gen post needs the link
sticker on the Reel and a matching bio link, and the caption should say where to
tap. Pin the cover frame manually to the hook frame; the auto-selected middle
frame is almost always worse.

### Facebook Reels
The most forgiving surface for a slightly longer, more explanatory cut, and the
one where an older/owner-operator audience over-indexes — which is OSO's actual
buyer. Links **are** clickable in the caption, so lead-gen posts should carry the
full URL, not "link in bio". Hashtags do very little here; write plain sentences
instead. Cross-post the same asset to the page's regular feed only if the Reel
underperforms in 48h — not both at once.

### LinkedIn
Different register, same footage. This is the B2B surface where OSO's consulting
buyers are, so:
- **First two lines are everything** — they are all that shows before "…more".
  Lead with the specific problem or a number, never with "Excited to share".
- No emoji-stacked, hashtag-heavy caption. 3–5 relevant hashtags, at the end.
- Write in first person as the operator, not as a brand account. "We keep seeing
  the same thing on job sites" beats "OSO is proud to announce".
- Put the CTA link **in the first comment** and say so in the post — outbound
  links in the post body still suppress reach.
- Native vertical gets surfaced in LinkedIn's vertical video feed; a 4:5
  (1080×1350) variant is the alternative if the post copy needs to stay visible
  alongside the video rather than going full-screen. Produce 4:5 only when the
  brief calls LinkedIn the primary platform.

### YouTube Shorts
Longest discovery tail of the five — post it last, it does not need the same-day
urgency. Title matters more than on the other four (it is indexed and searched):
lead with the hook line verbatim, keep it under 100 characters. Description gets
the full clickable URL with whatever UTM the campaign uses. Include `#shorts`.
A 16:9 variant is only worth producing if the brief wants the piece on the main
YouTube channel as well — otherwise skip it.

## Default posting plan

1. **TikTok** — immediately.
2. **Instagram Reels** — 2–4h later, same day.
3. **Facebook Reels** — same day, after Instagram.
4. **LinkedIn** — next morning, business hours in the audience's timezone
   (Tue–Thu mornings outperform for B2B).
5. **YouTube Shorts** — same day or next, timing least critical.

Stagger rather than blast: overlapping followings see the same asset twice in a
minute otherwise, and the stagger buys time to swap a cover or caption if TikTok's
completion rate comes in weak.

## What changes per platform, and what never does

| Changes | Never changes |
|---|---|
| Caption length and register | The style lock (style key image) |
| Hashtag count and specificity | The narrator voice |
| Link placement (bio / sticker / caption / first comment / description) | The hook itself |
| Cover/first-frame emphasis | The end-card logo |
| Aspect (only 4:5 or 16:9 when the brief asks) | The CTA offer |
