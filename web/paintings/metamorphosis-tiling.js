Gallery.register({
  id: "metamorphosis-tiling",
  title: "Metamorphosis Tiling",
  description:
    "A tessellation that changes as you read it: plain squares on the left grow bulging, " +
    "interlocking edges column by column until, on the right, they lock together like " +
    "jigsaw creatures.",
  tags: ["tessellation", "geometric"],
  instruction:
    "Divide the wall into {columns} columns and {rows} rows of squares. Bend every shared " +
    "edge into the same wave on both sides, flat in the first column and growing column by " +
    "column until the last bends by {morph%} of a full curve, with waves chosen at random " +
    "(seed {seed}). Color the tiles in two tones like a checkerboard.",
  params: [
    { name: "columns", label: "Columns", type: "range", min: 3, max: 16, step: 1, value: 9 },
    { name: "rows", label: "Rows", type: "range", min: 2, max: 14, step: 1, value: 7 },
    { name: "morph", label: "Morph", type: "range", min: 0, max: 1, step: 0.01, value: 0.9 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 2 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 40;
    const cell = Math.min((pen.width - 2 * margin) / p.columns, (pen.height - 2 * margin) / p.rows);
    const left = (pen.width - cell * p.columns) / 2;
    const top = (pen.height - cell * p.rows) / 2;
    const tones = ["#2f4858", "#e8dcc0"];

    // Edge shapes: one wave per vertical boundary and per column for horizontal ones.
    const shape = () => [0.18 + rand() * 0.1, (rand() - 0.5) * 0.25, rand() < 0.5 ? 1 : -1];
    const vShapes = Array.from({ length: p.columns + 1 }, shape);
    const hShapes = Array.from({ length: p.columns }, shape);
    const wave = ([a, b, sign], t) => sign * (a * Math.sin(2 * Math.PI * t) + b * Math.sin(Math.PI * t));
    const amount = (x) => p.morph * Math.max(0, Math.min(1, x / p.columns)) ** 1.2;
    const steps = 16;

    // Points along an edge in canonical direction; outer frame edges stay straight.
    const vEdge = (i, j) => {
      const k = i === 0 || i === p.columns ? 0 : amount(i);
      return Array.from({ length: steps + 1 }, (_, s) => {
        const t = s / steps;
        return [left + i * cell + cell * k * wave(vShapes[i], t), top + (j + t) * cell];
      });
    };
    const hEdge = (i, j) => {
      const k = j === 0 || j === p.rows ? 0 : amount(i + 0.5);
      return Array.from({ length: steps + 1 }, (_, s) => {
        const t = s / steps;
        return [left + (i + t) * cell, top + j * cell + cell * k * wave(hShapes[i], t)];
      });
    };

    for (let j = 0; j < p.rows; j++) {
      for (let i = 0; i < p.columns; i++) {
        const outline = [
          ...hEdge(i, j),
          ...vEdge(i + 1, j).slice(1),
          ...hEdge(i, j + 1).reverse().slice(1),
          ...vEdge(i, j).reverse().slice(1, -1),
        ];
        pen.polygon(outline, { fill: tones[(i + j) % 2], width: 1 });
        // Late in the change, the shapes come alive with an eye.
        const life = amount(i + 0.5);
        if (life > 0.55) {
          const [ex, ey] = [left + (i + 0.62) * cell, top + (j + 0.38) * cell];
          pen.circle(ex, ey, cell * 0.07, { fill: tones[(i + j + 1) % 2], width: 0.8 });
          pen.circle(ex, ey, cell * 0.025, { fill: p.ink, stroke: "none" });
        }
      }
    }
  },
});
