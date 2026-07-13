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

## Standing CTAs by goal

- **Advertising:** TBD
- **Lead generation:** TBD
- **Brand trust:** TBD

## Platforms & handles

| Platform | Handle | Priority |
|---|---|---|
| TikTok | TBD | TBD |
| Instagram Reels | TBD | TBD |
| YouTube Shorts | TBD | TBD |
| LinkedIn | TBD | TBD |

## Special standing instructions

<!-- Anything the agents must always do or never do. e.g. "always end on the logo", "never show competitor names", "always spell numbers out" -->
- (none yet)
