// Builds web/showcase.json from the "Show and tell" Discussions category and web/likes.json from
// the reactions on the giscus comment threads ("Announcements") at deploy time.
// It never fails the deploy: when GitHub cannot be reached each file reuses its published copy
// (re-validated), and only falls back to [] / {} when that is unavailable too. It always exits 0.
// `run` takes its fetch, env, web dir and logger as arguments so tests can drive it offline.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SITE, buildLikes, buildShowcase, extractPaintingIds, reuseLikes, reuseShowcase } from "./showcase-lib.mjs";

const WEB = fileURLToPath(new URL("../web/", import.meta.url));
const SHOWCASE_CATEGORY = "show-and-tell";
const COMMENTS_CATEGORY = "announcements";
const PAGE = 100;
const MAX_PAGES = 5;
const TIMEOUT_MS = 15000;

function knownPaintingIds(webDir) {
  const dir = join(webDir, "paintings");
  const files = readdirSync(dir).filter((file) => file.endsWith(".js"));
  return new Set(files.flatMap((file) => extractPaintingIds(readFileSync(join(dir, file), "utf8"))));
}

// `ctx` carries the injected { fetch, log, webDir } through the helpers below.
async function graphql(ctx, token, query, variables) {
  const response = await ctx.fetch("https://api.github.com/graphql", {
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

async function fetchCategoryIds(ctx, token, owner, name) {
  const data = await graphql(ctx, token, CATEGORIES, { owner, name });
  return new Map((data.repository?.discussionCategories.nodes || []).map((c) => [c.slug, c.id]));
}

async function fetchDiscussions(ctx, token, owner, name, categoryIds, slug) {
  const category = categoryIds.get(slug);
  if (!category) throw new Error(`no Discussions category with slug "${slug}"`);
  const all = [];
  let after = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await graphql(ctx, token, DISCUSSIONS, { owner, name, category, after });
    const { nodes, pageInfo } = data.repository.discussions;
    all.push(...nodes);
    if (!pageInfo.hasNextPage) break;
    if (page === MAX_PAGES - 1) ctx.log.warn(`${slug}: stopped after ${MAX_PAGES * PAGE} discussions`);
    after = pageInfo.endCursor;
  }
  return all;
}

// The two outputs. Each one falls back on its own, so a failure of one never wipes the other.
const outputs = (env) => [
  {
    label: "showcase",
    file: "showcase.json",
    slug: SHOWCASE_CATEGORY,
    published: env.SHOWCASE_PUBLISHED_URL || `${SITE}showcase.json`,
    build: buildShowcase,
    reuse: reuseShowcase,
    empty: () => [],
    size: (entries) => `${entries.length} entries`,
  },
  {
    label: "likes",
    file: "likes.json",
    slug: COMMENTS_CATEGORY,
    published: env.LIKES_PUBLISHED_URL || `${SITE}likes.json`,
    build: buildLikes,
    reuse: reuseLikes,
    empty: () => ({}),
    size: (likes) => `${Object.keys(likes).length} paintings`,
  },
];

function write(ctx, output, data) {
  writeFileSync(join(ctx.webDir, output.file), `${JSON.stringify(data, null, 2)}\n`);
  ctx.log.log(`${output.label}: wrote ${output.size(data)} to web/${output.file}`);
}

async function fetchPublished(ctx, output, knownIds) {
  try {
    const response = await ctx.fetch(output.published, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`answered ${response.status}`);
    const data = output.reuse(await response.json(), knownIds);
    ctx.log.warn(`${output.label}: reusing ${output.size(data)} from ${output.published}`);
    return data;
  } catch (error) {
    ctx.log.warn(`${output.label}: published ${output.file} unavailable (${error.message}); writing an empty one`);
    return output.empty();
  }
}

async function buildOutput(ctx, output, fetchAll, knownIds) {
  try {
    write(ctx, output, output.build(await fetchAll(output.slug), knownIds));
  } catch (error) {
    ctx.log.warn(`${output.label}: ${error.message}`);
    write(ctx, output, await fetchPublished(ctx, output, knownIds));
  }
}

export async function run({ fetch = globalThis.fetch, env = process.env, webDir = WEB, log = console } = {}) {
  const ctx = { fetch, log, webDir };
  const token = env.GITHUB_TOKEN;
  const [owner, name] = (env.GITHUB_REPOSITORY || "brancan/tangle-machine").split("/");
  const knownIds = knownPaintingIds(webDir);
  // One categories lookup for both outputs; when it fails, every fetch fails with the same reason.
  let fetchAll;
  try {
    if (!token) throw new Error("GITHUB_TOKEN is not set");
    const categoryIds = await fetchCategoryIds(ctx, token, owner, name);
    fetchAll = (slug) => fetchDiscussions(ctx, token, owner, name, categoryIds, slug);
  } catch (error) {
    fetchAll = async () => {
      throw error;
    };
  }
  for (const output of outputs(env)) await buildOutput(ctx, output, fetchAll, knownIds);
}

// Run only when executed directly (`node scripts/build-showcase.mjs`), not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
