Gallery.register({
  id: "star-checker",
  title: "Star Checker",
  description:
    "A two-color checkerboard where every other grid point becomes a star: rays fan out " +
    "from it across its four cells, crossed by nested squares that frame the burst.",
  instruction:
    "Draw a {n} × {n} checkerboard in two colors with a margin of {margin} px. At every " +
    "other grid point, draw a star: {rays} rays into each square around it and {rings} " +
    "nested squares around the point.{dots? Put a dot near the far corner of each square.:}",
  params: [
    { name: "n", label: "Grid size", type: "range", min: 2, max: 16, step: 1, value: 6 },
    { name: "rays", label: "Rays per cell", type: "range", min: 2, max: 40, step: 1, value: 14 },
    { name: "rings", label: "Nested squares", type: "range", min: 0, max: 16, step: 1, value: 6 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 30 },
    { name: "colorA", label: "Color A", type: "color", value: "#f2cf4a" },
    { name: "colorB", label: "Color B", type: "color", value: "#86b97a" },
    { name: "dots", label: "Dots", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const cell = (pen.width - 2 * p.margin) / p.n;

    for (let i = 0; i < p.n; i++) {
      for (let j = 0; j < p.n; j++) {
        const x = p.margin + i * cell;
        const y = p.margin + j * cell;
        pen.polygon([[x, y], [x + cell, y], [x + cell, y + cell], [x, y + cell]], {
          fill: (i + j) % 2 ? p.colorB : p.colorA,
        });

        // The star sits on the corner with even grid coordinates; `far` is the opposite one.
        const sx = i % 2 === 0 ? x : x + cell;
        const sy = j % 2 === 0 ? y : y + cell;
        const fx = sx === x ? x + cell : x;
        const fy = sy === y ? y + cell : y;

        // Rays land evenly along the two far edges: (fx, sy) -> (fx, fy) -> (sx, fy).
        for (let k = 1; k < p.rays; k++) {
          const s = (2 * k) / p.rays;
          const [tx, ty] = s <= 1 ? [fx, sy + (fy - sy) * s] : [fx + (sx - fx) * (s - 1), fy];
          pen.line(sx, sy, tx, ty);
        }

        // Nested squares around the star, seen in this cell as L-shaped lines.
        for (let k = 1; k <= p.rings; k++) {
          const f = k / (p.rings + 1);
          const cx = sx + (fx - sx) * f;
          const cy = sy + (fy - sy) * f;
          pen.polyline([[cx, sy], [cx, cy], [sx, cy]]);
        }

        if (p.dots) pen.circle(sx + (fx - sx) * 0.82, sy + (fy - sy) * 0.82, cell * 0.035, { fill: p.ink });
      }
    }
    pen.polygon([[p.margin, p.margin], [pen.width - p.margin, p.margin], [pen.width - p.margin, pen.height - p.margin], [p.margin, pen.height - p.margin]], { width: p.strokeWidth * 2 });
  },
});
