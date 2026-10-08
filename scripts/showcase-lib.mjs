// Pure helpers that turn "Show and tell" Discussions into showcase.json entries and giscus
// comment threads into likes.json. No network here.
import { createHash } from "node:crypto";

export const SITE = "https://brancan.github.io/tangle-machine/";

const TITLE_MAX = 120;
const LINK_MAX = 8000;
const VALUE_MAX = 32;
const SAFE_KEY = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
const SAFE_VALUE = /^[#A-Za-z0-9._-]*$/;
const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_LOGIN = /^[A-Za-z0-9-]{1,39}$/;
const GITHUB_AVATAR = /^https:\/\/([a-z0-9-]+\.)*(githubusercontent\.com|github\.com)\//;
// The site prefix must be followed by "#/" (optionally via index.html), so look-alike hosts and paths fail.
const LINK = /https:\/\/brancan\.github\.io\/tangle-machine\/(?:index\.html)?#\/[^\s<>()[\]"'`]*/;

function labelNames(labels) {
  const list = Array.isArray(labels) ? labels : labels?.nodes || [];
  return list.map((label) => String(label?.name || "").toLowerCase());
}

function capTitle(title) {
  const text = String(title || "").replace(/\s+/g, " ").trim() || "Untitled";
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text;
}

function author(raw) {
  const login = SAFE_LOGIN.test(raw?.login || "") ? raw.login : "ghost";
  const avatarUrl = login !== "ghost" && GITHUB_AVATAR.test(raw?.avatarUrl || "") ? raw.avatarUrl : "";
  return { login, avatarUrl };
}

// Splits "<SITE>#/<id>?<query>" into the painting id, safe params and whether it carries code.
function parseLink(link, knownIds) {
  const [id, query = ""] = link.slice(link.indexOf("#/") + 2).split("?");
  if (!SAFE_ID.test(id) || !knownIds.has(id)) return null;
  const params = {};
  let hasCode = false;
  // The code payload is only flagged, never decoded: the studio's "Run shared code" gate handles it.
  for (const [key, value] of new URLSearchParams(query)) {
    if (key === "code") hasCode ||= value !== "";
    else if (SAFE_KEY.test(key) && value.length <= VALUE_MAX && SAFE_VALUE.test(value)) params[key] = value;
  }
  return { paintingId: id, params, hasCode };
}

// One Discussion (GraphQL shape) -> showcase entry, or null when it must not be shown.
export function parseShowcaseEntry(discussion, knownIds) {
  if (!discussion || discussion.locked) return null;
  if (labelNames(discussion.labels).includes("hidden")) return null;
  if (!Number.isInteger(discussion.number) || discussion.number < 1) return null;
  const url = String(discussion.url || "");
  if (!url.startsWith("https://github.com/")) return null;
  const createdAt = String(discussion.createdAt || "");
  if (Number.isNaN(Date.parse(createdAt))) return null;

  const link = String(discussion.body || "").match(LINK)?.[0];
  if (!link || link.length > LINK_MAX) return null;
  const parsed = parseLink(link, knownIds);
  if (!parsed) return null;

  return {
    number: discussion.number,
    url,
    title: capTitle(discussion.title),
    author: author(discussion.author),
    createdAt,
    likes: countLikes(discussion.reactionGroups),
    ...parsed,
    link,
  };
}

// All discussions -> valid entries, one per discussion number, newest first.
export function buildShowcase(discussions, knownIds) {
  const byNumber = new Map();
  for (const discussion of discussions) {
    const entry = parseShowcaseEntry(discussion, knownIds);
    if (entry && !byNumber.has(entry.number)) byNumber.set(entry.number, entry);
  }
  return [...byNumber.values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.number - a.number
  );
}

// A previously published showcase.json -> entries that still pass validation.
// Used when GitHub cannot be reached, so a transient failure keeps the gallery instead of wiping it.
export function reuseShowcase(previous, knownIds) {
  if (!Array.isArray(previous)) return [];
  const discussions = previous
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      ...entry,
      body: entry.link,
      locked: false,
      labels: { nodes: [] },
      reactionGroups: isCount(entry.likes) ? [{ content: "HEART", reactors: { totalCount: entry.likes } }] : [],
    }));
  return buildShowcase(discussions, knownIds);
}

// ---------- Likes (GitHub reactions) ----------

// Reactions that read as "I like it"; thumbs down, confused, laugh and eyes do not count.
const POSITIVE = new Set(["THUMBS_UP", "HEART", "HOORAY", "ROCKET"]);
const isCount = (value) => Number.isInteger(value) && value >= 0;
const isDiscussionUrl = (url) => typeof url === "string" && url.startsWith("https://github.com/");

// GraphQL `reactionGroups { content reactors { totalCount } }` -> number of positive reactions.
export function countLikes(groups) {
  if (!Array.isArray(groups)) return 0;
  let total = 0;
  for (const group of groups) {
    const count = group?.reactors?.totalCount;
    if (POSITIVE.has(group?.content) && isCount(count)) total += count;
  }
  return total;
}

const sha1 = (text) => createHash("sha1").update(text).digest("hex");
const TERM = /(?:^|[^A-Za-z0-9:_-])painting:([a-z0-9][a-z0-9-]{0,63})(?![A-Za-z0-9_-])/g;

// Which painting a giscus thread belongs to. giscus ("specific" mapping) titles the Discussion with
// the term and appends "<!-- sha1: <digest(term)> -->" to its body, so the exact title wins, then
// that hash (the title was edited), then the term as a whole token in the body.
function threadPainting(thread, knownIds, idByHash) {
  const title = String(thread.title || "").trim();
  if (title.startsWith("painting:") && knownIds.has(title.slice(9))) return title.slice(9);
  const body = String(thread.body || "");
  for (const match of body.matchAll(/<!--\s*sha1:\s*([0-9a-f]{40})\s*-->/g)) {
    if (idByHash.has(match[1])) return idByHash.get(match[1]);
  }
  for (const match of body.matchAll(TERM)) {
    if (knownIds.has(match[1])) return match[1];
  }
  return null;
}

// Comment threads -> { <painting id>: { likes, url } }. With two threads for one painting, the
// one with more likes wins.
export function buildLikes(threads, knownIds) {
  const likes = {};
  if (!Array.isArray(threads)) return likes;
  const idByHash = new Map([...knownIds].map((id) => [sha1(`painting:${id}`), id]));
  for (const thread of threads) {
    if (!thread || typeof thread !== "object" || !isDiscussionUrl(thread.url)) continue;
    const id = threadPainting(thread, knownIds, idByHash);
    if (!id) continue;
    const count = countLikes(thread.reactionGroups);
    if (!likes[id] || count > likes[id].likes) likes[id] = { likes: count, url: thread.url };
  }
  return likes;
}

// A previously published likes.json -> the entries that still pass validation.
export function reuseLikes(previous, knownIds) {
  const likes = {};
  if (!previous || typeof previous !== "object" || Array.isArray(previous)) return likes;
  for (const id of knownIds) {
    if (!Object.hasOwn(previous, id)) continue;
    const entry = previous[id];
    if (isCount(entry?.likes) && isDiscussionUrl(entry?.url)) likes[id] = { likes: entry.likes, url: entry.url };
  }
  return likes;
}

// Painting ids declared in a painting script: Gallery.register({ id: "..." }).
export function extractPaintingIds(source) {
  return [...source.matchAll(/Gallery\.register\(\s*\{\s*id:\s*["']([a-z0-9-]+)["']/g)].map((m) => m[1]);
}
