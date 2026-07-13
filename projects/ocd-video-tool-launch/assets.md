# Assets: Your Business, On Video — Without Lifting a Camera

- Style key: cd119d60-892c-42a7-9404-3144912bce87 (new)
  - URL: https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_205706_cd119d60-892c-42a7-9404-3144912bce87.png
- Characters: OSO Grizzly: e4c62fde-9371-47e7-80f1-9ba9dbca563d
  - URL: https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_205758_e4c62fde-9371-47e7-80f1-9ba9dbca563d.png

All clips: gemini_omni, 10s, 720p, 9:16 (720x1280). All voice takes: seed_audio, voice Sterling (preset dc382508-c8bd-443c-8cb2-46e57b8d2e6f), wav.

| Block | Clip job id | Clip URL | Voice job id | Voice URL | Status |
|---|---|---|---|---|---|
| 1 | aeb5116e-e490-4cd4-805b-09084179752a | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_210219_aeb5116e-e490-4cd4-805b-09084179752a.mp4 | 879e555e-efe9-46a6-b225-5dbe10bfdf61 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_210125_879e555e-efe9-46a6-b225-5dbe10bfdf61.wav | done (voice 9.44s) |
| 2 | 2934c55a-f098-4b20-a954-39b9a3acffd3 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_210226_2934c55a-f098-4b20-a954-39b9a3acffd3.mp4 | ceebc1fe-68d8-4115-9c52-bdb1e6ed0ea1 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_210017_ceebc1fe-68d8-4115-9c52-bdb1e6ed0ea1.wav | done (voice 8.42s) |
| 3 | 5cbc5af9-bdf5-408d-b0ba-10a7c02864db | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_210234_5cbc5af9-bdf5-408d-b0ba-10a7c02864db.mp4 | f4d645ae-efc8-49ab-a2e3-f269c52e1506 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_210128_f4d645ae-efc8-49ab-a2e3-f269c52e1506.wav | done (voice 9.41s) |
| 4 | f39f7de6-d5d6-406e-867e-b3e07c6b51fd | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_210240_f39f7de6-d5d6-406e-867e-b3e07c6b51fd.mp4 | ecfd5410-5728-42e2-a5b8-0fdb7e1db420 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_210021_ecfd5410-5728-42e2-a5b8-0fdb7e1db420.wav | done (voice 7.72s) |

## Failures/retries

- Preset interception: the first generate_video submissions were intercepted by a Higgsfield "3D RENDER" preset recommendation (no jobs created). Resubmitted literally with declined_preset_id=5a77643c-b6cc-4efd-bdc6-ab8ff48dfa82 — required on every gemini_omni call for these prompts.
- Aspect-ratio deviation from work order: the first full clip batch was submitted WITHOUT aspect_ratio per the work order ("framing follows the key image"), but gemini_omni ignored the 9:16 reference images and defaulted to 16:9 (1280x720). All four blocks were regenerated once with explicit aspect_ratio "9:16", which produced correct 720x1280 portrait output. Landscape first-pass ids (discard or keep as 16:9 variants): Block 1 e79e970e-d578-45b8-b8a4-1b5e4ea96445, Block 2 3c65598a-8874-4df2-a848-e9697ca4c221, Block 3 c929f247-2952-4637-b972-9f29244a0f97, Block 4 c2bffe77-b5e2-4d6b-98c4-06938199ed99. Lesson for future runs: always pass aspect_ratio "9:16" explicitly to gemini_omni.
- Voice overruns: Block 1 first take b050b3b3-e24c-4a0f-9112-62bc790a402a ran 10.04s and Block 3 first take 96f07408-ad96-498f-9fcf-65ba23b750a3 ran 10.38s (cap 9.5s). Regenerated with speech_rate 10 (Block 1 → 9.44s) and speech_rate 15 (Block 3 → 9.41s). Blocks 2 and 4 passed on the first take.

## New ids to save to brand profile

- Locked style key: cd119d60-892c-42a7-9404-3144912bce87
- OSO Grizzly reference: e4c62fde-9371-47e7-80f1-9ba9dbca563d
