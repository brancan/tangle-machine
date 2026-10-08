Gallery.register({
  id: "triangle-paradox",
  title: "Triangle Paradox",
  description:
    "The classic Paradox drawn in triangles: every grid cell is split by its diagonals " +
    "and each triangle spirals in, mirrored against its neighbours.",
  params: [
    { name: "n", label: "Grid size", type: "range", min: 1, max: 12, step: 1, value: 4 },
    { name: "steps", label: "Lines per triangle", type: "range", min: 1, max: 60, step: 1, value: 24 },
    { name: "ratio", label: "Ratio", type: "range", min: 0.02, max: 0.5, step: 0.01, value: 0.13 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 20 },
    { name: "fourTriangles", label: "Four triangles per cell", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const cell = (pen.width - 2 * p.margin) / p.n;

    const spiral = (poly, clockwise) => {
      const next = clockwise ? 1 : poly.length - 1;
      pen.polygon(poly);
      for (let s = 0; s < p.steps; s++) {
        poly = poly.map(([x, y], i) => {
          const [nx, ny] = poly[(i + next) % poly.length];
          return [x + p.ratio * (nx - x), y + p.ratio * (ny - y)];
        });
        pen.polygon(poly);
      }
    };

    for (let row = 0; row < p.n; row++) {
      for (let col = 0; col < p.n; col++) {
        const x = p.margin + col * cell;
        const y = p.margin + row * cell;
        const c = [[x, y], [x + cell, y], [x + cell, y + cell], [x, y + cell]];
        const center = [x + cell / 2, y + cell / 2];
        const parity = (row + col) % 2;

        if (p.fourTriangles) {
          for (let i = 0; i < 4; i++) {
            spiral([c[i], c[(i + 1) % 4], center], (i + parity) % 2 === 0);
          }
        } else if (parity === 0) {
          spiral([c[0], c[1], c[2]], true);
          spiral([c[0], c[2], c[3]], false);
        } else {
          spiral([c[1], c[2], c[3]], true);
          spiral([c[1], c[3], c[0]], false);
        }
      }
    }
  },
});
