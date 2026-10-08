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
- [ ] T3 Likes build: reaction counts per painting thread → `web/likes.json`; per variant → `likes` in showcase entries; tests — route: delegated (writer). PARTIAL (wip commit):
  RED tests written in `tests/likes.test.mjs` (fail: `buildLikes`/`countLikes`/`reuseLikes` not exported yet); placeholder `web/likes.json` = `{}` added.
  Left: implement in `scripts/showcase-lib.mjs` (countLikes over `reactionGroups { content reactors { totalCount } }`, positive = THUMBS_UP/HEART/HOORAY/ROCKET; `likes` in parseShowcaseEntry; reuseShowcase maps `likes` back; buildLikes matching title `painting:<id>`, or body `<!-- sha1: sha1("painting:<id>") -->`, or the term as a whole token in body; reuseLikes), then extend build-showcase.mjs (reactionGroups in DISCUSSIONS, Announcements slug `announcements` query, write likes.json with same never-fail fallback to published likes.json).
  Verified: giscus `pages/api/discussions/index.ts` creates the discussion with title = term and appends `<!-- sha1: <digest(title)> -->` to the body.
- [ ] T4 Likes UI: count on home cards / studio and on showcase cards, linking to GitHub to react — route: delegated (writer)
- [ ] T5 README — route: delegated (writer)

Route evidence: 6+ non-trivial files across web/, scripts/, tests → writer trigger.

## Checks
- `npm test` (test-first for the likes parser/merge).
- Headless Chrome: page renders, OG tags present; timing numbers recorded.

## Progress
- Branch `feat/share-perf-likes`, worktree `~/zentangles-worktrees/share-perf-likes`.
- Engram mirror: pending (server unavailable this session).

## Next step
T3: make `tests/likes.test.mjs` GREEN (npm test currently fails only there), then T4 UI and T5 README (keep README edits in the comments section; main gained a Brand section — parent rebases).
