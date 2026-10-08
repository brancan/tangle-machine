Gallery.register({
  id: "bubbles",
  title: "Bubbles",
  description:
    "Randomly packed bubbles on a dark ground. Each one gets a crescent of shadow away " +
    "from the light and a few nested rings that lean toward it.",
  tags: ["organic", "random"],
  instruction:
    "Scatter up to {count} circles (seed {seed}), from {maxR} px down to {minR} px in " +
    "radius, never closer than {gap} px. In each, leave a dark crescent {shade%} of the " +
    "radius wide on the side away from a light at {light}°, and draw {rings} rings that " +
    "lean toward the light.",
  style: { ink: "#f6f3ec", paper: "#151515", strokeWidth: 1.4 },
  params: [
    { name: "count", label: "Bubbles", type: "range", min: 10, max: 500, step: 1, value: 160 },
    { name: "maxR", label: "Largest radius", type: "range", min: 20, max: 220, step: 1, value: 120 },
    { name: "minR", label: "Smallest radius", type: "range", min: 4, max: 60, step: 1, value: 10 },
    { name: "gap", label: "Gap", type: "range", min: 0, max: 20, step: 0.5, value: 4 },
    { name: "shade", label: "Shadow", type: "range", min: 0, max: 0.4, step: 0.01, value: 0.14 },
    { name: "rings", label: "Rings", type: "range", min: 0, max: 8, step: 1, value: 3 },
    { name: "light", label: "Light angle", type: "range", min: 0, max: 360, step: 5, value: 225 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 9 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const bubbles = [];

    // Greedy packing: radii shrink over the attempts, overlapping candidates are rejected.
    const attempts = 6000;
    for (let i = 0; i < attempts && bubbles.length < p.count; i++) {
      const t = i / attempts;
      const r = p.maxR * Math.pow(p.minR / p.maxR, Math.sqrt(t)) * (0.8 + 0.2 * rand());
      const x = rand() * pen.width;
      const y = rand() * pen.height;
      if (bubbles.every((b) => Math.hypot(b.x - x, b.y - y) >= b.r + r + p.gap)) bubbles.push({ x, y, r });
    }

    const angle = (p.light * Math.PI) / 180;
    const lx = Math.cos(angle);
    const ly = Math.sin(angle);

    for (const { x, y, r } of bubbles) {
      pen.circle(x, y, r, { fill: p.paper });
      // The lit body sits toward the light, leaving a dark crescent on the far side.
      const body = r * (1 - p.shade);
      const bx = x + lx * (r - body);
      const by = y + ly * (r - body);
      pen.circle(bx, by, body, { fill: p.ink });
      for (let k = 1; k <= p.rings; k++) {
        const rr = body * (1 - k / (p.rings + 1));
        pen.circle(bx + lx * (body - rr), by + ly * (body - rr), rr, { stroke: p.paper });
      }
    }
  },
});
