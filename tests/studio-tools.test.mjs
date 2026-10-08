import assert from "node:assert/strict";
import { test } from "node:test";
import { loadGallery } from "./load-gallery.mjs";

const { Gallery, StudioTools } = loadGallery();

// Compiles and runs edited code, returning what it threw.
function thrown(source) {
  try {
    const draw = Gallery.compile(source);
    Gallery.render(draw, Gallery.initialValues({ params: [] }));
  } catch (error) {
    return error;
  }
  assert.fail("expected the code to throw");
}

test("errorLine finds the editor line of a runtime error in compiled code", () => {
  const error = thrown("function draw(p, pen) {\n  pen.line(0, 0, 1, 1);\n  missing.call();\n}");
  assert.equal(StudioTools.errorLine(error), 3);
  const first = thrown("function draw(p, pen) { undefinedThing(); }");
  assert.equal(StudioTools.errorLine(first), 1);
});

test("errorLine returns null when no compiled frame is in the stack", () => {
  assert.equal(StudioTools.errorLine(new Error("plain")), null);
  assert.equal(StudioTools.errorLine(null), null);
  assert.equal(StudioTools.errorLine({ stack: "at foo (paintings/x.js:4:2)" }), null);
});

test("errorLine reads Firefox-style Function frames", () => {
  const firefox = StudioTools.errorLine({ stack: "draw@http://x/js/gallery.js line 225 > Function:9:3" });
  const chrome = StudioTools.errorLine({ stack: "at draw (eval at compile (js/gallery.js:225:16), <anonymous>:9:3)" });
  assert.equal(typeof firefox, "number");
  assert.equal(firefox, chrome);
});

test("PNG sizes default to 2x and include A4 at 300 DPI", () => {
  const sizes = [...StudioTools.PNG_SIZES.map((s) => s.size)];
  assert.deepEqual(sizes, [800, 1600, 3200, 3508]);
  assert.equal(StudioTools.PNG_SIZES.find((s) => s.default).size, 1600);
});

test("replaySchedule spreads any number of strokes over the same total time", () => {
  for (const count of [1, 7, 500, 20000]) {
    const { delay, duration } = StudioTools.replaySchedule(count, 4000);
    assert.equal(delay(0), 0);
    const end = delay(count - 1) + duration;
    assert.ok(end <= 4000 + 1e-9 && end >= 3000, `${count} strokes end at ${end}`);
    assert.ok(duration > 0);
  }
  const { delay } = StudioTools.replaySchedule(10, 4000);
  assert.ok(delay(5) > delay(4));
});
