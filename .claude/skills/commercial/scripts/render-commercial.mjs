#!/usr/bin/env node
/*
 * render-commercial.mjs: commercial.json → finished vertical commercial (MP4) + QC contact sheet.
 *
 *   node render-commercial.mjs path/to/commercial.json [--dry]
 *
 * Everything is driven by the spec (see ../templates/commercial.example.json):
 *   timeline   clip segments in order (any clip, any in/out: re-cuts cost no credits)
 *   voice      voice takes placed at absolute times
 *   overlays   timed burned-in text in brand styles (hook, claim, label, caption, price, sub, chip)
 *   watermark  logo badge held in the platform-safe upper-left until the end card
 *   endcard    blurred plate + logo disc + CTA lines
 *   music      optional bed, ducked under the voice
 * Paths in the spec are relative to the spec file. Output, captions.ass and qc-sheet.png land next to it.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(process.argv[2] ?? "commercial.json");
const DRY = process.argv.includes("--dry");
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const root = path.dirname(specPath);
const rel = (p) => (p == null ? p : path.isAbsolute(p) ? p : path.join(root, p));

/* ---------- ffmpeg ---------- */
function findFfmpeg() {
  const candidates = [process.env.FFMPEG, path.join(here, "node_modules/ffmpeg-static/ffmpeg")];
  const which = spawnSync("which", ["ffmpeg"], { encoding: "utf8" });
  if (which.status === 0) candidates.push(which.stdout.trim());
  const hit = candidates.find((c) => c && existsSync(c));
  if (!hit) die(`No ffmpeg found. Run \`npm install\` in ${here} (bundles ffmpeg-static) or set FFMPEG=/path/to/ffmpeg.`);
  return hit;
}
const FF = findFfmpeg();
function ff(args, opts = {}) {
  const r = spawnSync(FF, ["-hide_banner", ...args], { encoding: "utf8", maxBuffer: 1 << 26, ...opts });
  if (r.status !== 0 && !opts.allowFail) die(`ffmpeg failed:\n${(r.stderr || "").split("\n").slice(-25).join("\n")}`);
  return r;
}
function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }
function probe(file) {
  const r = ff(["-i", file], { allowFail: true });
  const err = r.stderr || "";
  const d = err.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return {
    duration: d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : null,
    hasAudio: /Stream #\d+:\d+.*: Audio:/.test(err),
    hasVideo: /Stream #\d+:\d+.*: Video:/.test(err),
  };
}

/* ---------- spec defaults ---------- */
const [W, H] = spec.size ?? [1080, 1920];
const FPS = spec.fps ?? 30;
const brand = spec.brand ?? {};
const colors = { primary: "#CE1126", accent: "#F2A21B", dark: "#141015", light: "#FFFFFF", ...(brand.colors ?? {}) };
// Default fonts by platform: macOS, Windows, Linux (msttcorefonts), then DejaVu (most Linux distros).
// A brand override (brand.fonts.*) always wins; with no match, libass resolves the name via fontconfig.
const MAC = "/System/Library/Fonts/Supplemental", WIN = "C:\\Windows\\Fonts", MS = "/usr/share/fonts/truetype/msttcorefonts";
const DEJAVU = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const pickFont = (candidates) =>
  candidates.find((c) => existsSync(c.file)) ?? { name: candidates[0].name, file: null };
const fonts = {
  display: brand.fonts?.display ?? pickFont([
    { name: "Arial Black", file: `${MAC}/Arial Black.ttf` },
    { name: "Arial Black", file: `${WIN}\\ariblk.ttf` },
    { name: "Arial Black", file: `${MS}/Arial_Black.ttf` },
    { name: "DejaVu Sans", file: DEJAVU },
  ]),
  body: { bold: true, ...(brand.fonts?.body ?? pickFont([
    { name: "Arial", file: `${MAC}/Arial Bold.ttf` },
    { name: "Arial", file: `${WIN}\\arialbd.ttf` },
    { name: "Arial", file: `${MS}/Arial_Bold.ttf` },
    { name: "DejaVu Sans", file: DEJAVU },
  ])) },
};
const outFile = rel(spec.out ?? "commercial-9x16.mp4");
const build = path.join(root, ".build");
mkdirSync(path.join(build, "fonts"), { recursive: true });

if (!Array.isArray(spec.timeline) || !spec.timeline.length) die("spec.timeline is empty.");
const segments = spec.timeline.map((s, i) => {
  const file = rel(s.clip);
  if (!existsSync(file)) die(`timeline[${i}].clip not found: ${file}`);
  const info = probe(file);
  const inT = s.in ?? 0;
  const outT = s.out ?? info.duration;
  if (!(outT > inT)) die(`timeline[${i}] has out <= in.`);
  const speed = s.speed ?? 1; // <1 = slow motion (0.8 makes a 10 s clip last 12.5 s)
  if (!(speed >= 0.5 && speed <= 2)) die(`timeline[${i}].speed must be between 0.5 and 2.`);
  return { ...s, file, info, inT, outT, speed, dur: +((outT - inT) / speed).toFixed(3) };
});
const TOTAL = +segments.reduce((a, s) => a + s.dur, 0).toFixed(3);
const end = spec.endcard ? { duration: 3.3, logoSize: 500, logoY: 300, ...spec.endcard } : null;
const E = end ? +(TOTAL - end.duration).toFixed(3) : TOTAL; // end-card start
const wm = spec.watermark === false ? null : { size: 160, x: 48, y: 200, opacity: 0.92, ...(spec.watermark ?? {}) };
const logo = rel(brand.logo);
const logoShape = brand.logoShape ?? "circle";
if ((wm || end) && (!logo || !existsSync(logo))) die(`brand.logo not found: ${logo}`);

/* ---------- fonts for libass ---------- */
for (const f of [fonts.display, fonts.body]) {
  if (!f.file) { console.warn(`! no font file found for "${f.name}"; libass will substitute a system font (set brand.fonts to pin one).`); continue; }
  if (!existsSync(rel(f.file))) die(`font file not found: ${f.file}`);
  copyFileSync(rel(f.file), path.join(build, "fonts", path.basename(f.file)));
}

/* ---------- logo assets: circular badge (watermark) + disc (end card) ---------- */
function logoAsset(size, name, opacity = 1) {
  const out = path.join(build, name);
  const vf = logoShape === "circle"
    ? `scale=${size}:${size}:flags=lanczos,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-W/2,Y-H/2),W/2-1),alpha(X,Y)*${opacity},0)'`
    : `scale=${size}:${size}:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,colorchannelmixer=aa=${opacity}`;
  ff(["-y", "-i", logo, "-vf", vf, "-frames:v", "1", out]);
  return out;
}
const wmPng = wm ? logoAsset(wm.size, "wm.png", wm.opacity) : null;
const discPng = end ? logoAsset(end.logoSize, "disc.png") : null;

/* ---------- captions (ASS) ---------- */
const ass = (hex, alpha = 0) => { const h = hex.replace("#", ""); return `&H${alpha.toString(16).padStart(2, "0").toUpperCase()}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase(); };
const topY = wm ? wm.y + wm.size + 50 : Math.round(H * 0.2);   // upper text sits below the watermark
const capV = Math.round(H * 0.23);                              // captions clear the bottom ~22% platform UI
const marginR = 150;                                            // right-edge action icons
const S = (name, font, size, fg, back, align, marginV, opts = {}) => {
  const bold = opts.bold ?? (font === fonts.body ? (fonts.body.bold ? -1 : 0) : 0);
  const border = opts.border ?? 3, outline = opts.outline ?? 16, shadow = opts.shadow ?? 0;
  return `Style: ${name},${font.name},${size},${ass(fg)},${ass(fg)},${back},${opts.shadowColour ?? "&H00000000"},${bold},0,0,0,100,100,0,0,${border},${outline},${shadow},${align},60,${opts.marginR ?? marginR},${marginV},1`;
};
const boxDark = ass(colors.dark, 0x38), boxDarker = ass(colors.dark, 0x66);
const styles = [
  S("caption", fonts.body, 66, colors.light, boxDark, 2, capV),
  S("hook", fonts.display, 92, colors.light, boxDark, 8, topY, { outline: 20 }),
  S("claim", fonts.display, 84, colors.accent, boxDark, 8, topY, { outline: 22 }),
  S("label", fonts.display, 132, colors.accent, boxDark, 8, topY, { outline: 22 }),
  S("price", fonts.display, 210, colors.accent, boxDarker, 8, topY - 110, { outline: 20, marginR: 60 }),
  S("sub", fonts.body, 84, colors.light, boxDarker, 8, topY + 180, { marginR: 60 }),
  S("chip", fonts.body, 66, colors.light, ass(colors.primary), 8, topY + 320, { marginR: 60 }),
  S("end-big", fonts.display, 84, colors.light, "&H00000000", 8, 0, { border: 1, outline: 4, shadow: 5, shadowColour: "&H96000000", marginR: 60 }),
  S("end-mid", fonts.body, 60, colors.light, "&H00000000", 8, 0, { border: 1, outline: 4, shadow: 5, shadowColour: "&H96000000", marginR: 60 }),
  S("end-phone", fonts.display, 100, colors.accent, "&H00000000", 8, 0, { border: 1, outline: 5, shadow: 6, shadowColour: "&H96000000", marginR: 60 }),
  S("end-small", fonts.body, 48, colors.light, "&H00000000", 8, 0, { border: 1, outline: 3, shadow: 4, shadowColour: "&H96000000", marginR: 60 }),
];
const POP = new Set(["hook", "claim", "label", "price"]);
const t2a = (t) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = (t % 60).toFixed(2).padStart(5, "0"); return `${h}:${String(m).padStart(2, "0")}:${s}`; };
/* Text markup: "\n" = line break, *word* = accent colour. */
const markup = (txt, base) => String(txt)
  .replace(/[{}]/g, "")
  .replace(/\*([^*]+)\*/g, `{\\c${ass(colors.accent)}}$1{\\c${ass(base)}}`)
  .replace(/\r?\n/g, "\\N");
const baseColour = { claim: colors.accent, label: colors.accent, price: colors.accent, "end-phone": colors.accent };
const events = [];
for (const [i, o] of (spec.overlays ?? []).entries()) {
  if (!styles.some((s) => s.startsWith(`Style: ${o.style},`))) die(`overlays[${i}].style "${o.style}" is not one of: caption hook claim label price sub chip end-*`);
  const tags = [`\\fad(120,100)`];
  if (o.pos) tags.unshift(`\\pos(${o.pos[0]},${o.pos[1]})`);
  if (POP.has(o.style)) tags.push(`\\fscx88\\fscy88\\t(0,200,\\fscx100\\fscy100)`);
  events.push(`Dialogue: 0,${t2a(o.start)},${t2a(o.end)},${o.style},,0,0,0,,{${tags.join("")}}${markup(o.text, baseColour[o.style] ?? colors.light)}`);
}
if (end?.lines?.length) {
  const gap = { "end-big": 120, "end-mid": 70, "end-phone": 150, "end-small": 70 };
  let y = end.logoY + end.logoSize + 130;
  end.lines.forEach((l, k) => {
    const st = `end-${l.style ?? "mid"}`;
    const t0 = E + 0.25 + Math.min(k, 4) * 0.15;
    events.push(`Dialogue: 0,${t2a(t0)},${t2a(TOTAL)},${st},,0,0,0,,{\\pos(${W / 2},${y})\\fad(120,100)}${markup(l.text, baseColour[st] ?? colors.light)}`);
    y += gap[st] ?? 80;
  });
}
writeFileSync(path.join(build, "captions.ass"), `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styles.join("\n")}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`);

/* ---------- filter graph ---------- */
const inputs = [];
const add = (args) => { inputs.push(...args); return inputs.filter((a) => a === "-i").length - 1; };
const g = [];
const vLabels = [], aLabels = [];
segments.forEach((s, k) => {
  const idx = add(["-i", s.file]);
  const p = s.punchIn ?? 0;
  const anchorY = { top: 0, center: 0.5, bottom: 1 }[s.anchor ?? "center"];
  const crop = p > 0 ? `crop=iw*${1 - p}:ih*${1 - p}:iw*${p / 2}:ih*${p * anchorY},` : "";
  // Slow motion blends frames so 24 fps sources stay smooth instead of stuttering.
  const slow = s.speed !== 1 ? `setpts=PTS/${s.speed},` : "";
  const blend = s.speed < 1 ? `minterpolate=fps=${FPS}:mi_mode=blend,` : "";
  g.push(`[${idx}:v]trim=${s.inT}:${s.outT},setpts=PTS-STARTPTS,${slow}${blend}${crop}scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},fps=${FPS},setsar=1[v${k}]`);
  vLabels.push(`[v${k}]`);
  if (s.info.hasAudio) g.push(`[${idx}:a]atrim=${s.inT}:${s.outT},asetpts=PTS-STARTPTS,${s.speed !== 1 ? `atempo=${s.speed},` : ""}aresample=48000,aformat=channel_layouts=stereo[x${k}]`);
  else g.push(`anullsrc=r=48000:cl=stereo,atrim=0:${s.dur}[x${k}]`);
  aLabels.push(`[x${k}]`);
});
g.push(`${vLabels.join("")}concat=n=${segments.length}:v=1:a=0[vc]`);
let v = "vc";
if (end) {
  const di = add(["-loop", "1", "-t", String(TOTAL), "-i", discPng]);
  g.push(`[${v}]split[m][e]`);
  g.push(`[e]scale=${W / 4}:${H / 4},gblur=sigma=4,scale=${W}:${H}:flags=bicubic,eq=brightness=-0.14:saturation=0.9,format=yuva420p,fade=t=in:st=${E + 0.2}:d=0.45:alpha=1[eb]`);
  g.push(`[m][eb]overlay=enable='gte(t,${E})'[vb]`);
  g.push(`[${di}:v]format=rgba,fade=t=in:st=${E + 0.35}:d=0.45:alpha=1[disc]`);
  v = "vb";
  var discLabel = "disc";
}
if (wm) {
  const wi = add(["-loop", "1", "-t", String(TOTAL), "-i", wmPng]);
  const fadeAt = end ? E - 0.2 : TOTAL;
  g.push(`[${wi}:v]format=rgba,split[w1][w2]`);
  g.push(`[w2]colorchannelmixer=rr=0:gg=0:bb=0:aa=0.55,gblur=sigma=7[wsh]`);
  g.push(`[${v}][wsh]overlay=${wm.x + 3}:${wm.y + 6}:enable='lt(t,${fadeAt + 0.5})'[vs]`);
  g.push(`[w1]fade=t=out:st=${fadeAt}:d=0.45:alpha=1[wmf]`);
  g.push(`[vs][wmf]overlay=${wm.x}:${wm.y}:enable='lt(t,${fadeAt + 0.5})'[vw]`);
  v = "vw";
}
if (end) { g.push(`[${v}][${discLabel}]overlay=${(W - end.logoSize) / 2}:${end.logoY}:enable='gte(t,${E})'[vd]`); v = "vd"; }
g.push(`[${v}]format=yuv420p,ass=captions.ass:fontsdir=fonts[vout]`);

/* audio: voice takes on top, clip ambience (and optional music) ducked underneath */
const voice = spec.voice ?? [];
voice.forEach((t, k) => {
  const f = rel(t.file); if (!existsSync(f)) die(`voice[${k}].file not found: ${f}`);
  const vi = add(["-i", f]);
  g.push(`[${vi}:a]aresample=48000,loudnorm=I=-16:TP=-2:LRA=7,aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round((t.at ?? 0) * 1000)}:all=1,volume=${t.gainDb ?? 0}dB[vo${k}]`);
});
const amb = spec.ambient ?? {};
g.push(`${aLabels.join("")}concat=n=${segments.length}:v=0:a=1,highpass=f=70,acompressor=threshold=0.05:ratio=4:attack=5:release=120,volume=${amb.gainDb ?? 9}dB[amb0]`);
let bed = "amb0";
if (spec.music?.file) {
  const mf = rel(spec.music.file); if (!existsSync(mf)) die(`music.file not found: ${mf}`);
  const mi = add(["-stream_loop", "-1", "-i", mf]);
  g.push(`[${mi}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${TOTAL},afade=t=in:d=0.4,afade=t=out:st=${TOTAL - 1.2}:d=1.2,volume=${spec.music.gainDb ?? -14}dB[mus]`);
  g.push(`[amb0][mus]amix=inputs=2:normalize=0:duration=first[bedmix]`);
  bed = "bedmix";
}
const swell = end ? `,volume='1+0.9*clip((t-${E})/1.5,0,1)':eval=frame` : "";
if (voice.length) {
  g.push(`${voice.map((_, k) => `[vo${k}]`).join("")}amix=inputs=${voice.length}:normalize=0:duration=longest,apad=whole_dur=${TOTAL},atrim=0:${TOTAL},asplit=2[vo][vok]`);
  g.push(`[${bed}][vok]sidechaincompress=threshold=0.015:ratio=10:attack=15:release=500:makeup=1${swell}[duck]`);
  g.push(`[vo][duck]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-13.5:TP=-1.5:LRA=9,aresample=48000,alimiter=limit=0.84:level=disabled,atrim=0:${TOTAL}[aout]`);
} else {
  g.push(`[${bed}]loudnorm=I=-14:TP=-1.5,aresample=48000,atrim=0:${TOTAL}[aout]`);
}

const args = ["-y", ...inputs, "-filter_complex", g.join(";\n"), "-map", "[vout]", "-map", "[aout]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS),
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-t", String(TOTAL), outFile];
writeFileSync(path.join(build, "ffmpeg-args.json"), JSON.stringify(args, null, 1));
console.log(`• ${segments.length} segments · ${TOTAL}s · ${W}x${H}@${FPS} · ${voice.length} voice takes · ${events.length} text events${end ? ` · end card at ${E}s` : ""}${wm ? " · watermark" : ""}${spec.music?.file ? " · music" : ""}`);
if (DRY) { console.log(`dry run: captions + filter graph written to ${build}`); process.exit(0); }
ff(args, { cwd: build });

/* ---------- QC contact sheet (10 frames, evenly spaced) ---------- */
const qc = path.join(root, spec.qcSheet ?? "qc-sheet.png");
const step = TOTAL / 10;
ff(["-y", "-i", outFile, "-vf", `fps=1/${step.toFixed(3)},scale=360:-1,tile=5x2`, "-frames:v", "1", qc]);
const got = probe(outFile);
console.log(`✓ ${path.relative(process.cwd(), outFile)} (${got.duration?.toFixed(2)}s, audio: ${got.hasAudio ? "yes" : "NO"})`);
console.log(`✓ QC sheet: ${path.relative(process.cwd(), qc)}. Open it and check legibility, safe zones and the end card before delivering.`);
