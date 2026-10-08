# Feature: polish-and-seed

## Objective
Polish three paintings that looked weak at review time, then prepare a
curated set of variants to open the public gallery.

## Scope / constraints
- Edit only `web/paintings/crescent-moon.js`, `mandala.js`, `suprematism.js`
  and their keys in `tests/snapshots.json` (existing snapshot keys of other
  paintings must not change).
- Keep ids, param names and instruction placeholders valid; plotter rules
  (path commands M L H V Q C A Z, no NaN, export < 3 s).
- Gallery seeding: the user publishes from their own GitHub account; we only
  prepare share links and verify the build picks them up.

## Tasks
- [x] T1 crescent-moon: remove the seams along the corner diagonals — route: delegated (writer) — commit 7527e52; corners now hold one shared quarter moon, side moons never overlap, each aura is one closed loop meeting exactly on the diagonals (no clipping); snapshot key `crescent-moon` only
- [x] T2 mandala: fill the rings so the default looks dense and varied — route: delegated (writer) — commit 53f109e; center rosette, 8 motifs, wide outer rings repeat motifs (multiple of N cells), double-line/bead edges; worst case ~4.2k shapes; snapshot key `mandala` only
- [x] T3 suprematism: spread shapes so the composition is less clustered — route: delegated (writer) — commit `fix(web): spread the suprematist composition` (the one carrying this update); large/mid/small tiers, best-of-40 placement along the diagonal minimizing overlap, shapes kept on the sheet, sizes shrink with the shape count; snapshot key `suprematism` only
- [ ] T4 Curate 6 variant share links for the first gallery posts — route: inline (parent)
- [ ] T5 Verify the posts appear in showcase.json after the user publishes — route: inline (parent)

Route evidence: 3 non-trivial painting edits → writer trigger.

## Checks
- `npm test`; snapshot diff limited to the three ids.
- Headless Chrome screenshots before/after.

## Progress
- Branch `feat/polish-and-seed`, worktree `~/zentangles-worktrees/polish-and-seed`.
- Engram mirror: pending (server unavailable this session).

Evidence T1–T3: before/after headless Chrome screenshots (default plus one
non-default variant each) inspected; `npm test` 64/64 pass after each
`npm run test:update`; snapshot diffs limited to the three ids.
Instructions of crescent-moon, mandala and suprematism were reworded; every
placeholder still names an existing param.

## Next step
T4.
