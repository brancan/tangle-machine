# Feature: studio-tools

## Objective
Studio improvements requested by the user: hotkeys, better export, global style presets,
per-painting presets and an on-screen pen API reference.

## Scope / constraints
- Worktree `~/zentangles-worktrees/studio-tools`, branch `feat/studio-tools` off main 2d2f4d0.
- Other sessions add paintings in parallel: do not touch `web/paintings/`; keep the
  painting `<script>` list in `web/index.html` untouched.
- Build-free static site, no new dependencies. Default renders must stay byte-identical
  (snapshots unchanged) unless a task explicitly changes visuals.
- Already existing (do not rebuild): Ctrl/Cmd+Enter run, Reset / Reset code, localStorage
  code drafts, status-bar errors, SVG/PNG export, share links, hand-drawn sliders.

## Tasks
- [x] T1 Hotkeys: Ctrl/Cmd+S downloads SVG, `F` toggles a full-canvas focus mode, editor marks the error line — route: delegated
  - Evidence: `tests/studio-tools.test.mjs` errorLine RED then GREEN; headless Chrome: Ctrl+S downloads `scales.svg` (also inside CodeMirror), runtime error marks line 3 and clears on Reset code, F/Esc toggle focus.
- [x] T2 Export: PNG size selector (1x 800, 2x, 4x, A4 300 DPI = 3508 px) and a Replay button that animates strokes — route: delegated
  - Evidence: PNG_SIZES/replaySchedule tests RED then GREEN; headless Chrome: 1x export is an 800x800 PNG, Replay runs Web Animations without touching the SVG markup, a second click cancels, it ends on its own after ~4 s, reduced motion skips it.
- [ ] T3 Global style: palette presets applied to ink/paper/color params, paper textures (plain, dark, kraft, grain) — route: delegated
- [ ] T4 Presets per painting saved in localStorage + pen API help panel — route: delegated

Route note: delegated, one writer (app.js, gallery.js, styles.css, index.html, tests: 4+ non-trivial files).

## Checks
- `npm test` green, snapshots unchanged.
- Headless Chrome screenshot of the studio with the new controls.

## Progress
- Worktree created.
