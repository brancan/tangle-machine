# zentangles

Drawings made with code: an interactive gallery of generative zentangles,
written in plain JavaScript and rendered as SVG.

## Web gallery

Live at **https://brancan.github.io/zentangles/** (deployed by GitHub Actions on every push to `main` that touches `web/`).

`web/` is an interactive gallery: pick a painting, tweak its variables with a
live preview, and read or edit its drawing code in the browser. No build step —
open `web/index.html` directly or serve the folder:

```bash
python -m http.server -d web 8000   # http://localhost:8000
```

Each painting is one file in `web/paintings/` that calls `Gallery.register`
with an `id`, `title`, `description`, a `params` schema (`range`, `checkbox`,
`color`) and a `draw(p, pen)` function. Add a `<script>` tag for it in
`web/index.html` and it shows up in the gallery. A painting may also set
`style` (`ink`, `paper`, `strokeWidth`) to override the default look.

The `pen` API offers `polygon`, `polyline`, `line`, `circle`, `arc` and `path`;
each accepts an optional `{ fill, stroke, width }` style. `pen.clip(d, fn)` clips everything drawn inside `fn` to
the SVG path `d`. `pen.random(seed)`
returns a deterministic random generator. Code edits are saved in the browser
(localStorage) and can be reset at any time.

Every painting also gets **Hand-drawn** variables that humanize the strokes:
`Wobble` (slow drift along each stroke), `Jitter` (corners and endpoints miss
slightly, closed shapes don't quite close), `Pressure` (stroke width varies per
stroke), `Roughness` (an SVG displacement filter that also bends raw paths and
fills) and `Hand seed`. All start at 0, so paintings look exact by default.

The studio also offers Randomize, shareable links (the variables live in the
URL hash, e.g. `#/paradox?n=3&alternate=0`), SVG/PNG export and arrow-key
navigation between paintings. When the code was edited, **Copy link** also packs
it into the link (`code=`, deflate + base64url). Whoever opens such a link sees
the original painting and a notice; the shared code runs only after they click
**Run shared code**.

Current paintings: Paradox, Paradox Circle, Triangle Paradox, Honeycomb
Paradox, Spider Web, Truchet Tiles, Scales, String Art, Bulge Checker, Polar
Checker, Op Waves, Woven Circle, Quarter Arcs, Bubbles, Contour Lines, Vortex,
Drips, Ripples and Flow Field.

## Tests

```bash
npm test             # Node's built-in test runner, no dependencies
npm run test:update  # accept intended visual changes
```

The suite renders every painting with its default variables and compares a
hash of the SVG against `tests/snapshots.json`, renders each one with random
variables to catch `NaN`, and checks that no painting param shadows a shared
style or hand-drawn param. CI runs it on every push and pull request.
