Gallery.register({
  id: "woven-modules",
  title: "Woven Modules",
  description:
    "A small set of rectangular and diagonal modules, stripes, half squares and blocks, " +
    "placed on a grid by a simple arithmetic rule, so the surface reads like a woven textile.",
  tags: ["tessellation", "geometric", "random"],
  instruction:
    "Divide the wall into {columns} columns and {rows} rows. Number six modules, horizontal " +
    "stripes, vertical stripes, two diagonal half squares, a solid block and an empty square, " +
    "in an order shuffled at random (seed {seed}). In each square place the module given by " +
    "rule {rule} applied to its column and row.",
  params: [
    { name: "columns", label: "Columns", type: "range", min: 3, max: 24, step: 1, value: 12 },
    { name: "rows", label: "Rows", type: "range", min: 3, max: 24, step: 1, value: 12 },
    { name: "rule", label: "Rule", type: "range", min: 1, max: 8, step: 1, value: 3 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 6 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 40;
    const cw = (pen.width - 2 * margin) / p.columns;
    const ch = (pen.height - 2 * margin) / p.rows;
    const accent = "#b5523b";
    const quad = (pts, fill) => pen.polygon(pts, { fill, stroke: "none" });

    // Module index from column i and row j: rule picks the coefficients.
    const rules = [[1, 1, 0], [1, 2, 0], [2, 1, 1], [1, 0, 1], [3, 2, 0], [1, 3, 1], [2, 2, 1], [1, 1, 2]];
    const [a, b, m] = rules[p.rule - 1];
    const order = [0, 1, 2, 3, 4, 5];
    for (let k = order.length - 1; k > 0; k--) {
      const r = Math.floor(rand() * (k + 1));
      [order[k], order[r]] = [order[r], order[k]];
    }

    for (let j = 0; j < p.rows; j++) {
      for (let i = 0; i < p.columns; i++) {
        const x = margin + i * cw;
        const y = margin + j * ch;
        const index = order[(a * i + b * j + m * Math.floor((i * j) / 2)) % 6];
        const color = (i + j) % 3 === 0 ? accent : p.ink;
        if (index === 0 || index === 1) {
          const bands = 4;
          for (let s = 0; s < bands; s++) {
            if (index === 0) quad([[x, y + (s + 0.25) * (ch / bands)], [x + cw, y + (s + 0.25) * (ch / bands)], [x + cw, y + (s + 0.75) * (ch / bands)], [x, y + (s + 0.75) * (ch / bands)]], color);
            else quad([[x + (s + 0.25) * (cw / bands), y], [x + (s + 0.75) * (cw / bands), y], [x + (s + 0.75) * (cw / bands), y + ch], [x + (s + 0.25) * (cw / bands), y + ch]], color);
          }
        } else if (index === 2) {
          quad([[x, y], [x + cw, y], [x, y + ch]], color);
        } else if (index === 3) {
          quad([[x + cw, y], [x + cw, y + ch], [x, y + ch]], color);
        } else if (index === 4) {
          quad([[x + cw * 0.1, y + ch * 0.1], [x + cw * 0.9, y + ch * 0.1], [x + cw * 0.9, y + ch * 0.9], [x + cw * 0.1, y + ch * 0.9]], color);
        }
        pen.polygon([[x, y], [x + cw, y], [x + cw, y + ch], [x, y + ch]], { width: 0.3 });
      }
    }
  },
});
