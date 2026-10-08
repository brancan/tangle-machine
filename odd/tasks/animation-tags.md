# Feature: animation-tags

## Objective
Dossier phase 3: animation in the studio and tag filters in the gallery.

## Tasks
- [x] T1 `web/js/motion.js` (tag vocabulary, oscillate, filterByTag), test-first — route: inline
- [x] T2 Tags on all 29 paintings; `p.time` in Vortex, Op Waves, Polar Checker (identical at time 0) — route: inline
- [x] T3 Player (Play/Pause/Space, animate variable, speed) and gallery tag filters — route: inline
- [x] T4 README and dossier

## Checks
- `npm test` 62 pass; RED observed (4 failing) before motion.js. A test asserts that only paintings tagged `animated` change with time; snapshots prove time 0 is unchanged.
- Chrome (CDP): filters + URL, Vortex time animation, Space pause, Paradox variable animation with slider/instruction sync, pause on navigation, no JS errors.

## Progress
- Branch `feat/animation-tags`, built on main b157ae3 (includes zentangles-7c's studio tools).
