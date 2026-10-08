Gallery.register({
  id: "hollibaugh",
  title: "Hollibaugh",
  description:
    "Bands laid one over another on a dark ground, like planks dropped in a pile. " +
    "Every new band hides the ones beneath it, so depth appears out of flat strips.",
  params: [
    { name: "bands", label: "Bands", type: "range", min: 2, max: 40, step: 1, value: 16 },
    { name: "minWidth", label: "Narrowest band", type: "range", min: 8, max: 80, step: 1, value: 22 },
    { name: "maxWidth", label: "Widest band", type: "range", min: 20, max: 180, step: 1, value: 64 },
    { name: "lines", label: "Lines inside", type: "range", min: 0, max: 10, step: 1, value: 2 },
    { name: "tilt", label: "Tilt (degrees)", type: "range", min: 0, max: 45, step: 1, value: 10 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 3 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const reach = Math.hypot(W, H);

    pen.polygon([[0, 0], [W, 0], [W, H], [0, H]], { fill: p.ink });

    for (let b = 0; b < p.bands; b++) {
      // Mostly horizontal or vertical, nudged by the tilt.
      const base = rand() < 0.5 ? 0 : Math.PI / 2;
      const angle = base + ((rand() * 2 - 1) * p.tilt * Math.PI) / 180;
      const width = p.minWidth + rand() * Math.max(0, p.maxWidth - p.minWidth);
      const [cx, cy] = [rand() * W, rand() * H];
      const [ux, uy] = [Math.cos(angle), Math.sin(angle)];
      const [nx, ny] = [-uy, ux];

      const edge = (offset) => [
        [cx - ux * reach + nx * offset, cy - uy * reach + ny * offset],
        [cx + ux * reach + nx * offset, cy + uy * reach + ny * offset],
      ];
      const [a0, a1] = edge(-width / 2);
      const [b0, b1] = edge(width / 2);
      pen.polygon([a0, a1, b1, b0], { fill: p.paper });

      for (let k = 1; k <= p.lines; k++) {
        const [l0, l1] = edge(-width / 2 + (width * k) / (p.lines + 1));
        pen.line(l0[0], l0[1], l1[0], l1[1], { width: p.strokeWidth * 0.6 });
      }
    }
  },
});
