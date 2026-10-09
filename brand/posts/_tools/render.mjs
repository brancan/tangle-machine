// Renders the Instagram posts in brand/posts/ from the real Tangle Machine renderer.
// Usage: node render.mjs <baseUrl> <framesDir>
//   baseUrl   a static server rooting web/ (e.g. http://localhost:8765)
//   framesDir scratch directory for reel frames (encoded afterwards with ffmpeg)
// The paintings are drawn by web/js/gallery.js (Gallery.render), exactly as the site does.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const BASE = process.argv[2] || "http://localhost:8765";
const FRAMES = process.argv[3] || "/tmp/reel-frames";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ONLY = process.env.ONLY || "all";

const C = { paper: "#121212", ink: "#ececec", muted: "#8a8a8a", accent: "#b6f23a", panel: "#1c1c1c", rule: "#2e2e2e" };
const SERIF = `'P052', 'Palatino Linotype', Palatino, 'Liberation Serif', serif`;
const MONO = `'DejaVu Sans Mono', 'Ubuntu Mono', monospace`;

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: ${C.paper}; color: ${C.ink}; font-family: ${SERIF}; }
  .page { position: relative; overflow: hidden; background: ${C.paper}; }
  .art svg { display: block; width: 100%; height: 100%; }
  .muted { color: ${C.muted}; }
  .accent { color: ${C.accent}; }
  .kicker { font-size: 30px; letter-spacing: 0.14em; text-transform: uppercase; color: ${C.accent}; }
  .brand { font-size: 28px; color: ${C.muted}; letter-spacing: 0.04em; }
`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ deviceScaleFactor: 1 });

// Load the real renderer and the paintings we need.
await page.setContent(`<!doctype html><html><head>
  <script src="${BASE}/js/gallery.js"></script>
  <script src="${BASE}/paintings/wall-drawing.js"></script>
  <script src="${BASE}/paintings/des-ordres.js"></script>
  <script src="${BASE}/paintings/interruptions.js"></script>
</head><body></body></html>`);
await page.waitForFunction(() => window.Gallery && Gallery.paintings.length === 3);

// Renders a painting with its initial values plus overrides. `limit` stops the pen after
// that many shapes (a drawing in progress); the geometry is untouched.
async function svg(id, overrides = {}, size = 800, limit = Infinity) {
  return page.evaluate(
    ({ id, overrides, size, limit }) => {
      const painting = Gallery.find(id);
      const values = { ...Gallery.initialValues(painting), ...overrides };
      let draw = painting.draw;
      if (Number.isFinite(limit)) {
        draw = (p, pen) => {
          const done = new Set();
          let count = 0;
          const stop = {};
          const wrapped = Object.create(pen);
          for (const name of ["polygon", "polyline", "line", "circle", "arc", "path"]) {
            wrapped[name] = (...args) => {
              if (count++ >= limit) throw stop;
              return pen[name](...args);
            };
          }
          try {
            painting.draw(p, wrapped);
          } catch (e) {
            if (e !== stop) throw e;
          }
        };
      }
      return Gallery.render(draw, values, size);
    },
    { id, overrides, size, limit: Number.isFinite(limit) ? limit : null }
  ).catch((e) => {
    throw new Error(`render ${id}: ${e.message}`);
  });
}

async function shoot(html, width, height, file) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html><html><head><style>${BASE_CSS}</style></head><body><div class="page" style="width:${width}px;height:${height}px">${html}</div></body></html>`
  );
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(dirname(file), { recursive: true });
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
  // Restore the renderer for the next svg() call.
  await reloadRenderer();
}

async function reloadRenderer() {
  await page.setContent(`<!doctype html><html><head>
    <script src="${BASE}/js/gallery.js"></script>
    <script src="${BASE}/paintings/wall-drawing.js"></script>
    <script src="${BASE}/paintings/des-ordres.js"></script>
    <script src="${BASE}/paintings/interruptions.js"></script>
  </head><body></body></html>`);
  await page.waitForFunction(() => window.Gallery && Gallery.paintings.length === 3);
}

// Brand palette for the rendered paintings.
const BRAND = { paper: C.paper, ink: C.ink };
// "Hand-drawn" settings used across the posts (the studio's Hand-drawn sliders).
const HAND = { handWobble: 3.5, handJitter: 1.8, handPressure: 0.4, handRoughness: 1.2, handSeed: 7 };
// Wall Drawing, random combinations, so seeds differ visibly.
const WALL = { ...BRAND, cells: 4, spacing: 9, systematic: false, seed: 3 };

const W = 1080;
const H = 1350;
const footer = (n) => `
  <div style="position:absolute;left:96px;right:96px;bottom:84px;display:flex;justify-content:space-between;align-items:baseline">
    <span class="brand">Tangle Machine</span><span class="brand">${n} / 5</span>
  </div>`;

// ---------- 01 · The idea becomes a machine (carousel) ----------
async function post1() {
  const dir = join(OUT, "01-idea-machine");

  // 1 · cover
  await shoot(
    `<div style="position:absolute;left:110px;right:110px;top:250px">
       <div style="font-size:250px;line-height:0.6;color:${C.accent};height:120px">“</div>
       <div style="font-size:104px;line-height:1.1;letter-spacing:-0.01em">The idea becomes a machine that makes the art.</div>
       <div style="margin-top:70px;width:90px;height:4px;background:${C.accent}"></div>
       <div style="margin-top:36px;font-size:40px">Sol LeWitt</div>
       <div class="muted" style="margin-top:10px;font-size:32px;font-style:italic">Paragraphs on Conceptual Art, Artforum, Summer 1967</div>
     </div>
     ${footer(1)}`,
    W, H, join(dir, "slide-1.png")
  );

  // 2 · the instruction → the code
  const instruction =
    "Divide the wall into a 4 × 4 grid. Use lines in four directions, vertical, horizontal, " +
    "diagonal left to right and diagonal right to left, 9 apart. In each square draw a " +
    "combination of directions chosen at random.";
  const code = [
    "if (mask & 1)",
    "  for (let u = step / 2; u < s; u += step)",
    "    pen.line(x + u, y, x + u, y + s);",
    "if (mask & 2)",
    "  for (let u = step / 2; u < s; u += step)",
    "    pen.line(x, y + u, x + s, y + u);",
  ];
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  await shoot(
    `<div style="position:absolute;left:96px;right:96px;top:110px">
       <div class="kicker">The instruction → the code</div>
       <div style="margin-top:28px;font-size:58px;line-height:1.12">A wall drawing is a set of words. Here, the words are a function.</div>
       <div style="margin-top:56px;padding-left:28px;border-left:4px solid ${C.accent}">
         <div class="muted" style="font-size:24px;letter-spacing:0.1em;text-transform:uppercase">Instruction · written after LeWitt, not his text</div>
         <div style="margin-top:14px;font-size:35px;line-height:1.38;font-style:italic">${instruction}</div>
       </div>
       <div style="margin-top:48px">
         <div class="muted" style="font-size:24px;letter-spacing:0.1em;text-transform:uppercase">Code · web/paintings/wall-drawing.js</div>
         <pre style="margin-top:16px;padding:30px 30px;background:${C.panel};color:${C.ink};font-family:${MONO};font-size:31px;line-height:1.5;border-radius:6px;white-space:pre">${code.map(esc).join("\n")}</pre>
       </div>
     </div>
     ${footer(2)}`,
    W, H, join(dir, "slide-2.png")
  );

  // 3 · the draftsman → your browser (a real render, stopped part-way through)
  const partial = await svg("wall-drawing", WALL, 800, 520);
  await shoot(
    `<div style="position:absolute;left:96px;right:96px;top:110px">
       <div class="kicker">The draftsman → your browser</div>
       <div style="margin-top:28px;font-size:58px;line-height:1.12">LeWitt’s instructions were carried out by draftsmen. Here, your browser holds the pen.</div>
     </div>
     <div style="position:absolute;left:200px;top:440px;width:680px;border:2px solid ${C.ink};border-radius:10px;overflow:hidden;background:${C.paper}">
       <div style="height:44px;border-bottom:2px solid ${C.ink};display:flex;align-items:center;gap:12px;padding:0 18px">
         <span style="width:14px;height:14px;border-radius:50%;border:2px solid ${C.ink}"></span>
         <span style="width:14px;height:14px;border-radius:50%;border:2px solid ${C.ink}"></span>
         <span style="width:14px;height:14px;border-radius:50%;background:${C.accent}"></span>
         <span class="muted" style="margin-left:14px;font-family:${MONO};font-size:19px">brancan.github.io/tangle-machine</span>
       </div>
       <div class="art" style="width:676px;height:676px">${partial}</div>
     </div>
     ${footer(3)}`,
    W, H, join(dir, "slide-3.png")
  );

  // 4 · the hand → hand-drawn parameters
  const off = await svg("wall-drawing", { ...WALL, cells: 2, spacing: 16 });
  const on = await svg("wall-drawing", { ...WALL, cells: 2, spacing: 16, ...HAND });
  const tile = (s, label, value) => `
    <div style="width:420px">
      <div class="art" style="width:420px;height:420px;border:1px solid ${C.rule}">${s}</div>
      <div style="margin-top:20px;font-size:34px">${label}</div>
      <div class="muted" style="margin-top:6px;font-family:${MONO};font-size:22px;line-height:1.5">${value}</div>
    </div>`;
  await shoot(
    `<div style="position:absolute;left:96px;right:96px;top:110px">
       <div class="kicker">The hand → hand-drawn parameters</div>
       <div style="margin-top:28px;font-size:58px;line-height:1.12">The tremble of a hand is computed, too. Same instruction, same seed.</div>
     </div>
     <div style="position:absolute;left:96px;right:96px;top:500px;display:flex;justify-content:space-between">
       ${tile(off, "Hand-drawn off", "wobble 0 · jitter 0<br>pressure 0 · roughness 0")}
       ${tile(on, "Hand-drawn on", `wobble ${HAND.handWobble} · jitter ${HAND.handJitter}<br>pressure ${HAND.handPressure} · roughness ${HAND.handRoughness}`)}
     </div>
     ${footer(4)}`,
    W, H, join(dir, "slide-4.png")
  );

  // 5 · same instruction, different hands
  const seeds = [3, 17, 42, 88];
  const grid = [];
  for (const seed of seeds) grid.push(await svg("wall-drawing", { ...WALL, ...HAND, seed, handSeed: seed }));
  await shoot(
    `<div style="position:absolute;left:96px;right:96px;top:100px">
       <div class="kicker">Same instruction, different hands</div>
     </div>
     <div style="position:absolute;left:160px;top:165px;width:768px;display:grid;grid-template-columns:1fr 1fr;gap:28px 28px">
       ${grid
         .map(
           (s, i) => `<div><div class="art" style="width:370px;height:370px;border:1px solid ${C.rule}">${s}</div>
             <div class="muted" style="margin-top:6px;font-family:${MONO};font-size:20px">seed ${seeds[i]}</div></div>`
         )
         .join("")}
     </div>
     <div style="position:absolute;left:96px;right:96px;bottom:160px;text-align:center">
       <div style="font-size:54px">Run it yourself.</div>
       <div class="accent" style="margin-top:10px;font-size:34px">Link in bio</div>
     </div>
     ${footer(5)}`,
    W, H, join(dir, "slide-5.png")
  );
}

// ---------- 02 · One percent of disorder (reel) ----------
const REEL = { ...BRAND, cells: 6, squares: 7, seed: 5, strokeWidth: 1.3 };
const FPS = 30;
const DURATION = 10;
// Disorder over time: in motion from frame 0. It settles from 150% to perfect order,
// holds, creeps up to 1%, holds, then climbs back to 150% and holds there.
function disorderAt(t) {
  const ease = (x) => x * x * (3 - 2 * x);
  if (t < 2.5) return 1.5 * (1 - t / 2.5) ** 2;
  if (t < 3.2) return 0;
  if (t < 4.8) return 0.01 * ease((t - 3.2) / 1.6);
  if (t < 5.4) return 0.01;
  if (t < 8.6) {
    const x = (t - 5.4) / 3.2;
    return 0.01 + (1.5 - 0.01) * x * x;
  }
  return 1.5;
}
const pct = (d) => (d < 0.1 && d > 0 ? `${(d * 100).toFixed(1)}%` : `${Math.round(d * 100)}%`);

function reelFrame(art, disorder, { cover = false } = {}) {
  // Everything that matters sits inside the centered 1080×1350 crop (y 285–1635).
  return `
    <div style="position:absolute;left:0;right:0;top:330px;text-align:center">
      <div class="kicker">${cover ? "After Vera Molnár · (Des)Ordres" : "1% de désordre"}</div>
      ${cover ? `<div style="margin-top:22px;font-size:76px;line-height:1.08">One percent<br>of disorder</div>` : ""}
    </div>
    <div class="art" style="position:absolute;left:37px;top:${cover ? 537 : 357}px;width:1006px;height:1006px">${art}</div>
    <div style="position:absolute;left:0;right:0;top:${cover ? 1515 : 1345}px;text-align:center">
      ${
        cover
          ? `<div class="muted" style="font-size:34px">From 0% to 150% disorder · Tangle Machine</div>`
          : `<div style="font-size:46px">disorder <span class="accent">${pct(disorder)}</span></div>
             <div class="muted" style="margin-top:12px;font-size:28px">of the gap between two squares · seed ${REEL.seed}</div>`
      }
    </div>`;
}

async function post2() {
  const dir = join(OUT, "02-one-percent-disorder");
  mkdirSync(FRAMES, { recursive: true });
  const total = FPS * DURATION;
  // Render all frame SVGs first (one renderer page), then shoot them.
  const arts = [];
  for (let f = 0; f < total; f++) {
    const d = disorderAt(f / FPS);
    arts.push({ d, art: await svg("des-ordres", { ...REEL, disorder: d }, 800) });
  }
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.setContent(
    `<!doctype html><html><head><style>${BASE_CSS}</style></head><body><div id="p" class="page" style="width:1080px;height:1920px"></div></body></html>`
  );
  await page.evaluate(() => document.fonts.ready);
  for (let f = 0; f < total; f++) {
    await page.evaluate((html) => (document.getElementById("p").innerHTML = html), reelFrame(arts[f].art, arts[f].d));
    await page.screenshot({ path: join(FRAMES, `f${String(f).padStart(4, "0")}.png`) });
  }
  await reloadRenderer();
  const coverArt = await svg("des-ordres", { ...REEL, disorder: 0.6 }, 800);
  await shoot(reelFrame(coverArt, 0.6, { cover: true }), 1080, 1920, join(dir, "cover.png"));
}

// ---------- 03 · First piece (single image) ----------
async function post3() {
  const dir = join(OUT, "03-first-piece");
  const art = await svg("interruptions", { ...BRAND, strokeWidth: 1.4 }, 800);
  await shoot(
    `<div class="art" style="position:absolute;left:100px;top:150px;width:880px;height:880px">${art}</div>
     <div style="position:absolute;left:155px;right:155px;top:1110px;display:flex;justify-content:space-between;align-items:baseline">
       <span style="font-size:28px"><i>Interruptions</i>, after Vera Molnár</span>
       <span class="muted" style="font-size:24px">Tangle Machine · seed 11</span>
     </div>`,
    W, H, join(dir, "first-piece.png")
  );
}

// ====================== Posts 4–6 (second batch) ======================
// A second renderer page holds the paintings these posts need, so the code above stays as is.
const EXTRA = ["harmonograph", "moire", "movement-in-squares"];
const xpage = await browser.newPage({ deviceScaleFactor: 1 });
await xpage.setContent(`<!doctype html><html><head>
  <script src="${BASE}/js/gallery.js"></script>
  ${EXTRA.map((id) => `<script src="${BASE}/paintings/${id}.js"></script>`).join("\n  ")}
</head><body></body></html>`);
await xpage.waitForFunction((n) => window.Gallery && Gallery.paintings.length === n, EXTRA.length);

// Same as svg(), on the second renderer page (no partial drawing needed here).
async function xsvg(id, overrides = {}, size = 800) {
  return xpage
    .evaluate(
      ({ id, overrides, size }) => {
        const painting = Gallery.find(id);
        return Gallery.render(painting.draw, { ...Gallery.initialValues(painting), ...overrides }, size);
      },
      { id, overrides, size }
    )
    .catch((e) => {
      throw new Error(`render ${id}: ${e.message}`);
    });
}

// ---------- 04 · Same rule, different values (carousel) ----------
// Harmonograph: one instruction, five sets of numbers.
const HARMO = [
  { fx: 2, fy: 3, detune: 0.2, phase: 1.2, damping: 2, beats: 90 },
  { fx: 1, fy: 2, detune: 0.2, phase: 0.6, damping: 3, beats: 90 },
  { fx: 1, fy: 1, detune: 1.5, phase: 1.5, damping: 3, beats: 90 },
  { fx: 5, fy: 4, detune: 0.1, phase: 2.4, damping: 5, beats: 90 },
  { fx: 5, fy: 6, detune: 0.1, phase: 0.3, damping: 6, beats: 90 },
];
const harmoValues = (v) =>
  `x ${v.fx} · y ${v.fy} · detune ${v.detune}% · phase ${v.phase}<br>damping ${v.damping}‰ · beats ${v.beats}`;

async function post4() {
  const dir = join(OUT, "04-same-rule");
  const style = { ...BRAND, strokeWidth: 1.6 };
  const foot = (n) => `
    <div style="position:absolute;left:96px;right:96px;bottom:70px;display:flex;justify-content:space-between;align-items:baseline">
      <span class="brand">Tangle Machine · Harmonograph</span><span class="brand">${n} / 5</span>
    </div>`;
  for (let i = 0; i < HARMO.length; i++) {
    const v = HARMO[i];
    const art = await xsvg("harmonograph", { ...style, ...v }, 800);
    const head =
      i === 0
        ? `<div class="kicker">Same rule, different values</div>
           <div style="margin-top:22px;font-size:62px;line-height:1.1">Two pendulums steer one pen.</div>`
        : i === HARMO.length - 1
          ? `<div class="kicker">Only the numbers changed</div>
             <div style="margin-top:22px;font-size:62px;line-height:1.1">Set your own. <span class="accent">Link in bio.</span></div>`
          : `<div class="kicker">Same rule</div>
             <div style="margin-top:22px;font-size:62px;line-height:1.1">${["", "One swing against two.", "In unison, slightly out of tune.", "Five swings against four."][i]}</div>`;
    await shoot(
      `<div style="position:absolute;left:96px;right:96px;top:96px">${head}</div>
       <div class="art" style="position:absolute;left:60px;top:240px;width:960px;height:960px">${art}</div>
       <div class="muted" style="position:absolute;left:96px;right:96px;top:1150px;text-align:center;font-family:${MONO};font-size:25px;line-height:1.55">${harmoValues(v)}</div>
       ${foot(i + 1)}`,
      W, H, join(dir, `slide-${i + 1}.png`)
    );
  }
}

// ---------- 05 · Moiré (reel) ----------
// The studio's Turn slider swept by hand: the second layer of lines turns from 0.5° to 6°
// and back, so the reel loops seamlessly.
const MOIRE = { ...BRAND, spacing: 6, strokeWidth: 1.2, circles: false };
const turnAt = (t) => 0.5 + 5.5 * (1 - Math.cos((2 * Math.PI * t) / DURATION)) / 2;

function moireFrame(art, turn, { cover = false } = {}) {
  // Text and drawing stay inside the centered 1080×1350 crop (y 285–1635).
  return `
    <div style="position:absolute;left:0;right:0;top:330px;text-align:center">
      <div class="kicker">${cover ? "Moiré · Tangle Machine" : "Moiré"}</div>
      ${cover ? `<div style="margin-top:22px;font-size:76px;line-height:1.08">Two layers of lines,<br>one small turn</div>` : ""}
    </div>
    <div class="art" style="position:absolute;left:62px;top:${cover ? 562 : 402}px;width:956px;height:956px">${art}</div>
    <div style="position:absolute;left:0;right:0;top:${cover ? 1530 : 1380}px;text-align:center">
      ${
        cover
          ? `<div class="muted" style="font-size:34px">Neither layer has the bands</div>`
          : `<div style="font-size:46px">turn <span class="accent">${turn.toFixed(1)}°</span></div>
             <div class="muted" style="margin-top:12px;font-size:28px">lines ${MOIRE.spacing} apart · second layer turned</div>`
      }
    </div>`;
}

async function post5() {
  const dir = join(OUT, "05-moire");
  const frames = join(FRAMES, "05");
  mkdirSync(frames, { recursive: true });
  const total = FPS * DURATION;
  const arts = [];
  for (let f = 0; f < total; f++) {
    const turn = turnAt(f / FPS);
    arts.push({ turn, art: await xsvg("moire", { ...MOIRE, angle: turn }, 800) });
  }
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.setContent(
    `<!doctype html><html><head><style>${BASE_CSS}</style></head><body><div id="p" class="page" style="width:1080px;height:1920px"></div></body></html>`
  );
  await page.evaluate(() => document.fonts.ready);
  for (let f = 0; f < total; f++) {
    await page.evaluate((html) => (document.getElementById("p").innerHTML = html), moireFrame(arts[f].art, arts[f].turn));
    await page.screenshot({ path: join(frames, `f${String(f).padStart(4, "0")}.png`) });
  }
  await reloadRenderer();
  const coverArt = await xsvg("moire", { ...MOIRE, angle: 2 }, 800);
  await shoot(moireFrame(coverArt, 2, { cover: true }), 1080, 1920, join(dir, "cover.png"));
}

// ---------- 06 · Movement in Squares (single image) ----------
async function post6() {
  const dir = join(OUT, "06-movement-in-squares");
  const art = await xsvg("movement-in-squares", { ...BRAND, strokeWidth: 1.4 }, 800);
  await shoot(
    `<div class="art" style="position:absolute;left:100px;top:150px;width:880px;height:880px">${art}</div>
     <div style="position:absolute;left:140px;right:140px;top:1100px;text-align:center">
       <div style="font-size:34px"><i>Movement in Squares</i>, after Bridget Riley</div>
       <div class="muted" style="margin-top:12px;font-size:24px">Tangle Machine · 22 columns · fold 62% · squeeze 90%</div>
     </div>`,
    W, H, join(dir, "movement-in-squares.png")
  );
}

if (ONLY === "all" || ONLY === "1") await post1();
if (ONLY === "all" || ONLY === "3") await post3();
if (ONLY === "all" || ONLY === "2") await post2();
if (ONLY === "all" || ONLY === "4") await post4();
if (ONLY === "all" || ONLY === "6") await post6();
if (ONLY === "all" || ONLY === "5") await post5();
await browser.close();
