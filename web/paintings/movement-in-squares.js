Gallery.register({
  id: "movement-in-squares",
  title: "Movement in Squares",
  description:
    "After Bridget Riley's Movement in Squares (1961): an interpretation, not the original. " +
    "A black and white checkerboard whose columns squeeze together toward a fold, so the " +
    "flat surface seems to bend away from you.",
  tags: ["op-art", "geometric"],
  instruction:
    "Draw a checkerboard of {columns} columns and {rows} rows. Keep the rows even, but make " +
    "the columns narrower the closer they lie to a fold {fold%} of the way across, where they " +
    "are squeezed by {compression%}. Fill every other square.",
  params: [
    { name: "columns", label: "Columns", type: "range", min: 6, max: 40, step: 1, value: 22 },
    { name: "rows", label: "Rows", type: "range", min: 4, max: 30, step: 1, value: 14 },
    { name: "compression", label: "Compression", type: "range", min: 0, max: 0.97, step: 0.01, value: 0.9 },
    { name: "fold", label: "Fold position", type: "range", min: 0.1, max: 0.9, step: 0.01, value: 0.62 },
  ],
  draw: function draw(p, pen) {
    const margin = 40;
    const w = pen.width - 2 * margin;
    const h = pen.height - 2 * margin;
    const reach = Math.max(p.fold, 1 - p.fold);

    // Column width follows a density that falls gradually toward the fold; sample and normalize it.
    const density = (u) => 1 - p.compression * (1 - Math.abs(u - p.fold) / reach) ** 0.8;
    const widths = [];
    for (let i = 0; i < p.columns; i++) {
      let sum = 0;
      for (let k = 0; k < 8; k++) sum += density((i + (k + 0.5) / 8) / p.columns);
      widths.push(sum);
    }
    const total = widths.reduce((a, b) => a + b, 0);
    const rowHeight = h / p.rows;

    let x = margin;
    for (let i = 0; i < p.columns; i++) {
      const cw = (widths[i] / total) * w;
      for (let j = 0; j < p.rows; j++) {
        if ((i + j) % 2 !== 0) continue;
        const y = margin + j * rowHeight;
        pen.polygon([[x, y], [x + cw, y], [x + cw, y + rowHeight], [x, y + rowHeight]], { fill: p.ink, stroke: "none" });
      }
      x += cw;
    }
    pen.polygon([[margin, margin], [margin + w, margin], [margin + w, margin + h], [margin, margin + h]]);
  },
});
