# Feature: reference-paintings-2

## Objective
Add ten new paintings inspired by the second batch of user reference photos.

## Scope / constraints
- Worktree `~/zentangles-worktrees/reference-paintings-2`, branch `feat/reference-paintings-2`.
- Another session (zentangles-af) works on `main`: only new files under `web/paintings/`;
  shared files (`web/index.html`, `tests/snapshots.json`, `README.md`) appended at the end, rebased before merge.
- Same pen API and param conventions as existing paintings; no new dependencies.

## Tasks
- [x] T1 Line paintings: shaded-ribbons (photo 1), hatched-pinwheel (2), warped-grid (12), pebble-cells (14) — route: delegated (writer trigger: 4 new files)
  - Evidence: headless Chrome renders inspected; `npm test` 16/16 pass; extreme-param stress shows no NaN/Infinity.
- [x] T2 Pattern paintings: arc-scales (3), radial-sampler (9), pattern-peaks (15), pattern-hills (11) — route: delegated
  - Evidence: headless Chrome renders inspected (hills in color and b/w); `npm test` 16/16 pass; stress over extremes clean, hidden motifs culled to keep SVG small.
- [x] T3 Op-art paintings: rainbow-petals (10/11), ribbon-arcs (13) — route: delegated
  - Evidence: headless Chrome renders inspected; `npm test` 16/16 pass; stress over extremes clean.
- [x] T4 Register in index.html, README, snapshots — route: delegated (same writer)
  - Evidence: scripts appended after tube-network in brief order; README list updated; snapshots regenerated with each group; `instruction` added to all ten (main's new requirement).

## Checks
- `npm test` green with new snapshots.
- Headless render of each default painting inspected visually.

## Progress
- Worktree created from main 2d2f4d0.
