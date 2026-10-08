// Builds web/showcase.json from the "Show and tell" Discussions category and web/likes.json from
// the reactions on the giscus comment threads ("Announcements") at deploy time.
// It never fails the deploy: when GitHub cannot be reached each file reuses its published copy
// (re-validated), and only falls back to [] / {} when that is unavailable too. It always exits 0.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SITE, buildLikes, buildShowcase, extractPaintingIds, reuseLikes, reuseShowcase } from "./showcase-lib.mjs";

const WEB = new URL("../web/", import.meta.url).pathname;
const SHOWCASE_CATEGORY = "show-and-tell";
const COMMENTS_CATEGORY = "announcements";
const PAGE = 100;
const MAX_PAGES = 5;
const TIMEOUT_MS = 15000;

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
        reactionGroups { content reactors { totalCount } }
      }
    }
  }
}`;

async function fetchCategoryIds(token, owner, name) {
  const data = await graphql(token, CATEGORIES, { owner, name });
  return new Map((data.repository?.discussionCategories.nodes || []).map((c) => [c.slug, c.id]));
}

async function fetchDiscussions(token, owner, name, categoryIds, slug) {
  const category = categoryIds.get(slug);
  if (!category) throw new Error(`no Discussions category with slug "${slug}"`);
  const all = [];
  let after = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await graphql(token, DISCUSSIONS, { owner, name, category, after });
    const { nodes, pageInfo } = data.repository.discussions;
    all.push(...nodes);
    if (!pageInfo.hasNextPage) break;
    if (page === MAX_PAGES - 1) console.warn(`${slug}: stopped after ${MAX_PAGES * PAGE} discussions`);
    after = pageInfo.endCursor;
  }
  return all;
}

// The two outputs. Each one falls back on its own, so a failure of one never wipes the other.
const OUTPUTS = [
  {
    label: "showcase",
    file: "showcase.json",
    slug: SHOWCASE_CATEGORY,
    published: process.env.SHOWCASE_PUBLISHED_URL || `${SITE}showcase.json`,
    build: buildShowcase,
    reuse: reuseShowcase,
    empty: () => [],
    size: (entries) => `${entries.length} entries`,
  },
  {
    label: "likes",
    file: "likes.json",
    slug: COMMENTS_CATEGORY,
    published: process.env.LIKES_PUBLISHED_URL || `${SITE}likes.json`,
    build: buildLikes,
    reuse: reuseLikes,
    empty: () => ({}),
    size: (likes) => `${Object.keys(likes).length} paintings`,
  },
];

function write(output, data) {
  writeFileSync(join(WEB, output.file), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${output.label}: wrote ${output.size(data)} to web/${output.file}`);
}

async function fetchPublished(output, knownIds) {
  try {
    const response = await fetch(output.published, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`answered ${response.status}`);
    const data = output.reuse(await response.json(), knownIds);
    console.warn(`${output.label}: reusing ${output.size(data)} from ${output.published}`);
    return data;
  } catch (error) {
    console.warn(`${output.label}: published ${output.file} unavailable (${error.message}); writing an empty one`);
    return output.empty();
  }
}

async function buildOutput(output, fetchAll, knownIds) {
  try {
    write(output, output.build(await fetchAll(output.slug), knownIds));
  } catch (error) {
    console.warn(`${output.label}: ${error.message}`);
    write(output, await fetchPublished(output, knownIds));
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const [owner, name] = (process.env.GITHUB_REPOSITORY || "brancan/tangle-machine").split("/");
  const knownIds = knownPaintingIds();
  // One categories lookup for both outputs; when it fails, every fetch fails with the same reason.
  let fetchAll;
  try {
    if (!token) throw new Error("GITHUB_TOKEN is not set");
    const categoryIds = await fetchCategoryIds(token, owner, name);
    fetchAll = (slug) => fetchDiscussions(token, owner, name, categoryIds, slug);
  } catch (error) {
    fetchAll = async () => {
      throw error;
    };
  }
  for (const output of OUTPUTS) await buildOutput(output, fetchAll, knownIds);
}

await main();
