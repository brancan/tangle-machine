Gallery.register({
  id: "des-ordres",
  title: "(Des)Ordres",
  description:
    "After Vera Molnar's (Des)Ordres (1974): an interpretation, not the original. Every cell " +
    "of a grid holds a nest of concentric squares whose corners have been nudged at random, " +
    "so order and disorder sit side by side.",
  tags: ["geometric", "random"],
  instruction:
    "Divide the wall into a {cells} × {cells} grid. In each cell draw {squares} concentric " +
    "squares, evenly spaced, and move every corner at random (seed {seed}) by up to " +
    "{disorder%} of the gap between two squares.",
  params: [
    { name: "cells", label: "Cells per side", type: "range", min: 2, max: 20, step: 1, value: 10 },
    { name: "squares", label: "Squares per cell", type: "range", min: 1, max: 12, step: 1, value: 6 },
    { name: "disorder", label: "Disorder", type: "range", min: 0, max: 1.5, step: 0.05, value: 0.6 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 5 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 50;
    const cell = (pen.width - 2 * margin) / p.cells;
    const gap = (cell * 0.46) / p.squares;

    for (let row = 0; row < p.cells; row++) {
      for (let col = 0; col < p.cells; col++) {
        const cx = margin + (col + 0.5) * cell;
        const cy = margin + (row + 0.5) * cell;
        for (let k = 1; k <= p.squares; k++) {
          const half = k * gap;
          const jitter = () => (rand() * 2 - 1) * p.disorder * gap;
          pen.polygon(
            [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [cx + sx * half + jitter(), cy + sy * half + jitter()])
          );
        }
      }
    }
  },
});
