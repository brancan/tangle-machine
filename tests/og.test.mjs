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
