Gallery.register({
  id: "paradox",
  title: "Paradox",
  description:
    "An n x n grid where every cell holds a Paradox tangle: each line starts where " +
    "the previous one ended and lands a little further along the next side. " +
    "Straight lines, curved illusion.",
  tags: ["geometric", "paradox"],
  instruction:
    "On a square wall, draw a {n} × {n} grid with a margin of {margin} px. In each square, " +
    "draw a line from one corner to a point {ratio%} of the way along the next side. From " +
    "there, draw to a point {ratio%} along the following side, and keep going round, " +
    "{steps} times. Turn {alternate?clockwise and counterclockwise in alternating " +
    "squares:the same way in every square}.",
  params: [
    { name: "n", label: "Grid size", type: "range", min: 1, max: 16, step: 1, value: 6 },
    { name: "steps", label: "Lines per cell", type: "range", min: 1, max: 80, step: 1, value: 30 },
    { name: "ratio", label: "Ratio", type: "range", min: 0.01, max: 0.5, step: 0.01, value: 0.1 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 20 },
    { name: "alternate", label: "Alternate spin", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const cell = (pen.width - 2 * p.margin) / p.n;

    // With a still hand, every square goes into one path in tenths of a pixel, each point
    // relative to the one before: the same lines in a fraction of the bytes. A moving hand
    // bends polygons but not raw paths, so then each square stays a polygon.
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

    for (let row = 0; row < p.n; row++) {
      for (let col = 0; col < p.n; col++) {
        const x = p.margin + col * cell;
        const y = p.margin + row * cell;
        const clockwise = p.alternate ? (row + col) % 2 === 0 : true;
        const next = clockwise ? 1 : 3;

        let square = [[x, y], [x + cell, y], [x + cell, y + cell], [x, y + cell]];
        polygon(square);

        for (let s = 0; s < p.steps; s++) {
          square = square.map(([px, py], i) => {
            const [nx, ny] = square[(i + next) % 4];
            return [px + p.ratio * (nx - px), py + p.ratio * (ny - py)];
          });
          polygon(square);
        }
      }
    }
    if (d) pen.path(d);
  },
});
