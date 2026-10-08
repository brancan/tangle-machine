Gallery.register({
  id: "huggins",
  title: "Huggins",
  description:
    "Dots on a grid, joined by soft curved bands that bow alternately one way and the " +
    "other. The result reads as a woven fabric pinned at every crossing.",
  instruction:
    "Mark the points of a {n} × {n} grid, {margin} px from the edge, with " +
    "{filled?solid:open} circles of {dot} px radius. Join every point to its neighbours " +
    "with bands of {lines} lines, bowed by {bow%} of their length, alternately one way and " +
    "the other.",
  params: [
    { name: "n", label: "Cells per side", type: "range", min: 2, max: 14, step: 1, value: 6 },
    { name: "dot", label: "Dot radius", type: "range", min: 3, max: 30, step: 0.5, value: 11 },
    { name: "bow", label: "Bow", type: "range", min: 0, max: 0.45, step: 0.01, value: 0.24 },
    { name: "lines", label: "Lines per band", type: "range", min: 2, max: 8, step: 1, value: 2 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 50 },
    { name: "filled", label: "Solid dots", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const step = (pen.width - 2 * p.margin) / p.n;
    const r = Math.min(p.dot, step / 2.5);
    const f = (n) => n.toFixed(2);
    const point = (i, j) => [p.margin + i * step, p.margin + j * step];

    // A band from a to b: parallel curves offset across the band, all bowed the same way.
    const band = ([ax, ay], [bx, by], sign) => {
      const len = Math.hypot(bx - ax, by - ay);
      const [nx, ny] = [-(by - ay) / len, (bx - ax) / len];
      const bow = sign * p.bow * len;
      for (let k = 0; k < p.lines; k++) {
        const o = -r + (2 * r * k) / (p.lines - 1);
        const [sx, sy] = [ax + nx * o, ay + ny * o];
        const [ex, ey] = [bx + nx * o, by + ny * o];
        const [qx, qy] = [(sx + ex) / 2 + nx * bow, (sy + ey) / 2 + ny * bow];
        pen.path(`M${f(sx)} ${f(sy)}Q${f(qx)} ${f(qy)} ${f(ex)} ${f(ey)}`);
      }
    };

    for (let j = 0; j <= p.n; j++) {
      for (let i = 0; i <= p.n; i++) {
        if (i < p.n) band(point(i, j), point(i + 1, j), (i + j) % 2 ? 1 : -1);
        if (j < p.n) band(point(i, j), point(i, j + 1), (i + j) % 2 ? -1 : 1);
      }
    }
    for (let j = 0; j <= p.n; j++) {
      for (let i = 0; i <= p.n; i++) {
        const [x, y] = point(i, j);
        pen.circle(x, y, r, { fill: p.filled ? p.ink : p.paper });
      }
    }
  },
});
