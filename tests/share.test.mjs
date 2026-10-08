import assert from "node:assert/strict";
import { test } from "node:test";
import { loadGallery } from "./load-gallery.mjs";

const { Share } = loadGallery();

const PARAMS = [
  { name: "n", type: "range", min: 1, max: 10, step: 1, value: 4 },
  { name: "alternate", type: "checkbox", value: true },
  { name: "ink", type: "color", value: "#000000" },
];
const INITIAL = { n: 4, alternate: true, ink: "#000000" };

test("parseQuery types, clamps and validates values", () => {
  assert.deepEqual({ ...Share.parseQuery(PARAMS, "n=99&alternate=0&ink=%23ff0000") }, { n: 10, alternate: false, ink: "#ff0000" });
  assert.deepEqual({ ...Share.parseQuery(PARAMS, "n=abc&ink=red&unknown=1") }, {});
});

test("buildQuery keeps only changed values and round-trips through parseQuery", () => {
  const values = { n: 7, alternate: true, ink: "#00ff00" };
  const query = Share.buildQuery(PARAMS, values, INITIAL);
  assert.equal(query, "n=7&ink=%2300ff00");
  assert.deepEqual({ ...INITIAL, ...Share.parseQuery(PARAMS, query) }, values);
  assert.equal(Share.buildQuery(PARAMS, INITIAL, INITIAL), "");
});

test("code survives encode/decode, including unicode, and is URL-safe", async () => {
  const source = "function draw(p, pen) {\n  // círculo ✏️\n  pen.circle(400, 400, p.n * 10);\n}";
  const encoded = await Share.encodeCode(source);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.equal(await Share.decodeCode(encoded), source);
});

test("decodeCode returns null for garbage", async () => {
  assert.equal(await Share.decodeCode("not-valid-data!!"), null);
  assert.equal(await Share.decodeCode(""), null);
});
