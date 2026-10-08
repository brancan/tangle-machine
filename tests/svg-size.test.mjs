import assert from "node:assert/strict";
import { test } from "node:test";
import { loadGallery } from "./load-gallery.mjs";

const { Gallery } = loadGallery();

// Huge SVGs are slow on phones and painful to plot, so every painting's output is bounded.
const LIMIT = 1_000_000;

// Paintings known to exceed the limit at extreme settings, with their largest size
// measured by this sweep (bytes). They are bounded at that size instead, so they cannot
// grow further; shrink them and drop their entry when they are reworked.
const ALLOWED = {
  "flow-field": 3_689_000, // all max: 1000 long streamlines
  "truchet-tiles": 2_432_000, // all max: 24×24 tiles of 12 bands
  "woven-circle": 2_185_000, // all max
  "triangle-paradox": 2_045_000, // all max
  vortex: 1_553_000, // random mix with many arms and ribs
  paradox: 1_418_000, // all max
  "string-art": 1_352_000, // all max
};

// Defaults, every range at its min, every range at its max, and a few seeded random mixes.
// The shared hand-drawn params stay at their defaults: wobble resamples every stroke and
// would inflate every painting alike, which is the hand's cost, not the painting's.
function variants(painting) {
  const own = [...painting.params, ...Gallery.STYLE_PARAMS.filter((p) => p.type === "select")];
  const out = [["defaults", Gallery.initialValues(painting)]];
  for (const end of ["min", "max"]) {
    const values = Gallery.initialValues(painting);
    for (const p of painting.params) if (p.type === "range") values[p.name] = p[end];
    out.push([`all ${end}`, values]);
  }
  const rand = Gallery.random(2024);
  for (let round = 0; round < 6; round++) {
    const values = Gallery.initialValues(painting);
    for (const p of own) {
      if (p.type === "range") values[p.name] = p.min + Math.round((rand() * (p.max - p.min)) / p.step) * p.step;
      if (p.type === "checkbox") values[p.name] = rand() < 0.5;
      if (p.type === "select") values[p.name] = p.options[Math.floor(rand() * p.options.length)].value;
    }
    out.push([`random ${round}`, values]);
  }
  return out;
}

// The largest SVG of each painting across its variants.
const worst = Object.fromEntries(
  Gallery.paintings.map((painting) => {
    let max = { size: 0 };
    for (const [label, values] of variants(painting)) {
      const size = Gallery.render(painting.draw, values).length;
      if (size > max.size) max = { size, label };
    }
    return [painting.id, max];
  })
);

test("every painting keeps its SVG under 1 MB", () => {
  if (process.env.SVG_SIZES) console.log(Object.entries(worst).map(([id, w]) => `${id} ${w.size} ${w.label}`).join("\n"));
  for (const [id, { size, label }] of Object.entries(worst)) {
    const limit = ALLOWED[id] ?? LIMIT;
    assert.ok(size <= limit, `${id} (${label}) is ${size} bytes, over ${limit}`);
  }
});

test("allow-listed paintings still need their exemption", () => {
  for (const id of Object.keys(ALLOWED)) {
    assert.ok(worst[id], `${id} is not a painting`);
    assert.ok(worst[id].size > LIMIT, `${id} now fits in ${LIMIT} bytes: drop it from ALLOWED`);
  }
});
