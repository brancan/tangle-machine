Gallery.register({
  id: "ripples",
  title: "Ripples",
  description:
    "Pebbles dropped in still water. Rings spread out from every circle and fold into " +
    "sharp seams where two ripples meet. Traced with marching squares.",
  tags: ["organic", "random"],
  instruction:
    "Drop {count} circles (seed {seed}) between {minR} and {maxR} px in radius. Around " +
    "them, draw rings every {spacing} px, each tracing the distance to the nearest circle, " +
    "so the rings fold into seams where they meet.",
  params: [
    { name: "count", label: "Circles", type: "range", min: 1, max: 40, step: 1, value: 16 },
    { name: "maxR", label: "Largest radius", type: "range", min: 15, max: 180, step: 1, value: 70 },
    { name: "minR", label: "Smallest radius", type: "range", min: 5, max: 80, step: 1, value: 16 },
    { name: "spacing", label: "Ring spacing", type: "range", min: 4, max: 30, step: 0.5, value: 9 },
    { name: "resolution", label: "Resolution", type: "range", min: 60, max: 260, step: 10, value: 180 },
    { name: "pebble", label: "Circle color", type: "color", value: "#cfcac0" },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 6 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const N = p.resolution;
    const step = W / N;
    const f = (n) => n.toFixed(1);

    const circles = [];
    for (let i = 0; i < 3000 && circles.length < p.count; i++) {
      const r = p.minR + rand() * Math.max(0, p.maxR - p.minR);
      const x = rand() * W;
      const y = rand() * W;
      if (circles.every((c) => Math.hypot(c.x - x, c.y - y) > c.r + r + 2 * p.spacing)) circles.push({ x, y, r });
    }

    // Distance to the nearest circle edge: its level sets are the ripples.
    const g = new Float64Array((N + 1) * (N + 1));
    let max = 0;
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        let d = Infinity;
        for (const c of circles) d = Math.min(d, Math.hypot(i * step - c.x, j * step - c.y) - c.r);
        g[j * (N + 1) + i] = d;
        max = Math.max(max, d);
      }
    }

    // Marching squares: which cell edges (0 top, 1 right, 2 bottom, 3 left) each case connects.
    const CASES = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[3, 0]],
      [[3, 0]], [[0, 2]], [[0, 1], [3, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];

    let d = "";
    for (let t = p.spacing; t < max; t += p.spacing) {
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
    }
    if (d) pen.path(d);

    for (const c of circles) pen.circle(c.x, c.y, c.r, { fill: p.pebble, width: p.strokeWidth * 1.5 });
  },
});
