import assert from "node:assert/strict";
import { test } from "node:test";
import { loadGallery } from "./load-gallery.mjs";

const { Gallery } = loadGallery();

test("random is deterministic per seed", () => {
  const a = Gallery.random(7);
  const b = Gallery.random(7);
  const c = Gallery.random(8);
  const first = [a(), a(), a()];
  assert.deepEqual([b(), b(), b()], first);
  assert.notDeepEqual([c(), c(), c()], first);
});

test("initialValues layers style overrides and painting params over shared defaults", () => {
  const painting = { style: { ink: "#ffffff" }, params: [{ name: "n", type: "range", min: 1, max: 9, step: 1, value: 3 }] };
  const values = Gallery.initialValues(painting);
  assert.equal(values.ink, "#ffffff");
  assert.equal(values.paper, "#fbf8f0");
  assert.equal(values.n, 3);
  assert.equal(values.handWobble, 0);
});

test("compile turns source into a function and rejects anything else", () => {
  const draw = Gallery.compile("function draw(p, pen) { pen.line(0, 0, p.n, p.n); }");
  const svg = Gallery.render(draw, { ...Gallery.initialValues({ params: [] }), n: 5 });
  assert.match(svg, /<line x1="0" y1="0" x2="5" y2="5"\/>/);
  assert.throws(() => Gallery.compile("42"), /must be a function/);
});

test("hand-drawn variables at zero leave geometry exact", () => {
  const draw = (p, pen) => pen.polygon([[0, 0], [10, 0], [10, 10]]);
  const svg = Gallery.render(draw, Gallery.initialValues({ params: [] }));
  assert.match(svg, /<polygon points="0,0 10,0 10,10"\/>/);
});

test("hand-drawn variables bend strokes deterministically", () => {
  const draw = (p, pen) => pen.polygon([[0, 0], [100, 0], [100, 100]]);
  const values = { ...Gallery.initialValues({ params: [] }), handWobble: 3, handJitter: 2, handSeed: 5 };
  const svg = Gallery.render(draw, values);
  assert.match(svg, /<polyline points=/);
  assert.equal(Gallery.render(draw, values), svg);
});

test("clip ids are unique across renders", () => {
  const draw = (p, pen) => pen.clip("M0 0h10v10z", () => pen.line(0, 0, 5, 5));
  const values = Gallery.initialValues({ params: [] });
  const id = (svg) => svg.match(/clipPath id="([^"]+)"/)[1];
  assert.notEqual(id(Gallery.render(draw, values)), id(Gallery.render(draw, values)));
});

test("paper texture is a shared style param that defaults to plain", () => {
  const texture = Gallery.STYLE_PARAMS.find((p) => p.name === "paperTexture");
  assert.equal(texture.type, "select");
  assert.equal(texture.value, "plain");
  assert.deepEqual([...texture.options.map((o) => o.value)], ["plain", "dark", "kraft", "grain", "watercolor"]);
});

test("plain paper adds nothing; other textures overlay noise on the paper", () => {
  const draw = (p, pen) => pen.line(0, 0, 10, 10);
  const values = Gallery.initialValues({ params: [] });
  const plain = Gallery.render(draw, values);
  const { paperTexture, ...withoutTexture } = values;
  assert.equal(paperTexture, "plain");
  assert.equal(Gallery.render(draw, withoutTexture), plain);
  assert.doesNotMatch(plain, /feTurbulence|<defs>/);
  for (const texture of ["dark", "kraft", "grain", "watercolor"]) {
    const svg = Gallery.render(draw, { ...values, paperTexture: texture });
    assert.match(svg, /<filter id="paper-\d+"[^>]*><feTurbulence /, texture);
    assert.match(svg, /<rect width="100%" height="100%" fill="#fbf8f0"\/><rect width="100%" height="100%" filter="url\(#paper-\d+\)"\/>/);
  }
  const both = Gallery.render(draw, { ...values, paperTexture: "grain", handRoughness: 2 });
  assert.equal(both.match(/<defs>/g).length, 1);
});

// Points of the first traced shape.
const tracePoints = (draw, values) => Array.from(Gallery.trace(draw, values)[0].points, ([x, y]) => [x, y]);

// Distance from point p to the segment ab.
function toSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

test("wobble samples a long stroke sparsely but stays on its drift curve", () => {
  const values = { ...Gallery.initialValues({ params: [] }), handWobble: 8, handSeed: 7 };
  // As a curve, a stroke draws the same drift however many vertices it has, so a stroke
  // with a vertex every 2px traces the drift curve itself.
  const sparse = tracePoints((p, pen) => pen.polyline([[100, 400], [700, 400]], null, true), values);
  const dense = Array.from({ length: 301 }, (_, i) => [100 + i * 2, 400]);
  const curve = tracePoints((p, pen) => pen.polyline(dense, null, true), values);
  assert.ok(sparse.length <= 600 / 12, `${sparse.length} points, the old 6px sampling had 101`);
  const off = Math.max(...curve.map((p) => Math.min(...sparse.slice(1).map((b, i) => toSegment(p, sparse[i], b)))));
  assert.ok(off < 0.35, `strays ${off}px from the drift curve`);
  for (const [x, y] of sparse) assert.equal(Math.round(x * 10) / 10, x, "tenths of a pixel");
  assert.ok(Math.max(...curve.map(([, y]) => Math.abs(y - 400))) > 1, "it does wobble");
});

test("a hand-bent circle uses fewer points yet stays round", () => {
  const values = { ...Gallery.initialValues({ params: [] }), handJitter: 2, handSeed: 3 };
  const exact = Gallery.trace((p, pen) => pen.circle(400, 400, 100), Gallery.initialValues({ params: [] }))[0].points;
  // The last point is the hand's loose end near the start; the rest is the shifted circle.
  const ring = tracePoints((p, pen) => pen.circle(400, 400, 100), values).slice(0, -1);
  assert.ok(ring.length < exact.length / 2, `${ring.length} vs ${exact.length} points`);
  const cx = ring.reduce((s, [x]) => s + x, 0) / ring.length;
  const cy = ring.reduce((s, [, y]) => s + y, 0) / ring.length;
  for (const [i, a] of ring.entries()) {
    const b = ring[(i + 1) % ring.length];
    assert.ok(Math.abs(Math.hypot(a[0] - cx, a[1] - cy) - 100) < 0.15, "points on the circle");
    assert.ok(100 - Math.hypot((a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy) < 0.3, "chords hug the circle");
  }
});
