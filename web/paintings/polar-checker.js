Gallery.register({
  id: "polar-checker",
  title: "Polar Checker",
  description:
    "A checkerboard in polar coordinates fanning out from one corner, with rings that " +
    "widen as they move away. The corner itself is a black pool of dots.",
  tags: ["op-art", "radial", "color", "animated"],
  instruction:
    "From the lower right corner, draw {rays} rays across the wall and arcs around the " +
    "corner, the first {core} px out, each ring {growth} times as wide as the one inside " +
    "it. Fill every other cell{palette?, ring by ring in three colors:}. Fill the quarter " +
    "circle at the corner with ink and scatter light dots about {dot} px across inside it " +
    "(seed {seed}).",
  params: [
    { name: "rays", label: "Rays", type: "range", min: 2, max: 30, step: 1, value: 9 },
    { name: "core", label: "Core radius", type: "range", min: 40, max: 400, step: 1, value: 170 },
    { name: "growth", label: "Ring growth", type: "range", min: 1.05, max: 1.8, step: 0.01, value: 1.2 },
    { name: "dot", label: "Dot size", type: "range", min: 2, max: 20, step: 0.5, value: 7 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 11 },
    { name: "palette", label: "Palette", type: "checkbox", value: true },
    { name: "colorA", label: "Color A", type: "color", value: "#264653" },
    { name: "colorB", label: "Color B", type: "color", value: "#e76f51" },
    { name: "colorC", label: "Color C", type: "color", value: "#e9c46a" },
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
    // Time makes the rings flow outward (p.time is 0 when the studio is not playing). Six rings
    // make a full cycle, so checker parity and palette colors line up again seamlessly.
    const drift = ((p.time || 0) * 0.4) % 6;
    const mod = (a, b) => ((a % b) + b) % b;
    let j = drift ? -6 : 0;
    let r0 = drift ? p.core * Math.pow(p.growth, drift - 6) : p.core;
    for (; r0 < reach; j++) {
      const r1 = r0 * p.growth;
      // Rings still inside the core are skipped; the one crossing it is trimmed to the core.
      const inner = Math.max(r0, p.core);
      for (let i = 0; i < p.rays && r1 > p.core; i++) {
        const a0 = start + (span * i) / p.rays;
        const a1 = start + (span * (i + 1)) / p.rays;
        const d =
          `M${at(a0, inner)}A${f(inner)} ${f(inner)} 0 0 1 ${at(a1, inner)}` +
          `L${at(a1, r1)}A${f(r1)} ${f(r1)} 0 0 0 ${at(a0, r1)}Z`;
        // With the palette, each ring of dark cells takes the next color.
        const color = p.palette ? [p.colorA, p.colorB, p.colorC][mod(j, 3)] : p.ink;
        pen.path(d, mod(i + j, 2) === 0 ? { fill: color } : undefined);
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
