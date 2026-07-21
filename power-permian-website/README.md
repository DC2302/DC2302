# Power of the Permian — Website

Static site, ready to deploy on Vercel (set this folder as the project root; no build step).

## Drop-in asset slots

These files are wired up and appear automatically once added to `assets/`:

| File | Where it shows |
|---|---|
| `assets/hero.jpg` | Backdrop inside the 3D hero scene (dimmed behind the rotating cube) |
| `assets/hero-cutout.png` | Transparent cutout layered in front of the 3D cube animation |
| `assets/hero-loop.mp4` | Fullscreen hero background video — layers behind the scene when added later |
| `assets/breezey-about.png` | Sitting studio illustration on the About page |
| `assets/breezey-ai-avatar.png` | Breezey avatar — chat bubble, chat panel header, and the "Meet Breezey" card on the home page (circular slots auto-zoom to the face) |
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
