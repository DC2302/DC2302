# OSO Content Design (OCD) — intake app

Branded intake for the agentic video pipeline in this repo. Clients (or you) fill
in brand details, upload a logo / inspiration images / character references, and
describe the video. The app commits everything to `intake/<submission>/` in this
repo, where the `/brand-video` agent team picks it up.

## Deploy on Vercel

1. Import this repo on Vercel and set **Root Directory** to `ocd/`.
2. Environment variables:
   - `GITHUB_TOKEN` — a fine-grained personal access token with **Contents:
     read & write** on this repo only (github.com → Settings → Developer
     settings → Fine-grained tokens).
   - `INTAKE_REPO` — optional, defaults to `DC2302/DC2302`.
   - `INTAKE_BRANCH` — optional, defaults to `main`.
3. Deploy. Submissions appear as commits under `intake/`.

## Local dev

```
cd ocd && npm install && GITHUB_TOKEN=... npm run dev
```

## Notes

- Uploads are capped at 4MB per file (Vercel request-body limit). Bigger assets
  can be added straight to the repo.
- The official OSO OCD badge loads from `public/oso-ocd-logo.png` (also used as
  the favicon). To add/replace it: GitHub → `ocd/public/` → Add file → Upload
  files → name it exactly `oso-ocd-logo.png`. Until it exists, a simple line-art
  bear shows as fallback.
- Producing a video from a submission: open Claude Code on this repo and say
  `/brand-video` — it checks `intake/` for pending submissions automatically.
