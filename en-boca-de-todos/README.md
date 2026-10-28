# En Boca de Todos — website concept

Single-page static site for En Boca de Todos Mexican Food (703 S Terrell St, Midland TX 79701).
No build step: open `index.html`, or deploy this folder to any static host (Vercel, Netlify, GitHub Pages).

## What's in it

- Papel picado banner (animated canvas, static when the visitor prefers reduced motion)
- English / Spanish toggle across the whole page, remembered per visitor
- Live "open now / closed" badge computed in Central time from the hours below
- Full menu transcribed from the printed menu (`assets/menu-original.jpg`)
- Saturday-only soups shown as Lotería cards
- Tap-to-call buttons, a sticky call bar on phones, and Google Maps directions
- `Restaurant` schema.org JSON-LD for Google (hours, phone, address)

## Editing

- **Hours:** `HOURS` in the script (0 = Sunday). Also update the JSON-LD block in `<head>`.
- **Menu and prices:** the `MENU` array. Each item has `n` (name), `p` (price), and `en` / `es` descriptions.
- **House favorites:** the `PICKS` array. Swap in the restaurant's real best sellers.
- **Saturday soups:** the `SAT` array.
- **Page text:** the `T.en` / `T.es` objects.

## Open items for the owner

- Confirm hours. This site uses the business card: Mon closed, Tue–Sat 6 AM–2 PM, Sun 7 AM–2 PM.
  The old Google Site says Mon–Fri 6–2, Sat 7–2.
- Real food photos can replace the illustrated sections later.
- Instagram / Facebook links once we have them (the menu card mentions a "Follow" QR code).
