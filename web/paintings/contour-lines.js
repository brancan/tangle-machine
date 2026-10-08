Gallery.register({
  id: "contour-lines",
  title: "Contour Lines",
  description:
    "A random landscape traced with evenly spaced height lines, like a topographic map " +
    "or a fingerprint. Built with the marching squares algorithm.",
  instruction:
    "Raise {hills} hills and hollows at random (seed {seed}), each about {spread%} of the " +
    "wall across. Measure the height on a {resolution} × {resolution} grid and draw " +
    "{levels} lines of equal height across the whole wall{twoTone?, every other line in a " +
    "lighter color:}.",
  style: { ink: "#a8330f", paper: "#f39a52", strokeWidth: 1.6 },
  params: [
    { name: "hills", label: "Hills", type: "range", min: 2, max: 30, step: 1, value: 10 },
    { name: "spread", label: "Hill size", type: "range", min: 0.05, max: 0.5, step: 0.01, value: 0.17 },
    { name: "levels", label: "Lines", type: "range", min: 4, max: 80, step: 1, value: 54 },
    { name: "resolution", label: "Resolution", type: "range", min: 40, max: 240, step: 10, value: 150 },
    { name: "highlight", label: "Highlight", type: "color", value: "#ffe2c4" },
    { name: "twoTone", label: "Two-tone lines", type: "checkbox", value: true },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 4 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const N = p.resolution;
    const step = W / N;
    const f = (n) => n.toFixed(1);

    // Height field: a sum of gaussian hills and pits.
    const hills = [];
    for (let i = 0; i < p.hills; i++) {
      hills.push({ x: rand() * W, y: rand() * W, s: W * p.spread * (0.5 + rand()), a: rand() < 0.5 ? -1 : 1 });
    }
    const height = (x, y) =>
      hills.reduce((sum, h) => sum + h.a * Math.exp(-((x - h.x) ** 2 + (y - h.y) ** 2) / (2 * h.s * h.s)), 0);

    const g = new Float64Array((N + 1) * (N + 1));
    let min = Infinity;
    let max = -Infinity;
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const v = height(i * step, j * step);
        g[j * (N + 1) + i] = v;
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }

    // Marching squares: which cell edges (0 top, 1 right, 2 bottom, 3 left) each case connects.
    const CASES = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[3, 0]],
      [[3, 0]], [[0, 2]], [[0, 1], [3, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];

    for (let l = 1; l <= p.levels; l++) {
      const t = min + ((max - min) * l) / (p.levels + 1);
      let d = "";
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const v0 = g[j * (N + 1) + i];
          const v1 = g[j * (N + 1) + i + 1];
          const v2 = g[(j + 1) * (N + 1) + i + 1];
          const v3 = g[(j + 1) * (N + 1) + i];
          const index = (v0 > t ? 8 : 0) | (v1 > t ? 4 : 0) | (v2 > t ? 2 : 0) | (v3 > t ? 1 : 0);
          if (index === 0 || index === 15) continue;
          const x = i * step;
          const y = j * step;
          const edge = [
            () => [x + (step * (t - v0)) / (v1 - v0), y],
            () => [x + step, y + (step * (t - v1)) / (v2 - v1)],
            () => [x + (step * (t - v3)) / (v2 - v3), y + step],
            () => [x, y + (step * (t - v0)) / (v3 - v0)],
          ];
          for (const [a, b] of CASES[index]) {
            const [ax, ay] = edge[a]();
            const [bx, by] = edge[b]();
            d += `M${f(ax)} ${f(ay)}L${f(bx)} ${f(by)}`;
          }
        }
      }
      if (d) pen.path(d, p.twoTone && l % 2 === 0 ? { stroke: p.highlight } : undefined);
    }
  },
});
