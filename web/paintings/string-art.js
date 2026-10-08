Gallery.register({
  id: "string-art",
  title: "String Art",
  description:
    "Only straight lines, joining evenly spaced points on two edges of each cell. " +
    "Together they trace curves (parabolic envelopes) that hug the corners.",
  tags: ["geometric", "color"],
  instruction:
    "Draw a {n} × {n} grid with a margin of {margin} px. In each square, take {corners} of " +
    "its corners{rotate?, starting from a different corner in each square:}. Mark {lines} " +
    "even points on the two sides that meet there and join them with straight lines, first " +
    "to first, second to second, until the lines bend into a curve.{colors? Give each " +
    "corner its own warm color.:}",
  params: [
    { name: "n", label: "Grid size", type: "range", min: 1, max: 8, step: 1, value: 3 },
    { name: "lines", label: "Strings per corner", type: "range", min: 4, max: 80, step: 1, value: 26 },
    { name: "corners", label: "Corners per cell", type: "range", min: 1, max: 4, step: 1, value: 2 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 30 },
    { name: "rotate", label: "Rotate per cell", type: "checkbox", value: true },
    { name: "colors", label: "Warm colors", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const cell = (pen.width - 2 * p.margin) / p.n;
    const palette = ["#c0392b", "#e67e22", "#d4a017", p.ink];
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

    // With a still hand, a corner's strings go into one path in tenths of a pixel, each
    // point relative to the one before: the same lines in a fraction of the bytes. A moving
    // hand bends lines but not raw paths, so then each string stays a line.
    const still = !p.handWobble && !p.handJitter && !p.handPressure;
    const num = (t) => String(t / 10).replace(/^(-?)0\./, "$1.");
    let at = [0, 0];
    const to = (command, [x, y]) => {
      const point = [Math.round(x * 10), Math.round(y * 10)];
      const [dx, dy] = [num(point[0] - at[0]), num(point[1] - at[1])];
      at = point;
      return command + dx + (dy[0] === "-" ? "" : " ") + dy;
    };

    for (let row = 0; row < p.n; row++) {
      for (let col = 0; col < p.n; col++) {
        const x = p.margin + col * cell;
        const y = p.margin + row * cell;
        const c = [[x, y], [x + cell, y], [x + cell, y + cell], [x, y + cell]];
        const turn = p.rotate ? (row + 2 * col) % 4 : 0;

        for (let t = 0; t < p.corners; t++) {
          const k = (turn + t * (p.corners === 2 ? 2 : 1)) % 4;
          const corner = c[k];
          const next = c[(k + 1) % 4];
          const prev = c[(k + 3) % 4];
          const style = p.colors ? { stroke: palette[k] } : undefined;
          // A path's first move is absolute, so each corner starts from the origin.
          let d = "";
          at = [0, 0];
          for (let i = 0; i <= p.lines; i++) {
            const s = i / p.lines;
            const [x0, y0] = lerp(prev, corner, s);
            const [x1, y1] = lerp(corner, next, s);
            if (still) d += to("m", [x0, y0]) + to("l", [x1, y1]);
            else pen.line(x0, y0, x1, y1, style);
          }
          if (d) pen.path(d, style);
        }
        pen.polygon(c, { width: 0.5 });
      }
    }
  },
});
