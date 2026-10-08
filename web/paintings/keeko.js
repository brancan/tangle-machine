Gallery.register({
  id: "keeko",
  title: "Keeko",
  description:
    "Basketweave from bundles of parallel lines: each cell turns its bundle a quarter " +
    "turn from its neighbours, and the checkerboard of directions reads as woven cane.",
  params: [
    { name: "n", label: "Grid size", type: "range", min: 2, max: 24, step: 1, value: 8 },
    { name: "lines", label: "Lines per cell", type: "range", min: 2, max: 16, step: 1, value: 6 },
    { name: "inset", label: "Inset", type: "range", min: 0, max: 0.3, step: 0.01, value: 0.06 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 30 },
    { name: "frame", label: "Frame", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const L = pen.width - 2 * p.margin;
    const cell = L / p.n;
    const pad = cell * p.inset;

    for (let i = 0; i < p.n; i++) {
      for (let j = 0; j < p.n; j++) {
        const x = p.margin + i * cell;
        const y = p.margin + j * cell;
        const horizontal = (i + j) % 2 === 0;
        for (let k = 0; k < p.lines; k++) {
          // Lines spread across the cell, inset from the edges they run along.
          const t = (k + 0.5) / p.lines;
          if (horizontal) pen.line(x + pad, y + cell * t, x + cell - pad, y + cell * t);
          else pen.line(x + cell * t, y + pad, x + cell * t, y + cell - pad);
        }
      }
    }
    if (p.frame) {
      const m = p.margin;
      pen.polygon([[m, m], [m + L, m], [m + L, m + L], [m, m + L]], { width: p.strokeWidth * 2 });
    }
  },
});
