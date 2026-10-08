// Builds web/og-image.png (1200x630), the preview shown when a link to the site is shared.
// Renders a few paintings with their default variables, lays them out under the title and
// screenshots the page with headless Chrome. Run: node scripts/og-image.mjs [chrome binary]
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WEB, loadGallery } from "../tests/load-gallery.mjs";

const PAINTINGS = ["paradox", "truchet-tiles", "mondrian", "great-wave", "mandala", "op-waves"];
const CHROME = process.argv[2] || process.env.CHROME || "google-chrome";
const OUT = join(WEB, "og-image.png");

const { Gallery } = loadGallery();
const tiles = PAINTINGS.map((id) => {
  const painting = Gallery.find(id);
  if (!painting) throw new Error(`unknown painting ${id}`);
  return `<div class="tile">${Gallery.render(painting.draw, Gallery.initialValues(painting))}</div>`;
}).join("");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    background: #f4f1ea; color: #1a1a1a; box-sizing: border-box; padding: 0 64px;
    display: flex; align-items: center; justify-content: space-between;
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  }
  h1 { margin: 0; font-size: 104px; font-weight: 500; letter-spacing: -1px; line-height: 0.95; }
  p { margin: 24px 0 0; font-size: 38px; color: #6b665d; }
  .accent { margin-top: 36px; width: 120px; height: 6px; background: #b5482f; }
  .grid { display: grid; grid-template-columns: repeat(3, 182px); gap: 20px; }
  .tile { aspect-ratio: 1; background: #fff; padding: 8px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }
  .tile svg { width: 100%; height: 100%; display: block; }
</style></head>
<body><div><h1>Tangle<br>Machine</h1><p>Drawings made with code</p><div class="accent"></div></div><div class="grid">${tiles}</div></body></html>`;

const dir = mkdtempSync(join(tmpdir(), "og-image-"));
try {
  const page = join(dir, "og.html");
  writeFileSync(page, html);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,630",
    `--user-data-dir=${join(dir, "profile")}`,
    `--screenshot=${OUT}`,
    `file://${page}`,
  ], { stdio: "ignore" });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`og-image: wrote web/og-image.png (${Math.round(statSync(OUT).size / 1024)} KB)`);
