// Builds the search-engine pages at deploy time: web/p/<id>.html for every painting, the static
// painting index inside web/index.html (between the paintings-index markers), web/sitemap.xml and
// web/llms.txt. None of these outputs are committed (see .gitignore), except that web/index.html is
// rewritten IN PLACE: run it locally only to preview, then `git checkout web/index.html`.
// Unlike build-showcase.mjs it never degrades: any error exits 1 and fails the deploy.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WEB, loadGallery } from "./load-gallery.mjs";
import { INDEX_END, INDEX_START, SITE, homeIndex, injectBetween, llmsTxt, paintingPage, sitemap } from "./pages-lib.mjs";
import { extractPaintingIds } from "./showcase-lib.mjs";

const ROOT = new URL("../", import.meta.url).pathname;
const today = new Date().toISOString().slice(0, 10);

// Date of the last commit touching `file` (repository-relative), or today without git history.
function lastmod(file) {
  try {
    const date = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: ROOT, encoding: "utf8" }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  } catch {
    return today;
  }
}

function paintingFiles() {
  const dir = join(WEB, "paintings");
  const files = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    for (const id of extractPaintingIds(readFileSync(join(dir, file), "utf8"))) files.set(id, `web/paintings/${file}`);
  }
  return files;
}

function main() {
  const { Gallery, Instruction } = loadGallery();
  const paintings = Gallery.paintings;
  if (!paintings.length) throw new Error("no paintings were registered");
  const files = paintingFiles();

  const outDir = join(WEB, "p");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir);
  paintings.forEach((painting, index) => {
    const values = Gallery.initialValues(painting);
    const svg = Gallery.render(painting.draw, values);
    if (!svg.startsWith("<svg")) throw new Error(`${painting.id}: render did not return an SVG`);
    const n = paintings.length;
    const html = paintingPage(painting, {
      svg,
      instruction: Instruction.render(painting.instruction || "", values),
      number: index + 1,
      prev: paintings[(index - 1 + n) % n],
      next: paintings[(index + 1) % n],
    });
    writeFileSync(join(outDir, `${painting.id}.html`), html);
  });
  console.log(`pages: wrote ${paintings.length} painting pages to web/p/`);

  const indexFile = join(WEB, "index.html");
  writeFileSync(indexFile, injectBetween(readFileSync(indexFile, "utf8"), INDEX_START, INDEX_END, homeIndex(paintings)));
  console.log("pages: injected the painting index into web/index.html");

  const urls = [
    { loc: SITE, lastmod: lastmod("web/index.html") },
    { loc: `${SITE}about.html`, lastmod: lastmod("web/about.html") },
    { loc: `${SITE}showcase.html`, lastmod: lastmod("web/showcase.html") },
    ...paintings.map((painting) => {
      const file = files.get(painting.id);
      if (!file) throw new Error(`${painting.id}: no painting file registers this id`);
      return { loc: `${SITE}p/${painting.id}.html`, lastmod: lastmod(file) };
    }),
  ];
  writeFileSync(join(WEB, "sitemap.xml"), sitemap(urls));
  console.log(`pages: wrote ${urls.length} urls to web/sitemap.xml`);

  writeFileSync(join(WEB, "llms.txt"), llmsTxt(paintings));
  console.log("pages: wrote web/llms.txt");
}

try {
  main();
} catch (error) {
  console.error(`pages: ${error.stack || error.message}`);
  process.exit(1);
}
