// The build's network orchestration with a fake fetch: live GraphQL data first, then the published
// copy (re-validated), then an empty file. No real network and no writes outside a temp dir.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { run } from "../scripts/build-showcase.mjs";

const SITE = "https://brancan.github.io/tangle-machine/";
const GRAPHQL = "https://api.github.com/graphql";
const PUBLISHED_SHOWCASE = "https://published.test/showcase.json";
const PUBLISHED_LIKES = "https://published.test/likes.json";
const CATEGORY_IDS = { "show-and-tell": "CAT_SHOW", announcements: "CAT_COMMENTS" };

const env = (overrides = {}) => ({
  GITHUB_TOKEN: "test-token",
  GITHUB_REPOSITORY: "brancan/tangle-machine",
  SHOWCASE_PUBLISHED_URL: PUBLISHED_SHOWCASE,
  LIKES_PUBLISHED_URL: PUBLISHED_LIKES,
  ...overrides,
});

// A web dir with one painting script, so the known ids are exactly "paradox" and "ripples".
function webDir(t) {
  const dir = mkdtempSync(join(tmpdir(), "build-showcase-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, "paintings"));
  writeFileSync(
    join(dir, "paintings", "set.js"),
    'Gallery.register({ id: "paradox" });\nGallery.register({ id: "ripples" });\n'
  );
  return dir;
}

const readJson = (dir, file) => JSON.parse(readFileSync(join(dir, file), "utf8"));

function logger() {
  const lines = [];
  return { lines, log: (msg) => lines.push(msg), warn: (msg) => lines.push(msg) };
}

const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

function discussion(number, id) {
  return {
    number,
    url: `https://github.com/brancan/tangle-machine/discussions/${number}`,
    title: `Entry ${number}`,
    body: `Look: ${SITE}#/${id}?seed=${number}`,
    createdAt: new Date(Date.UTC(2026, 0, number)).toISOString(),
    locked: false,
    author: { login: "someone", avatarUrl: "https://avatars.githubusercontent.com/u/1" },
    labels: { nodes: [] },
    reactionGroups: [{ content: "HEART", reactors: { totalCount: number } }],
  };
}

function thread(number, id, hearts) {
  return {
    ...discussion(number, id),
    title: `painting:${id}`,
    body: `${SITE}#/${id}`,
    reactionGroups: [{ content: "HEART", reactors: { totalCount: hearts } }],
  };
}

const page = (nodes, endCursor = null) => ({
  data: { repository: { discussions: { pageInfo: { hasNextPage: endCursor !== null, endCursor }, nodes } } },
});

// Fake fetch: GraphQL calls are answered by `graphql({ query, variables })` (a body or a Response),
// every other URL by `routes[url]`. All calls are recorded.
function fakeFetch({ graphql = () => assert.fail("unexpected GraphQL call"), routes = {} } = {}) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const call = { url, ...(init.body ? JSON.parse(init.body) : {}) };
    calls.push(call);
    let answer;
    if (url === GRAPHQL) answer = graphql(call);
    else if (Object.hasOwn(routes, url)) answer = routes[url]();
    else throw new TypeError(`fetch failed: ${url}`);
    return answer instanceof Response ? answer : json(answer);
  };
  return { fetch, calls };
}

// GraphQL answers with the categories and one page per category.
function liveGraphql(pages) {
  return ({ query, variables }) => {
    if (query.includes("discussionCategories")) {
      const nodes = Object.entries(CATEGORY_IDS).map(([slug, id]) => ({ slug, id }));
      return { data: { repository: { discussionCategories: { nodes } } } };
    }
    return pages[variables.category](variables.after);
  };
}

const PUBLISHED = {
  [PUBLISHED_SHOWCASE]: () =>
    json([
      { number: 7, url: "https://github.com/brancan/tangle-machine/discussions/7", title: "Kept", createdAt: "2026-02-01T00:00:00Z", likes: 3, link: `${SITE}#/ripples` },
      { number: 8, url: "https://github.com/brancan/tangle-machine/discussions/8", title: "Gone", createdAt: "2026-02-02T00:00:00Z", likes: 1, link: `${SITE}#/removed` },
    ]),
  [PUBLISHED_LIKES]: () =>
    json({
      ripples: { likes: 4, url: "https://github.com/brancan/tangle-machine/discussions/2" },
      removed: { likes: 9, url: "https://github.com/brancan/tangle-machine/discussions/5" },
      paradox: { likes: -1, url: "https://github.com/brancan/tangle-machine/discussions/3" },
    }),
};

// The published copy, re-validated: unknown paintings and invalid counts are dropped.
function assertPublishedCopy(dir) {
  const showcase = readJson(dir, "showcase.json");
  assert.deepEqual(showcase.map((entry) => [entry.number, entry.paintingId, entry.likes]), [[7, "ripples", 3]]);
  assert.deepEqual(readJson(dir, "likes.json"), {
    ripples: { likes: 4, url: "https://github.com/brancan/tangle-machine/discussions/2" },
  });
}

test("live GraphQL data is written for both files and the published copy is not used", async (t) => {
  const dir = webDir(t);
  const { fetch, calls } = fakeFetch({
    graphql: liveGraphql({
      CAT_SHOW: () => page([discussion(1, "paradox"), discussion(2, "unknown-painting")]),
      CAT_COMMENTS: () => page([thread(3, "ripples", 5), thread(4, "unknown-painting", 9)]),
    }),
    routes: PUBLISHED,
  });
  await run({ fetch, env: env(), webDir: dir, log: logger() });

  const showcase = readJson(dir, "showcase.json");
  assert.equal(showcase.length, 1);
  assert.equal(showcase[0].number, 1);
  assert.equal(showcase[0].paintingId, "paradox");
  assert.deepEqual(showcase[0].params, { seed: "1" });
  assert.equal(showcase[0].likes, 1);
  assert.deepEqual(readJson(dir, "likes.json"), {
    ripples: { likes: 5, url: "https://github.com/brancan/tangle-machine/discussions/3" },
  });
  assert.ok(calls.every((call) => call.url === GRAPHQL), "the published copy must not be fetched");
  const auth = calls.find((call) => call.query.includes("discussionCategories"));
  assert.deepEqual(auth.variables, { owner: "brancan", name: "tangle-machine" });
});

test("a GraphQL errors array falls back to the re-validated published copy", async (t) => {
  const dir = webDir(t);
  const log = logger();
  const { fetch } = fakeFetch({ graphql: () => ({ errors: [{ message: "rate limited" }] }), routes: PUBLISHED });
  await run({ fetch, env: env(), webDir: dir, log });

  assertPublishedCopy(dir);
  assert.ok(log.lines.some((line) => line.includes("rate limited")));
});

test("a non-OK GraphQL answer for one category falls back for that file only", async (t) => {
  const dir = webDir(t);
  const { fetch } = fakeFetch({
    graphql: liveGraphql({
      CAT_SHOW: () => json({ message: "boom" }, 502),
      CAT_COMMENTS: () => page([thread(3, "paradox", 2)]),
    }),
    routes: PUBLISHED,
  });
  await run({ fetch, env: env(), webDir: dir, log: logger() });

  assert.deepEqual(readJson(dir, "showcase.json").map((entry) => entry.number), [7]);
  assert.deepEqual(readJson(dir, "likes.json"), {
    paradox: { likes: 2, url: "https://github.com/brancan/tangle-machine/discussions/3" },
  });
});

test("without GITHUB_TOKEN no GraphQL call is made and the published copy is reused", async (t) => {
  const dir = webDir(t);
  const log = logger();
  const { fetch, calls } = fakeFetch({ routes: PUBLISHED });
  await run({ fetch, env: env({ GITHUB_TOKEN: undefined }), webDir: dir, log });

  assertPublishedCopy(dir);
  assert.deepEqual(calls.map((call) => call.url), [PUBLISHED_SHOWCASE, PUBLISHED_LIKES]);
  assert.ok(log.lines.some((line) => line.includes("GITHUB_TOKEN is not set")));
});

test("an unreachable published copy writes empty files", async (t) => {
  const dir = webDir(t);
  const { fetch } = fakeFetch({
    graphql: () => json({}, 500),
    routes: { [PUBLISHED_SHOWCASE]: () => json({}, 404) },
  });
  await run({ fetch, env: env(), webDir: dir, log: logger() });

  assert.deepEqual(readJson(dir, "showcase.json"), []);
  assert.deepEqual(readJson(dir, "likes.json"), {});
});

test("pagination follows endCursor and stops at the page cap", async (t) => {
  const dir = webDir(t);
  const log = logger();
  let number = 0;
  // Every page says there is another one; each holds one new discussion.
  const endless = (id, make) => (after) => {
    number += 1;
    return page([make(number, id)], `cursor-${number}`);
  };
  const { fetch, calls } = fakeFetch({
    graphql: liveGraphql({ CAT_SHOW: endless("paradox", discussion), CAT_COMMENTS: endless("ripples", (n, id) => thread(n, id, n)) }),
    routes: PUBLISHED,
  });
  await run({ fetch, env: env(), webDir: dir, log });

  const pages = (category) => calls.filter((call) => call.variables?.category === category).map((call) => call.variables.after);
  assert.deepEqual(pages("CAT_SHOW"), [null, "cursor-1", "cursor-2", "cursor-3", "cursor-4"]);
  assert.deepEqual(pages("CAT_COMMENTS"), [null, "cursor-6", "cursor-7", "cursor-8", "cursor-9"]);
  assert.deepEqual(readJson(dir, "showcase.json").map((entry) => entry.number), [5, 4, 3, 2, 1]);
  // Two threads for one painting: the one with more likes wins.
  assert.deepEqual(readJson(dir, "likes.json"), {
    ripples: { likes: 10, url: "https://github.com/brancan/tangle-machine/discussions/10" },
  });
  assert.ok(log.lines.some((line) => line.includes("show-and-tell: stopped after 500 discussions")));
});
