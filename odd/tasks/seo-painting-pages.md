# Feature: seo-painting-pages

## Objective
Make the 69 paintings indexable and the site well described to search engines.

## Problem (audit 2026-10-08)
- Paintings live only behind hash routes (`#/<id>`); Google ignores fragments,
  so the site exposes 3 pages. Home raw HTML: 142 words, no links to paintings.
- No sitemap.xml; robots.txt 404 (it would live at the brancan.github.io
  root, another repo, so we cannot add it — compensate with Search Console).
- Home has no meaningful H1 in gallery view; no favicon; no structured data;
  home title "Tangle Machine" says nothing about the content.

## Decisions
- One static page per painting, generated at deploy time (not committed, to
  avoid churn and cross-session conflicts): `web/p/<id>.html` with title,
  description, instruction filled with default values, inline SVG of the
  default render, credit for homages, "Open in studio" → `../index.html#/<id>`,
  prev/next links, JSON-LD `VisualArtwork`.
- Home gets a static, visible index of all paintings (links to `p/<id>.html`)
  injected at deploy between markers; locally the markers hold a fallback.
- `sitemap.xml` (home, about, showcase, 69 painting pages; lastmod from git)
  and `llms.txt` generated at deploy.
- Favicon: `web/favicon.svg` in the brand palette (#121212 ground, #b6f23a
  accent, see brand/), linked from all pages (painting pages too).
- Search Console verification is an owner action (meta tag or HTML file).

## Scope / constraints
- No new runtime dependencies; build script uses Node built-ins and
  tests/load-gallery.mjs-style loading; never fails the deploy silently wrong:
  if generation fails, the workflow should fail loudly (pages are core now),
  unlike showcase which degrades.
- Do not edit paintings, snapshots, gallery.js; app.js only if the H1 needs it.
- Escape all text into HTML; JSON-LD via JSON.stringify with `<` escaped.

## Tasks
- [x] T1 Pure page/sitemap/llms generators + tests (test-first) — route: delegated (writer) — d8f5117. RED observed (pages-lib missing), GREEN 10/10; loader shared as scripts/load-gallery.mjs (tests re-export).
- [x] T2 Build script + pages.yml step + .gitignore; home index markers — route: delegated (writer) — 10d36a6. Build: 69 pages (5.8 MB, largest ripples 410 KB), 72 sitemap urls, all JSON-LD parse; fetch-depth 0.
- [x] T3 Home H1 + improved title/description + WebSite JSON-LD; favicon on all pages — route: delegated (writer) — 74673e6. Also app.js gallery document.title aligned with the new title.
- [x] T4 README (SEO section, Search Console steps) — route: delegated (writer) — 6f36965.

Route evidence: 6+ non-trivial files → writer trigger.

## Checks
- `npm test`; generated pages validated (one per painting, canonical, JSON-LD parses, no unescaped user text).
- Headless Chrome screenshot of a painting page and the home index.

## Progress
- Branch `feat/seo-painting-pages`, worktree `~/zentangles-worktrees/seo-painting-pages`.
- Engram mirror: pending (server unavailable).

## Verification
- `npm test`: 106/106 pass (94 before; +10 pages, +2 og/home).
- Headless Chrome screenshots (scratchpad/seo): p/schotter.html, p/harmonograph.html, home top (h1) and bottom (4-column index), favicon at 256/64/32/16 px.
- Native review: not run by the writer (RDD is the parent's call).

## Next step
Owner: Search Console verification token, then submit sitemap.xml. Parent: review and PR.
