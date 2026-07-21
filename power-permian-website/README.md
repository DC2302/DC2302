# Power of the Permian — Website

Static site, ready to deploy on Vercel (set this folder as the project root; no build step).

## Drop-in asset slots

Two files are wired up and appear automatically once added to `assets/`:

| File | Where it shows |
|---|---|
| `assets/hero-loop.mp4` | Fullscreen hero background video (fades in over the ember animation) |
| `assets/breezey-ai-avatar.png` | Breezey AI avatar — chat bubble, chat panel header, and the "Meet Breezey AI" card on the home page |
| `assets/logo.png` | Brand logo — replaces the gold derrick mark in the nav, hero medallion, and footer |

Until those files exist, the hero shows the animated ember/sweep treatment and the
avatar shows a gold "B" monogram.

## Episode data

Episode cards pull thumbnails straight from YouTube's CDN
(`https://i.ytimg.com/vi/<VIDEO_ID>/hqdefault.jpg`) and link to the videos.
To add a new episode, add a line to the `episodes` object in `index.html` with
the episode number, YouTube video ID, guest, and organization.

## Merch

Cart is client-side (localStorage). The checkout button is a stub for the
Shopify integration at launch.
