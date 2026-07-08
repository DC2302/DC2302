# Brand Profile

This file is the single source of truth for brand consistency. Every agent in the
`/brand-video` pipeline reads it before doing anything. Fill in as much as you can —
anything left as `TBD` will be decided by the marketing-strategist agent (and its
choice will be written back here so the next video matches).

## Identity

- **Brand name:** TBD
- **Tagline:** TBD
- **What we do (one sentence):** TBD
- **Website / link for CTAs:** TBD

## Voice & tone

- **Tone:** TBD  <!-- e.g. confident, warm, no-hype, plain-spoken -->
- **Words we use:** TBD
- **Words we never use:** TBD

## Visual style (the "style lock")

The pipeline generates ONE style key image and reuses it on every clip of every
video so the whole catalog looks like one brand.

- **Style descriptor:** TBD  <!-- e.g. "flat 2D vector, thick outlines, warm off-white background, brand palette accents, non-photorealistic" -->
- **Palette:** TBD  <!-- hex codes -->
- **Locked style key (job/media id):** TBD  <!-- filled automatically after the first approved video; reused on every subsequent video -->
- **Default aspect:** 9:16  <!-- 9:16 for Reels/TikTok/Shorts, 16:9 for YouTube -->

## Narrator

- **Locked voice_id:** TBD  <!-- filled after you pick a voice on the first run; reused forever after -->
- **Locked voice_type:** TBD  <!-- preset | element -->
- **Language:** English

## Recurring characters / mascot

List any recurring characters. Each gets a reference image the first time it appears;
the id is saved here and attached to every future scene featuring that character.

| Character | Description | Reference id |
|---|---|---|
| (none yet) | | |

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
