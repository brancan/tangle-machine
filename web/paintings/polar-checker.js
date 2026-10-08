Gallery.register({
  id: "polar-checker",
  title: "Polar Checker",
  description:
    "A checkerboard in polar coordinates fanning out from one corner, with rings that " +
    "widen as they move away. The corner itself is a black pool of dots.",
  params: [
    { name: "rays", label: "Rays", type: "range", min: 2, max: 30, step: 1, value: 9 },
    { name: "core", label: "Core radius", type: "range", min: 40, max: 400, step: 1, value: 170 },
    { name: "growth", label: "Ring growth", type: "range", min: 1.05, max: 1.8, step: 0.01, value: 1.2 },
    { name: "dot", label: "Dot size", type: "range", min: 2, max: 20, step: 0.5, value: 7 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 11 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const ox = pen.width;
    const oy = pen.height;
    const reach = Math.hypot(pen.width, pen.height);
    const start = Math.PI;
    const span = Math.PI / 2;
    const f = (n) => n.toFixed(2);
    const at = (a, r) => `${f(ox + r * Math.cos(a))} ${f(oy + r * Math.sin(a))}`;

    // Annular sectors between consecutive rays and rings, filled like a checkerboard.
    let r0 = p.core;
    for (let j = 0; r0 < reach; j++) {
      const r1 = r0 * p.growth;
      for (let i = 0; i < p.rays; i++) {
        const a0 = start + (span * i) / p.rays;
        const a1 = start + (span * (i + 1)) / p.rays;
        const d =
          `M${at(a0, r0)}A${f(r0)} ${f(r0)} 0 0 1 ${at(a1, r0)}` +
          `L${at(a1, r1)}A${f(r1)} ${f(r1)} 0 0 0 ${at(a0, r1)}Z`;
        pen.path(d, (i + j) % 2 === 0 ? { fill: p.ink } : undefined);
      }
      r0 = r1;
    }

    // The core: a solid quarter disc sprinkled with paper-colored dots.
    pen.path(`M${ox} ${oy}L${at(start, p.core)}A${f(p.core)} ${f(p.core)} 0 0 1 ${at(start + span, p.core)}Z`, {
      fill: p.ink,
    });
    for (let r = p.dot * 2; r < p.core - p.dot; r += p.dot * 2.6) {
      const count = Math.max(1, Math.floor((span * r) / (p.dot * 2.6)));
      for (let k = 0; k < count; k++) {
        const a = start + (span * (k + 0.5 + (rand() - 0.5) * 0.4)) / count;
        const size = p.dot * (0.5 + rand() * 0.6);
        pen.circle(ox + r * Math.cos(a), oy + r * Math.sin(a), size, { fill: p.paper, stroke: p.paper });
      }
    }
  },
});
