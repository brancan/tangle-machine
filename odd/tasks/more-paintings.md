# Feature: more-paintings

## Objective
Grow the web gallery from 1 to 11 paintings, using the user's ideas (paradox in
a circle, tessellations, honeycomb paradox, spider web) and reference photos in
`bandeja/`.

## Scope / constraints
- Each painting stays a self-contained `draw(p, pen)` so it remains editable.
- Pen API grows: optional per-shape style (`fill`, `stroke`, `width`), `arc`,
  seeded `random`. Paintings may override default ink/paper/stroke width.
- `bandeja/` (reference photos) is not committed.

## Tasks
- [x] T1 Pen API: per-shape style, `arc`, `random(seed)`, per-painting style defaults — route: inline
- [x] T2 Paradox family: Paradox Circle, Triangle Paradox, Honeycomb Paradox — route: inline
- [x] T3 Pattern tiles: Spider Web, Truchet Tiles, Scales, String Art — route: inline
- [x] T4 Op-art: Bulge Checker, Polar Checker, Op Waves — route: inline
- [x] T5 README update

Route note: inline because the parent already holds the full design context of
the gallery API; each painting is an isolated file.

## Checks
- Headless Chrome screenshot of every painting at default params (montage review).
- Python unit tests unchanged.

## Progress
- Branch `feat/more-paintings`.
