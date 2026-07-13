# Assets: Sleepless Nights (OSO)

- Style key: cd119d60-892c-42a7-9404-3144912bce87 (reused)
- Characters:
  - OSO Grizzly: e4c62fde-9371-47e7-80f1-9ba9dbca563d (reused)
  - Field-service owner: 66066fa8-7e9e-41f6-9e5a-533b1750e112 (new — https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_213008_66066fa8-7e9e-41f6-9e5a-533b1750e112.png)

| Block | Clip job id | Clip URL | Voice job id | Voice URL | Status |
|---|---|---|---|---|---|
| 1 | 6188170f-17bb-40a9-9019-f64aa68cbcee | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_213117_6188170f-17bb-40a9-9019-f64aa68cbcee.mp4 | c03c3cd9-0b9e-4010-ad22-af752e2cbf02 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_213147_c03c3cd9-0b9e-4010-ad22-af752e2cbf02.wav | OK — clip first-pass, voice 8.55s |
| 2 | 47a833ea-e5dc-4e9d-b3b6-38752b8c5edc | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_213122_47a833ea-e5dc-4e9d-b3b6-38752b8c5edc.mp4 | b94e84d1-8880-46cb-a78e-3f1dcc704ec2 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_213259_b94e84d1-8880-46cb-a78e-3f1dcc704ec2.wav | OK — clip first-pass; voice retried once (speech_rate 12), now 8.39s |
| 3 | 23a826f7-5944-431a-8f67-566676140311 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_213129_23a826f7-5944-431a-8f67-566676140311.mp4 | ddea1295-28a7-478c-8356-25e58324eb6b | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_213700_ddea1295-28a7-478c-8356-25e58324eb6b.wav | OK — clip first-pass; voice re-scripted by orchestrator (trimmed line, speech_rate 12), now 8.47s |
| 4 | 4fa01c74-c051-4229-af87-8a808f4a8035 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_213134_4fa01c74-c051-4229-af87-8a808f4a8035.mp4 | a92dff12-1069-4bfe-affe-d9134609d077 | https://d8j0ntlcm91z4.cloudfront.net/user_2xfEds2KQoY8LoVXO45fAm1wAkM/hf_20260713_213154_a92dff12-1069-4bfe-affe-d9134609d077.wav | OK — clip first-pass, voice 6.0s |

## Failures / retries

- **Clips:** all 4 `gemini_omni` submissions completed on the first pass at 720p/9:16 with `declined_preset_id=5a77643c-b6cc-4efd-bdc6-ab8ff48dfa82` passed proactively — no "3D RENDER" preset interception occurred, no off-style drift, no retries needed.
- **Voice, Block 2:** first take (`f250e383-f168-4043-9d0a-5fe39b4fd160`) ran 11.13s, over the 9.5s cap. Retried at `speech_rate: 12` → `b94e84d1-8880-46cb-a78e-3f1dcc704ec2`, 8.39s. Used the retry.
- **Voice, Block 3 — resolved:** original line could not fit 9.5s at a natural pace (11.34s at rate 0; 9.80s even at rate 25). The orchestrator trimmed the script line ("We can't promise to fix everything. But we'll surface the problems and address them — the finances, the compliance, the technology nobody taught you.") and re-voiced at speech_rate 12 → ddea1295-28a7-478c-8356-25e58324eb6b, 8.47s, calm pace. script.md updated to match.

## New ids to save to brand profile

- Field-service owner reference: `66066fa8-7e9e-41f6-9e5a-533b1750e112` — add to the "Recurring characters / mascot" table in `brand/brand-profile.md` alongside OSO Grizzly, so future OSO videos reuse this same owner design.
