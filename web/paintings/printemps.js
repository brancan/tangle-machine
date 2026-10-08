Gallery.register({
  id: "printemps",
  title: "Printemps",
  description:
    "Loose coiled spirals of every size crowd the paper like spring buds. Each one winds out " +
    "from its center and closes with a turn around its own rim.",
  tags: ["organic", "random"],
  instruction:
    "Place up to {count} circles at random (seed {seed}), the largest first, as big as " +
    "{size%} of the wall, without letting them touch. Fill each circle with a spiral whose " +
    "coils sit {coil} apart, winding {mixed?either way:the same way}, and finish it with one " +
    "turn around the rim.{dots? Put a dot at the heart of each spiral.:}",
  params: [
    { name: "count", label: "Spirals", type: "range", min: 5, max: 300, step: 1, value: 120 },
    { name: "size", label: "Largest size", type: "range", min: 0.04, max: 0.3, step: 0.01, value: 0.17 },
    { name: "coil", label: "Coil spacing", type: "range", min: 2, max: 16, step: 0.5, value: 8 },
    { name: "mixed", label: "Mixed directions", type: "checkbox", value: true },
    { name: "dots", label: "Center dots", type: "checkbox", value: false },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 9 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 30;
    const rMax = (p.size * pen.width) / 2;
    const rMin = Math.min(rMax, Math.max(4, p.coil * 1.5));
    const placed = [];
    const attempts = 4000;

    // Dart throwing: radii shrink as the attempts go on, so big spirals settle first.
    for (let k = 0; k < attempts && placed.length < p.count; k++) {
      const r = rMin + (rMax - rMin) * (1 - k / attempts) ** 2;
      const x = margin + r + rand() * (pen.width - 2 * (margin + r));
      const y = margin + r + rand() * (pen.height - 2 * (margin + r));
      if (placed.every((c) => Math.hypot(c.x - x, c.y - y) > c.r + r + 3)) {
        placed.push({ x, y, r, start: rand() * 2 * Math.PI, dir: p.mixed && rand() < 0.5 ? -1 : 1 });
      }
    }

    for (const c of placed) {
      const turns = c.r / p.coil;
      const thetaMax = turns * 2 * Math.PI;
      const points = [];
      for (let theta = 0; theta <= thetaMax; ) {
        const r = (c.r * theta) / thetaMax;
        const a = c.start + c.dir * theta;
        points.push([c.x + r * Math.cos(a), c.y + r * Math.sin(a)]);
        theta += Math.min(0.5, 4 / Math.max(r, 1));
      }
      // One loop around the rim, stopping just short of where the spiral reached it.
      for (let t = 0; t <= 0.92; t += 0.02) {
        const a = c.start + c.dir * (thetaMax + t * 2 * Math.PI);
        points.push([c.x + c.r * Math.cos(a), c.y + c.r * Math.sin(a)]);
      }
      pen.polyline(points);
      if (p.dots) pen.circle(c.x, c.y, Math.max(1.2, p.coil * 0.3), { fill: p.ink });
    }
  },
});
