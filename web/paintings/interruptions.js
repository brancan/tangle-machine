Gallery.register({
  id: "interruptions",
  title: "Interruptions",
  description:
    "After Vera Molnar's Interruptions (1968–69): an interpretation, not the original. A " +
    "dense grid of short strokes, each turned at random around the vertical, with patches " +
    "left blank where the pattern is interrupted.",
  tags: ["geometric", "random"],
  instruction:
    "Mark a {density} × {density} grid of points. At each point draw a short line, {length} " +
    "times the grid step long, turned at random (seed {seed}) up to {spread} quarter turns " +
    "away from vertical. Leave about {gaps%} of the wall empty, in a few irregular patches.",
  params: [
    { name: "density", label: "Lines per side", type: "range", min: 10, max: 70, step: 1, value: 44 },
    { name: "length", label: "Line length", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.4 },
    { name: "spread", label: "Rotation spread", type: "range", min: 0, max: 1, step: 0.05, value: 1 },
    { name: "gaps", label: "Gap amount", type: "range", min: 0, max: 0.6, step: 0.01, value: 0.15 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 11 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 50;
    const step = (pen.width - 2 * margin) / p.density;

    // Patches: a field of a few random bumps; the lowest-valued points (the gap share) are skipped.
    const bumps = Array.from({ length: 14 }, () => ({
      x: margin + rand() * (pen.width - 2 * margin),
      y: margin + rand() * (pen.height - 2 * margin),
      r: (0.04 + rand() * 0.07) * pen.width,
    }));
    const field = (x, y) =>
      bumps.reduce((sum, b) => sum + Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (b.r * b.r)), 0);

    const points = [];
    for (let row = 0; row < p.density; row++) {
      for (let col = 0; col < p.density; col++) {
        const x = margin + (col + 0.5) * step;
        const y = margin + (row + 0.5) * step;
        // Each point keeps its own random angle whatever the gap setting, so gaps only remove lines.
        const angle = Math.PI / 2 + (rand() - 0.5) * p.spread * Math.PI;
        points.push({ x, y, angle, hole: field(x, y) + rand() * 0.15 });
      }
    }
    const cut = [...points].sort((a, b) => b.hole - a.hole)[Math.floor(p.gaps * points.length)];
    const half = (p.length * step) / 2;
    for (const pt of points) {
      if (p.gaps > 0 && cut && pt.hole >= cut.hole) continue;
      const dx = Math.cos(pt.angle) * half;
      const dy = Math.sin(pt.angle) * half;
      pen.line(pt.x - dx, pt.y - dy, pt.x + dx, pt.y + dy);
    }
  },
});
