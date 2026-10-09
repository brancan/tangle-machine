Gallery.register({
  id: "not-straight-lines",
  title: "Not-Straight Lines",
  description:
    "After Sol LeWitt's Wall Drawing #91 (1971): an interpretation, not the original. A " +
    "grid of squares, each crossed by gently bending lines in three colors, so every square " +
    "holds all three and no two squares agree.",
  tags: ["geometric", "random", "color"],
  instruction:
    "Divide the wall into a {cells} × {cells} grid. In each square draw {lines} lines that " +
    "are not straight, each running from one side of the square to the opposite one and " +
    "swaying by up to {waviness%} of the square. Share the three colors so that every " +
    "square holds at least one line of each. Directions and curves follow seed " +
    "{seed}.{grid? Draw the squares.:}",
  params: [
    { name: "cells", label: "Cells per side", type: "range", min: 1, max: 10, step: 1, value: 4 },
    { name: "lines", label: "Lines per square", type: "range", min: 3, max: 15, step: 1, value: 6 },
    { name: "waviness", label: "Waviness", type: "range", min: 0.02, max: 0.2, step: 0.01, value: 0.08 },
    { name: "grid", label: "Show grid", type: "checkbox", value: true },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 1 },
    { name: "colorA", label: "Color A", type: "color", value: "#111111" },
    { name: "colorB", label: "Color B", type: "color", value: "#4a7a0c" },
    { name: "colorC", label: "Color C", type: "color", value: "#8a8a8a" },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 50;
    const pad = 8;
    const cell = (pen.width - 2 * margin) / p.cells;
    const s = cell - 2 * pad;
    const amp = p.waviness * s;
    const colors = [p.colorA, p.colorB, p.colorC];
    const samples = Math.max(12, Math.ceil(s / 5));

    for (let row = 0; row < p.cells; row++) {
      for (let col = 0; col < p.cells; col++) {
        const x = margin + col * cell + pad;
        const y = margin + row * cell + pad;
        // Each square starts the color cycle at a different color, so each holds all three.
        const first = Math.floor(rand() * 3);
        for (let i = 0; i < p.lines; i++) {
          const vertical = rand() < 0.5;
          // Two waves with random phases and frequencies: a slow sway plus a smaller ripple.
          const base = amp + rand() * (s - 2 * amp);
          const [f1, f2] = [0.5 + rand() * 1.5, 2 + rand() * 2];
          const [a1, a2] = [rand() * 6.3, rand() * 6.3];
          const points = [];
          for (let k = 0; k <= samples; k++) {
            const u = k / samples;
            const v = base + amp * (0.7 * Math.sin(2 * Math.PI * f1 * u + a1) + 0.3 * Math.sin(2 * Math.PI * f2 * u + a2));
            const along = u * s;
            points.push(vertical ? [x + v, y + along] : [x + along, y + v]);
          }
          pen.polyline(points, { stroke: colors[(first + i) % 3] }, true);
        }
        if (p.grid) pen.polygon([[x, y], [x + s, y], [x + s, y + s], [x, y + s]], { width: 0.4 });
      }
    }
  },
});
