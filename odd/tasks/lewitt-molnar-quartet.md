# Feature: lewitt-molnar-quartet

## Objective
Add four paintings that keep the LeWitt / Molnar balance: two Sol LeWitt wall
drawings and two Vera Molnar series, each an interpretation in our own words.

## Problem / why
The conceptual frame (docs/dossier.md) rests on LeWitt and Molnar, and the
Instagram plan needs new pieces (the "sun" #254 also anchors a future reel).

## Scope
- New files in `web/paintings/`, registered in `web/index.html`.
- Snapshots regenerated deliberately (`npm run test:update`).
- Painting counts in README/dossier updated if they state a number.
- Out of scope: the three reels (separate feature).

## Constraints
- Every painting: `tags` from web/js/motion.js vocabulary, `instruction` written
  in our own words (no quoting LeWitt's text), no param name shadowing shared
  params, plotter export < 3 s, description says "an interpretation, not the original".
- Colors stay on brand: ink plus one accent palette, via `color` params.

## Tasks
- [x] T1 Lines from the Center (after Wall Drawing #254): lines from the wall's center to random points — route: delegated (writer trigger: 4+ non-trivial files)
- [x] T2 Not-Straight Lines (after Wall Drawing #91): grid, each square holds not-straight lines with at least one of each of three colors — route: delegated
- [x] T3 Letters (after Molnar's Lettres de ma mère): rows of illegible handwriting-like strokes — route: delegated
- [ ] T4 M for Malevich (after Molnar): grid of schematic, rule-deformed letter M — route: delegated

## Checks
- `npm test` green; visual check of each painting.

## Delivery
- Strategy: ask-on-risk. Forecast ~300–400 authored lines (4 small files + index).

## Progress
- Branch `feat/lewitt-molnar-quartet` from main c2e1616.
- T1 done: c988a25 (`npm test` 112/112).
- T2 done: 832f5e2 (`npm test` 112/112).
