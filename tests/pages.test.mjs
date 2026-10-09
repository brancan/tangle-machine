import assert from "node:assert/strict";
import { test } from "node:test";
import { loadGallery } from "./load-gallery.mjs";
import {
  SITE,
  escapeHtml,
  homeIndex,
  injectBetween,
  llmsTxt,
  metaDescription,
  paintingPage,
  sitemap,
} from "../scripts/pages-lib.mjs";

const { Gallery, Instruction } = loadGallery();
const paintings = Gallery.paintings;

function pageFor(painting, index, list = paintings) {
  const n = list.length;
  return paintingPage(painting, {
    svg: Gallery.render(painting.draw, Gallery.initialValues(painting)),
    instruction: Instruction.render(painting.instruction || "", Gallery.initialValues(painting)),
    number: index + 1,
    prev: list[(index - 1 + n) % n],
    next: list[(index + 1) % n],
  });
}

function jsonLd(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return blocks.map((m) => JSON.parse(m[1]));
}

function meta(html, key) {
  const tag = [...html.matchAll(/<meta\s[^>]*>/g)]
    .map((m) => m[0])
    .find((t) => t.includes(`property="${key}"`) || t.includes(`name="${key}"`));
  return tag?.match(/content="([^"]*)"/)?.[1];
}

const fake = {
  id: "fake",
  title: 'Bold <b>&"',
  description: 'After Someone\'s <Thing> & "friends": a test painting that is not real.',
  tags: ["geometric", "<x>"],
  instruction: "Draw {n} lines.",
};

test("every real painting gets a complete page", () => {
  assert.ok(paintings.length >= 69, `${paintings.length} paintings`);
  const ids = new Set();
  paintings.forEach((painting, index) => {
    const html = pageFor(painting, index);
    ids.add(painting.id);
    const url = `${SITE}p/${painting.id}.html`;
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<html lang="en">/);
    assert.ok(html.includes(`<title>${escapeHtml(painting.title)} · Tangle Machine</title>`), painting.id);
    assert.ok(html.includes(`<link rel="canonical" href="${url}"`), painting.id);
    assert.equal(meta(html, "og:url"), url);
    assert.equal(meta(html, "og:image"), `${SITE}og-image.png`);
    const description = meta(html, "description");
    assert.ok(description && description.length >= 50, `${painting.id} description`);
    assert.ok(description.length <= 160, `${painting.id} description is ${description.length} chars`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${painting.id} has one h1`);
    assert.match(html, /<svg[\s>]/);
    const scripts = html
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")
      .replace(/<script data-goatcounter="[^"]*" async src="https:\/\/gc\.zgo\.at\/count\.js"><\/script>/, "");
    assert.doesNotMatch(scripts, /<script/, `${painting.id} runs no script but the visit counter`);
    assert.ok(html.includes(`href="../index.html#/${painting.id}"`), `${painting.id} studio link`);
    assert.ok(html.includes('href="../favicon.svg"'));
    assert.ok(html.includes("Zentangle®"));
    const [ld] = jsonLd(html);
    assert.equal(ld["@context"], "https://schema.org");
    assert.equal(ld["@type"], "VisualArtwork");
    assert.equal(ld.url, url);
    assert.equal(ld.name, painting.title);
    assert.match(ld.image, /^https:\/\//);
  });
  assert.equal(ids.size, paintings.length, "ids are unique");
});

test("prev and next link the neighbouring pages", () => {
  const html = pageFor(paintings[0], 0);
  assert.ok(html.includes(`href="${paintings.at(-1).id}.html"`));
  assert.ok(html.includes(`href="${paintings[1].id}.html"`));
});

test("the instruction is rendered with its default values", () => {
  const filled = paintingPage(fake, {
    svg: "<svg></svg>",
    instruction: Instruction.render(fake.instruction, { n: 7 }),
    number: 3,
    prev: fake,
    next: fake,
  });
  assert.match(filled, /Draw <span class="blank">7<\/span> lines\./);
  assert.match(filled, /Instruction #3/);
});

test("user text is escaped in HTML and in JSON-LD", () => {
  const html = paintingPage(fake, { svg: "<svg><script>alert(1)</script><rect/></svg>", instruction: [], number: 1, prev: fake, next: fake });
  assert.ok(!html.includes("<b>"), "title is escaped");
  assert.ok(html.includes("Bold &lt;b&gt;&amp;&quot;"));
  assert.ok(!html.includes("<Thing>"));
  assert.ok(!html.includes("<x>"));
  assert.ok(!html.includes("alert(1)"), "scripts in the SVG are stripped");
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  assert.ok(!ld.includes("<"), "no raw < inside JSON-LD");
  const data = JSON.parse(ld);
  assert.equal(data.name, fake.title);
  assert.ok(data.keywords.includes("<x>"));
});

test("homages credit the original work", () => {
  const schotter = paintings.find((p) => p.id === "schotter");
  const [ld] = jsonLd(pageFor(schotter, paintings.indexOf(schotter)));
  assert.match(ld.description, /After Georg Nees/);
  assert.match(ld.citation, /Georg Nees/);
});

test("meta descriptions are trimmed at a word boundary", () => {
  const long = "word ".repeat(80).trim();
  const short = metaDescription(long);
  assert.ok(short.length <= 155, `${short.length}`);
  assert.ok(short.endsWith("…"));
  assert.ok(!/wor…$/.test(short) && /word…$/.test(short));
  assert.equal(metaDescription("  Short one.  "), "Short one.");
});

test("homeIndex links every painting", () => {
  const html = homeIndex([...paintings, fake]);
  assert.match(html, /^<nav class="painting-index" aria-label="All paintings">/);
  for (const painting of paintings) assert.ok(html.includes(`href="p/${painting.id}.html"`), painting.id);
  assert.ok(html.includes("Bold &lt;b&gt;&amp;&quot;"));
});

test("injectBetween replaces the marked block and throws without markers", () => {
  const start = "<!-- paintings-index:start -->";
  const end = "<!-- paintings-index:end -->";
  const html = `<main>${start}<p>fallback</p>${end}</main>`;
  const out = injectBetween(html, start, end, "<nav>new</nav>");
  assert.equal(out, `<main>${start}\n<nav>new</nav>\n${end}</main>`);
  assert.equal(injectBetween(out, start, end, "<nav>again</nav>"), `<main>${start}\n<nav>again</nav>\n${end}</main>`);
  assert.throws(() => injectBetween("<main></main>", start, end, "x"), /marker/);
  assert.throws(() => injectBetween(`${end}${start}`, start, end, "x"), /marker/);
});

test("sitemap lists every page with a lastmod and is well formed", () => {
  const urls = [
    { loc: SITE, lastmod: "2026-10-01" },
    { loc: `${SITE}about.html`, lastmod: "2026-10-02" },
    { loc: `${SITE}showcase.html`, lastmod: "2026-10-03" },
    ...paintings.map((p) => ({ loc: `${SITE}p/${p.id}.html`, lastmod: "2026-09-30" })),
    { loc: `${SITE}p/a&b.html`, lastmod: "2026-09-30" },
  ];
  const xml = sitemap(urls);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.match(xml, /<\/urlset>\n$/);
  assert.equal((xml.match(/<url>/g) || []).length, paintings.length + 4);
  assert.equal((xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || []).length, paintings.length + 4);
  assert.ok(xml.includes("a&amp;b.html"));
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml), "every & is escaped");
  assert.throws(() => sitemap([{ loc: SITE, lastmod: "yesterday" }]), /lastmod/);
});

test("llms.txt summarises the site and lists every painting", () => {
  const text = llmsTxt(paintings);
  assert.match(text, /^# Tangle Machine\n\n> /);
  assert.match(text, /\n## Pages\n/);
  assert.match(text, /\n## Paintings\n/);
  assert.ok(text.includes(`(${SITE}about.html)`));
  for (const painting of paintings) assert.ok(text.includes(`](${SITE}p/${painting.id}.html): `), painting.id);
});

test("painting pages load the GoatCounter visit counter", () => {
  const html = pageFor(paintings[0], 0);
  assert.match(html, /<script data-goatcounter="https:\/\/tanglemachine\.goatcounter\.com\/count" async src="https:\/\/gc\.zgo\.at\/count\.js"><\/script>/);
});
