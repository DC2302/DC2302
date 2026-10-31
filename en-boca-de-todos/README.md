# En Boca de Todos — website (live at en-boca.com)

Single-page static site for En Boca de Todos Mexican Food (703 S Terrell St, Midland TX 79701).
No build step: open `index.html`, or deploy this folder to any static host (Vercel, Netlify, GitHub Pages).

## What's in it

- Looping, muted background video in the hero
- Papel picado banner over the video (animated canvas, static when the visitor prefers reduced motion)
- English / Spanish toggle across the whole page, remembered per visitor
- Live "open now / closed" badge computed in Central time from the hours below
- Full menu transcribed from the printed menu (`assets/menu-original.jpg`, updated to the Oct 31, 2026 menu)
- Real dish photos from their Facebook page: favorites, menu thumbnails, gallery and lightbox
- Weekend soups (Fri–Sun; caldo de res Sat–Sun only) shown as Lotería cards with their photos
- Tap-to-call buttons, a sticky call bar on phones, and Google Maps directions
- `Restaurant` schema.org JSON-LD for Google (hours, phone, address)

## Hero video

`assets/video/hero-720.mp4` (desktop) and `hero-480.mp4` (phones, picked with `<source media>`) are muted
H.264 loops cut from the owner's 10-second brand clip with the audio track removed. `hero-poster.webp` is the
neon-sign frame shown before the video loads and for visitors with reduced motion turned on. To swap the clip:

    ffmpeg -i new.mp4 -an -vf scale=1280:-2 -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart assets/video/hero-720.mp4
    ffmpeg -i new.mp4 -an -vf scale=854:-2 -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart assets/video/hero-480.mp4

## Photos

`assets/photos/` holds dishes from the restaurant's Facebook page (`*.webp` 820px, `*-sm.webp` 300px thumbs),
plus `neon-sign.webp` (no longer on the page; kept for social posts) and `street-sign.webp` (Find us panel). Get the owner's OK and, ideally,
the original full-size files before launch.

## Editing

- **Hours:** `HOURS` in the script (0 = Sunday). Also update the JSON-LD block in `<head>`.
- **Menu and prices:** the `MENU` array. Each item has `n` (name), `p` (price), and `en` / `es` descriptions.
- **House favorites:** the `PICKS` array. Swap in the restaurant's real best sellers.
- **Weekend soups:** the `SAT` array (`days` overrides the Fri–Sun label on a card).
- **Page text:** the `T.en` / `T.es` objects.

## Open items for the owner

- Confirm hours. This site uses the business card: Mon closed, Tue–Sat 6 AM–2 PM, Sun 7 AM–2 PM.
  Their Facebook post from Sept 2025 says Tue–Fri 6 AM–2 PM, Sat 7 AM–1 PM (no Sunday).
  The old Google Site says Mon–Fri 6–2, Sat 7–2.
- Confirm the second phone number: the card says (432) 218-7079, the Facebook post says (432) 218-1879.
- The testimonial quotes Jessica H.'s public Facebook post. Ask before launch.
- Instagram link if they have one (the menu card mentions a "Follow" QR code).
