// Builds web/showcase.json from the "Show and tell" Discussions category at deploy time.
// It never fails the deploy: when GitHub cannot be reached it reuses the published showcase.json
// (re-validated), and only falls back to [] when that is unavailable too. It always exits 0.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildShowcase, extractPaintingIds, reuseShowcase } from "./showcase-lib.mjs";

const WEB = new URL("../web/", import.meta.url).pathname;
const OUT = join(WEB, "showcase.json");
const CATEGORY = "show-and-tell";
const PAGE = 100;
const MAX_PAGES = 5;
const TIMEOUT_MS = 15000;
const PUBLISHED = process.env.SHOWCASE_PUBLISHED_URL || "https://brancan.github.io/tangle-machine/showcase.json";

function knownPaintingIds() {
  const dir = join(WEB, "paintings");
  const files = readdirSync(dir).filter((file) => file.endsWith(".js"));
  return new Set(files.flatMap((file) => extractPaintingIds(readFileSync(join(dir, file), "utf8"))));
}

async function graphql(token, query, variables) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "tangle-machine-showcase" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GitHub API answered ${response.status}`);
  const json = await response.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

const CATEGORIES = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) { discussionCategories(first: 50) { nodes { id slug } } }
}`;

const DISCUSSIONS = `query($owner: String!, $name: String!, $category: ID!, $after: String) {
  repository(owner: $owner, name: $name) {
    discussions(first: ${PAGE}, after: $after, categoryId: $category, orderBy: { field: CREATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number url title body createdAt locked
        author { login avatarUrl }
        labels(first: 20) { nodes { name } }
      }
    }
  }
}`;

async function fetchDiscussions(token, owner, name) {
  const categories = await graphql(token, CATEGORIES, { owner, name });
  const category = categories.repository?.discussionCategories.nodes.find((c) => c.slug === CATEGORY);
  if (!category) throw new Error(`no Discussions category with slug "${CATEGORY}"`);
  const all = [];
  let after = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await graphql(token, DISCUSSIONS, { owner, name, category: category.id, after });
    const { nodes, pageInfo } = data.repository.discussions;
    all.push(...nodes);
    if (!pageInfo.hasNextPage) break;
    if (page === MAX_PAGES - 1) console.warn(`showcase: stopped after ${MAX_PAGES * PAGE} discussions`);
    after = pageInfo.endCursor;
  }
  return all;
}

function write(entries) {
  writeFileSync(OUT, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`showcase: wrote ${entries.length} entries to web/showcase.json`);
}

async function fetchPublished(knownIds) {
  try {
    const response = await fetch(PUBLISHED, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`answered ${response.status}`);
    const entries = reuseShowcase(await response.json(), knownIds);
    console.warn(`showcase: reusing ${entries.length} entries from ${PUBLISHED}`);
    return entries;
  } catch (error) {
    console.warn(`showcase: published gallery unavailable (${error.message}); writing an empty gallery`);
    return [];
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const [owner, name] = (process.env.GITHUB_REPOSITORY || "brancan/tangle-machine").split("/");
  const knownIds = knownPaintingIds();
  if (!token) {
    console.warn("showcase: GITHUB_TOKEN is not set");
    return write(await fetchPublished(knownIds));
  }
  try {
    write(buildShowcase(await fetchDiscussions(token, owner, name), knownIds));
  } catch (error) {
    console.warn(`showcase: ${error.message}`);
    write(await fetchPublished(knownIds));
  }
}

await main();
