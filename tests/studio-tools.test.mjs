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

const PAINTING = {
  params: [
    { name: "n", type: "range", min: 1, max: 9, step: 1, value: 3 },
    { name: "colorA", type: "color", value: "#111111" },
    { name: "colorB", type: "color", value: "#222222" },
    { name: "colorC", type: "color", value: "#333333" },
  ],
};

test("palettes set ink, paper and cycle their colors over the painting's color params", () => {
  const initial = Gallery.initialValues(PAINTING);
  const values = { ...initial, n: 7, colorA: "#abcdef" };
  const duotone = StudioTools.PALETTES.find((p) => p.id === "duotone");
  const out = StudioTools.applyPalette(PAINTING, values, "duotone", initial);
  assert.equal(out.ink, duotone.ink);
  assert.equal(out.paper, duotone.paper);
  assert.equal(out.colorA, duotone.colors[0]);
  assert.equal(out.colorB, duotone.colors[1]);
  assert.equal(out.colorC, duotone.colors[0]);
  assert.equal(out.n, 7);
  assert.equal(values.colorA, "#abcdef", "input values are not mutated");
});

test("the default palette restores the painting's own colors", () => {
  const initial = Gallery.initialValues(PAINTING);
  const changed = { ...initial, ink: "#ff0000", paper: "#00ff00", colorB: "#0000ff", n: 5 };
  assert.deepEqual({ ...StudioTools.applyPalette(PAINTING, changed, "default", initial) }, { ...initial, n: 5 });
  assert.equal(StudioTools.applyPalette(PAINTING, changed, "nope", initial), changed);
});

test("every palette color is a 6-digit hex the color inputs accept", () => {
  assert.ok(StudioTools.PALETTES.length >= 7);
  for (const palette of StudioTools.PALETTES.filter((p) => p.id !== "default")) {
    for (const color of [palette.ink, palette.paper, ...palette.colors]) assert.match(color, /^#[0-9a-f]{6}$/);
  }
});

test("dark and kraft textures bring their own paper and ink", () => {
  const values = { ink: "#1a1a1a", paper: "#fbf8f0", paperTexture: "plain" };
  assert.deepEqual({ ...StudioTools.textureValues(values, "dark") }, { ink: "#ece8df", paper: "#1d1d1f", paperTexture: "dark" });
  assert.deepEqual({ ...StudioTools.textureValues(values, "kraft") }, { ink: "#1a1a1a", paper: "#c8a878", paperTexture: "kraft" });
  assert.deepEqual({ ...StudioTools.textureValues(values, "grain") }, { ...values, paperTexture: "grain" });
});

test("presets survive a storage round trip and garbage reads as no presets", () => {
  let list = StudioTools.savePreset([], "  Calm  ", { n: 4, ink: "#000000" });
  list = StudioTools.savePreset(list, "Busy", { n: 9 });
  list = StudioTools.savePreset(list, "Calm", { n: 2 });
  const read = StudioTools.parsePresets(StudioTools.serializePresets(list));
  assert.deepEqual(JSON.parse(JSON.stringify(read)), [
    { name: "Busy", values: { n: 9 } },
    { name: "Calm", values: { n: 2 } },
  ]);
  assert.equal(StudioTools.savePreset(list, "   ", { n: 1 }), list, "blank names are ignored");
  assert.deepEqual([...StudioTools.deletePreset(read, "Busy").map((p) => p.name)], ["Calm"]);
  for (const garbage of [null, "", "{", "42", '{"a":1}', '[{"name":1}]', '[{"name":"x","values":null}]']) {
    assert.deepEqual([...StudioTools.parsePresets(garbage)], [], String(garbage));
  }
});

test("presetValues keeps only known params with valid values", () => {
  const params = [
    ...PAINTING.params,
    { name: "core", type: "checkbox", value: true },
    { name: "paperTexture", type: "select", value: "plain", options: [{ value: "plain" }, { value: "kraft" }] },
  ];
  const stored = { n: 99, colorA: "#00ff00", colorB: "red", core: false, paperTexture: "kraft", gone: 1 };
  assert.deepEqual({ ...StudioTools.presetValues(params, stored) }, { n: 9, colorA: "#00ff00", core: false, paperTexture: "kraft" });
  assert.deepEqual({ ...StudioTools.presetValues(params, { paperTexture: "velvet", core: "yes" }) }, {});
});

test("pen help documents every pen member the drawing code can use", () => {
  let members = [];
  Gallery.render((p, pen) => (members = Object.keys(pen)), Gallery.initialValues({ params: [] }));
  const documented = new Set(StudioTools.PEN_HELP.map((entry) => entry.name));
  for (const name of members.filter((m) => m !== "shapes")) assert.ok(documented.has(`pen.${name}`), name);
  for (const entry of StudioTools.PEN_HELP) assert.ok(entry.signature && entry.description.length > 10, entry.name);
});
