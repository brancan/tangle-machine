# Project dossier

> "In conceptual art the idea or concept is the most important aspect of the
> work. [...] all of the planning and decisions are made beforehand and the
> execution is a perfunctory affair. The idea becomes a machine that makes the
> art."
> — Sol LeWitt, *Paragraphs on Conceptual Art*, Artforum, vol. 5, no. 10, Summer 1967

## 1. Summary

Tangle Machine is a public, interactive gallery of drawings made with code. Every
piece is a small JavaScript function that draws SVG. Visitors can move its
variables, read its code, rewrite it, and share the exact result as a link.

The project takes Sol LeWitt's conceptual art as its compass: the work is the
instruction, and each rendering is one execution of it. The name comes from
his line "the idea becomes a machine that makes the art": here the machine
makes tangles. "Tangle" is the untrademarked word for a structured pattern
drawing; the project was first called "Zentangles" and was renamed to respect
the Zentangle® trademark.

- Live: https://brancan.github.io/tangle-machine/
- Source: https://github.com/brancan/tangle-machine

## 2. Conceptual frame

LeWitt's *Wall Drawings* exist as written instructions. Draftsmen carry them
out on a wall, and every installation differs a little, because hands differ.
Tangle Machine maps that system onto code almost one to one:

| Sol LeWitt | Tangle Machine |
| --- | --- |
| The idea, written as an instruction | The painting's `draw(p, pen)` function |
| Choices the instruction leaves open | The painting's variables (`p`) |
| The draftsman's hand | The **Hand-drawn** variables: wobble, jitter, pressure, roughness |
| A different draftsman | A different **Hand seed** |
| The certificate and diagram that travel with the work | The share link: variables, and edited code, encoded in the URL |
| The wall | The SVG canvas, 800 × 800 |

### A second compass: Vera Molnar and "1% of disorder"

Where LeWitt explains the instruction, Vera Molnar (1924–2023) explains the
hand. A pioneer of computer art, she worked with computers from 1968 and, with
François Molnar, wrote *Molnart* (1974), a program for composing with squares
into which she deliberately injected a percentage of clumsiness. Her plotter
work *1% de désordre* (1976) gave the idea its name: strict order, broken by a
small, intentional amount of disorder, is what makes a pattern feel alive. In
her words, "a small amount of disorder is necessary… one percent, for example."

The **Hand-drawn** variables are a direct descendant of that idea. Every
painting starts in perfect order (all at 0); wobble, jitter, pressure and
roughness let the visitor dial in exactly how much disorder the instruction
tolerates, and the hand seed decides *which* disorder.

| Vera Molnar | Tangle Machine |
| --- | --- |
| Strict geometric system | The painting's instruction and `draw` function |
| A percentage of clumsiness injected by the program | Wobble, jitter, pressure, roughness |
| "1% of disorder" as an artistic choice | All hand-drawn values start at 0: disorder is opt-in and measured |

Three principles follow from that frame:

1. **The rule generates the variety.** A handful of primitives (`line`,
   `polygon`, `arc`, …) and simple arithmetic produce every piece. Repetition
   with variation is the subject, not a limitation.
2. **The hand is computed.** Imperfection is a parameter. Wobble and jitter are
   deterministic, so the same seed always gives the same "hand", and a new
   seed gives a new draftsman.
3. **The visitor executes.** Moving a slider or editing the code is executing
   the instruction. Whether the visitor is a *draftsman* (LeWitt's position:
   authorship stays with the idea) or a *co-author* is an open question (see 6).

## 3. Current state (verified)

- **39 paintings**, among them Paradox variations, op art (Bulge Checker, Op
  Waves, Polar Checker), field-based pieces (Contour Lines, Ripples, Flow
  Field) and classic tangles (Hollibaugh, Florz, Huggins, Keeko, Knitting,
  Tumbling Blocks, Rhombus Star…).
- **Studio** per painting: live variables, editable code with automatic
  re-run, Randomize, previous/next navigation with arrow keys.
- **Hand-drawn variables** shared by every painting; all start at 0 so the
  default rendering is exact.
- **Palettes** on Polar Checker, Quarter Arcs, Truchet Tiles and Scales.
- **Sharing**: variables in the URL hash; edited code is compressed into the
  link and only runs after the visitor confirms it.
- **Export**: SVG and PNG.
- **Quality**: Node test suite (snapshot hash of every painting, random-variable
  renders checked for `NaN`, param-name collisions, share helpers), run in CI
  on every push. Gallery page loads in about 0.1 s (code editor fetched only in
  the studio).

## 4. Architecture

- **Static site, no build step.** Plain HTML, CSS and JavaScript in `web/`,
  deployed to GitHub Pages by GitHub Actions.
- **Renderer**: `web/js/gallery.js`. A painting's `draw(p, pen)` calls the
  `pen`, which collects SVG elements as strings; `render()` wraps them in an
  SVG document. Vector output is deliberate: it scales, prints, and is the
  natural input for a pen plotter.
- **`pen` API**: `polygon`, `polyline`, `line`, `circle`, `arc`, `path`, each
  with an optional `{ fill, stroke, width }` style; `clip(d, fn)`;
  `random(seed)`; `width` / `height`. Hand-drawn distortion is applied inside
  the pen, so paintings never need to know about it.
- **Sharing**: `web/js/share.js` (pure helpers, tested headless).
- **Paintings**: one self-contained file each in `web/paintings/`, registered
  with `Gallery.register`.
- **Only external dependency**: CodeMirror 5 from cdnjs, loaded lazily, with a
  plain-textarea fallback.

## 5. Roadmap

- [x] **Phase 1 — Base**: gallery, studio, live code, variables, export, share
  links, hand-drawn strokes, tests and CI.
- [x] **Phase 2 — Instructions**: every painting has a numbered,
  LeWitt-style instruction in plain language shown above its studio. Its
  blanks are filled live by the variables (`{n}`, `{ratio%}`,
  `{flag?text:text}`, see `web/js/instruction.js`), e.g.
  *"Within an n × n grid, in each square, draw lines from side to side, each
  beginning where the previous ended and landing a little further along the
  next side."* Moving a slider rewrites the instruction: the variables are the
  blanks the instruction leaves open.
- [x] **Phase 3 — Time and taxonomy**: a player under the canvas (Play/Pause,
  Space) animates any painting by swinging one variable between its limits,
  with the slider and the instruction following live. Paintings tagged
  `animated` (Vortex, Op Waves, Polar Checker) also read `p.time` and move on
  their own; at time 0 they draw exactly as before. Every painting carries
  tags from a fixed vocabulary (geometric, organic, paradox, op-art,
  tessellation, radial, random, color, animated), with filters in the gallery
  and the active tag in the URL (`#/?tag=op-art`).
- [ ] **Phase 4 — Plotter**: SVG export with one layer per color and
  optimized stroke order, for AxiDraw-style plotters, closing the loop between
  instruction and physical execution.
- [ ] **Phase 5 — Studio tools**: presets per painting, `pen` API reference
  in the studio, global palettes, keyboard shortcuts. *In progress on a
  parallel branch.*
- [ ] **Phase 6 — Community** *(in progress on a parallel branch)*: Giscus
  comments per painting and a public gallery of visitor variants, built from
  GitHub Discussions at deploy time; no backend.

## 6. Open questions

1. ~~**Name and trademark.**~~ *Resolved:* renamed from "Zentangles" to
   **Tangle Machine**, because Zentangle, Inc.'s guidelines ask not to use
   "Zentangle" in a product name without written permission. The site still
   credits the trademark and states it is independent. The repository was
   renamed to `tangle-machine`; the old Pages URL (`/zentangles/`) no longer
   serves the site.
2. **Visitor's role.** Draftsman or co-author? It changes the copy of the
   About page and how shared links are credited.
3. **Language.** The site is in English; this dossier can be translated.

## 7. Credits

- Many paintings follow tangles from the Zentangle® Method of pattern
  drawing; tangle names belong to their creators.
- Quote: Sol LeWitt, *Paragraphs on Conceptual Art*, Artforum, Summer 1967.
- Vera Molnar: *Molnart* (1974, with François Molnar) and *1% de désordre*
  (1976), per the Centre Pompidou and the V&A collection; quote as cited by
  Lohaus Sominsky (exhibition *1% of Disorder*).
