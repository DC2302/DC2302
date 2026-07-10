# Agentic Brand-Video Pipeline

Open this repo in Claude Code (with the Higgsfield MCP connected) and say what you
want a video about. A team of specialist agents takes it from idea to a finished,
stitched, brand-consistent short video plus ready-to-post social packaging.

## How to use

**Intake app — OSO Content Design (OCD):** the branded web app in [`ocd/`](ocd/)
(hosted on Vercel) collects everything in one form — brand details, logo,
inspiration images, character references, and the video request — and commits it
to `intake/` in this repo. Then just say `/brand-video` in Claude Code and the
agent team picks up the pending submission, expands on it, and produces. See
[`ocd/README.md`](ocd/README.md) for deploy steps.

**Idea mode — you give one sentence, the agents do the rest:**

```
/brand-video a video about why most small businesses waste money on ads
```

**Brief mode — you give the details, the agents execute them exactly:**

```
/brand-video
Idea: launch video for our new booking tool
Goal: lead generation
Audience: barbershop owners
Length: 40 seconds, 9:16 for Reels + TikTok
Characters: use our mascot "Ozzy" in blocks 1 and 4
Special instructions: end on the logo, never say "cheap", CTA is "Book a free demo"
```

**Auto mode:** add "you choose, run it end to end" and it runs without checkpoints.

**Music video mode — turn a song into a stitched music video:**

```
/music-video https://suno.com/song/abc123 — our bear mascot wandering a neon
city at night, chorus = rooftop shots. Use the 60 seconds around the drop.
```

Works with a Suno link, any audio URL, an uploaded file, or an OCD intake
submission. The `music-video-director` agent maps the song's structure (lyrics
help) onto 10-second blocks and designs a shot per block with your recurring
characters; the `video-designer` generates the clips; the `video-producer`
stitches them locally with ffmpeg and lays the full song over the cut — the song
is the only soundtrack. Full song or a chosen window (a 3-minute song is ~18
clips, so a 60-second cut is the budget-friendly default for social).

## What happens

| Phase | Agent | Deliverable |
|---|---|---|
| 1 | `marketing-strategist` | Creative brief — goal (ad / lead-gen / trust), audience, hook, arc, CTA, platforms |
| 2 | `content-writer` | Narration script, one 10-second block per clip, plus caption CTA |
| 3 | `brand-designer` | Storyboard — style-lock descriptor, character continuity, per-block scene/motion/audio prompts |
| 4 | `video-designer` | All assets via Higgsfield — style key image, character refs, clips, per-block voiceover |
| 5 | `video-producer` | One stitched MP4 (server-side assembly), QC, aspect variants |
| 6 | `social-media-manager` | Captions, hashtags, titles, posting plan, virality pre-flight — you post |

Every artifact is saved to `projects/<slug>/` so a video is reviewable and
repairable block-by-block (a bad clip gets regenerated alone, never the whole
video).

## How branding stays consistent

`brand/brand-profile.md` is the source of truth. The first run locks in:

- **one style key image** — attached to every clip of every future video,
- **one narrator voice** — reused on every video,
- **character reference images** — reused whenever that character appears.

Fill in the profile's tone, palette, CTAs, and platforms before your first run for
best results — anything left `TBD` gets decided once and written back.

## Requirements

- Higgsfield MCP connected (image, video, audio generation + assembly — generation
  phases spend Higgsfield credits; strategy/script/storyboard phases are free).
- The agent definitions in `.claude/agents/` and the orchestrator skill in
  `.claude/skills/brand-video/` (this repo).
