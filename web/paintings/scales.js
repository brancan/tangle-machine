Gallery.register({
  id: "scales",
  title: "Scales",
  description:
    "Overlapping rows of half-discs filled with concentric arcs, like fish scales or roof " +
    "tiles. Each row hides the bottom of the one above it.",
  instruction:
    "Draw rows of half-discs, {cols} to a row, each row shifted by half a disc and set " +
    "{overlap%} of a radius below the last, so it covers the bottom of the row above. " +
    "Inside each half-disc, draw {lines} concentric arcs{core? and fill the " +
    "smallest:}.{palette? Color the scales in three colors by turns.:}",
  params: [
    { name: "cols", label: "Scales per row", type: "range", min: 2, max: 16, step: 1, value: 6 },
    { name: "lines", label: "Arcs per scale", type: "range", min: 1, max: 20, step: 1, value: 8 },
    { name: "overlap", label: "Row spacing", type: "range", min: 0.3, max: 1, step: 0.01, value: 0.62 },
    { name: "core", label: "Filled core", type: "checkbox", value: true },
    { name: "palette", label: "Palette", type: "checkbox", value: true },
    { name: "colorA", label: "Color A", type: "color", value: "#2a9d8f" },
    { name: "colorB", label: "Color B", type: "color", value: "#e9c46a" },
    { name: "colorC", label: "Color C", type: "color", value: "#f4a261" },
  ],
  draw: function draw(p, pen) {
    const r = pen.width / (2 * p.cols);
    const dy = r * p.overlap;
    const rows = Math.ceil((pen.height + r) / dy) + 1;
    const f = (n) => n.toFixed(2);
    const halfDisc = (cx, cy, rr) => `M${f(cx - rr)} ${f(cy)}A${f(rr)} ${f(rr)} 0 0 1 ${f(cx + rr)} ${f(cy)}`;

    // Top rows first so every new row is painted over the previous one.
    for (let row = 0; row < rows; row++) {
      const cy = row * dy;
      const shift = row % 2 ? r : 0;
      for (let cx = shift - r, k = 0; cx <= pen.width + r; cx += 2 * r, k++) {
        const fill = p.palette ? [p.colorA, p.colorB, p.colorC][(row + k) % 3] : p.paper;
        pen.path(halfDisc(cx, cy, r) + "Z", { fill });
        for (let j = 1; j < p.lines; j++) {
          pen.path(halfDisc(cx, cy, r * (1 - j / p.lines)));
        }
        if (p.core) pen.path(halfDisc(cx, cy, r / p.lines) + "Z", { fill: p.ink });
      }
    }
  },
});
