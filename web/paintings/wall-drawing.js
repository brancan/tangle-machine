Gallery.register({
  id: "wall-drawing",
  title: "Wall Drawing",
  description:
    "After Sol LeWitt's wall drawings of lines in four directions (from 1969): an " +
    "interpretation, not the original. Vertical, horizontal and the two diagonal line " +
    "families are combined cell by cell, in order or at random.",
  tags: ["geometric"],
  instruction:
    "Divide the wall into a {cells} × {cells} grid. Use lines in four directions, vertical, " +
    "horizontal, diagonal left to right and diagonal right to left, {spacing} apart. In each " +
    "square draw {systematic?the next combination of directions, in order, until all fifteen " +
    "have been used and then start again:a combination of directions chosen at random}. Random " +
    "choices follow seed {seed}.",
  params: [
    { name: "cells", label: "Cells per side", type: "range", min: 1, max: 8, step: 1, value: 4 },
    { name: "spacing", label: "Line spacing", type: "range", min: 3, max: 30, step: 1, value: 8 },
    { name: "systematic", label: "Systematic order", type: "checkbox", value: true },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 1 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 50;
    const pad = 8;
    const cell = (pen.width - 2 * margin) / p.cells;
    const s = cell - 2 * pad;
    const step = p.spacing;
    const diagonal = step * Math.SQRT2;

    let index = 0;
    for (let row = 0; row < p.cells; row++) {
      for (let col = 0; col < p.cells; col++) {
        const x = margin + col * cell + pad;
        const y = margin + row * cell + pad;
        // Bits: 1 vertical, 2 horizontal, 4 diagonal \, 8 diagonal /.
        const mask = p.systematic ? (index % 15) + 1 : 1 + Math.floor(rand() * 15);
        index++;
        if (mask & 1) for (let u = step / 2; u < s; u += step) pen.line(x + u, y, x + u, y + s);
        if (mask & 2) for (let u = step / 2; u < s; u += step) pen.line(x, y + u, x + s, y + u);
        if (mask & 4) {
          // Lines y = x - c inside the square.
          for (let c = -s + diagonal / 2; c < s; c += diagonal) {
            const x0 = Math.max(0, c);
            const x1 = Math.min(s, s + c);
            pen.line(x + x0, y + x0 - c, x + x1, y + x1 - c);
          }
        }
        if (mask & 8) {
          // Lines x + y = c inside the square.
          for (let c = diagonal / 2; c < 2 * s; c += diagonal) {
            const x0 = Math.max(0, c - s);
            const x1 = Math.min(s, c);
            pen.line(x + x0, y + c - x0, x + x1, y + c - x1);
          }
        }
        pen.polygon([[x, y], [x + s, y], [x + s, y + s], [x, y + s]], { width: 0.4 });
      }
    }
  },
});
