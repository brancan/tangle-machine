import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { WEB, loadGallery, scriptsFromIndex } from "./load-gallery.mjs";

const { Gallery } = loadGallery();
const SNAPSHOTS = new URL("./snapshots.json", import.meta.url).pathname;

// Clip and filter ids depend on render order, so they are normalized before hashing.
const fingerprint = (svg) =>
  createHash("sha256").update(svg.replace(/(clip|rough|paper)-\d+/g, "$1-N")).digest("hex").slice(0, 16);

test("every painting file is loaded by index.html", () => {
  const files = readdirSync(join(WEB, "paintings")).map((f) => `paintings/${f}`).sort();
  const loaded = scriptsFromIndex().filter((s) => s.startsWith("paintings/")).sort();
  assert.deepEqual(loaded, files);
});

test("painting ids are unique", () => {
  const ids = Gallery.paintings.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("painting params do not collide with shared style or hand-drawn params", () => {
  const shared = new Set([...Gallery.STYLE_PARAMS, ...Gallery.HAND_PARAMS].map((p) => p.name));
  assert.ok(shared.has("paperTexture"));
  for (const painting of Gallery.paintings) {
    const names = painting.params.map((p) => p.name);
    assert.equal(new Set(names).size, names.length, `${painting.id} repeats a param name`);
    for (const name of names) assert.ok(!shared.has(name), `${painting.id}.${name} shadows a shared param`);
  }
});

test("range defaults sit inside their range", () => {
  for (const painting of Gallery.paintings) {
    for (const p of painting.params.filter((p) => p.type === "range")) {
      assert.ok(p.value >= p.min && p.value <= p.max, `${painting.id}.${p.name} = ${p.value}`);
    }
  }
});

test("paintings render without NaN across random variables", () => {
  const rand = Gallery.random(42);
  for (const painting of Gallery.paintings) {
    for (let round = 0; round < 4; round++) {
      const values = Gallery.initialValues(painting);
      for (const p of [...painting.params, ...Gallery.HAND_PARAMS]) {
        if (p.type === "range") values[p.name] = p.min + Math.round((rand() * (p.max - p.min)) / p.step) * p.step;
        if (p.type === "checkbox") values[p.name] = rand() < 0.5;
      }
      const svg = Gallery.render(painting.draw, values);
      assert.ok(!svg.includes("NaN"), `${painting.id} produced NaN with ${JSON.stringify(values)}`);
      assert.ok(!svg.includes("Infinity"), `${painting.id} produced Infinity with ${JSON.stringify(values)}`);
    }
  }
});

test("default renders match snapshots", () => {
  const actual = Object.fromEntries(
    Gallery.paintings.map((p) => [p.id, fingerprint(Gallery.render(p.draw, Gallery.initialValues(p)))])
  );
  if (process.env.UPDATE_SNAPSHOTS || !existsSync(SNAPSHOTS)) {
    writeFileSync(SNAPSHOTS, JSON.stringify(actual, null, 2) + "\n");
    return;
  }
  const expected = JSON.parse(readFileSync(SNAPSHOTS, "utf8"));
  assert.deepEqual(actual, expected, "Visual change detected; run `npm run test:update` if it is intended");
});
