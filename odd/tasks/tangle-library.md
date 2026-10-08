# Feature: tangle-library

## Objective
Add eight classic tangles from the user's reference sheets (official tangle
names chart and a mixed tile sheet).

## Scope / constraints
- One self-contained painting per file; snapshots updated deliberately.
- Param names must not shadow shared style/hand params (enforced by tests).

## Tasks
- [x] T1 Tumbling Blocks, Hollibaugh, Huggins, Florz — route: inline
- [x] T2 Knitting, Keeko, Lightning Bolt, Rhombus Star — route: inline

## Checks
- `npm test` green; visual check of each painting in Chrome.

## Progress
- Branch `feat/tangle-library`. All 8 checked in Chrome; Lightning Bolt line count and Rhombus Star rings/shading tuned after the visual check. Coordinated with a parallel session adding 10 other paintings in a separate worktree (no id overlap; second to merge rebases and regenerates snapshots).
