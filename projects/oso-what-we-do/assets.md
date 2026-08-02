# Assets: We Don't Hand You a Binder (OSO)

- **Style key:** `cd119d60-892c-42a7-9404-3144912bce87` (reused — not regenerated)
- **Characters:**
  - OSO Grizzly: `e4c62fde-9371-47e7-80f1-9ba9dbca563d` (reused — not regenerated). Attached to Blocks 1, 3, 4.
  - Field crew: `5327deaa-e666-43b3-941f-a2c9e7748d45` (**new** — https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_021731_5327deaa-e666-43b3-941f-a2c9e7748d45.png). Attached to Blocks 3 and 4.
- **Narrator:** voice_id `dc382508-c8bd-443c-8cb2-46e57b8d2e6f` ("Sterling"), voice_type `preset` — same on all four takes.
- **Clips:** `gemini_omni`, `duration: 10`, `resolution: 720p`, `aspect_ratio: "9:16"` passed explicitly on every call. Output 720×1280.

| Block | Clip job id | Clip URL | Voice job id | Voice URL | Status |
|---|---|---|---|---|---|
| 1 | `86da1df1-2de7-43a9-8273-f124fe0a85e8` | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_022511_86da1df1-2de7-43a9-8273-f124fe0a85e8.mp4 | `078ae594-ffc5-48b7-822b-54de9340f316` | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_022024_078ae594-ffc5-48b7-822b-54de9340f316.wav | OK — clip **re-rolled once**; voice 7.34s (rate 8) first pass |
| 2 | `e30df48f-7ecb-43b4-aa55-2c2f8fb17af0` | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_022525_e30df48f-7ecb-43b4-aa55-2c2f8fb17af0.mp4 | `95c49b03-ef8e-43a0-8150-06b9df87c4b6` | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_022026_95c49b03-ef8e-43a0-8150-06b9df87c4b6.wav | OK — clip **re-rolled once**; voice 7.49s (rate 12) first pass |
| 3 | `04c12981-343e-4488-8914-b01a8a7e2eb0` | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_022121_04c12981-343e-4488-8914-b01a8a7e2eb0.mp4 | `9fdf587d-8f4d-4bc9-bb44-0177a3e5d1c5` | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_022028_9fdf587d-8f4d-4bc9-bb44-0177a3e5d1c5.wav | OK — clip first-pass; voice 7.92s (rate 15) first pass |
| 4 | `612bb5da-b76e-4e23-a1ea-aedc8f455ec5` | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_022732_612bb5da-b76e-4e23-a1ea-aedc8f455ec5.mp4 | `4de3fe43-b989-4250-9781-e9f8250476cf` | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260802_022032_4de3fe43-b989-4250-9781-e9f8250476cf.wav | OK — clip **re-rolled once**; voice 6.75s (rate 0) first pass |

## Voice timing

All four takes cleared the ~9.0s gate on the **first pass** — no voice retries this run. Pre-rating the longer
lines using the sibling run's finding (rate 12 was needed there) worked:

| Block | speech_rate | Duration | Headroom in the 10s block |
|---|---|---|---|
| 1 | 8 | **7.34s** | 2.66s |
| 2 | 12 | **7.49s** | 2.51s |
| 3 | 15 | **7.92s** | 2.08s |
| 4 | 0 | **6.75s** | 3.25s |

Block 3 carries the longest line (23 words) and was pre-set to rate 15; it reads brisk, which suits this
video's foreman register. No script trimming was needed — unlike the sibling run, `script.md` is unchanged.

## Failures / retries

**Voice:** none. All four first-pass.

**Preset interception:** the "3D RENDER" preset was never offered. On the retry batch the backend instead
proposed **"IN THE DARK"** (`24bae836-2c4a-48e0-89b6-49fcc0b21612`), which would have forced night lighting —
the exact drift this video bans. Declined via `declined_preset_id` and regenerated literal. The first batch
carried `declined_preset_id=5a77643c-...` (the sibling run's 3D RENDER id) proactively.

**Block 1 — re-rolled (superseded clip `2553ff1b-d110-4511-afde-1d1aeed4a7d7`).** Three failures at once:
the render came back fully photorealistic 3D CG rather than 2D badge illustration; the grizzly forearm never
entered frame at all (the binder simply vanished, losing the whole hook and the character beat); and the
binder carried a white label. Fix: front-loaded a hard "FLAT 2D CEL-SHADED — this is a drawing, NOT a
photograph and NOT a 3D CG render" clamp, expanded NEGATIVE with the CGI/ray-trace/Octane family, and made
the paw sweep a MANDATORY on-screen action with a timing cue. Retry is correct on all three.

**Block 2 — re-rolled (superseded clip `67622008-bcc1-4c81-bfd5-4093c9703d50`).** Beats A and B were clean,
but Beat C failed the zero-text rule twice over: the field ticket rendered with printed column headers and
form wording, and the "progress bar across a chrome ledger plate" rendered as an illuminated sign carrying
formed pseudo-glyphs. Beat C had also drifted photoreal and warm (cream paper). Fix: the two text-bait props
were the cause, so the ruled/boxed ticket became a "COMPLETELY BLANK UNMARKED WHITE SHEET" and the ledger
plate became "a plain glowing bar on bare dark steel — no plate, no housing, no readout"; NEGATIVE gained
glyphs / pseudo-text / form fields / ruled lines / placards / cream paper. Retry is fully abstract and clean.

**Block 4 — re-rolled (superseded clip `934b538c-e08f-4b72-ad39-84ef2b020ca2`).** Two hard failures: the sky
darkened to night/deep-navy across the back half — the single drift this video most needed to avoid, and the
one that would have collided with the "Sleepless Nights" sibling — and a red placard reading "A4" sat on the
shop wall. Fix: a LIGHTING LOCK block promoted above the style reference ("bright pale blue-white daylight
from first frame to last, MUST NOT darken"), all surfaces declared bare, and NEGATIVE gained the full
night/dusk/twilight family plus signs/placards/painted markings. Retry holds bright cold daylight end to end.

## Verification performed

Every clip was frame-sampled and inspected rather than accepted on completion status.

- **Zero readable text:** confirmed on all four finals, including zoomed crops of Block 1's binder (blank
  cream label patches, no lettering), Block 2's board/phone/paper/bar (pure abstract), and Block 3's wall
  panel (abstract bars and graph shapes only — no letters or numbers).
- **Cold daylight:** confirmed on all four. No amber, gold or sunset cast anywhere.
- **Grizzly continuity (Block 1 forearm vs Blocks 3–4 reveal), compared side by side as instructed:**
  matches well — same chrome/silver fur value with steel-navy shadowing, same dark steel-navy sleeve rolled
  above the elbow with the same cuff, same forearm/shoulder mass. The Block 1 paw reads retroactively as the
  same animal.
- **Block 4 end-card zone:** centered upper-middle is clean pale-blue sky, and the camera is effectively
  locked in the final 3 seconds — measured mean absolute pixel delta of 1.6–3.5 out of 255 between t=7/8/9/9.8,
  i.e. idle motion only. Safe for the logo end-card.

## Known deviations (accepted — flagging for the producer)

1. **Block 1, ~6.5s:** during the paw sweep a small sliver of the grizzly's muzzle clips the extreme
   right edge of frame for roughly half a second. The storyboard wants the face fully out of Block 1. It is
   not a face reveal — it reads as an ambiguous shape at the frame edge and sits well outside the centered
   upper-middle cover-text zone. If strictness is wanted, mask/crop the right edge in that window; I judged
   it not worth a third generation against the risk of losing the now-correct 2D style and paw action.
2. **Block 4:** the Grizzly establishes in the opening medium (~0–3s) but is not visible in the final wide,
   where the storyboard asks him to stand in the lower third watching. The "crew runs it without him" read
   still lands. The retry was already the fix for two hard brand-lock failures (night + signage) and it nails
   every end-card requirement, so I accepted the character-placement miss rather than risk reintroducing them.
3. **Block 3:** environment leans concrete-grey/tan rather than the locked deep ink-navy steel, and small
   label plates sit beside the panel's indicator buttons. The plates are illegible smudges at delivery
   resolution, not readable letters, so they clear the stated gate; the lighting itself is cold and neutral
   (the tan is material colour, not a warm cast), so it clears the daylight lock too. It is the least
   on-palette of the four. Re-roll if the producer wants tighter palette consistency — it violates no hard rule.

## New ids to save to brand profile

- **Field crew reference:** `5327deaa-e666-43b3-941f-a2c9e7748d45` — add to the "Recurring characters /
  mascot" table in `brand/brand-profile.md` so future OSO videos reuse this same crew design.
- **Preset to keep declining:** `24bae836-2c4a-48e0-89b6-49fcc0b21612` ("IN THE DARK") — forces night
  lighting. Worth noting alongside the existing "3D RENDER" note, since it was intercepted this run and
  targets the daylight lock directly.
