# Deliverables: El Café de Olla de las 6 a.m. (En Boca de Todos, Midland)

- Final video (9:16): `projects/en-boca-cafe-de-olla/en-boca-cafe-de-olla-9x16.mp4`
- Duration: 30.00 s | 1080x1920 | 30 fps | H.264 (yuv420p) + AAC 48 kHz stereo | about 4.8 Mbps
- Contact sheet: `projects/en-boca-cafe-de-olla/qc-sheet.png` (frames at 1, 5, 8, 12, 15, 19, 23, 26, 29 s)
- Edit source (re-runnable, local ffmpeg): `projects/en-boca-cafe-de-olla/edit-src/` (captions.ass, run.sh, wm.png, disc.png)
- Assembly: LOCAL ffmpeg (not Higgsfield server-side), because of burned-in captions, price overlay, watermark and end card. Clips B1 retake (cb408010) + B2 + B3 upscaled 720x1280 to 1080x1920 (lanczos), hard cuts, 10 s each.
- Higgsfield credits spent in this phase: 0 (earlier phases: 127.5, see assets.md).

## Music
No music bed. The Higgsfield connector exposes no general music model (Suno is not in the catalog; `sonilo_music` is game-pipeline-only and must not be used standalone), so the music step was skipped. Audio = the three Soraya voice takes (v1r, v2r, v3, each starting 0.3 s into its block) over the clips' own ambient audio (pour, crackle, clink, steam), compressed, ducked under the VO, and lifted slightly in the last 3 s. Clip ambience is almost silent in the final seconds, so the swell is barely audible. Mix: -13.6 LUFS integrated, true peak -1.6 dBFS. If a music bed is wanted, drop a licensed track into run.sh as a 4th audio input.

## Persistent watermark (new requirement)
Circular En Boca ring badge (logo-ring.png, masked to a circle so the white corners are transparent), 160 px diameter, about 92% opacity, soft dark drop shadow. Top-left corner at about x=48, y=200. Visible from 0 s until a fade-out at about 26.3-26.8 s, where the big end-card logo takes over. Why upper-left: TikTok/Reels/Facebook Reels keep the right ~150 px (like/comment/share icons), the bottom ~22% (username, caption, audio) and the top ~180 px (Following/For You tabs, Reels header) covered by UI; the upper-left below the top bar is free on all three. All hook/claim/label/price text is centered in x=60..930 and starts at y>=290-410, so nothing overlaps the badge.

## Captions (all burned in, Spanish; Arial Black / Arial Bold, white or cempasúchil gold on night semi-opaque boxes)
Upper-middle (hook/claim/labels; text block centered in x=60..930):
- 0.0-2.5 s: "6 a.m. y ya huele a canela." ("6 a.m." in gold)
- 6.4-9.7 s claim card (gold): "El mejor café de olla de la Cuenca Pérmica"
- Ingredient labels synced to the macro cuts: 10.05 "Piloncillo", 11.65 "Canela", 13.25 "Clavo", 14.65 "Anís estrella"; 18.2-19.95 "Calientito." on the final steaming close
- Price stack 21.2-26.4 s: "$5.99" (gold, large), "Refill $2.99" (white), chip "4.5 estrellas en Google" (white on red #CE1126)
Lower-middle VO captions (bottom edge at about 77% of height, phrase by phrase, timed to the actual takes using silence detection plus syllable-proportional splits):
- 0.3 "Si madrugas, / esto es para ti." | 2.55 "El café de olla que anda / en boca de todos" (the "para nosotros, el mejor..." phrase is carried by the claim card instead)
- 10.7 "Café endulzado con / piloncillo, canela, clavo / y anís estrella" | 14.6 "Todo junto en tu café, / calientito" | 16.3 "Servido en jarrito de barro, / como en casa"
- 20.5 "Ven por tu café de olla" | 22.1 "703 S Terrell St, Midland" | 24.2 "Mar–Sáb desde las 6 a.m. / Dom desde las 7 a.m."
End card 26.7-30 s (background blurred and darkened, logo.png on a white disc with shadow): "Ven por tu café de olla" / "Llama para ordenar:" / "(432) 218-7078" (gold) / "703 S Terrell St, Midland" / "en-boca.com" (small).

## Edit notes
- Block 1 top-edge sliver hidden by an 8% punch-in crop on B1 (verified clean at 0.6 s).
- Block 3 end card sits over the calm jarrito plate; no clip cuts in the last 3 s.
- Hours: shown as "Mar–Sáb desde las 6 a.m. / Dom desde las 7 a.m." exactly as specified. The script/brief also listed "Lunes cerrado"; it is NOT on screen, so a Monday walk-in is possible. Recommend adding it (one-line change in captions.ass, 24.2 s event).
- Claim "el mejor café de olla de la Cuenca Pérmica" still needs owner OK (brief risk item). Price/refill from Oct 2026 menu.

## QC
- Contact sheet reviewed: captions legible at phone size; accents (é, í, á, ñ-free copy; "Pérmica", "Anís", "café", "Sáb") render correctly; no clipped text; right ~150 px and bottom ~20% clear of text; watermark visible and uncovered in every sampled frame 1-23 s; end card (29 s, full-res checked) clean.
- Known minor: VO captions at 62-77% overlap the jarrito belly/hands in B3 (specified band); boxes are rectangular (libass), not rounded; ingredient labels follow the visual cuts (Anís label ends just before the VO says "estrella" is finished), not word-level VO timing.
- NOT verified by ear: Soraya's Mexican-Spanish accent, "South Terrell" pronunciation, and the digit groups of the phone number; and no one has listened to the final mix balance. Play the final once.
- Audio present: yes (AAC stereo, whole 30 s). Duration confirmed 30.00 s.
