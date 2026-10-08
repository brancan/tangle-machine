# Tangle Machine

Drawings made with code: an interactive gallery of generative tangles,
written in plain JavaScript and rendered as SVG.

The project takes Sol LeWitt's conceptual art as its compass: each piece is an
instruction, and each rendering is one execution of it. See the
[project dossier](docs/dossier.md) and the site's About page.

Zentangle® is a registered trademark of Zentangle, Inc. This is an independent
project, not created, endorsed or licensed by Zentangle, Inc.

## Web gallery

Live at **https://brancan.github.io/tangle-machine/** (deployed by GitHub Actions on every push to `main` that touches `web/`).

`web/` is an interactive gallery: pick a painting, tweak its variables with a
live preview, and read or edit its drawing code in the browser. No build step —
open `web/index.html` directly or serve the folder:

```bash
python -m http.server -d web 8000   # http://localhost:8000
```

Each painting is one file in `web/paintings/` that calls `Gallery.register`
with an `id`, `title`, `description`, an `instruction` (a LeWitt-style text
whose `{param}`, `{param%}` and `{flag?yes:no}` blanks are filled live by the
variables), a `params` schema (`range`, `checkbox`,
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

Studio extras: **Ctrl/Cmd+S** downloads the SVG, **F** toggles a focus mode
with only the canvas (Esc leaves it), and a code error marks its line in the
editor. PNG export offers 800, 1600 (default), 3200 or 3508 px (A4 at 300 DPI).
**Replay** animates the drawing stroke by stroke (skipped when the system asks
for reduced motion). The **Palette** picker sets ink, paper and the painting's
own colors in one go, and **Paper texture** (`plain`, `dark`, `kraft`, `grain`,
`watercolor`) lays SVG noise over the paper; plain adds nothing to the SVG.
**Presets** save every current value of a painting under a name (localStorage,
per painting; code is not included), and the **?** button in the code panel
lists the pen API with signatures.

Current paintings: Paradox, Paradox Circle, Triangle Paradox, Honeycomb
Paradox, Spider Web, Truchet Tiles, Scales, String Art, Bulge Checker, Polar
Checker, Op Waves, Woven Circle, Quarter Arcs, Bubbles, Contour Lines, Vortex,
Drips, Ripples, Flow Field, Star Checker, Tube Network, Tumbling Blocks,
Hollibaugh, Huggins, Florz, Knitting, Keeko, Lightning Bolt and Rhombus Star.

## Public gallery and comments

Everything runs on GitHub; there is no backend and no extra login.

- **Comments**: below each painting in the studio, a [Giscus](https://giscus.app)
  thread (one GitHub Discussion per painting, term `painting:<id>`, category
  *Comments*). Visitors sign in with GitHub to comment.
- **Publish to gallery**: the button in that section opens a prefilled
  Discussion in the *Gallery* category with the current share link. If the code
  was edited, the post asks the visitor to paste the link from **Copy link**.
- **Public gallery** (`web/showcase.html`): the Pages workflow runs
  `scripts/build-showcase.mjs`, which reads the *Gallery* Discussions through
  the GraphQL API and writes `web/showcase.json`. Only links to
  `https://brancan.github.io/tangle-machine/` with a known painting id are
  kept. Thumbnails render the original painting with the link's variables;
  shared code is never run there (variants with code get a *custom code* badge
  and open behind the studio's **Run shared code** gate). The workflow
  rebuilds on Discussion events and every six hours. If GitHub cannot be
  reached it keeps the currently published gallery (re-validated), writes `[]`
  only when that is unavailable too, and the deploy always succeeds.

### One-time setup (repository owner)

1. Settings → General → Features: enable **Discussions**.
2. The default categories are reused: **Show and tell** (slug
   `show-and-tell`, open to visitors) holds gallery posts, and
   **Announcements** (Announcement format, so only giscus and maintainers
   create threads) holds the per-painting comment threads.
3. Install the giscus app on the repository: https://github.com/apps/giscus.
   Until then the comment box does not load.
4. `GISCUS_CONFIG` at the top of `web/js/comments.js` holds the repository and
   *Announcements* category ids (from https://giscus.app). Empty ids make the
   studio show "Comments are not configured yet."
5. Run the *Deploy gallery to GitHub Pages* workflow once (or wait for the next
   Show and tell post) to publish `showcase.json`.

**Moderation**: delete a Show and tell Discussion, lock it, or add the label
`hidden` and it disappears from the public gallery on the next build (label
and lock events trigger one). Comments are moderated like any Discussion.

## Tests

```bash
npm test             # Node's built-in test runner, no dependencies
npm run test:update  # accept intended visual changes
```

The suite renders every painting with its default variables and compares a
hash of the SVG against `tests/snapshots.json`, renders each one with random
variables to catch `NaN`, and checks that no painting param shadows a shared
style or hand-drawn param. CI runs it on every push and pull request.
