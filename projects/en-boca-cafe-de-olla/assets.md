# Assets: El Café de Olla de las 6 a.m. (En Boca de Todos, Midland)

- Style key: 33129300-814d-4780-8620-06f20c86021c (new) — https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20261101_020111_33129300-814d-4780-8620-06f20c86021c.png (nano_banana_pro, 9:16, 2k; jarrito matches the reference: black rim/neck/handle, amber belly, terracotta base, rim chips)
- Jarrito reference (uploaded photo): media id 6917181b-b4a7-44af-819c-a8f19f51ad89 — https://d2ol7oe51mr4n9.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/6917181b-b4a7-44af-819c-a8f19f51ad89.jpg
- Characters: none (hands only in Block 3, described inside the prompt)
- Video model: `gemini_omni_flash_1_1`, mode `reference-to-video`, 10 s, 720p, 9:16 (720x1280, 24 fps). The role file's `gemini_omni` is retired ("no longer available"); 1.1 is the direct successor (same Google Omni family, photoreal). Both the style key and the jarrito photo were attached as `image_references` on every block.
- Voice: Soraya, preset 5c1d2f7f-cdb4-5b1d-bca9-156439e3275e, model `seed_audio`, mp3.

| Block | Clip job id | Clip URL | Voice job id | Voice URL | Status |
|---|---|---|---|---|---|
| 1 | cb408010-1eac-47c9-a302-862fafdeed96 (retake; use this) | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20261101_020718_cb408010-1eac-47c9-a302-862fafdeed96.mp4 | 1a485170-e99e-47d6-9b00-2247dc07a978 (speech_rate 12, 8.42 s) | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20261101_020611_1a485170-e99e-47d6-9b00-2247dc07a978.mp3 | OK |
| 2 | 894f419d-e09a-4110-98d8-5a2a65bcb561 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20261101_020527_894f419d-e09a-4110-98d8-5a2a65bcb561.mp4 | 2bd28f3c-4a76-4414-9255-cb3ec3f1bf1d (speech_rate 22, 8.32 s) | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20261101_020614_2bd28f3c-4a76-4414-9255-cb3ec3f1bf1d.mp3 | OK |
| 3 | e8bf9c4c-0d2c-4244-8b41-b14cb16a0fea | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20261101_020529_e8bf9c4c-0d2c-4244-8b41-b14cb16a0fea.mp4 | fd868e20-43a2-4d17-985e-5d6efa015422 (default rate, 8.32 s) | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20261101_020338_fd868e20-43a2-4d17-985e-5d6efa015422.mp3 | OK |

## Clip QC (frame-sheet review at 1 fps plus full-size frames)
- Block 1 (retake): jarrito matches reference, steam/grade on-style, no face, no stove/pot/flame. A thin dark sliver at the very top edge during the first ~1.5 s of the pour is the only trace of a pouring vessel (the original take showed an obvious dark pitcher edge; retaken once). Beat 3 hero frame is calm with spices lower-left; bottom 20% mostly dark wood. If the sliver bothers anyone, crop in post (about 6% punch-in) or start the clip at ~1.0 s.
- Block 2: six clean macro cuts in order (piloncillo, canela, clavo, anís, spices drop into the jarrito, pour and steam). No pot, stove, flame, face or hands. The jarrito's handle is on the right in beats 5-6 (the real jarrito has it on the left, so it is mirrored). Black rim, amber belly and terracotta base still read correctly. Acceptable; flag if the client is picky about handle side.
- Block 3: hands (aged, tanned, sand canvas cuff, no gloves/rings/watch/text) around the jarrito, lift to the top of frame, set down, withdraw. No face or torso. Last ~3.5 s: jarrito alone on dark wood, steam only, papel picado bokeh, spices lower-left, nothing sharp in the bottom-right; clean end-card plate. Hands show no mud dust (minor deviation).
- No text or logos visible in any clip.

## Voice QC
- Language setting: `seed_audio` has no language parameter; it auto-detects from the Spanish text. I cannot listen to audio in this session, so Mexican-Spanish accent quality is NOT verified by ear. Someone should play the three mp3s; if Soraya sounds non-Mexican, swap the voice and regenerate.
- First-pass (default rate) durations: B1 10.48 s, B2 12.91 s, B3 8.32 s. B1 and B2 exceeded the 9.5 s cap, so they were retaken with a higher speech_rate (12 and 22); both now fit (8.42 s, 8.32 s). Speech rate varies a lot between runs, so re-measure if retaking. The takes include about 0.1-0.4 s of leading/trailing silence.
- Unused extra take: d75c0593-a7f5-4541-a81e-b52486103f86, a trimmed Block 2 line ("...Todo junto, calientito, en jarrito de barro, como en casa."), came out 10.58 s, not needed.
- Superseded first-pass takes (keep as fallbacks): B1 59c547a6-afd6-4597-9721-dcffc884905a (10.48 s), B2 9cdca979-b95c-4594-97ff-14d0896b0393 (12.91 s).
- Check by ear how "South Terrell" and the digit groups of the phone number are read.

## Failures / retries
- `gemini_omni` rejected as retired; used `gemini_omni_flash_1_1`.
- The first video submit returned a "3D RENDER" preset suggestion, triggered by the phrase "3D render look" in the NEGATIVE; resubmitted literally with `declined_preset_id`. Nothing was charged for the suggestion.
- One regeneration: Block 1 (visible pouring vessel). Original Block 1 clip kept for reference: 26c63f94-3990-44ff-aae8-45db3a340e48 (https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20261101_020525_26c63f94-3990-44ff-aae8-45db3a340e48.mp4).
- Credits: balance 5175.25 before, 5047.75 after = 127.5 spent (4 clips at 30 each = 120, plus the style key and 6 voice takes = 7.5 combined).

## New ids saved to brand profile
- Locked style key 33129300-814d-4780-8620-06f20c86021c written to `brand/clients/en-boca-de-todos/brand-profile.md`. Jarrito reference media id noted in the same comment.
