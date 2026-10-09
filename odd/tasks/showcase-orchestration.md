# Feature: showcase-orchestration

## Objective
Cover the network path of the showcase/likes build with tests, and refresh
likes more often.

## Problem / why
- `scripts/build-showcase.mjs` (GraphQL fetch, fallback to the published copy,
  empty output) has no tests; only the pure `showcase-lib.mjs` is tested. A
  regression there could publish an empty gallery or fail the deploy.
- GitHub Actions has no event for reactions, so a new like waits up to six
  hours (the cron) unless a Discussion event or push triggers a deploy.

## Scope / constraints
- Allowed: `scripts/build-showcase.mjs`, new `tests/build-showcase.test.mjs`,
  `.github/workflows/pages.yml`, `README.md`, this document.
- No dependencies (Node's built-in test runner); no real network in tests.
- Behavior of the build must not change: the deploy always succeeds, fallback
  order stays live → published copy (re-validated) → empty.

## Tasks
- [x] T1 Make the orchestration injectable (fetch, env, output dir, logger) and
  test it: success writes both files; GraphQL error, HTTP error and missing
  token fall back to the published copy; unreachable published copy writes
  `[]` / `{}`; pagination stops at the page cap — route: delegated (writer);
  trigger: 2 non-trivial files (script + new test)
- [x] T2 Run the Pages workflow hourly instead of every six hours and update the
  README — route: inline (parent); mechanical cron + text change

## Acceptance criteria
- `npm test` green, new tests fail if the fallback order breaks.
- `node scripts/build-showcase.mjs` still runs as a script with the same output.

## Checks
- `npm test`
- `node scripts/build-showcase.mjs` without `GITHUB_TOKEN` (falls back to the
  published copy), then `git checkout web/showcase.json web/likes.json`.

## Delivery
Forecast ~250 authored lines; strategy `ask-on-risk`, single PR/merge.

## Progress
- Branch `test/showcase-orchestration`, worktree
  `~/zentangles-worktrees/showcase-orchestration`, from main ba021af.
- T1 done: `run({ fetch, env, webDir, log })` exported from
  `scripts/build-showcase.mjs` (defaults: global fetch, `process.env`, `web/`,
  `console`; runs only when executed directly). 6 tests in
  `tests/build-showcase.test.mjs`. RED observed: import failed (no `run`
  export). GREEN: `npm test` 112/112. Mutation check: skipping the published
  copy, skipping re-validation, published-before-live, no empty fallback,
  dropping the token check and changing the page cap each fail >= 1 test.
  `node scripts/build-showcase.mjs` without `GITHUB_TOKEN` reused 6 showcase
  entries and 0 likes from the published copy, exit 0. Commit 0f7e319.

- T2 done: cron `17 * * * *` in `.github/workflows/pages.yml`; README says
  every hour and that reactions have no Actions event. `npm test` 112/112.

## Next step
None: feature complete; merge to main needs the user's approval.
