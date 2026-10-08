# Feature: share-tests-palettes

## Objective
Act on the improvement review: share edited code in links, test the web
gallery, speed up the gallery page, add color palettes, add the two pending
paintings, and remove the Python CLI.

## Scope / constraints
- Static site stays build-free; tests use Node's built-in runner (no deps).
- Code in links never runs without the visitor's explicit confirmation.
- Snapshot tests store SVG hashes, not full SVGs.

## Tasks
- [x] T1 Remove Python CLI, tests and examples; README without Python — route: inline
- [x] T2 Node test suite (snapshots of all paintings, param-name collisions, URL helpers) + CI workflow — route: inline
- [x] T3 Edited code in share links (compressed, confirm-before-run) — route: inline
- [x] T4 Lazy gallery thumbnails (IntersectionObserver) + CodeMirror loaded only in the studio — route: inline. Measured in Chrome: DOMContentLoaded 551 ms -> 97 ms; the CDN editor (~400 ms per file) was the real bottleneck, thumbnails cost ~200 ms for all 19.
- [x] T5 Color palettes: Polar Checker, Quarter Arcs, Truchet Tiles, Scales — route: inline
- [x] T6 New paintings: Star Checker (photo 12), Tube Network (photo 17) — route: inline

Route note: inline; parent holds the full gallery API context from previous features.

## Checks
- `npm test` (node --test) green; snapshots updated deliberately when visuals change.
- Chrome headless screenshots for UI changes.

## Progress
- Branch `feat/share-tests-palettes`. T1-T3 reviewed (4 lenses, approved, boundary ae56591).
