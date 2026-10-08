Gallery.register({
  id: "truchet-tiles",
  title: "Truchet Tiles",
  description:
    "A tessellation built from a single tile, two bundles of quarter circles in opposite " +
    "corners, placed in one of two orientations at random. The bands always connect " +
    "across tiles, so they form endless winding ribbons.",
  tags: ["tessellation", "random", "color"],
  instruction:
    "Divide the wall into a {n} × {n} grid. In each square, draw {bands} quarter circles " +
    "around two opposite corners, choosing at random (seed {seed}) which pair. Keep the " +
    "arcs within {width%} of the square on either side of its middle, so every ribbon meets " +
    "its neighbour.{palette? Color the stripes between the arcs.:}{grid? Show the " +
    "squares.:}",
  params: [
    { name: "n", label: "Grid size", type: "range", min: 2, max: 20, step: 1, value: 8 },
    { name: "bands", label: "Lines per ribbon", type: "range", min: 1, max: 12, step: 1, value: 5 },
    { name: "width", label: "Ribbon width", type: "range", min: 0.02, max: 0.2, step: 0.01, value: 0.18 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 20 },
    { name: "grid", label: "Show tile borders", type: "checkbox", value: false },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 3 },
    { name: "palette", label: "Palette", type: "checkbox", value: true },
    { name: "colorA", label: "Color A", type: "color", value: "#3d5a80" },
    { name: "colorB", label: "Color B", type: "color", value: "#ee6c4d" },
    { name: "colorC", label: "Color C", type: "color", value: "#98c1d9" },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const cell = (pen.width - 2 * p.margin) / p.n;
    const quarter = Math.PI / 2;
    const radius = (j) => cell * (0.5 - p.width + 2 * p.width * (p.bands === 1 ? 0.5 : j / (p.bands - 1)));

    // Path data in tenths of a pixel, each point relative to the one before, so many
    // stripes or arcs share one path. A path's first move is absolute: start from the origin.
    const num = (t) => String(t / 10).replace(/^(-?)0\./, "$1.");
    const pathData = () => {
      let at = [0, 0];
      const to = (x, y) => {
        const point = [Math.round(x * 10), Math.round(y * 10)];
        const delta = [point[0] - at[0], point[1] - at[1]];
        at = point;
        return delta;
      };
      const pair = ([dx, dy]) => num(dx) + (dy < 0 ? "" : " ") + num(dy);
      const r = (value) => num(Math.round(value * 10));
      return {
        d: "",
        move(x, y) {
          this.d += "m" + pair(to(x, y));
        },
        // Lines here run along the tile's sides: horizontal or vertical.
        line(x, y) {
          const [dx, dy] = to(x, y);
          this.d += dy === 0 ? "h" + num(dx) : dx === 0 ? "v" + num(dy) : "l" + pair([dx, dy]);
        },
        // Quarter arc of radius rr ending at (x, y); sweep 1 turns clockwise on screen.
        arc(rr, sweep, x, y) {
          const end = pair(to(x, y));
          this.d += `a${r(rr)} ${r(rr)} 0 0 ${sweep}` + (end[0] === "-" ? "" : " ") + end;
        },
      };
    };

    // With a still hand, a tile's arcs share one path. A moving hand bends arcs but not raw
    // paths, so then each arc stays an arc.
    const still = !p.handWobble && !p.handJitter && !p.handPressure;

    for (let row = 0; row < p.n; row++) {
      for (let col = 0; col < p.n; col++) {
        const x = p.margin + col * cell;
        const y = p.margin + row * cell;
        // Each corner: [cx, cy, start angle of the quarter arc pointing into the tile].
        const corners =
          rand() < 0.5
            ? [[x, y, 0], [x + cell, y + cell, Math.PI]]
            : [[x + cell, y, quarter], [x, y + cell, 3 * quarter]];
        const at = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

        // Color the stripes between neighbouring arcs. Stripe j and its mirror (bands - 2 - j)
        // share a color, so stripes still match where tiles meet in either orientation.
        // Stripes of one color in a tile never overlap, so they share one filled path.
        if (p.palette) {
          const fills = [p.colorA, p.colorB, p.colorC].map(pathData);
          for (const [cx, cy, start] of corners) {
            for (let j = 0; j < p.bands - 1; j++) {
              const [r0, r1] = [radius(j), radius(j + 1)];
              const path = fills[Math.min(j, p.bands - 2 - j) % 3];
              path.move(...at(cx, cy, r0, start));
              path.arc(r0, 1, ...at(cx, cy, r0, start + quarter));
              path.line(...at(cx, cy, r1, start + quarter));
              path.arc(r1, 0, ...at(cx, cy, r1, start)); // a fill closes itself
            }
          }
          fills.forEach((path, i) => path.d && pen.path(path.d, { fill: [p.colorA, p.colorB, p.colorC][i], stroke: "none" }));
        }

        const arcs = pathData();
        for (const [cx, cy, start] of corners) {
          for (let j = 0; j < p.bands; j++) {
            if (!still) {
              pen.arc(cx, cy, radius(j), start, start + quarter);
              continue;
            }
            // Every other arc runs backwards, so the pen hops only from one arc to the next.
            const [from, to] = j % 2 ? [start + quarter, start] : [start, start + quarter];
            arcs.move(...at(cx, cy, radius(j), from));
            arcs.arc(radius(j), j % 2 ? 0 : 1, ...at(cx, cy, radius(j), to));
          }
        }
        if (arcs.d) pen.path(arcs.d);

        if (p.grid) pen.polygon([[x, y], [x + cell, y], [x + cell, y + cell], [x, y + cell]], { width: 0.3 });
      }
    }
  },
});
