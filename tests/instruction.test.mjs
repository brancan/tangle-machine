import assert from "node:assert/strict";
import { test } from "node:test";
import { loadGallery } from "./load-gallery.mjs";

const { Instruction, Gallery } = loadGallery();
const text = (template, values) => Instruction.render(template, values).map((part) => part.text).join("");

test("fills plain placeholders, trimming decimals", () => {
  assert.equal(text("A {n} × {n} grid, ratio {r}.", { n: 6, r: 0.125 }), "A 6 × 6 grid, ratio 0.13.");
  assert.equal(text("{w} wide", { w: 2.5 }), "2.5 wide");
});

test("percent placeholders turn fractions into percentages", () => {
  assert.equal(text("land {ratio%} along the side", { ratio: 0.1 }), "land 10% along the side");
});

test("conditional placeholders pick a branch from a boolean", () => {
  const template = "spin {alternate?in alternating directions:all the same way}";
  assert.equal(text(template, { alternate: true }), "spin in alternating directions");
  assert.equal(text(template, { alternate: false }), "spin all the same way");
  assert.equal(text("{solid?filled:}", { solid: false }), "");
});

test("filled values are marked with the param they come from", () => {
  const parts = Instruction.render("Draw {n} lines.", { n: 3 });
  assert.deepEqual(
    Array.from(parts, (p) => ({ ...p })), // copy out of the vm realm
    [{ text: "Draw " }, { text: "3", param: "n" }, { text: " lines." }]
  );
});

test("conditional blanks are flagged as choices", () => {
  const [part] = Instruction.render("{on?yes:no}", { on: true });
  assert.equal(part.choice, true);
  assert.equal(part.param, "on");
});

test("unknown placeholders are left untouched", () => {
  assert.equal(text("keep {missing} as is", {}), "keep {missing} as is");
});

test("placeholders lists every param name once", () => {
  assert.deepEqual([...Instruction.placeholders("{n} by {n}, {ratio%}, {flip?a:b}")], ["n", "ratio", "flip"]);
});

test("every painting has an instruction whose placeholders name its params", () => {
  for (const painting of Gallery.paintings) {
    assert.equal(typeof painting.instruction, "string", `${painting.id} has no instruction`);
    assert.ok(painting.instruction.length > 40, `${painting.id} instruction is too short`);
    const names = new Set(painting.params.map((p) => p.name));
    for (const name of Instruction.placeholders(painting.instruction)) {
      assert.ok(names.has(name), `${painting.id} instruction uses unknown {${name}}`);
    }
  }
});
