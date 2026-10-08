Gallery.register({
  id: "triangle-paradox",
  title: "Triangle Paradox",
  description:
    "The classic Paradox drawn in triangles: every grid cell is split by its diagonals " +
    "and each triangle spirals in, mirrored against its neighbours.",
  tags: ["geometric", "paradox"],
  instruction:
    "Draw a {n} × {n} grid. Cut each square into {fourTriangles?four triangles along both " +
    "diagonals:two triangles along one diagonal}. In each triangle, draw lines that start " +
    "where the last one ended and land {ratio%} along the next side, {steps} times, turning " +
    "the opposite way from the triangle beside it.",
  params: [
    { name: "n", label: "Grid size", type: "range", min: 1, max: 12, step: 1, value: 4 },
    { name: "steps", label: "Lines per triangle", type: "range", min: 1, max: 60, step: 1, value: 24 },
    { name: "ratio", label: "Ratio", type: "range", min: 0.02, max: 0.5, step: 0.01, value: 0.13 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 20 },
    { name: "fourTriangles", label: "Four triangles per cell", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const cell = (pen.width - 2 * p.margin) / p.n;

    // With a still hand, every triangle goes into one path in tenths of a pixel, each point
    // relative to the one before: the same lines in a fraction of the bytes. A moving hand
    // bends polygons but not raw paths, so then each triangle stays a polygon.
    const still = !p.handWobble && !p.handJitter && !p.handPressure;
    const num = (t) => String(t / 10).replace(/^(-?)0\./, "$1.");
    let d = "";
    let at = [0, 0];
    const to = (command, [x, y]) => {
      const point = [Math.round(x * 10), Math.round(y * 10)];
      const [dx, dy] = [num(point[0] - at[0]), num(point[1] - at[1])];
      at = point;
      return (command || (dx[0] === "-" ? "" : " ")) + dx + (dy[0] === "-" ? "" : " ") + dy;
    };
    const polygon = (list) => {
      if (!still) return pen.polygon(list);
      // Pairs after a move are lines, so they need no command of their own.
      d += to("m", list[0]);
      const start = at;
      for (const point of list.slice(1)) d += to("", point);
      d += "z";
      at = start;
    };

    const spiral = (poly, clockwise) => {
      const next = clockwise ? 1 : poly.length - 1;
      polygon(poly);
      for (let s = 0; s < p.steps; s++) {
        poly = poly.map(([x, y], i) => {
          const [nx, ny] = poly[(i + next) % poly.length];
          return [x + p.ratio * (nx - x), y + p.ratio * (ny - y)];
        });
        polygon(poly);
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
    if (d) pen.path(d);
  },
});
