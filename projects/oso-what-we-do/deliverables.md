# Deliverables: We Don't Hand You a Binder (OSO — what we do and why it matters)

## Primary

- **Final video (primary, 9:16, 1080×1920, WITH logo end-card): https://d2ol7oe51mr4n9.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/3b8c25d6-1deb-482c-8800-b4a1f2030094.mp4** — 40s
  - Local: `/home/user/DC2302/projects/oso-what-we-do/oso-what-we-do-final-9x16-1080.mp4`
  - This is the upload file for all five platforms. 1080×1920 is the master size the brief specified and the platforms' preferred ingest size.
- **Native-resolution master (9:16, 720×1280, WITH logo end-card):** https://d2ol7oe51mr4n9.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/9e56d1e8-c151-4c14-9ffb-530b42cc0b70.mp4 — 40s
  - Local: `/home/user/DC2302/projects/oso-what-we-do/oso-what-we-do-final-9x16.mp4`
  - Archival master. The 1080 file above is a lanczos upscale of this one — it adds no new detail, it only matches the platforms' ingest size so they don't upscale it themselves.
- **Recommended cover still (t=1.4s):** https://d2ol7oe51mr4n9.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/75c337fb-73d0-4347-ab1d-845b3bac3bfb.jpg
  - Local: `/home/user/DC2302/projects/oso-what-we-do/cover-frame-recommended.jpg` — see QC item 3, this is a required manual step.
- **Pre-end-card assembly (no logo, 720×1280):** https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_023358_ec29c967-d366-4dde-87fc-20783bc7e8b9.mp4
  - `explainer_video` job id `ec29c967-d366-4dde-87fc-20783bc7e8b9` (width 720, height 1280, no subtitles, 4 blocks)
  - Local: `/home/user/DC2302/projects/oso-what-we-do/oso-what-we-do-noendcard-9x16.mp4`

- **Variants: none.** No `reframe` called. Per the brief, LinkedIn is not primary (no 4:5) and there is no main-YouTube-channel requirement (no 16:9). The 9:16 master serves TikTok, Instagram Reels, Facebook Reels, LinkedIn and YouTube Shorts as-is.

## Logo end-card — APPLIED (the sibling run's blocker did not reproduce)

The sibling "Sleepless Nights" run reported HTTP 403 from `d8j0ntlcm91z4.cloudfront.net` and had to ship without the end-card. **That did not happen this run.** The host returned HTTP 200 on both a HEAD and a full download of the assembled MP4, the file came down intact (10,650,044 bytes, ffprobe-clean), and the overlay ran locally. `ffmpeg` was not preinstalled in this sandbox; installed via `apt-get` first.

- Mark used: `/home/user/DC2302/brand/assets/oso-shield-logo.png` — verified before compositing as the **OSO parent mark** (grizzly shield, "OPERATIONAL SYSTEMS OPTIMIZATION"). No film strip, no clapperboard. The OCD badge was not used.
- Verified the PNG carries real alpha (corner alpha = 0), so it composites without a white box.
- Placement: 560px wide, horizontally centered, top edge at y = 0.16·H = 205px. Fades in over 0.5s starting at t=37.0 and holds to 40.0.
- Safe zones respected: logo occupies y 205–765 of 1280. Top 12% cutoff is y=154, bottom 20% cutoff is y=1024. Clear of both.
- Narration ends at t=38.29, so the logo fade begins under the last three words of the CTA and then holds over 1.7s of clean tail. Visually verified at t=36.9 (no logo), 37.25 (mid-fade), 39.9 (full opacity) — the shield sits in open sky, with only the tip of the shield point grazing the rooftop line. Reads clean.

Command used, for the record:

```
ffmpeg -y -i final-noendcard.mp4 -loop 1 -i /home/user/DC2302/brand/assets/oso-shield-logo.png \
  -filter_complex "[1:v]scale=560:-1,format=rgba,fade=t=in:st=37:d=0.5:alpha=1[lg];[0:v][lg]overlay=(W-w)/2:H*0.16:enable='gte(t,37)'[v]" \
  -map "[v]" -map 0:a -t 40 -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart final-endcard.mp4
```

**Worth writing back to the pipeline docs:** the CloudFront 403 is intermittent/environment-specific, not a permanent property of that host. Future runs should test it rather than assume it is blocked. If it ever does return 403, `mcp__Higgsfield__sandbox_exec` is a clean fallback — it is a remote Linux sandbox with ffmpeg preinstalled and its own internet access, so the overlay can run entirely server-side without a local download. It was not needed here.

## QC: PASS

**1. Total length = 40s exactly.** ffprobe: video stream 40.000000s, 720×1280, h264, 30fps; audio 40.023s AAC 44.1kHz stereo. Four fixed 10s windows, as designed.

**2. Block N's narration lands on clip N — verified, not assumed.** Ran `silencedetect` across the whole file and mapped every speech window against the block boundaries:

| Block | Speech window | Sits inside its 10s window | Take length (assets.md) | Centering |
|---|---|---|---|---|
| 1 | 1.37 – 7.78s | 0–10 ✓ | 7.34s | predicted start 1.33, actual 1.37 |
| 2 | 11.28 – 17.91s | 10–20 ✓ | 7.49s | predicted start 11.26, actual 11.28 |
| 3 | 21.08 – 28.76s | 20–30 ✓ | 7.92s | predicted start 21.04, actual 21.08 |
| 4 | 32.00 – 38.29s | 30–40 ✓ | 6.75s | take has leading silence; ends 38.29 |

Every cut is straddled by a silence gap of 3.1s or more (7.78–11.28, 17.91–21.08, 28.76–32.00). No line bleeds across a boundary and nothing was sped up — every take had headroom.

**3. Hook block reads instantly — but the first frame does NOT work as a still. Action required.**
This is the one real finding. Frame-stepping the first 12 frames: **frames 0–2 are an empty steel desk.** The binder enters frame at frame 3 (t≈0.10s) and lands at frame ~12 (t≈0.40s). So the auto-derived cover frame is a bare desk with no subject — it would be a dead thumbnail on TikTok and Reels, which is exactly the failure mode the brief was guarding against by making the first frame the cover.

The block itself is correct and needs no re-render: binder impact with a dust punch through the ice-blue light shaft, dust plume peaking ~1.5s, grizzly forearm sweeping the binder off the desk ~6–7s, clean empty desk at 9.7s. The whole hook beat plays exactly as storyboarded.

**Fix is free and does not touch the video:** pin the cover manually to **t=1.4s** (binder on the desk, dust plume at full height, high contrast, legible at thumbnail size). I have exported that frame and hosted it — see "Recommended cover still" above. All five platforms allow a manual cover/thumbnail, so this is a packaging instruction for the social-media-manager, not a re-render. **Do not let any platform default to frame 0.**

**4. Block 4's end-card zone is clean and the camera holds through the final 3s — confirmed.**
The designer's note said "camera locked." Measured full-frame PSNR t=37.0 vs t=39.9 is only 24.6 dB, which initially looked like a fail. It is not: measuring the end-card region specifically (560×560 at x=80, y=205) gives **42.4 dB over 37.0→39.9 and 45.2 dB over 38.5→39.9** — roughly 1.9/255 mean deviation, i.e. static. The full-frame number is low because the *subjects* move (crew loading trucks in the lower two-thirds), not the camera. That is exactly the shot the end-card needs: locked frame, clean sky up top, life below. Confirms the designer's 1.6–3.5/255 measurement.

**5. Style and grizzly continuity hold across the cuts.** Consistent 2D cel-shaded illustration on all four blocks — no photoreal or 3D-CG drift anywhere, which was the failure that forced the Block 1 re-roll. Cold daylight throughout, no amber or night drift, so no collision with the "Sleepless Nights" sibling. The grizzly reads as one animal: chrome/silver fur with steel-navy shadowing and blue eyes in the Block 1 forearm, the Block 3 shop panel, and the Block 4 opening medium; same dark navy work shirt in 3 and 4. Zero readable text in any block — I re-checked the Block 4 building placards in the assembled cut and they are blank tan rectangles.

**6. CTA block is clean.** Block 4 cuts from an interior medium of the grizzly (ice-blue neon strips, very on-palette) to the exterior wide of the yard, crew and trucks, then holds for the end-card. Payoff line and URL land at 32.00–38.29 with the logo taking the frame behind the last words.

## Block 3 palette — my read: PASSES, not worth a re-roll

The video-designer flagged Block 3 as the least on-palette of the four, leaning concrete-grey/tan rather than ink-navy. That is accurate, and it is measurable. Mean RGB per block over the assembled cut:

| Block | mean R | mean G | mean B | blue-over-red separation |
|---|---|---|---|---|
| 1 | 63.3 | 82.3 | 93.6 | **30.3** |
| 2 | 80.8 | 101.2 | 112.4 | **31.6** |
| 3 | 79.1 | 88.6 | 96.2 | **17.1** |
| 4 | 120.8 | 138.7 | 148.3 | **27.5** |

So Block 3 carries about 45% less blue separation than its neighbours — the drift is real and quantifiable, not imagined.

**But it passes, for three reasons.** First, it is still net-cool: blue is the highest channel, red the lowest, same ordering as every other block. It is a desaturated cool grey, not a warm cast, so it violates neither the daylight lock nor the no-amber rule. Second, the cut is already climbing in brightness on purpose — interior gloom (mean ~80) → abstract inserts (~98) → shop (~88) → open yard daylight (~136). Block 3's greyer concrete sits on that ramp rather than breaking it; in playback it reads as "different location, same day," not as a different film. Third, where the eye actually goes in Block 3 — the wall panel with its ice-blue chart glow, the indicator buttons, the grizzly's blue eyes — is fully on-palette. The tan is in the background masonry, which is the least attended part of the frame.

Against that: a re-roll costs credits and, per assets.md, this clip is the only one of the four that came back clean first-pass. Re-rolling it risks reintroducing the drift failures that cost three of the four blocks a retry — photoreal 3D, night lighting, pseudo-text signage. That is a bad trade for a background material tone that no viewer will consciously register at 10 seconds. **Recommend shipping as-is.**

## Re-render requests for video-designer: none

All four blocks pass. Two known deviations carried over from assets.md, both re-confirmed in the assembled cut and both accepted:

1. **Block 1, ~6.3s:** a sliver of the grizzly's muzzle clips the extreme right frame edge for roughly half a second during the paw sweep. Visible in the filmstrip, but at playback speed it reads as an ambiguous dark shape at the frame edge, not a face reveal, and it sits far outside the centered cover-text zone. Not worth a third generation on the one block that already burned a re-roll fixing three hard failures.
2. **Block 4:** the grizzly appears in the opening medium but not in the closing wide. The "crew runs it without him" read still lands, and arguably lands better — the closing wide is the crew working unsupervised, which is literally the beat 3 promise ("it keeps running") paying off in beat 4. Accepted.

## Handoff notes for the social-media-manager

- **Set the cover manually on every platform** to the supplied `cover-frame-recommended.jpg` (t=1.4s). The default first frame is an empty desk. This is the single highest-leverage packaging action on this asset.
- Upload the **1080×1920** file.
- On-screen text from `script.md` (hook line, "RUNS. FOUND. PAID.", "Installed with your crew.", the URL) is **not** burned in — no subtitles were requested and none were rendered. It needs to be added in the platform composer or a separate pass, keeping clear of the top 12% / bottom 20% safe zones and clear of the logo from t=37.
- The video is fully legible muted except for the narration, so on-screen text is load-bearing, not optional.
- Per the brief: pin on TikTok and Instagram, feature on LinkedIn, set as channel trailer on YouTube.
