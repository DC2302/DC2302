// Writes the menu into the page as real HTML (so Google reads it without running JavaScript) and
// builds the Spanish home page, the /menu page, the dish pages and sitemap.xml from the same data.
// Run after editing MENU, PICKS, SAT, GALLERY, HOURS or the T strings in index.html:
//   node scripts/build-seo.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://en-boca.com";
const TODAY = new Date().toISOString().slice(0, 10);
const FB = "https://www.facebook.com/people/En-Boca-de-Todos-Mexican-Food/61574979775180/";
const MAPS = "https://maps.google.com/?cid=13181815553918891561";

/* ---------- Data: evaluated straight from index.html so there is one source of truth ---------- */
let index = await readFile(path.join(root, "index.html"), "utf8");
const block = index.match(/\/\* @data:start[^\n]*\n([\s\S]*?)\/\* @data:end \*\//);
if (!block) throw new Error("index.html is missing the @data:start / @data:end markers");
const ctx = {};
vm.runInNewContext(block[1] + "\nthis.D = { T, MENU, PICKS, SAT, GALLERY, HOURS };", ctx);
const { T, MENU, PICKS, SAT, GALLERY, HOURS } = ctx.D;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const money = (p) => "$" + p.toFixed(2);
const photo = (name, size) => "/assets/photos/" + name + (size === "sm" ? "-sm" : "") + ".webp";
const fill = (html, id, content) => {
  const re = new RegExp(`<!--@${id}-->[\\s\\S]*?<!--/@${id}-->`);
  if (!re.test(html)) throw new Error(`marker @${id} not found`);
  return html.replace(re, `<!--@${id}-->${content}<!--/@${id}-->`);
};

/* ---------- The same markup the page's renderX() functions produce ---------- */
function picks(lang) {
  return PICKS.map((x) => '<article class="pick"><div class="pick-img"><img src="' + photo(x.img) + '" alt="' + esc(x.n) + '" loading="lazy" width="820" height="820"></div>' +
    '<div class="pick-body"><h3>' + esc(x.n) + '</h3><p>' + esc(x[lang]) + '</p>' +
    '<div class="price"><small>$</small>' + x.p.toFixed(2) + '</div></div></article>').join("");
}
function row(name, price) {
  return '<div class="item-row"><span class="item-name">' + name + '</span><span class="leader"></span>' +
    (price != null ? '<span class="item-price">' + money(price) + '</span>' : '') + '</div>';
}
function chips(lang) {
  return MENU.map((c) => '<a href="#' + (c.sat ? "sabados" : "cat-" + c.id) + '" data-cat="' + c.id + '">' + esc(c[lang]) + '</a>').join("");
}
function menuCols(lang) {
  const other = lang === "en" ? "es" : "en";
  return MENU.map((c) => {
    const alt = c.alt ? c.alt[lang] : (c[other] !== c[lang] ? c[other] : "");
    let html = '<div class="cat" id="cat-' + c.id + '"><div class="cat-head"><h3>' + esc(c[lang]) +
      (c.sat ? '<span class="tag-sat">' + (lang === "en" ? "Fri–Sun" : "Vie–Dom") + '</span>' : '') + '</h3>' +
      (alt ? '<span class="alt">' + esc(alt) + '</span>' : '') + '</div>';
    if (c.note) html += '<p class="cat-note">' + esc(c.note[lang]) + '</p>';
    html += '<ul class="items">' + c.items.map((it) => {
      const desc = it[lang] || "";
      let li = row(esc(it.n), it.p);
      if (desc && desc !== it.n) li += '<p class="item-desc">' + esc(desc) + '</p>';
      if (!it.img) return '<li>' + li + '</li>';
      return '<li class="has-img"><button class="thumb" type="button" data-src="' + photo(it.img) + '" data-cap="' + esc(it.n) + '" aria-label="' + esc(it.n) + '">' +
        '<img src="' + photo(it.img, "sm") + '" alt="" loading="lazy" width="300" height="300"></button><div>' + li + '</div></li>';
    }).join("") + '</ul>';
    if (c.extras) html += '<p class="extras"><b>' + T[lang].extras + '</b>' + esc(c.extras[lang]) + '</p>';
    return html + '</div>';
  }).join("");
}
function loteria(lang) {
  return SAT.map((x) => '<article class="carta" style="--tilt:' + x.tilt + '"><div class="carta-in">' +
    '<div class="carta-top"><span>' + (x.days ? x.days[lang] : (lang === "en" ? "Fri–Sun" : "Vie–Dom")) + '</span><span class="p">' + money(x.p) + '</span></div>' +
    '<div class="carta-art"><img src="' + photo(x.img) + '" alt="' + esc(x.n) + '" loading="lazy" width="820" height="820"></div>' +
    '<h3>' + esc(x.n) + '</h3><p>' + esc(x[lang]) + '</p></div></article>').join("");
}
function gallery(lang) {
  return GALLERY.map((g) => '<button class="tile' + (g.big ? ' big' : '') + '" type="button" data-src="' + photo(g.img) + '" data-cap="' + esc(g[lang]) + '">' +
    '<img src="' + photo(g.img, g.big ? "" : "sm") + '" alt="' + esc(g[lang]) + '" loading="lazy" width="820" height="820"><span>' + esc(g[lang]) + '</span></button>').join("");
}
function hoursRows(lang) {
  const t = T[lang];
  return [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const h = HOURS[d];
    return '<tr' + (h ? '' : ' class="closed"') + '><td>' + t.days[d] + '</td><td>' + (h ? t.time(h[0]) + " – " + t.time(h[1]) : t.closed) + '</td></tr>';
  }).join("");
}
function renderInto(html, lang) {
  html = fill(html, "picks", picks(lang));
  html = fill(html, "chips", chips(lang));
  html = fill(html, "menu-cols", menuCols(lang));
  html = fill(html, "loteria", loteria(lang));
  html = fill(html, "gallery", gallery(lang));
  return fill(html, "hours", hoursRows(lang));
}

/* ---------- Home page: English in place, Spanish at /es/ ---------- */
index = renderInto(index, "en");
await writeFile(path.join(root, "index.html"), index);

function applyStrings(html, t) {
  html = html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (m, open, tag, key, inner, close) => (typeof t[key] === "string" ? open + esc(t[key]) + close : m));
  return html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-i18n-html="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (m, open, tag, key, inner, close) => (typeof t[key] === "string" ? open + t[key] + close : m));
}
let es = renderInto(index, "es");
const swap = (from, to) => { if (!es.includes(from)) throw new Error("es: not found: " + from.slice(0, 60)); es = es.split(from).join(to); };
const dataStart = es.indexOf("/* @data:start");
es = applyStrings(es.slice(0, dataStart), T.es) + es.slice(dataStart); // leave the script's own strings alone
swap('<html lang="en">', '<html lang="es">');
swap('<title>En Boca de Todos Mexican Food · Breakfast &amp; Lunch in Midland, TX</title>',
  '<title>En Boca de Todos · Desayuno y Comida Mexicana en Midland, TX</title>');
es = es.replace(/<meta name="description" content="[^"]*">/,
  '<meta name="description" content="En Boca de Todos, comida mexicana en 703 S Terrell St, Midland TX. Desayunos y comidas: burritos, chilaquiles, guisados, café de olla, y menudo y pozole los fines de semana. Llama al (432) 218-7078 para ordenar.">');
swap('<link rel="canonical" href="https://en-boca.com/">', '<link rel="canonical" href="https://en-boca.com/es/">');
swap('<meta property="og:url" content="https://en-boca.com/">', '<meta property="og:url" content="https://en-boca.com/es/">');
es = es.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="En Boca de Todos · Comida Mexicana · Midland, TX">');
es = es.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="Burritos de desayuno desde las 6 a.m., guisados, chilaquiles divorciados, tortas y menudo los fines de semana. 703 S Terrell St, Midland.">');
swap('data-lang="en" aria-pressed="true"', 'data-lang="en" aria-pressed="false"');
swap('data-lang="es" aria-pressed="false"', 'data-lang="es" aria-pressed="true"');
swap('<a class="brand-mini" href="#top"', '<a class="brand-mini" href="/es/"');
await mkdir(path.join(root, "es"), { recursive: true });
await writeFile(path.join(root, "es", "index.html"), es);

/* ---------- Standalone pages ---------- */
const hoursList = (lang) => '<table class="hours"><tbody>' + hoursRows(lang) + '</tbody></table>';
const restaurantRef = { "@type": "Restaurant", "@id": SITE + "/#restaurant", name: "En Boca de Todos Mexican Food", url: SITE + "/", telephone: "+1-432-218-7078",
  address: { "@type": "PostalAddress", streetAddress: "703 S Terrell St", addressLocality: "Midland", addressRegion: "TX", postalCode: "79701", addressCountry: "US" } };

function page({ slug, title, description, h1, eyebrow, body, schema = [], image = "/assets/video/hero-poster.webp", crumb }) {
  const url = SITE + "/" + slug;
  const ld = [{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "En Boca de Todos", item: SITE + "/" },
    { "@type": "ListItem", position: 2, name: crumb, item: url }] }, ...schema.map((x) => ({ "@context": "https://schema.org", ...x }))];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}${image}">
<meta name="theme-color" content="#141015">
<link rel="icon" href="/assets/logo.webp" type="image/webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Instrument+Sans:wght@400;500;600&display=swap">
${ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join("\n")}
<style>
:root { --paper:#FBF9F8; --ink:#1A1418; --muted:#6C6168; --line:#E7DFE1; --rojo:#CE1126; --rojo-ink:#B10E20; --night:#141015; --night-fg:#F8F2EF; --night-muted:#C2B5BB; --gold:#F2A21B;
  --display:"Big Shoulders Display","Arial Narrow",Impact,sans-serif; --body:"Instrument Sans","Segoe UI",system-ui,sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper:#141015; --ink:#F8F2EF; --muted:#C2B5BB; --line:#3A2F37; --rojo-ink:#FF6B7A; } }
:root[data-theme="dark"] { --paper:#141015; --ink:#F8F2EF; --muted:#C2B5BB; --line:#3A2F37; --rojo-ink:#FF6B7A; }
* { box-sizing: border-box; }
body { margin:0; background:var(--paper); color:var(--ink); font:400 1.05rem/1.6 var(--body); }
a { color: var(--rojo-ink); }
.wrap { max-width: 1000px; margin: 0 auto; padding: 0 16px; }
@media (min-width:700px) { .wrap { padding: 0 32px; } }
header.top { background: var(--night); color: var(--night-fg); }
header.top .wrap { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px 20px; padding-block:14px; }
.brand { display:flex; align-items:center; gap:10px; color:var(--night-fg); text-decoration:none; font:900 1.25rem/1 var(--display); text-transform:uppercase; letter-spacing:.02em; }
.brand img { width:40px; height:40px; }
header.top nav { display:flex; flex-wrap:wrap; gap:6px 16px; font-size:.92rem; }
header.top nav a { color: var(--night-muted); text-decoration:none; }
header.top nav a:hover, header.top nav a[aria-current] { color: var(--night-fg); text-decoration: underline; }
.hero { background: var(--night); color: var(--night-fg); padding: 28px 0 40px; }
.eyebrow { font-size:.78rem; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:#F7C6D2; margin:0 0 8px; }
h1 { font:900 clamp(2.4rem,7vw,4.2rem)/.95 var(--display); text-transform:uppercase; margin:0 0 14px; }
.hero p.lead { color: var(--night-muted); max-width: 40rem; margin: 0 0 22px; font-size: 1.1rem; }
.btn { display:inline-flex; align-items:center; gap:.5em; padding:.8em 1.3em; border-radius:999px; background:var(--rojo); color:#fff; font-weight:600; text-decoration:none; margin:0 8px 8px 0; }
.btn.ghost { background:transparent; color:var(--night-fg); border:2px solid rgba(255,255,255,.35); }
main section { padding: 40px 0; border-bottom: 1px solid var(--line); }
h2 { font:900 clamp(1.7rem,4.5vw,2.4rem)/1 var(--display); text-transform:uppercase; margin:0 0 14px; }
h3 { font:800 1.35rem/1.1 var(--display); text-transform:uppercase; margin:0 0 6px; }
.cards { display:grid; gap:18px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.card { border:1px solid var(--line); border-radius:14px; overflow:hidden; background: color-mix(in srgb, var(--paper) 92%, var(--ink)); }
.card img { width:100%; height:auto; aspect-ratio:1; object-fit:cover; display:block; }
.card div { padding:14px 16px 16px; }
.price { font-weight:700; color: var(--rojo-ink); }
.muted { color: var(--muted); }
.cols { display:grid; gap:24px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.hours { border-collapse: collapse; width: 100%; max-width: 360px; }
.hours td { padding: 4px 0; border-bottom: 1px dashed var(--line); }
.hours td + td { text-align: right; }
.hours tr.closed td { color: var(--muted); }
ul.menu { list-style:none; padding:0; margin:0 0 8px; }
ul.menu li { padding: 8px 0; border-bottom: 1px dashed var(--line); }
ul.menu .row { display:flex; justify-content:space-between; gap:12px; font-weight:600; }
ul.menu p { margin: 2px 0 0; color: var(--muted); font-size: .95rem; }
.cat { margin-bottom: 28px; }
.cat-note, .extras { color: var(--muted); font-size: .95rem; }
.es { border-left: 4px solid var(--gold); padding-left: 14px; }
footer { background: var(--night); color: var(--night-muted); padding: 28px 0 40px; font-size: .9rem; }
footer a { color: var(--night-fg); }
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="/"><img src="/assets/logo.webp" alt="" width="40" height="40">En Boca de Todos</a>
  <nav aria-label="Pages">${[["/menu", "Menu"], ["/menudo-midland", "Menudo & pozole"], ["/cafe-de-olla-midland", "Café de olla"], ["/breakfast-burritos-midland", "Breakfast burritos"], ["/es/", "Español"]]
    .map(([href, label]) => `<a href="${href}"${href === "/" + slug ? ' aria-current="page"' : ""}${href === "/es/" ? ' hreflang="es" lang="es"' : ""}>${label}</a>`).join("")}</nav>
</div></header>
<main>
<section class="hero"><div class="wrap">
  <p class="eyebrow">${esc(eyebrow)}</p>
  <h1>${esc(h1)}</h1>
  ${body.lead}
  <a class="btn" href="tel:+14322187078">Call to order (432) 218-7078</a><a class="btn ghost" href="${MAPS}" target="_blank" rel="noopener">Directions</a>
</div></section>
${body.main}
<section><div class="wrap cols">
  <div><h2>Hours</h2>${hoursList("en")}</div>
  <div><h2>Find us</h2><p>703 S Terrell St<br>Midland, TX 79701</p><p>Call <a href="tel:+14322187078">(432) 218-7078</a> or <a href="tel:+14322187079">(432) 218-7079</a>. Call ahead and your order will be ready when you get here.</p><p><a href="${MAPS}" target="_blank" rel="noopener">Open in Google Maps</a></p></div>
</div></section>
</main>
<footer><div class="wrap">
  <p><b>En Boca de Todos Mexican Food</b> · 703 S Terrell St · Midland, TX 79701 · <a href="tel:+14322187078">(432) 218-7078</a></p>
  <p><a href="/">Home</a> · <a href="/menu">Full menu</a> · <a href="/es/" hreflang="es" lang="es">Español</a> · <a href="${FB}" target="_blank" rel="noopener">Facebook</a></p>
  <p>© 2026 En Boca de Todos. Website by OSO Optimization.</p>
</div></footer>
</body>
</html>
`;
}

const item = (name) => MENU.flatMap((c) => c.items).find((x) => x.n === name);
const card = (img, name, price, text, days) => `<article class="card"><img src="${photo(img)}" alt="${esc(name)}" width="820" height="820" loading="lazy"><div><h3>${esc(name)}</h3>${days ? `<p class="muted">${esc(days)}</p>` : ""}<p>${esc(text)}</p><p class="price">${money(price)}</p></div></article>`;

/* /menu: the full menu with Menu schema */
const menuSchema = { "@type": "Menu", "@id": SITE + "/menu#menu", name: "En Boca de Todos menu", inLanguage: "en", url: SITE + "/menu",
  hasMenuSection: MENU.map((c) => ({ "@type": "MenuSection", name: c.en, ...(c.note ? { description: c.note.en } : {}),
    hasMenuItem: c.items.map((it) => ({ "@type": "MenuItem", name: it.n, ...(it.en && it.en !== it.n ? { description: it.en } : {}),
      offers: { "@type": "Offer", price: it.p.toFixed(2), priceCurrency: "USD" } })) })) };
const menuHtml = MENU.map((c) => `<div class="cat" id="${c.id}"><h3>${esc(c.en)}${c.es !== c.en ? ` <span class="muted">· ${esc(c.es)}</span>` : ""}</h3>` +
  (c.note ? `<p class="cat-note">${esc(c.note.en)}</p>` : "") +
  `<ul class="menu">${c.items.map((it) => `<li><div class="row"><span>${esc(it.n)}</span><span>${money(it.p)}</span></div>${it.en && it.en !== it.n ? `<p>${esc(it.en)}</p>` : ""}</li>`).join("")}</ul>` +
  (c.extras ? `<p class="extras"><b>Extras:</b> ${esc(c.extras.en)}</p>` : "") + `</div>`).join("");

const pages = [
  { slug: "menu", crumb: "Menu",
    title: "Menu · En Boca de Todos Mexican Food, Midland TX",
    description: "Full menu for En Boca de Todos, 703 S Terrell St, Midland TX: breakfast plates, breakfast and guisado burritos, chilaquiles, tacos, tortas, lunch plates, weekend menudo and pozole, café de olla. Prices included.",
    eyebrow: "Breakfast & lunch · Tuesday to Sunday", h1: "En Boca de Todos menu",
    schema: [{ ...restaurantRef, hasMenu: { "@id": SITE + "/menu#menu" } }, menuSchema],
    body: { lead: `<p class="lead">Breakfast from 6 a.m. and lunch until 2 p.m. at 703 S Terrell St in Midland. Every plate comes with your choice of one flour or three corn tortillas. Prices are subject to change; call to confirm today's guisados.</p>`,
      main: `<section><div class="wrap">${menuHtml}<p><a href="/assets/menu-original.jpg" target="_blank" rel="noopener">View the printed menu</a> · <a href="/es/#menu" hreflang="es" lang="es">Ver el menú en español</a></p></div></section>` } },

  { slug: "menudo-midland", crumb: "Menudo & pozole", image: photo("menudo"),
    title: "Menudo in Midland, TX · Fridays to Sundays · En Boca de Todos",
    description: "Menudo and pozole every Friday to Sunday, and caldo de res Saturday and Sunday, at En Boca de Todos, 703 S Terrell St, Midland TX. Come early; when the pot is empty, it's gone until next week.",
    eyebrow: "The weekend pot · Friday to Sunday", h1: "Menudo in Midland, every Friday to Sunday",
    schema: [restaurantRef],
    body: { lead: `<p class="lead">Every weekend the pot is on at En Boca de Todos on Terrell St. Menudo and pozole are served Friday through Sunday, and caldo de res joins them Saturday and Sunday. These are slow-simmered soups, so come early: when the pot is empty, it's gone until next week.</p>`,
      main: `<section><div class="wrap"><h2>What's in the pot</h2><div class="cards">${SAT.map((x) => card(x.img, x.n.replace(/^El /, ""), x.p, x.en, x.days ? "Saturday and Sunday" : "Friday to Sunday")).join("")}</div></div></section>
<section><div class="wrap"><h2>Good to know</h2><p>We open at 6 a.m. on Friday and Saturday and 7 a.m. on Sunday, and close at 2 p.m. Call ahead at <a href="tel:+14322187078">(432) 218-7078</a> and we'll have your order ready. Want breakfast too? See the <a href="/menu">full menu</a>, or pair your menudo with a <a href="/cafe-de-olla-midland">café de olla</a>.</p>
<div class="es" lang="es"><h3>Menudo en Midland</h3><p>Menudo y pozole rojo o verde de viernes a domingo, y caldo de res sábado y domingo, en 703 S Terrell St. Llega temprano: cuando se acaba la olla, hasta la próxima semana. <a href="/es/#sabados" hreflang="es">Ver en español</a></p></div></div></section>` } },

  { slug: "cafe-de-olla-midland", crumb: "Café de olla", image: photo("cafe-de-olla"),
    title: "Café de Olla in Midland, TX · En Boca de Todos",
    description: "Café de olla at En Boca de Todos in Midland TX: coffee sweetened with piloncillo and spiced with cinnamon, cloves and star anise, served in a clay jarrito. $5.99, refills $2.99. From 6 a.m., 703 S Terrell St.",
    eyebrow: "Mexican-style coffee · Midland, Texas", h1: "Café de olla in Midland",
    schema: [restaurantRef],
    body: { lead: `<p class="lead">Our café de olla is coffee sweetened with piloncillo and warmed with cinnamon, cloves and star anise, served in a clay jarrito the way it's made back home. It's ${money(item("Café de Olla").p)}, with refills for $2.99.</p>`,
      main: `<section><div class="wrap cols"><div><img src="${photo("cafe-de-olla")}" alt="Café de olla in a clay jarrito" width="820" height="820" style="width:100%;height:auto;border-radius:14px"></div><div><h2>How it comes together</h2><p><b>Piloncillo</b>, the unrefined cane sugar used across Mexico, gives it a deep, caramel sweetness. <b>Cinnamon</b>, <b>cloves</b> and <b>star anise</b> add the warm spice. It comes to the table in a <b>clay jarrito</b>.</p><p>We pour it from 6 a.m. Tuesday to Saturday and from 7 a.m. on Sunday. It goes with everything on the breakfast side of the menu, from <a href="/breakfast-burritos-midland">breakfast burritos</a> to chilaquiles and huevos divorciados, and with the <a href="/menudo-midland">weekend menudo</a>.</p>
<div class="es" lang="es"><h3>Café de olla en Midland</h3><p>Café endulzado con piloncillo, con canela, clavo y anís estrella, servido en jarrito de barro. ${money(item("Café de Olla").p)}, y el rellenado $2.99. <a href="/es/#menu" hreflang="es">Ver el menú en español</a></p></div></div></div></section>` } },

  { slug: "breakfast-burritos-midland", crumb: "Breakfast burritos", image: photo("bistec-eggs"),
    title: "Breakfast Burritos in Midland, TX from 6 a.m. · En Boca de Todos",
    description: "Breakfast burritos from $5.99 starting at 6 a.m., plus guisado burritos like asado, chile verde and barbacoa, at En Boca de Todos, 703 S Terrell St, Midland TX. Call ahead: (432) 218-7078.",
    eyebrow: "From 6 a.m. · Tuesday to Saturday", h1: "Breakfast burritos in Midland",
    schema: [restaurantRef],
    body: { lead: `<p class="lead">Doors open at 6 a.m. Tuesday to Saturday (7 a.m. Sunday) at 703 S Terrell St. Our breakfast burrito is ${money(item("Breakfast Burrito").p)}: two eggs with your choice of bacon, ham, sausage, spam or chorizo. Call ahead and it'll be ready when you pull up.</p>`,
      main: (() => { const bc = MENU.find((c) => c.id === "burritos-desayuno"), lc = MENU.find((c) => c.id === "burritos");
        const list = (c) => `<ul class="menu">${c.items.map((it) => `<li><div class="row"><span>${esc(it.n)}</span><span>${money(it.p)}</span></div>${it.en && it.en !== it.n ? `<p>${esc(it.en)}</p>` : ""}</li>`).join("")}</ul><p class="extras"><b>Extras:</b> ${esc(c.extras.en)}</p>`;
        return `<section><div class="wrap cols"><div><h2>Breakfast burritos</h2>${list(bc)}</div><div><h2>Guisado burritos</h2><p class="muted">For lunch, or breakfast if you can't wait.</p>${list(lc)}</div></div></section>
<section><div class="wrap"><p>Add a <a href="/cafe-de-olla-midland">café de olla</a> to go with it, or see the <a href="/menu">full menu</a> for breakfast plates, chilaquiles and tacos.</p>
<div class="es" lang="es"><h3>Burritos de desayuno en Midland</h3><p>Abrimos a las 6 a.m. de martes a sábado (7 a.m. el domingo). Burrito de desayuno ${money(item("Breakfast Burrito").p)}: dos huevos con tocino, jamón, salchicha, spam o chorizo. Burritos de guisado: asado, chile verde, chile colorado, barbacoa y más. <a href="/es/#menu" hreflang="es">Ver el menú en español</a></p></div></div></section>`; })() } }
];
for (const p of pages) await writeFile(path.join(root, p.slug + ".html"), page(p));

/* ---------- Sitemap ---------- */
const urls = [["/", "1.0"], ["/es/", "0.9"], ...pages.map((p) => ["/" + p.slug, p.slug === "menu" ? "0.9" : "0.8"])];
const alt = (u) => u === "/" || u === "/es/" ? `\n    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/"/>\n    <xhtml:link rel="alternate" hreflang="es" href="${SITE}/es/"/>` : "";
await writeFile(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(([u, pr]) => `  <url>\n    <loc>${SITE}${u}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <priority>${pr}</priority>${alt(u)}\n  </url>`).join("\n")}
</urlset>
`);
console.log("built: index.html (static menu), es/index.html, " + pages.map((p) => p.slug + ".html").join(", ") + ", sitemap.xml");
