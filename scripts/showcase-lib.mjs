// Pure helpers that turn "Gallery" Discussions into showcase.json entries. No network here.

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

// Painting ids declared in a painting script: Gallery.register({ id: "..." }).
export function extractPaintingIds(source) {
  return [...source.matchAll(/Gallery\.register\(\s*\{\s*id:\s*["']([a-z0-9-]+)["']/g)].map((m) => m[1]);
}
