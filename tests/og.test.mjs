import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { WEB } from "./load-gallery.mjs";

const SITE = "https://brancan.github.io/tangle-machine/";

function meta(html, key) {
  const tag = [...html.matchAll(/<meta\s[^>]*>/g)]
    .map((m) => m[0])
    .find((t) => t.includes(`property="${key}"`) || t.includes(`name="${key}"`));
  return tag?.match(/content="([^"]*)"/)?.[1];
}

for (const [page, path] of [
  ["index.html", ""],
  ["showcase.html", "showcase.html"],
  ["about.html", "about.html"],
]) {
  test(`${page} has Open Graph and Twitter card tags`, () => {
    const html = readFileSync(join(WEB, page), "utf8");
    assert.ok(meta(html, "og:title"), "og:title");
    assert.ok(meta(html, "og:description"), "og:description");
    assert.equal(meta(html, "og:url"), SITE + path);
    assert.equal(meta(html, "og:image"), `${SITE}og-image.png`);
    assert.match(meta(html, "og:image"), /^https:\/\//);
    assert.equal(meta(html, "twitter:card"), "summary_large_image");
    assert.match(html, new RegExp(`<link rel="canonical" href="${SITE + path}"`));
  });
}

test("the Open Graph image is a 1200x630 PNG", () => {
  const file = join(WEB, "og-image.png");
  assert.ok(existsSync(file));
  const png = readFileSync(file);
  assert.equal(png.toString("latin1", 1, 4), "PNG");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test("every static page links the SVG favicon", () => {
  assert.ok(existsSync(join(WEB, "favicon.svg")));
  assert.match(readFileSync(join(WEB, "favicon.svg"), "utf8"), /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  for (const page of ["index.html", "showcase.html", "about.html"]) {
    const html = readFileSync(join(WEB, page), "utf8");
    assert.match(html, /<link rel="icon" href="favicon.svg" type="image\/svg\+xml"/, page);
  }
});

test("the home page has a descriptive title, a gallery h1, WebSite JSON-LD and the index markers", () => {
  const html = readFileSync(join(WEB, "index.html"), "utf8");
  assert.match(html, /<title>Tangle Machine · [^<]+<\/title>/);
  assert.ok(meta(html, "description").length <= 155);
  const gallery = html.match(/<section id="gallery"[\s\S]*?<\/section>/)[0];
  assert.equal((gallery.match(/<h1[\s>]/g) || []).length, 1, "one h1 in the gallery view");
  assert.ok(gallery.indexOf("<!-- paintings-index:start -->") > gallery.indexOf('id="gallery-grid"'));
  assert.ok(gallery.includes("<!-- paintings-index:end -->"));
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld["@type"], "WebSite");
  assert.equal(ld.url, SITE);
});
