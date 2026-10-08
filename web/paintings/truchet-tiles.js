Gallery.register({
  id: "truchet-tiles",
  title: "Truchet Tiles",
  description:
    "A tessellation built from a single tile, two bundles of quarter circles in opposite " +
    "corners, placed in one of two orientations at random. The bands always connect " +
    "across tiles, so they form endless winding ribbons.",
  params: [
    { name: "n", label: "Grid size", type: "range", min: 2, max: 24, step: 1, value: 8 },
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

    for (let row = 0; row < p.n; row++) {
      for (let col = 0; col < p.n; col++) {
        const x = p.margin + col * cell;
        const y = p.margin + row * cell;
        // Each corner: [cx, cy, start angle of the quarter arc pointing into the tile].
        const corners =
          rand() < 0.5
            ? [[x, y, 0], [x + cell, y + cell, Math.PI]]
            : [[x + cell, y, quarter], [x, y + cell, 3 * quarter]];

        const radius = (j) => cell * (0.5 - p.width + 2 * p.width * (p.bands === 1 ? 0.5 : j / (p.bands - 1)));
        const f = (n) => n.toFixed(2);

        // Color the stripes between neighbouring arcs. Stripe j and its mirror (bands - 2 - j)
        // share a color, so stripes still match where tiles meet in either orientation.
        if (p.palette) {
          for (const [cx, cy, start] of corners) {
            for (let j = 0; j < p.bands - 1; j++) {
              const [r0, r1] = [radius(j), radius(j + 1)];
              const at = (r, a) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
              const color = [p.colorA, p.colorB, p.colorC][Math.min(j, p.bands - 2 - j) % 3];
              pen.path(
                `M${at(r0, start)}A${f(r0)} ${f(r0)} 0 0 1 ${at(r0, start + quarter)}` +
                  `L${at(r1, start + quarter)}A${f(r1)} ${f(r1)} 0 0 0 ${at(r1, start)}Z`,
                { fill: color, stroke: "none" }
              );
            }
          }
        }

        for (const [cx, cy, start] of corners) {
          for (let j = 0; j < p.bands; j++) {
            pen.arc(cx, cy, radius(j), start, start + quarter);
          }
        }

        if (p.grid) pen.polygon([[x, y], [x + cell, y], [x + cell, y + cell], [x, y + cell]], { width: 0.3 });
      }
    }
  },
});
