import assert from "node:assert/strict";
import { test } from "node:test";
import { loadGallery } from "./load-gallery.mjs";

const { Motion, Gallery } = loadGallery();
const RANGE = { name: "n", type: "range", min: 2, max: 10, step: 1, value: 4 };

test("oscillate starts at the minimum, peaks at half a period and snaps to the step", () => {
  assert.equal(Motion.oscillate(RANGE, 0, 6), 2);
  assert.equal(Motion.oscillate(RANGE, 3, 6), 10);
  assert.equal(Motion.oscillate(RANGE, 6, 6), 2);
  const v = Motion.oscillate(RANGE, 1, 6);
  assert.ok(Number.isInteger(v) && v > 2 && v < 10);
  const fine = Motion.oscillate({ ...RANGE, min: 0, max: 1, step: 0.01 }, 1.3, 6);
  assert.equal(fine, Math.round(fine * 100) / 100);
});

test("filterByTag keeps matching paintings and returns all for no tag", () => {
  const list = [{ id: "a", tags: ["op-art"] }, { id: "b", tags: ["organic"] }];
  assert.deepEqual(Array.from(Motion.filterByTag(list, "op-art"), (p) => p.id), ["a"]);
  assert.equal(Motion.filterByTag(list, "").length, 2);
  assert.equal(Motion.filterByTag(list, "unknown").length, 0);
});

test("every painting has tags from the shared vocabulary", () => {
  const vocabulary = new Set(Motion.TAGS);
  for (const painting of Gallery.paintings) {
    assert.ok(Array.isArray(painting.tags) && painting.tags.length > 0, `${painting.id} has no tags`);
    for (const tag of painting.tags) assert.ok(vocabulary.has(tag), `${painting.id} uses unknown tag ${tag}`);
  }
});

test("only paintings tagged animated change with time", () => {
  for (const painting of Gallery.paintings) {
    const values = Gallery.initialValues(painting);
    // Clip and filter ids grow with every render, so they are normalized before comparing.
    const render = (time) => Gallery.render(painting.draw, { ...values, time }).replace(/(clip|rough)-\d+/g, "$1-N");
    const still = render(0);
    const later = render(2.5);
    const animated = painting.tags.includes("animated");
    assert.equal(still !== later, animated, `${painting.id}: tag "animated" must match whether time changes it`);
  }
});
