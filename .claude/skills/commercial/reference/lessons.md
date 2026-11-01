# Lessons from real runs (keep appending)

## Voices (Higgsfield)
- Every Higgsfield **preset voice is a native English speaker**. Verified 2026-10-31: all
  female preset previews transcribe as English, including "Marisol", "Isabella" and "Elena".
  Spanish text read by a preset sounds like an English voice attempting Spanish, and the client noticed.
- For an authentic non-English narrator, **clone a native speaker** with `create_voice`
  (the widget records or uploads ~30–60 s). The owner or a staff member is ideal and
  on-brand. Get that person's consent. Then use the resulting `element` voice in `seed_audio`.
- Don't pick the voice yourself; you can't hear it. Offer 2–3 candidates or let the
  user name one (`list_voices` → `voice_id`). En Boca chose "Nora" (d081b915-…) for English.
- `seed_audio` has no language parameter; it follows the text. `speech_rate`: 0 is
  default, −10 to −14 is a slow, savoring read, +12 to +22 is rushed.
- Don't put "…" in TTS text: seed_audio turns it into 1–3 s silences (one take ran
  21 s instead of 10). Use commas and periods to set the rhythm.
- Re-measure every take; pacing varies a lot between runs.

## Video generation
- `gemini_omni` is retired. `gemini_omni_flash_1_1` reference-to-video (10 s, 720p, 9:16)
  with the style key + a real product photo attached keeps the product consistent across beats.
- A NEGATIVE prompt containing "3D render" makes Higgsfield suggest its "3D RENDER"
  preset. Resubmit with `declined_preset_id`.
- Pours can show the edge of a pitcher at the frame top. `punchIn` ~0.09 with
  `anchor: "bottom"` hides it without a regeneration.
- About 128 credits for a style key + 3 clips (one retake) + 6 voice takes.

## Audio
- The Higgsfield connector has **no general music model** (Suno isn't in the catalog;
  `sonilo_music` is game-pipeline only). Either supply a licensed track via
  `music.file`, or tell the user to add a sound in the app when posting.
- Clips from gemini_omni_flash carry soft ambient audio. The renderer ducks it under the voice.

## Preflight
- The Higgsfield `virality_predictor` rejects videos longer than 16 s. Score the first
  ≤16 s (the hook is what matters) and note that the CTA half wasn't scored.
- En Boca's static pour opening scored hook 28/100, while the fast ingredient cuts
  peaked. Open on motion.

## Layout
- Long caption lines clip at the frame edge (Arial at 66 px fits about 26 characters).
  Split with `\n`.
- Labels synced to picture cuts can run ahead of the VO. Slow the beat (`speed` 0.7)
  rather than squeezing the voice.
