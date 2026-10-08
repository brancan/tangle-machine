Gallery.register({
  id: "florz",
  title: "Florz",
  description:
    "A diagonal lattice with a solid diamond at every crossing and a small circle in " +
    "every cell. Simple, tidy and endlessly repeatable, like floor tiles.",
  instruction:
    "Draw a diagonal lattice {n} cells across, each line doubled {gap} px apart. Put a " +
    "solid diamond {diamond%} of a cell wide at every crossing and a circle {circle%} of a " +
    "cell wide in every cell. Frame it {margin} px from the edge.",
  params: [
    { name: "n", label: "Grid size", type: "range", min: 2, max: 20, step: 1, value: 8 },
    { name: "diamond", label: "Diamond size", type: "range", min: 0, max: 0.45, step: 0.01, value: 0.2 },
    { name: "circle", label: "Circle size", type: "range", min: 0, max: 0.45, step: 0.01, value: 0.16 },
    { name: "gap", label: "Double line gap", type: "range", min: 0, max: 12, step: 0.5, value: 3 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 30 },
  ],
  draw: function draw(p, pen) {
    const L = pen.width - 2 * p.margin;
    const h = L / p.n;
    const m = p.margin;
    const frame = `M${m} ${m}h${L}v${L}h${-L}Z`;
    const node = (i, j) => [m + i * h, m + j * h];

    // Diagonal lines double up: two parallels `gap` apart (one line when gap is 0).
    const offsets = p.gap > 0 ? [-p.gap / 2, p.gap / 2] : [0];
    const diagonal = ([x0, y0], [x1, y1]) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const [nx, ny] = [-(y1 - y0) / len, (x1 - x0) / len];
      for (const o of offsets) pen.line(x0 + nx * o, y0 + ny * o, x1 + nx * o, y1 + ny * o);
    };

    pen.clip(frame, () => {
      // Lattice nodes are the grid points with an even i + j; cells are the odd ones.
      for (let i = -1; i <= p.n + 1; i++) {
        for (let j = -1; j <= p.n + 1; j++) {
          if ((i + j + 2) % 2) continue;
          diagonal(node(i, j), node(i + 1, j + 1));
          diagonal(node(i, j), node(i + 1, j - 1));
        }
      }
      for (let i = -1; i <= p.n + 1; i++) {
        for (let j = -1; j <= p.n + 1; j++) {
          const [x, y] = node(i, j);
          if ((i + j + 2) % 2 === 0) {
            const d = p.diamond * h;
            if (d > 0) pen.polygon([[x, y - d], [x + d, y], [x, y + d], [x - d, y]], { fill: p.ink });
          } else if (p.circle > 0) {
            pen.circle(x, y, p.circle * h);
          }
        }
      }
    });
    pen.path(frame, { width: p.strokeWidth * 2 });
  },
});
