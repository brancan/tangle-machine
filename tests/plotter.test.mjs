import assert from "node:assert/strict";
import { test } from "node:test";
import { loadGallery } from "./load-gallery.mjs";

const { Plotter, Gallery } = loadGallery();
const len = ([ax, ay], [bx, by]) => Math.hypot(bx - ax, by - ay);

test("hatch fills a polygon with parallel segments at the given spacing", () => {
  const square = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const segments = Plotter.hatch(square, 10, 0);
  assert.equal(segments.length, 10);
  for (const [a, b] of segments) {
    assert.ok(Math.abs(a[1] - b[1]) < 1e-9, "horizontal");
    assert.ok(Math.abs(len(a, b) - 100) < 1e-6, "spans the square");
  }
});

test("flattenPath turns lines, curves and arcs into point lists", () => {
  const lines = Plotter.flattenPath("M0 0L10 0M20 0L30 0L30 5");
  assert.equal(lines.length, 2);
  assert.deepEqual(Array.from(lines[1].points, (p) => [...p]), [[20, 0], [30, 0], [30, 5]]);
  const [arc] = Plotter.flattenPath("M0 0A5 5 0 0 1 10 0");
  const first = arc.points[0];
  const last = arc.points[arc.points.length - 1];
  assert.deepEqual([...first], [0, 0]);
  assert.ok(Math.abs(last[0] - 10) < 1e-9 && Math.abs(last[1]) < 1e-9, "ends at the arc end");
  assert.ok(Math.abs(Math.min(...arc.points.map((p) => p[1])) + 5) < 0.1, "sweeps over the top");
  const [box] = Plotter.flattenPath("M10 10h20v20h-20Z");
  assert.equal(box.closed, true);
  assert.deepEqual(Array.from(box.points, (p) => [...p]), [[10, 10], [30, 10], [30, 30], [10, 30]]);
});

test("clipPolyline keeps only the parts inside the clip region", () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const pieces = Plotter.clipPolyline([[-5, 5], [15, 5]], [square]);
  assert.equal(pieces.length, 1);
  assert.deepEqual(Array.from(pieces[0], (p) => [...p]), [[0, 5], [10, 5]]);
  assert.equal(Plotter.clipPolyline([[20, 20], [30, 30]], [square]).length, 0);
});

test("clipped paintings stay inside their clip", () => {
  const draw = (p, pen) => pen.clip("M0 0h100v100h-100Z", () => pen.line(-50, 50, 150, 50));
  const values = Gallery.initialValues({ params: [] });
  const strokes = Plotter.build(Gallery.trace(draw, values), values).layers.flatMap((l) => l.strokes);
  assert.ok(strokes.every((s) => s.points.every(([x]) => x >= -1e-9 && x <= 100 + 1e-9)));
});

test("order keeps every stroke and cuts pen-up travel", () => {
  // Short dashes along a line, shuffled and half of them reversed.
  const strokes = [];
  for (let i = 0; i < 40; i++) strokes.push({ points: [[i * 20, 0], [i * 20 + 10, 0]] });
  const rand = Gallery.random(3);
  strokes.sort(() => rand() - 0.5);
  strokes.forEach((s, i) => i % 2 && s.points.reverse());
  const before = Plotter.travel(strokes);
  const ordered = Plotter.order(strokes);
  assert.equal(ordered.length, strokes.length);
  assert.ok(Plotter.travel(ordered) < before / 5, `travel ${Plotter.travel(ordered)} vs ${before}`);
});

test("touching strokes are joined into one pen-down stroke", () => {
  const joined = Plotter.join([{ points: [[0, 0], [10, 0]] }, { points: [[10, 0], [20, 0]] }, { points: [[50, 0], [60, 0]] }]);
  assert.equal(joined.length, 2);
  assert.equal(joined[0].points.length, 3);
});

test("a painting becomes layered, fill-free SVG in millimetres", () => {
  const painting = Gallery.find("paradox");
  const { svg, stats } = Plotter.exportSvg(painting.draw, Gallery.initialValues(painting));
  assert.match(svg, /width="190mm" height="190mm"/);
  assert.match(svg, /inkscape:groupmode="layer"/);
  assert.doesNotMatch(svg, /<rect|filter=|clip-path/);
  assert.equal(stats.layers, 1);
  assert.ok(stats.travelAfter < stats.travelBefore);
});

test("filled curved paths are hatched too", () => {
  const values = Gallery.initialValues({ params: [] });
  const draw = (p, pen) => pen.path("M0 50A50 50 0 1 1 100 50A50 50 0 1 1 0 50Z", { fill: p.ink });
  const strokes = Plotter.build(Gallery.trace(draw, values), values).layers.flatMap((l) => l.strokes);
  assert.ok(strokes.length > 20, "circle outline plus hatch lines");
});

test("dark fills are hatched; paper-colored fills are not", () => {
  const values = { ...Gallery.initialValues({ params: [] }) };
  const draw = (p, pen) => {
    pen.polygon([[0, 0], [100, 0], [100, 100], [0, 100]], { fill: p.ink });
    pen.polygon([[200, 0], [300, 0], [300, 100], [200, 100]], { fill: p.paper });
  };
  const { layers } = Plotter.build(Gallery.trace(draw, values), values);
  const strokes = layers.flatMap((layer) => layer.strokes);
  assert.ok(strokes.length > 10, "outlines plus hatching");
  assert.ok(strokes.every((s) => !s.points || s.points.every(([x]) => x <= 100 || x >= 200)));
  const insidePaper = strokes.filter((s) => s.points && s.points.every(([x]) => x > 200 && x < 300));
  assert.equal(insidePaper.length, 0, "no hatching inside the paper-filled square");
});

test("plotter geometry matches the screen, hand-drawn bends included", () => {
  const painting = Gallery.find("paradox");
  const values = { ...Gallery.initialValues(painting), handWobble: 3, handJitter: 2, handSeed: 4 };
  const first = Gallery.trace(painting.draw, values)[0];
  const screen = Gallery.render(painting.draw, values).match(/points="([^"]+)"/)[1];
  const traced = Array.from(first.points, ([x, y]) => `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`).join(" ");
  assert.equal(traced, screen);
});

test("every painting exports quickly and without NaN", () => {
  for (const painting of Gallery.paintings) {
    const started = Date.now();
    const { svg } = Plotter.exportSvg(painting.draw, Gallery.initialValues(painting));
    assert.ok(!svg.includes("NaN"), painting.id);
    assert.ok(Date.now() - started < 3000, `${painting.id} took ${Date.now() - started} ms`);
  }
});
