Gallery.register({
  id: "quarter-arcs",
  title: "Quarter Arcs",
  description:
    "Every cell holds a fan of concentric quarter circles growing from one corner. " +
    "Which corner depends on the pattern, and the eye invents curves and waves across the grid.",
  tags: ["tessellation", "random", "color"],
  instruction:
    "Draw a {n} × {n} grid with a margin of {margin} px. In each square, choose one corner " +
    "by pattern {pattern} (0 spin, 1 mirror, 2 diagonal, 3 random, seed {seed}) and draw " +
    "{bands} quarter circles around it, evenly spaced up to the far side.{core? Fill the " +
    "smallest.:}{stripes? Fill every other band.:}{palette? Color the bands in three " +
    "colors.:}",
  params: [
    { name: "n", label: "Grid size", type: "range", min: 2, max: 20, step: 1, value: 7 },
    { name: "bands", label: "Arcs per cell", type: "range", min: 2, max: 20, step: 1, value: 8 },
    {
      name: "pattern",
      label: "Pattern: spin · mirror · diagonal · random",
      type: "range",
      min: 0,
      max: 3,
      step: 1,
      value: 0,
    },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 30 },
    { name: "core", label: "Solid core", type: "checkbox", value: true },
    { name: "stripes", label: "Filled stripes", type: "checkbox", value: false },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 5 },
    { name: "palette", label: "Palette", type: "checkbox", value: true },
    { name: "colorA", label: "Color A", type: "color", value: "#e07a5f" },
    { name: "colorB", label: "Color B", type: "color", value: "#81b29a" },
    { name: "colorC", label: "Color C", type: "color", value: "#f2cc8f" },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const cell = (pen.width - 2 * p.margin) / p.n;
    const quarter = Math.PI / 2;
    const f = (n) => n.toFixed(2);

    // Corners in clockwise order with the angle at which their quarter arc starts.
    const cornerOf = (x, y, k) =>
      [[x, y, 0], [x + cell, y, quarter], [x + cell, y + cell, Math.PI], [x, y + cell, 3 * quarter]][k];

    const pick = (row, col) => {
      if (p.pattern === 0) return (row + col) % 4;
      if (p.pattern === 1) return (row % 2) * 3 ^ (col % 2);
      if (p.pattern === 2) return (row + col) % 2 ? 0 : 2;
      return Math.floor(rand() * 4);
    };

    const sector = (cx, cy, r, a) =>
      `M${f(cx)} ${f(cy)}L${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}` +
      `A${f(r)} ${f(r)} 0 0 1 ${f(cx + r * Math.cos(a + quarter))} ${f(cy + r * Math.sin(a + quarter))}Z`;

    for (let row = 0; row < p.n; row++) {
      for (let col = 0; col < p.n; col++) {
        const x = p.margin + col * cell;
        const y = p.margin + row * cell;
        const [cx, cy, a] = cornerOf(x, y, pick(row, col));

        // Largest first so smaller sectors paint over it.
        for (let k = p.bands; k >= 1; k--) {
          const r = (cell * k) / p.bands;
          const solid = (p.core && k === 1) || (p.stripes && k % 2 === 1);
          const band = p.palette ? [p.colorA, p.colorB, p.colorC][k % 3] : p.paper;
          pen.path(sector(cx, cy, r, a), { fill: solid ? p.ink : band });
        }
        pen.polygon([[x, y], [x + cell, y], [x + cell, y + cell], [x, y + cell]]);
      }
    }
  },
});
