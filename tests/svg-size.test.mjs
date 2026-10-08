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
  "truchet-tiles": 3_395_000, // all max + hand max: 24×24 tiles of 12 bands, bent arcs as polylines
  "triangle-paradox": 3_097_000, // all max + hand max
  "string-art": 2_242_000, // all max + hand max (1_352_000 without the hand)
  "woven-circle": 2_185_000, // all max
  paradox: 2_080_000, // all max + hand max (1_418_000 without the hand)
  "star-checker": 1_240_000, // all max + hand max only: wobble and pressure on ~14600 strokes
  "paradox-circle": 1_158_000, // all max + hand max only: ~11700 bent strokes
};

// Every shared hand-drawn param at its max: wobble, jitter, pressure and roughness.
const HAND_MAX = Object.fromEntries(Gallery.HAND_PARAMS.filter((p) => p.name !== "handSeed").map((p) => [p.name, p.max]));

// Defaults, every range at its min, every range at its max, a few seeded random mixes, and
// the defaults and the max with the hand-drawn params at their max (bent strokes cost bytes).
function variants(painting) {
  const own = [...painting.params, ...Gallery.STYLE_PARAMS.filter((p) => p.type === "select")];
  const out = [["defaults", Gallery.initialValues(painting)]];
  for (const end of ["min", "max"]) {
    const values = Gallery.initialValues(painting);
    for (const p of painting.params) if (p.type === "range") values[p.name] = p[end];
    out.push([`all ${end}`, values]);
  }
  out.push(["defaults + hand max", { ...out[0][1], ...HAND_MAX }]);
  out.push(["all max + hand max", { ...out[2][1], ...HAND_MAX }]);
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
