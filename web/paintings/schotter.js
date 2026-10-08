Gallery.register({
  id: "schotter",
  title: "Schotter",
  description:
    "After Georg Nees's Schotter (1968): an interpretation, not the original. A column of " +
    "squares starts in perfect order at the top and slowly comes loose row by row, turning " +
    "and drifting more the further down it goes, like gravel spilling out of a grid.",
  tags: ["geometric", "random"],
  instruction:
    "Draw a grid of {columns} × {rows} squares. Leave the first row in order. In every row " +
    "below, turn and shift each square at random (seed {seed}), a little more each row, " +
    "until the last row is disturbed by {disorder} times the full amount.",
  params: [
    { name: "columns", label: "Columns", type: "range", min: 4, max: 24, step: 1, value: 12 },
    { name: "rows", label: "Rows", type: "range", min: 4, max: 32, step: 1, value: 18 },
    { name: "disorder", label: "Disorder", type: "range", min: 0, max: 2, step: 0.05, value: 1.2 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 7 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 60;
    const cell = Math.min((pen.width - 2 * margin) / p.columns, (pen.height - 2 * margin) / p.rows);
    const left = (pen.width - cell * p.columns) / 2;
    const top = (pen.height - cell * p.rows) / 2;
    const half = cell / 2;

    for (let row = 0; row < p.rows; row++) {
      // Disorder grows linearly from the first row to the last.
      const amount = p.rows === 1 ? 0 : (p.disorder * row) / (p.rows - 1);
      for (let col = 0; col < p.columns; col++) {
        const angle = (rand() - 0.5) * amount * (Math.PI / 2);
        const cx = left + (col + 0.5) * cell + (rand() - 0.5) * amount * cell * 0.6;
        const cy = top + (row + 0.5) * cell + (rand() - 0.5) * amount * cell * 0.6;
        const corners = [[-half, -half], [half, -half], [half, half], [-half, half]].map(([x, y]) => [
          cx + x * Math.cos(angle) - y * Math.sin(angle),
          cy + x * Math.sin(angle) + y * Math.cos(angle),
        ]);
        pen.polygon(corners);
      }
    }
  },
});
