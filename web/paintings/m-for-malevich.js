Gallery.register({
  id: "m-for-malevich",
  title: "M for Malevich",
  description:
    "After Vera Molnar's M as in Malevich: an interpretation, not the original. A grid of " +
    "bare letters M, five points and four strokes each, pushed out of shape by chance a " +
    "little more with every letter.",
  tags: ["geometric", "random"],
  instruction:
    "Divide the wall into a {cells} × {cells} grid. In each square write the letter M as a " +
    "single stroke through five points: up the left leg, down to the middle, up again and " +
    "down the right leg. Move every point at random (seed {seed}) by up to {disorder%} of " +
    "the square{grow?, scaled from nothing in the first square to the full amount in the " +
    "last, reading row by row:}.",
  params: [
    { name: "cells", label: "Cells per side", type: "range", min: 2, max: 16, step: 1, value: 8 },
    { name: "disorder", label: "Disorder", type: "range", min: 0, max: 0.6, step: 0.02, value: 0.3 },
    { name: "grow", label: "Disorder grows", type: "checkbox", value: true },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 7 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 50;
    const cell = (pen.width - 2 * margin) / p.cells;
    const half = cell * 0.32;
    const last = p.cells * p.cells - 1;
    // The schematic M, in units of half a letter: feet, shoulders and the middle valley.
    const shape = [[-1, 1], [-1, -1], [0, 0.3], [1, -1], [1, 1]];

    for (let row = 0; row < p.cells; row++) {
      for (let col = 0; col < p.cells; col++) {
        const cx = margin + (col + 0.5) * cell;
        const cy = margin + (row + 0.5) * cell;
        const amount = p.disorder * cell * (p.grow ? (row * p.cells + col) / last : 1);
        const nudge = () => (rand() * 2 - 1) * amount;
        pen.polyline(shape.map(([x, y]) => [cx + x * half + nudge(), cy + y * half + nudge()]));
      }
    }
  },
});
