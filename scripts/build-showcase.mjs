// Builds web/showcase.json from the "Gallery" Discussions category at deploy time.
// It never fails the deploy: without a token, a category or the network it writes [] and exits 0.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildShowcase, extractPaintingIds } from "./showcase-lib.mjs";

const WEB = new URL("../web/", import.meta.url).pathname;
const OUT = join(WEB, "showcase.json");
const CATEGORY = "gallery";
const PAGE = 100;
const MAX_PAGES = 5;

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
    after = pageInfo.endCursor;
  }
  return all;
}

function write(entries) {
  writeFileSync(OUT, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`showcase: wrote ${entries.length} entries to web/showcase.json`);
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const [owner, name] = (process.env.GITHUB_REPOSITORY || "brancan/tangle-machine").split("/");
  if (!token) {
    console.warn("showcase: GITHUB_TOKEN is not set, writing an empty gallery");
    return write([]);
  }
  try {
    write(buildShowcase(await fetchDiscussions(token, owner, name), knownPaintingIds()));
  } catch (error) {
    console.warn(`showcase: ${error.message}; writing an empty gallery`);
    write([]);
  }
}

await main();
