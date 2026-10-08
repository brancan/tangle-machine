# Feature: web-gallery

## Objective
Interactive web gallery of code drawings: pick a painting, tweak its variables
with live preview, and view or edit its drawing code in the browser.

## Scope / constraints
- Static site under `web/`, no build step, opens from `file://` and GitHub Pages.
- Each painting is a self-registering script in `web/paintings/` with a param
  schema and a `draw(p, pen)` function; the editor shows and recompiles it.
- Code editor: CodeMirror 5 from cdnjs, textarea fallback if it fails to load.
- Python CLI stays as-is.

## Tasks
- [x] T1 Gallery + studio page (controls, live SVG preview, code editor, download) and Paradox painting — route: inline (parent already holds full design context)
- [x] T2 README section for the web gallery

## Checks
- Node smoke test: Paradox `draw` produces the expected polygon count.
- Headless Chrome screenshot of gallery and studio views.

## Progress
- Branch `feat/web-gallery`. Verified via headless Chrome screenshots of gallery and studio (Paradox 6x6 renders 1,116 shapes, CodeMirror loads).
