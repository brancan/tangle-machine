# Feature: art-history-paintings

## Objective
Add 12 paintings: five homages to historical generative/op art, four classic
tangles still missing, and three mathematical pieces (two may animate).

## Scope / constraints
- One file per painting in `web/paintings/`, following existing conventions:
  `id`, `title`, `description`, `tags` (vocabulary in `web/js/motion.js`),
  `instruction` (LeWitt-style text with `{param}`, `{param%}`, `{flag?a:b}`
  placeholders), `params`, `draw(p, pen)`; deterministic via `pen.random(seed)`.
- Animated paintings read `p.time` (0 when not playing) and carry the
  `animated` tag; the still frame at time 0 must look complete.
- Homages credit the artist and year in `description`; they are
  interpretations, not reproductions.
- `<script>` tags appended at the end of the painting list in `web/index.html`
  (showcase.html reads that list). Snapshots via `npm run test:update`.
- Do not touch `web/js/*`, `web/styles.css` or other paintings.
- Coordination: announced ids/files to zentangles-af and zentangles-7c.

## Tasks
- [x] T1 Homages: schotter (Nees), interruptions (Molnar), des-ordres (Molnar), wall-drawing (LeWitt), movement-in-squares (Riley) — route: delegated (writer)
- [x] T2 Classic tangles: printemps, crescent-moon, static, cadent — route: delegated (writer)
- [x] T3 Mathematical: harmonograph (animated), hilbert-curve, moire (animated) — route: delegated (writer)
- [x] T4 README painting list — route: delegated (writer), may ride with T3

- [x] T5 Modern masters: mondrian, kandinsky, suprematism, klimt-mosaic, great-wave, color-fields (style only, no Rothko), impossible-tiling (style only, no Escher) — route: delegated (writer)
- [x] T6 Old masters and patterns: bosch-garden, mandala, dynamism, scream-sky, impression-sunrise, babel-tower, metamorphosis-tiling (no Escher), woven-modules (no Albers) — route: delegated (writer)

Route evidence: 12 new non-trivial files → writer trigger.

## Delivery
Forecast ~700 authored lines (> 400). Strategy: one work-unit commit per
group on `feat/art-history-paintings`; each group fast-forwards to main only
with the user's approval.

## Checks
- `npm test` (existing suites cover registration, instruction placeholders,
  tags and snapshots for every painting in index.html).
- Headless Chrome screenshot of each new painting.

## Progress
- Branch `feat/art-history-paintings`, worktree `~/zentangles-worktrees/art-history-paintings`.
- Engram mirror: pending (server unavailable this session).

- T1 done in 5482de9: `npm test` 64/64 pass; snapshots only added 5 new keys;
  screenshots of all five checked (instruction placeholder bug in wall-drawing and
  too-sharp fold in movement-in-squares fixed before commit).
- T2 done in the T2 commit (`feat(web): add four classic tangles`): `npm test` 64/64
  pass; snapshots only added 4 new keys; screenshots checked (printemps coil loosened).
- Plotter constraints honored: pen.path uses only M L H V Q C A Z; no NaN.

- T3 + T4 done in the commit `feat(web): add three mathematical paintings`: `npm test`
  64/64 pass; snapshots only added 3 new keys; screenshots checked (harmonograph
  damping/detune rescaled so the instruction shows readable values; moire and
  wall-drawing instructions rewritten because placeholders cannot nest inside
  `{flag?a:b}`). harmonograph and moire are tagged animated and change with p.time.

- T5 done in the commit `feat(web): add seven paintings after modern masters`:
  `npm test` 64/64 pass; snapshots only added 7 new keys; screenshots checked
  (mondrian forced to split large cells and keep big planes white; great-wave
  reshaped so the curl reads; impossible-tiling got paper seams between tiles).
  No Rothko or Escher names anywhere; path strings checked for M L H V Q C A Z only.

- T6 done in the commit `feat(web): add eight paintings after old masters and patterns`:
  `npm test` 64/64 pass; snapshots only added 8 new keys; screenshots checked
  (bosch stems lengthened, dynamism group enlarged, scream bridge reoriented,
  impression marks given more color scatter). dynamism and scream-sky are tagged
  animated and change with p.time. showcase.html untouched (lists no paintings).
- Pre-existing, not touched: `florz.js` emits lowercase `h`/`v` path commands,
  which a strict M L H V Q C A Z plotter check would flag.

## Next step
User decides on fast-forwarding the group commits to main.
