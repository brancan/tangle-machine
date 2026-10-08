# Feature: gallery-comments

## Objective
Let visitors comment on paintings and publish their variants to a public
gallery, without running our own backend or login system.

## Decision
GitHub-only (user choice, 2026-10-07): comments via Giscus (GitHub
Discussions); a "Publish to gallery" button opens a prefilled Discussion in a
`Gallery` category with the share link; the Pages workflow builds
`showcase.json` from that category at deploy time. Login = GitHub account,
moderation = editing/deleting Discussions.

## Scope / constraints
- Static site, no build step for the browser; no new runtime dependencies.
- Do NOT touch `web/js/gallery.js` or the `Gallery` global (core renderer).
- New names: `web/showcase.html`, `web/js/showcase.js`, `web/js/comments.js`,
  `scripts/build-showcase.mjs`.
- Shared code in gallery entries must keep the existing "Run shared code"
  gate: the showcase never executes `code=` payloads; thumbnails use the
  original painting with the link's params only.
- Only links to `https://brancan.github.io/tangle-machine/` are accepted.
- Giscus repo/category IDs are config constants; filled after the user enables
  Discussions, creates the `Gallery` category and installs the giscus app.
- UI text names the project "Tangle Machine".
- Coordination: zentangles-af (feat/instructions) owns `.studio-head` and the
  header About link; zentangles-7c (feat/studio-tools) owns studio controls,
  app.js, share.js, styles.css. Second to merge rebases and runs
  `npm run test:update && npm test`.

## Tasks
- [x] T1 Pure parser `scripts/showcase-lib.mjs`: Discussion → showcase entry (validate URL, extract painting id/params, drop unknown hosts) + tests — route: delegated (writer)
- [x] T2 Build script `scripts/build-showcase.mjs` (GraphQL with GITHUB_TOKEN → `web/showcase.json`) and pages.yml triggers (discussion events, schedule) — route: delegated (writer)
- [x] T3 `web/showcase.html` + `web/js/showcase.js`: cards with thumbnails, author, link, empty state — route: delegated (writer)
- [x] T4 Comments section below the studio (`web/js/comments.js`, Giscus per painting id) + "Publish to gallery" button; header "Gallery" link — route: delegated (writer)
- [x] T5 README + About/dossier mention, setup steps for Discussions/giscus — route: delegated (writer)

Route evidence: 5+ new non-trivial files across scripts/, web/, workflow → writer trigger.

## Checks
- `npm test` (new `tests/showcase.test.mjs` RED → GREEN for T1).
- Headless render of showcase.html with a fixture `showcase.json`.

## Progress
- Branch `feat/gallery-comments`, worktree `~/zentangles-worktrees/gallery-comments`.
- T1+T2 `ddbf0aa` feat(showcase): parse gallery discussions and build showcase.json at deploy
  (also adds `web/js/publish-link.js`, a pure tested builder for the publish URL, and placeholder `web/showcase.json` = `[]`).
- T3 `c5f967a` feat(showcase): add public gallery page rendering published variants
- T4 `f774036` feat(web): add per-painting comments and publish-to-gallery button
- T5 docs commit (README "Public gallery and comments", dossier Phase 6, this file) — see `git log`.

## Verification evidence
- RED: `npm test` with only `tests/showcase.test.mjs` written → that file failed (module `scripts/showcase-lib.mjs` missing); 16/17 files passed.
- GREEN: `npm test` → 33 tests, 33 pass, 0 fail (after T4).
- `node scripts/build-showcase.mjs` without GITHUB_TOKEN → warns, writes `[]`, exit 0; with a stubbed 401 fetch → warns, writes `[]`, exit 0.
- Headless Chrome (`google-chrome --headless=new`) against `python3 -m http.server -d web`:
  fixture with 2 entries renders 2 cards with SVG thumbnails, a "custom code" badge, and an HTML-injection title shown as text;
  empty list → empty-state text; non-array JSON → error-state text. Studio `#/ripples` shows the comments panel with
  "Comments are not configured yet."; gallery view hides it. `web/showcase.json` restored to `[]`.
- Not verified live: giscus iframe and GitHub GraphQL (need the owner setup below and a deploy).

## Review
- Native review (risk high, granted): 4 lenses, approved, acknowledged (lineage review-07efbecd1a4e7fcc).
- Non-blocking follow-ups: duplicated painting list in showcase.html; build script network path untested.
- Fixed (user-approved follow-up): transient API failure now reuses the published showcase.json via `reuseShowcase` (re-validated), fetches time out after 15 s, truncation warns. RED: missing export; GREEN: `npm test` 35/35; e2e: 401 + local published fixture → reused 2 entries, exit 0; unreachable published URL → `[]`, exit 0. Route: inline (3 files, understood).
- Engram mirror: pending (server unavailable).

## Next step
Owner setup (README "One-time setup"): enable Discussions, create *Gallery* (slug `gallery`, open-ended) and *Comments*
(announcement) categories, install the giscus app, paste repoId/categoryId into `GISCUS_CONFIG` in `web/js/comments.js`.
Then merge; the second branch to merge rebases and runs `npm run test:update && npm test`.
