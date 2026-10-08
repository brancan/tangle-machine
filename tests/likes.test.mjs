import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { WEB } from "./load-gallery.mjs";
import { buildLikes, countLikes, parseShowcaseEntry, reuseLikes, reuseShowcase } from "../scripts/showcase-lib.mjs";

const KNOWN = new Set(["paradox", "ripples"]);
const SITE = "https://brancan.github.io/tangle-machine/";
const sha1 = (text) => createHash("sha1").update(text).digest("hex");

const reactions = (counts) =>
  Object.entries(counts).map(([content, totalCount]) => ({ content, reactors: { totalCount } }));

function thread(overrides = {}) {
  return {
    title: "painting:paradox",
    url: "https://github.com/brancan/tangle-machine/discussions/3",
    body: `${SITE}#/paradox\n\n<!-- sha1: ${sha1("painting:paradox")} -->`,
    reactionGroups: reactions({ THUMBS_UP: 2, HEART: 1 }),
    ...overrides,
  };
}

test("only positive reactions count as likes", () => {
  const groups = reactions({ THUMBS_UP: 1, HEART: 2, HOORAY: 3, ROCKET: 4, THUMBS_DOWN: 50, CONFUSED: 7, LAUGH: 8, EYES: 9 });
  assert.equal(countLikes(groups), 10);
});

test("malformed reaction groups count as zero", () => {
  for (const groups of [null, undefined, "x", {}, [null, 3, { content: "HEART" }, { content: "HEART", reactors: { totalCount: -2 } }, { content: "HEART", reactors: { totalCount: 1.5 } }]]) {
    assert.equal(countLikes(groups), 0);
  }
});

test("giscus threads become likes per painting", () => {
  const likes = buildLikes([thread(), thread({ title: "painting:ripples", body: "", url: "https://github.com/brancan/tangle-machine/discussions/4", reactionGroups: [] })], KNOWN);
  assert.deepEqual(likes, {
    paradox: { likes: 3, url: "https://github.com/brancan/tangle-machine/discussions/3" },
    ripples: { likes: 0, url: "https://github.com/brancan/tangle-machine/discussions/4" },
  });
});

test("a thread is matched by its giscus hash or the term in its body when the title differs", () => {
  assert.equal(buildLikes([thread({ title: "Renamed" })], KNOWN).paradox.likes, 3);
  assert.equal(buildLikes([thread({ title: "Renamed", body: "term painting:ripples here" })], KNOWN).ripples.likes, 3);
  assert.deepEqual(buildLikes([thread({ title: "Renamed", body: "painting:paradoxical" })], KNOWN), {});
});

test("unknown paintings, foreign urls and malformed threads are dropped", () => {
  const likes = buildLikes(
    [
      thread({ title: "painting:nope", body: "" }),
      thread({ url: "https://evil.example/discussions/3" }),
      null,
      42,
      { title: "painting:ripples" },
    ],
    KNOWN
  );
  assert.deepEqual(likes, {});
  assert.deepEqual(buildLikes(null, KNOWN), {});
});

test("when a painting has two threads the one with more likes wins", () => {
  const likes = buildLikes(
    [thread({ reactionGroups: reactions({ HEART: 1 }) }), thread({ url: "https://github.com/brancan/tangle-machine/discussions/9", reactionGroups: reactions({ HEART: 5 }) })],
    KNOWN
  );
  assert.deepEqual(likes.paradox, { likes: 5, url: "https://github.com/brancan/tangle-machine/discussions/9" });
});

test("published likes are reused and re-validated", () => {
  const previous = buildLikes([thread()], KNOWN);
  assert.deepEqual(reuseLikes(previous, KNOWN), previous);
  const tampered = {
    ...previous,
    ripples: { likes: 3, url: "https://evil.example/x" },
    nope: { likes: 1, url: "https://github.com/x" },
    __proto__x: 1,
  };
  assert.deepEqual(reuseLikes(tampered, KNOWN), previous);
  assert.deepEqual(reuseLikes({ paradox: { likes: -1, url: previous.paradox.url } }, KNOWN), {});
  for (const bad of [null, undefined, [], "{}", 3]) assert.deepEqual(reuseLikes(bad, KNOWN), {});
});

test("showcase entries carry their likes and keep them when reused", () => {
  const discussion = {
    number: 7,
    url: "https://github.com/brancan/tangle-machine/discussions/7",
    title: "Paradox variant",
    body: `${SITE}#/paradox?n=3`,
    createdAt: "2026-10-01T12:00:00Z",
    locked: false,
    author: { login: "octocat", avatarUrl: "" },
    labels: { nodes: [] },
    reactionGroups: reactions({ ROCKET: 2, THUMBS_DOWN: 4 }),
  };
  const entry = parseShowcaseEntry(discussion, KNOWN);
  assert.equal(entry.likes, 2);
  assert.equal(parseShowcaseEntry({ ...discussion, reactionGroups: undefined }, KNOWN).likes, 0);
  assert.deepEqual(reuseShowcase([entry], KNOWN), [entry]);
  assert.equal(reuseShowcase([{ ...entry, likes: "9" }], KNOWN)[0].likes, 0);
});

test("the committed likes.json is a JSON object", () => {
  const likes = JSON.parse(readFileSync(join(WEB, "likes.json"), "utf8"));
  assert.ok(likes && typeof likes === "object" && !Array.isArray(likes));
});
