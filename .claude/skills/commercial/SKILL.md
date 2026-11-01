---
name: commercial
description: Make a branded, conversion-focused short-form video commercial (TikTok, Instagram Reels, Facebook Reels, YouTube Shorts) for any company and any product or service, generated on Higgsfield and assembled locally with burned-in captions, a platform-safe logo watermark, price/proof overlays and a call-to-action end card. Use when the user asks for a commercial, ad, promo video or reel for a business ("make a commercial for X's Y", "promo video for our service", "reel promoting our product"), in any language.
---

# /commercial: any brand, any product or service, built to convert

You are the creative director. You run the existing `/brand-video` agents
(`.claude/agents/*.md`) with this skill's **conversion formula** as extra law, then
assemble the finished video yourself with `scripts/render-commercial.mjs`.
First run: En Boca de Todos café de olla (`projects/en-boca-cafe-de-olla-en/`). That
`commercial.json` is the reference spec.

## 0. Intake (ask only what you can't find)

Collect, from the user's message first, then their website, menu, brochure or brand
profile, and only then by asking:

| Need | Why |
|---|---|
| Company, the ONE product/service, location | one offer per commercial converts better than a catalog |
| The single action: visit / call / book / order / get a quote | the whole video funnels to it |
| Verified facts: price, ingredients/specs/process, hours, guarantees, ratings | the only claims allowed (rule 1) |
| Audience + why they'd buy now | shapes the hook |
| Language, platforms, length | default: English, 9:16 for all reels, 30–40 s |
| Logo (PNG) + colors | watermark, end card, overlay styling |

Anything the writer wants to say that isn't verified gets marked **CONFIRM WITH
OWNER** and stays out of the video until confirmed.

## 1. Brand profile

Client videos read `brand/clients/<slug>/brand-profile.md`, never OSO's. Copy
`templates/brand-profile.md` on a brand's first run. Locks live there and are
reused on every later video: style key, narrator voice, product reference images,
logo and watermark position. Never mix one client's locks with another's.

First-run locks need the user (never skip):
- **Voice:** let the user pick by ear (see `reference/lessons.md` → Voices). Write `voice_id` back to the profile.
- **Style:** propose the style descriptor (photoreal suits food and products; illustrated suits mascots and services), show it, then lock the generated key id.

## 2. The conversion formula (LAW for strategist, writer and designer)

Three beats. Each beat is one generated 10 s clip, played at 0.7–0.8× when the
product should feel savored (food, drink, craft) or at 1× for urgency (deals, services).

1. **Hook + promise (0–3 s decides everything).** Open on the strongest MOTION
   (pour, sizzle, spark, before→after reveal), not a static product shot. The
   virality preflight scored a static opening at 28/100. Pair it with a
   pattern-interrupt line of on-screen text ("6 a.m. and it already smells like
   cinnamon"). The VO names who it's for. The promise or claim card lands by ~8 s.
2. **Show how it comes together.** Ingredients, features or process steps, one per
   cut, each labeled on screen in sync with the VO saying it. Show only verified
   steps. If brewing or manufacturing details aren't verified, show the ingredients
   meeting the product, never an invented process.
3. **Proof + price + one action.** Real price stack, real rating or guarantee, then
   address, hours and phone (or URL). End card for the last ~3.3 s: logo disc +
   action line + phone/URL + address. No "link in bio" unless the profile has the link.

Pacing: write fewer words than you think. Savored products get about 20 words per 12 s
beat, read slowly (seed_audio `speech_rate` −10 to −14). Never use "…" in TTS text: it
inserts multi-second pauses. Use commas and periods.

Hook ideas by industry: `reference/hook-bank.md`. Model/voice/tool gotchas: `reference/lessons.md`. Read both before Phase 1.

## 3. Pipeline

Create `projects/<slug>/`. Run each phase as its agent, passing the brand profile
path, prior artifacts, this file's formula, and the user's request verbatim:

| Phase | Agent | Notes |
|---|---|---|
| 1 Brief | `marketing-strategist` | checkpoint: show hook, length, CTA, CONFIRM items, and get a go before credits are spent |
| 2 Script | `content-writer` | formula beats; per-beat VO ≤ the beat length; on-screen text plan |
| 3 Storyboard | `brand-designer` | style key prompt + 3 beats; real product photo as reference; keep text-safe zones calm |
| 4 Generate | `video-designer` | style key, product reference upload, 3 clips, 3 voice takes. Report ids, URLs and credits. Budget ≤1,500 credits |
| 5 Assemble | **you**, with `scripts/render-commercial.mjs` | see §4 |
| 6 Distribute | `social-media-manager` | per-platform captions, hashtags, pinned comment, cover, posting times, virality preflight |

Agent role files reference `mcp__Higgsfield__*`. In this workspace the connector
prefix is `mcp__26b64f0c-4ba4-48a9-9b44-6124cef2f5d2__`, so tell each agent that.

## 4. Assembly (0 credits, re-cut freely)

1. Download the clips, voice takes and logo into `projects/<slug>/media/`.
2. Measure each take and get word timestamps. In the Higgsfield sandbox
   (`sandbox_exec`), faster-whisper is preinstalled: `WhisperModel("base").transcribe(f, word_timestamps=True)`.
3. Copy `templates/commercial.example.json` → `projects/<slug>/commercial.json`.
   Fill in the timeline, voice `at` times, and overlays timed from the word
   timestamps. Ingredient/feature labels follow the picture cuts; captions follow the voice.
4. Render: `node .claude/skills/commercial/scripts/render-commercial.mjs projects/<slug>/commercial.json`
   (first time: `npm install` in `scripts/`, which bundles ffmpeg).
5. **Look at `qc-sheet.png`** (Read it). Check: no clipped text (split long lines with
   `\n`), labels match their shots, the watermark is uncovered, the end card is
   clean. Fix the spec and re-render; each pass takes under a minute.
6. Send the MP4 with SendUserFile right away. Tell the user to play it once with
   sound (you can't hear the accent or pronunciation).

Spec reference (all times in seconds on the final timeline):
- `timeline[]`: `clip`, `in`, `out`, `speed` (0.5–2), `punchIn` (0–0.2 crop to hide edge artifacts), `anchor` (`top`/`center`/`bottom`).
- `voice[]`: `file`, `at`, optional `gainDb`.
- `overlays[]`: `start`, `end`, `style` (`hook`, `claim`, `label`, `caption`, `price`, `sub`, `chip`), `text` (`\n` = new line, `*word*` = accent color), optional `pos: [x, y]`.
- `watermark`: `size`, `x`, `y`, `opacity`, or `false` to turn it off.
- `endcard`: `duration`, `logoSize`, `logoY`, `lines[]` with styles `big`, `mid`, `phone`, `small`.
- `music`: `{ file, gainDb }`, optional, ducked under the voice.
- `ambient`: `{ gainDb }`.
- `brand.fonts`: `{ display: {name, file}, body: {name, file} }`. The default is Arial Black / Arial Bold, found in the macOS, Windows or Linux msttcorefonts folders, with DejaVu Sans Bold as the Linux fallback. If none exists, the renderer warns and libass substitutes a system font.

## 5. Platform-safe layout (built into the renderer)

The logo watermark sits upper-left (x 48, y 200, 160 px) from 0 s until it fades
into the end card. That's the one area TikTok, Reels and Facebook Reels UI never
covers. The renderer keeps the right ~150 px (action icons), the bottom ~22%
(username, caption, audio) and the top ~180 px (tabs and header) free of text.
Upper text starts below the watermark; captions sit in the lower-middle band.

## Hard rules

1. **Never invent facts.** No prices, promotions, hours, recipes, specs, process
   steps, awards or "#1" claims beyond the profile's verified facts. Superlatives
   ("the best X in Y") need the owner's OK.
2. Whatever the user specifies overrides agent judgment. Repeat it verbatim to every agent.
3. Credits are real money: never regenerate the whole video to fix one beat. Re-cuts,
   re-timing, text and audio fixes happen in the spec for 0 credits.
4. Never publish. Phase 6 prepares; the user posts.
5. Deliver the video as soon as it renders. Don't hold it for the posting kit.
6. After each run, write new locks (voice, style key, references) back to the brand
   profile, and add anything new you learned about models or tools to `reference/lessons.md`.
