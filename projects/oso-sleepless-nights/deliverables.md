# Deliverables: Sleepless Nights (OSO)

- **Assembled video (primary, 9:16, 720×1280):** https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_213846_cd097de8-1255-4845-92d4-fa5e307b6b25.mp4
  - Job id: `cd097de8-1255-4845-92d4-fa5e307b6b25` (explainer_video, width 720, height 1280, no subtitles)
  - Duration: 40s exactly (4 blocks × 10s fixed window)
- **Variants:** none (brief locks 9:16 only; no secondary aspect requested)
- **Logo end-card (special instruction "always end with logo"): BLOCKED — not applied**
  - Attempted to download the assembled MP4 from its CloudFront host (`d8j0ntlcm91z4.cloudfront.net`) to overlay the OSO shield logo (`/home/user/DC2302/brand/assets/oso-shield-logo.png`) centered upper-middle during the final 3s with a 0.5s fade-in, per instructions.
  - `curl` returned HTTP 403. Confirmed via the sandbox agent-proxy status endpoint: `connect_rejected` — "gateway answered 403 to CONNECT (policy denial or upstream failure)" for host `d8j0ntlcm91z4.cloudfront.net:443`. This CDN host is not reachable from this sandbox; it is not a transient/retryable error.
  - Per run instructions, this is reported rather than treated as a run failure. **The logo end-card must be added outside this sandbox** — either by the user downloading the primary URL above and running the ffmpeg overlay command locally/elsewhere, or by an environment with network access to that CloudFront host.
  - ffmpeg overlay command to use once the file is downloadable as `final.mp4`:
    ```
    ffmpeg -y -i final.mp4 -loop 1 -i /home/user/DC2302/brand/assets/oso-shield-logo.png \
      -filter_complex "[1:v]scale=560:-1,format=rgba,fade=t=in:st=37:d=0.5:alpha=1[lg];[0:v][lg]overlay=(W-w)/2:H*0.16:enable='gte(t,37)'" \
      -t 40 -c:a copy final-endcard.mp4
    ```
  - No local file and no hosted end-card URL exist for this run. **The no-logo assembled URL above is the delivered primary asset.**

- **QC:**
  - Total length: 40s (4 × 10s blocks) — pass, per explainer_video's fixed-window assembly.
  - Block order: 1→2→3→4 as submitted (hook → problem montage → honest reframe → CTA) — pass.
  - Voice takes vs. 10s block cap (all within cap, no stretching needed):
    - Block 1: 8.55s — pass
    - Block 2: 8.39s (retried at speech_rate 12 after original 11.13s take was rejected) — pass
    - Block 3: 8.47s (script trimmed + speech_rate 12 after original couldn't fit even at max rate) — pass
    - Block 4: 6.00s — pass
  - Style/character continuity: per assets.md, all 4 clips completed first-pass at 720p/9:16 with the correct style key and no preset interception/drift — no re-render requests needed.
  - Logo end-card: NOT present in the delivered file (see blocked note above) — this is the one open item on an otherwise clean QC pass.

- **Re-render requests for video-designer:** none. All 4 clips and voice takes passed QC as delivered in assets.md.

- **Outstanding action for user/orchestrator:** apply the logo end-card locally using the ffmpeg command above once the primary MP4 is downloaded from a network path that can reach `d8j0ntlcm91z4.cloudfront.net` (blocked from this sandbox).
