# Brand Profile

This file is the single source of truth for brand consistency. Every agent in the
`/brand-video` pipeline reads it before doing anything. Fill in as much as you can —
anything left as `TBD` will be decided by the marketing-strategist agent (and its
choice will be written back here so the next video matches).

## Identity

- **Brand name:** OSO Content Design (OCD-OSO)
- **Tagline:** Obsessively consistent branding
- **What we do (one sentence):** AI-powered image and video content production — brand videos, ads, and music videos built by an agentic pipeline. Parent brand: OSO — business efficiency and optimization consulting.
- **Website / link for CTAs:** https://www.osoptimization.com/en
- **Logo:** `ocd/public/oso-ocd-logo.png` — shield badge: fierce grizzly over chrome "OSO" lettering, film strip + clapperboard, electric blue energy, transparent background

## Voice & tone

- **Tone:** confident
- **Words we use:** "Smarter Workflows. Stronger Bottom Line."
- **Words we never use:** TBD

## Visual style (the "style lock")

The pipeline generates ONE style key image and reuses it on every clip of every
video so the whole catalog looks like one brand.

- **Style descriptor:** bold esports-badge energy — deep ink-navy steel environments, chrome/silver detailing, electric ice-blue glow accents, cinematic contrast; grizzly-bear mascot styled like the OSO badge  <!-- edit freely; agents refine on first run -->
- **Palette:** #0A111C ink navy · #182740 steel navy · #4FA8E8 electric blue · #EDF3F9 chrome white · #8FA5BB silver
- **Locked style key (job/media id):** cd119d60-892c-42a7-9404-3144912bce87  <!-- 9:16 badge-style swatch; attach to every clip. NOTE: always pass aspect_ratio "9:16" explicitly to gemini_omni, and decline the "3D RENDER" preset with declined_preset_id when intercepted -->
- **Default aspect:** 9:16  <!-- 9:16 for Reels/TikTok/Shorts, 16:9 for YouTube -->

## Narrator

- **Locked voice_id:** dc382508-c8bd-443c-8cb2-46e57b8d2e6f  <!-- "Sterling" — deep, confident male -->
- **Locked voice_type:** preset
- **Language:** English

## Recurring characters / mascot

List any recurring characters. Each gets a reference image the first time it appears;
the id is saved here and attached to every future scene featuring that character.

| Character | Description | Reference id |
|---|---|---|
| OSO Grizzly | Fierce grizzly styled like the OSO badge: chrome/silver fur, steel-navy shadowing, glowing ice-blue eyes, broad esports-badge silhouette | e4c62fde-9371-47e7-80f1-9ba9dbca563d |
| Field crew | 2-3 blue-collar field-service workers in the locked badge-illustration style: stocky builds, faded work shirts with rolled sleeves, work gloves, chrome/silver highlight edges, ink-navy shadow; faces kept three-quarter or back-to-camera, never close-up; no logos or lettering on garments | 5327deaa-e666-43b3-941f-a2c9e7748d45 |

## Standing CTAs by goal

- **Advertising:** TBD
- **Lead generation:** "Book your free 30-minute consultation" → https://www.osoptimization.com/en
- **Brand trust:** "See the whole system" → https://www.osoptimization.com/en  <!-- soft single ask; the consultation and phone number both live one click away on that page -->

Spoken form of the URL in narration is always "osoptimization dot com" — the
narrator never reads "slash en". On-screen and in captions it is the full
https://www.osoptimization.com/en.

## Platforms & handles

Default target set for every video unless a brief narrows it. Specs, caption
register and posting order live in `brand/platform-playbook.md`.

| Platform | Handle | Priority |
|---|---|---|
| TikTok | TBD | 1 — post first, fastest retention read |
| Instagram Reels | TBD | 2 |
| Facebook Reels | TBD | 3 — owner-operator audience over-indexes here |
| LinkedIn | TBD | 4 — B2B buyer surface, own caption register |
| YouTube Shorts | TBD | 5 — longest discovery tail |

## Special standing instructions

<!-- Anything the agents must always do or never do. e.g. "always end on the logo", "never show competitor names", "always spell numbers out" -->
- **Always end on the logo.** For OSO parent-brand (consulting) videos the mark is
  `brand/assets/oso-shield-logo.png` — the grizzly shield reading "OPERATIONAL
  SYSTEMS OPTIMIZATION". `ocd/public/oso-ocd-logo.png` is the OCD
  content-production badge (film strip + clapperboard) and belongs only on OCD
  sub-brand videos; putting it on a consulting video mis-signals the offer.
- **Never mix OSO and OCD in one video.** One identity on screen per piece.
- **Decline these Higgsfield presets on sight** — both attack the style lock:
  `3D RENDER` (this style is 2D badge illustration) and `IN THE DARK`
  (`24bae836-2c4a-48e0-89b6-49fcc0b21612`, forces night lighting).
- **No baked text in generated clips.** Boards, phones and panels glow with
  abstract shapes only; generated lettering misspells. On-screen text is added in
  post, clear of the top 12% and bottom 20%.
- **No hype verbs:** never "transform", "revolutionize", "10x", "unlock",
  "supercharge".
- **Never escalate OSO Command's "same-day invoicing"** into "instant", "in
  minutes", or any specific timing guarantee.
