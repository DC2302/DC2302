---
name: music-video
description: Agentic music-video pipeline. Takes a song (Suno link, any audio URL, or a file) plus optional character references and stitches multiple AI-generated clips into a music video with the full song as the soundtrack. Use when the user wants a music video, a video for their song/track, or says /music-video.
---

# /music-video — song in, music video out

You are the orchestrator. The user gives a song — made on Suno or anywhere else —
and optionally characters, a style, lyrics, and special instructions. Specialist
agents design and generate the visuals; the final cut is stitched locally with
ffmpeg so the full song plays continuously over the clips.

Everything the user specifies is LAW for every agent. Characters come from
`brand/brand-profile.md`, an OCD intake submission's character uploads, or images
the user provides now (import via `media_import_url` / `media_upload_widget`).

## Phase 1 — Acquire the song

Get the audio into `projects/<slug>/song.mp3`:

- **Suno link** (`suno.com/song/<id>`): the direct audio is usually
  `https://cdn1.suno.ai/<id>.mp3` — try `curl -fL` on that first; if it 404s,
  WebFetch the share page and pull the audio URL from its `og:audio` /
  `og:video` meta tags.
- **Direct URL / repo path / intake upload:** download or copy it.
- **Local file on the user's machine:** have them drop it in the repo or use
  `media_upload_widget` when on an Apps-UI client (then download the media URL).

Only proceed with audio the user owns or has rights to use.

Then measure it — install ffmpeg if missing
(`apt-get update && apt-get install -y ffmpeg`):

```
ffprobe -v error -show_entries format=duration -of csv=p=0 projects/<slug>/song.mp3
```

`N = ceil(duration / 10)` blocks. **Credit check:** each block is one 10s video
generation. A full 3-minute song is ~18 clips — tell the user the block count
before generating and offer a cut instead (60s of the best section is the
short-form sweet spot). In auto mode: full song if ≤ 90s, otherwise a 60s cut.
Ask for lyrics (or pull them from the Suno page) — the treatment is far better
with them; instrumental is fine too.

## Phase 2 — Treatment

Run the `music-video-director` agent with: song path, exact duration, chosen
window, N, lyrics/structure, character references, brand style-lock status, and
the user's instructions verbatim → `projects/<slug>/treatment.md`.

Checkpoint (skip in auto mode): show the concept, structure map, and block count;
confirm before spending credits.

## Phase 3 — Generate clips

Run the `video-designer` agent on the treatment: style key (reuse the brand lock
unless the treatment says new), character references, then N × 10s clips exactly
as in the brand-video pipeline — **but no voiceover takes** (the song is the
audio). Character reference ids get attached (alongside the style key) to the
blocks the treatment lists them for. → `projects/<slug>/assets.md`.

## Phase 4 — Assemble (music mode)

Run the `video-producer` agent in **music mode**: it downloads the clip files,
concatenates them in block order with clip audio stripped, lays the full song
over the cut, and trims to the window. Output: `projects/<slug>/final.mp4`.
It then uploads the result to Higgsfield via `media_upload` for a hosted URL,
and you also send the file to the user directly (SendUserFile) when the session
supports it. → `projects/<slug>/deliverables.md`.

## Phase 5 — Package (optional but default-on)

Run `social-media-manager` for captions, hashtags, cover-frame suggestion, and a
virality pre-flight — music videos are brand-trust content unless the user says
otherwise.

## Hard rules

- The song is the only soundtrack — never let clip audio survive assembly.
- One style key across all blocks; brand lock wins unless the user asks for a
  new look for this video.
- Never regenerate all clips to fix one block; regenerate that block and
  re-assemble (assembly is local and free).
- Deliver the video link/file the moment Phase 4 finishes.
- If a phase agent fails twice, stop and report what exists so far.
