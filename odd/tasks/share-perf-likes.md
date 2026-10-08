# Feature: share-perf-likes

## Objective
Make shared links look good on social apps, check the home page speed with 69
thumbnails, and add likes to paintings and gallery variants.

## Decisions
- Likes = GitHub reactions (consistent with the GitHub-only choice of
  gallery-comments): no anonymous likes, which would need a counting backend;
  browser-only counters would be fake.
- Per painting: reactions on the giscus thread (`painting:<id>` in
  Announcements; `reactionsEnabled` is already on). Per gallery variant:
  reactions on its Show and tell Discussion.
- Counts are built at deploy time (same Pages workflow, same never-fail rule)
  into `web/likes.json` and `showcase.json`.

## Scope / constraints
- Static site, no new runtime dependencies; build keeps exit 0 and reuses the
  published data on transient failures (like `reuseShowcase`).
- Open Graph image must use an absolute https URL.
- Thumbnails are already lazy (IntersectionObserver in app.js); perf work only
  if measurement shows a real problem.

## Tasks
- [x] T1 Open Graph / Twitter meta on index, showcase, about + `web/og-image.png` (1200x630) — route: delegated (writer). Done in `1dec1fd`: meta + canonical on 3 pages, `scripts/og-image.mjs` (headless Chrome, 229 KB, 3x2 grid + title), `tests/og.test.mjs`; npm test 80/80.
- [x] T2 Measure home load (desktop + mobile emulation, 69 thumbnails); fix only if needed — route: delegated (writer). No code change needed.
  Measured via DevTools protocol (headless Chrome 154, local http.server, cache disabled, 69 cards):
  desktop 1280x800 no throttle: FCP 36–88 ms, DCL 88–145 ms, load 101–162 ms, 8 visible thumbnails drawn at 152–222 ms, no long tasks;
  desktop 4x CPU: FCP 116–160, load 259–434, visible thumbs 398–527 ms, long tasks max 181 ms;
  mobile 390x844 4x CPU: FCP 92–116, load 207–262, visible thumbs 210–265 ms, long tasks max 52 ms. All well under 1 s.
- [x] T3 Likes build: reaction counts per painting thread → `web/likes.json`; per variant → `likes` in showcase entries; tests — route: delegated (writer). RED tests in wip `595c110`, GREEN in `e3f104a`.
  `scripts/showcase-lib.mjs`: `countLikes` (positive = THUMBS_UP/HEART/HOORAY/ROCKET), `buildLikes` (exact title `painting:<id>`, then giscus `<!-- sha1 -->`, then the term as a whole body token; more likes wins), `reuseLikes`; `likes` in `parseShowcaseEntry`/`reuseShowcase`.
  `scripts/build-showcase.mjs`: one categories lookup, `reactionGroups` in the query, `show-and-tell` → showcase.json and `announcements` → likes.json, each with its own fallback (published copy via `SHOWCASE_PUBLISHED_URL`/`LIKES_PUBLISHED_URL`, then `[]`/`{}`), exit 0. Workflow unchanged.
  Evidence: npm test 91/91; no token + unreachable published → exit 0, `[]` and `{}`; local fixture published likes → 1 valid entry reused, 2 tampered dropped; real API (read-only) → exit 0, 0 entries / 0 paintings (repo has only the "Welcome" Announcements discussion).
- [x] T4 Likes UI: count on home cards / studio and on showcase cards, linking to GitHub to react — route: delegated (writer). Done in `dd2afd5`: app.js loads likes.json once (no-cache, silent failure), `♥ N` on cards with likes > 0, `window.Likes.get` + `likes-loaded` event; comments.js adds the `♥ N` link (title "Like it on GitHub") in the Comments heading and the reaction hint; showcase.js `♥ N` link per card; CSS appended to styles.css/showcase.css.
  Evidence: headless Chrome screenshots with fixtures (home, studio of `paradox`, showcase) show the counts; placeholders restored. Showcase thumbnails are blank in headless `--screenshot` both before and after this change (lazy IntersectionObserver under virtual time), not a regression.
- [x] T5 README — route: delegated (writer). Rode with T4 in `dd2afd5`: likes (which reactions count, refresh on deploy, fallback), share previews (`node scripts/og-image.mjs`), perf numbers; Brand section untouched.

Route evidence: 6+ non-trivial files across web/, scripts/, tests → writer trigger.

## Checks
- `npm test` (test-first for the likes parser/merge).
- Headless Chrome: page renders, OG tags present; timing numbers recorded.

## Progress
- Branch `feat/share-perf-likes`, worktree `~/zentangles-worktrees/share-perf-likes`.
- Engram mirror: pending (server unavailable this session).

## Next step
Parent: native review of the slice (wip..dd2afd5), then push/PR is the user's decision. After deploy, react on a painting thread and check likes.json on the next scheduled build.
