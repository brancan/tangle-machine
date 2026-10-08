Gallery.register({
  id: "klimt-mosaic",
  title: "Golden Mosaic (after Klimt)",
  description:
    "After the gold ornaments of Gustav Klimt's golden phase (1899–1910): an interpretation, " +
    "not a copy of any one painting. Gold and ochre discs crowd a dark gold ground, each one " +
    "holding a spiral or a few small tiles, with gold flecks in between.",
  tags: ["organic", "color", "random"],
  instruction:
    "Cover the wall in dark gold and sprinkle it with small gold tiles. Pack up to {density} " +
    "gold and ochre discs on top at random (seed {seed}), the largest first, none touching. " +
    "Draw a spiral in about {spirals%} of them and a ring with a few small tiles in the rest.",
  params: [
    { name: "density", label: "Discs", type: "range", min: 20, max: 600, step: 1, value: 260 },
    { name: "spirals", label: "Spiral share", type: "range", min: 0, max: 1, step: 0.01, value: 0.5 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 21 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const golds = ["#d6a92e", "#c58f27", "#e6c35c", "#b47628", "#9a6a1e", "#efd27a"];
    const dark = "#3a2508";
    const square = (x, y, s, fill) => pen.polygon([[x, y], [x + s, y], [x + s, y + s], [x, y + s]], { fill, stroke: "none" });

    square(0, 0, W, "#4b3511");
    for (let i = 0; i < 600; i++) {
      square(rand() * W, rand() * W, 3 + rand() * 6, rand() < 0.7 ? "#a77b26" : "#d8b24a");
    }

    const placed = [];
    const attempts = 6000;
    const rMax = 48;
    const rMin = 7;
    for (let k = 0; k < attempts && placed.length < p.density; k++) {
      const r = rMin + (rMax - rMin) * (1 - k / attempts) ** 2.5;
      const x = r + rand() * (W - 2 * r);
      const y = r + rand() * (W - 2 * r);
      if (placed.every((c) => Math.hypot(c.x - x, c.y - y) > c.r + r + 2)) placed.push({ x, y, r });
    }

    for (const c of placed) {
      pen.circle(c.x, c.y, c.r, { fill: golds[Math.floor(rand() * golds.length)], stroke: dark, width: 1.2 });
      if (rand() < p.spirals) {
        const turns = Math.max(1.5, c.r / 6);
        const start = rand() * 2 * Math.PI;
        const points = [];
        for (let t = 0; t <= 1; t += 1 / (turns * 24)) {
          const a = start + t * turns * 2 * Math.PI;
          points.push([c.x + 0.82 * c.r * t * Math.cos(a), c.y + 0.82 * c.r * t * Math.sin(a)]);
        }
        pen.polyline(points, { stroke: dark, width: 1.1 });
      } else {
        pen.circle(c.x, c.y, c.r * 0.72, { stroke: dark, width: 0.8 });
        const tiles = 2 + Math.floor(rand() * 4);
        const s = c.r * 0.22;
        for (let i = 0; i < tiles; i++) {
          const a = (i / tiles) * 2 * Math.PI + rand() * 0.3;
          const d = tiles === 1 ? 0 : c.r * 0.32;
          square(c.x + d * Math.cos(a) - s / 2, c.y + d * Math.sin(a) - s / 2, s, i % 2 ? dark : "#f3e2a4");
        }
      }
    }
  },
});
