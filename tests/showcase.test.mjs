import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { WEB, scriptsFromIndex } from "./load-gallery.mjs";
import { buildShowcase, extractPaintingIds, parseShowcaseEntry, reuseShowcase } from "../scripts/showcase-lib.mjs";

const KNOWN = new Set(["paradox", "ripples"]);
const SITE = "https://brancan.github.io/tangle-machine/";

function discussion(overrides = {}) {
  return {
    number: 7,
    url: "https://github.com/brancan/tangle-machine/discussions/7",
    title: "Paradox variant",
    body: `Look at this:\n\n${SITE}#/paradox?n=3&ink=%23ff0000\n\nThanks!`,
    createdAt: "2026-10-01T12:00:00Z",
    locked: false,
    author: { login: "octocat", avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4" },
    labels: { nodes: [] },
    ...overrides,
  };
}

test("a valid gallery post becomes a showcase entry", () => {
  const entry = parseShowcaseEntry(discussion(), KNOWN);
  assert.deepEqual(entry, {
    number: 7,
    url: "https://github.com/brancan/tangle-machine/discussions/7",
    title: "Paradox variant",
    author: { login: "octocat", avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4" },
    createdAt: "2026-10-01T12:00:00Z",
    likes: 0,
    paintingId: "paradox",
    params: { n: "3", ink: "#ff0000" },
    hasCode: false,
    link: `${SITE}#/paradox?n=3&ink=%23ff0000`,
  });
});

test("links with index.html and inside markdown link syntax are accepted", () => {
  const body = `[my take](${SITE}index.html#/ripples?count=5)`;
  const entry = parseShowcaseEntry(discussion({ body }), KNOWN);
  assert.equal(entry.paintingId, "ripples");
  assert.equal(entry.link, `${SITE}index.html#/ripples?count=5`);
});

test("links to other hosts or look-alike prefixes are rejected", () => {
  for (const link of [
    "https://evil.example/tangle-machine/#/paradox",
    "http://brancan.github.io/tangle-machine/#/paradox",
    "https://brancan.github.io.evil.example/tangle-machine/#/paradox",
    "https://brancan.github.io/tangle-machine-fake/#/paradox",
  ]) {
    assert.equal(parseShowcaseEntry(discussion({ body: link }), KNOWN), null, link);
  }
});

test("the first site link wins, foreign links before it are skipped", () => {
  const body = `https://evil.example/#/x then ${SITE}#/ripples and ${SITE}#/paradox`;
  assert.equal(parseShowcaseEntry(discussion({ body }), KNOWN).paintingId, "ripples");
});

test("unknown painting ids are rejected", () => {
  assert.equal(parseShowcaseEntry(discussion({ body: `${SITE}#/nope?n=1` }), KNOWN), null);
  assert.equal(parseShowcaseEntry(discussion({ body: `${SITE}#/` }), KNOWN), null);
});

test("unsafe param keys and values are dropped", () => {
  const body = `${SITE}#/paradox?n=3&bad%20key=1&x=${"9".repeat(100)}&y=%3Cscript%3E`;
  assert.deepEqual(parseShowcaseEntry(discussion({ body }), KNOWN).params, { n: "3" });
});

test("code= links are flagged and the code is never decoded", () => {
  const body = `${SITE}#/paradox?n=2&code=S0vMKS1OVcgoKSmw0tdPzs8tyM9LzSvRBwA`;
  const entry = parseShowcaseEntry(discussion({ body }), KNOWN);
  assert.equal(entry.hasCode, true);
  assert.deepEqual(entry.params, { n: "2" });
  assert.equal(entry.link, body);
  assert.ok(!("code" in entry.params));
});

test("locked discussions and ones labelled hidden are dropped", () => {
  assert.equal(parseShowcaseEntry(discussion({ locked: true }), KNOWN), null);
  assert.equal(parseShowcaseEntry(discussion({ labels: { nodes: [{ name: "Hidden" }] } }), KNOWN), null);
});

test("titles are capped at 120 characters and deleted authors become ghost", () => {
  const entry = parseShowcaseEntry(discussion({ title: "x".repeat(300), author: null }), KNOWN);
  assert.equal(entry.title.length, 120);
  assert.ok(entry.title.endsWith("…"));
  assert.deepEqual(entry.author, { login: "ghost", avatarUrl: "" });
});

test("avatars outside GitHub are discarded", () => {
  const author = { login: "octocat", avatarUrl: "https://tracker.example/a.png" };
  assert.equal(parseShowcaseEntry(discussion({ author }), KNOWN).author.avatarUrl, "");
});

test("buildShowcase drops invalid posts, dedupes by number and sorts newest first", () => {
  const list = buildShowcase(
    [
      discussion({ number: 1, createdAt: "2026-09-01T00:00:00Z" }),
      discussion({ number: 2, createdAt: "2026-10-05T00:00:00Z" }),
      discussion({ number: 1, createdAt: "2026-09-01T00:00:00Z" }),
      discussion({ number: 3, body: "no link here" }),
      discussion({ number: 4, createdAt: "2026-09-15T00:00:00Z" }),
    ],
    KNOWN
  );
  assert.deepEqual(
    list.map((e) => e.number),
    [2, 4, 1]
  );
});

test("extractPaintingIds reads ids from Gallery.register calls", () => {
  const source = readFileSync(join(WEB, "paintings", "ripples.js"), "utf8");
  assert.deepEqual(extractPaintingIds(source), ["ripples"]);
});

// ---------- Browser scripts ----------

function loadScript(file, extra = {}) {
  const context = { window: {}, URL, URLSearchParams, ...extra };
  vm.createContext(context);
  vm.runInContext(readFileSync(join(WEB, file), "utf8"), context, { filename: file });
  return context.window;
}

test("publish link prefills a gallery discussion with the canonical share link", () => {
  const { PublishLink } = loadScript("js/publish-link.js");
  const url = new URL(PublishLink.build({ href: "http://localhost:8000/index.html#/paradox?n=3", title: "Paradox" }));
  assert.equal(url.origin + url.pathname, "https://github.com/brancan/tangle-machine/discussions/new");
  assert.equal(url.searchParams.get("category"), "show-and-tell");
  assert.equal(url.searchParams.get("title"), "Paradox variant");
  const lines = url.searchParams.get("body").split("\n");
  assert.ok(lines.includes(`${SITE}#/paradox?n=3`));
  // What the button publishes is exactly what the build accepts.
  const entry = parseShowcaseEntry(discussion({ body: url.searchParams.get("body") }), KNOWN);
  assert.deepEqual(entry.params, { n: "3" });
});

test("publish link asks for a pasted link when the code was edited or the link is too long", () => {
  const { PublishLink } = loadScript("js/publish-link.js");
  for (const args of [
    { href: `${SITE}#/paradox`, title: "Paradox", edited: true },
    { href: `${SITE}#/paradox?code=${"a".repeat(9000)}`, title: "Paradox" },
  ]) {
    const url = PublishLink.build(args);
    assert.ok(url.length < 8000);
    const body = new URL(url).searchParams.get("body");
    assert.ok(!body.includes(SITE), "no link in the body");
    assert.match(body, /Copy link/);
  }
});

test("comments.js loads headless without touching the DOM", () => {
  assert.doesNotThrow(() => loadScript("js/comments.js"));
});

test("showcase.html keeps no painting list of its own", () => {
  const html = readFileSync(join(WEB, "showcase.html"), "utf8");
  assert.doesNotMatch(html, /<script src="paintings\//);
});

test("the showcase reads its painting scripts from index.html", () => {
  const { Showcase } = loadScript("js/showcase.js");
  const index = readFileSync(join(WEB, "index.html"), "utf8");
  assert.deepEqual([...Showcase.paintingScripts(index)], scriptsFromIndex().filter((s) => s.startsWith("paintings/")));
});

test("only plain painting script paths are accepted from index.html", () => {
  const { Showcase } = loadScript("js/showcase.js");
  const html = `<script src="paintings/ok-1.js"></script><script src="paintings/../evil.js"></script>
    <script src="https://evil.example/paintings/x.js"></script><script src="js/app.js"></script>`;
  assert.deepEqual([...Showcase.paintingScripts(html)], ["paintings/ok-1.js"]);
});

test("the committed showcase.json is a JSON array", () => {
  assert.ok(Array.isArray(JSON.parse(readFileSync(join(WEB, "showcase.json"), "utf8"))));
});

test("a previously published showcase is reused and re-validated", () => {
  const previous = buildShowcase([discussion(), discussion({ number: 8, createdAt: "2026-10-02T12:00:00Z" })], KNOWN);
  assert.deepEqual(reuseShowcase(previous, KNOWN), previous);
  const tampered = [...previous, { ...previous[0], number: 9, link: "https://evil.example/#/paradox?n=3" }];
  assert.deepEqual(reuseShowcase(tampered, KNOWN), previous);
  assert.deepEqual(reuseShowcase(previous, new Set(["ripples"])), []);
});

test("an unusable previous showcase falls back to an empty gallery", () => {
  for (const previous of [null, undefined, {}, "[]", [null, 3, "x"]]) {
    assert.deepEqual(reuseShowcase(previous, KNOWN), []);
  }
});
