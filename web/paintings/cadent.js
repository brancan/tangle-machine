Gallery.register({
  id: "cadent",
  title: "Cadent",
  description:
    "A grid of dots linked by S-curves: each curve leaves the top of one dot, slips between " +
    "two neighbours and lands on the bottom of the next, weaving a soft lattice.",
  tags: ["geometric", "tessellation"],
  instruction:
    "Draw a {grid} × {grid} grid of dots, each {dot%} of the grid step across" +
    "{solid? and filled in:}. From the top of every dot draw an S-curve to the bottom of the " +
    "dot to its right, bowed by {bow%}.{vertical? Also link the right side of every dot to " +
    "the left side of the dot below it.:}",
  params: [
    { name: "grid", label: "Dots per side", type: "range", min: 3, max: 20, step: 1, value: 8 },
    { name: "dot", label: "Dot size", type: "range", min: 0.1, max: 0.6, step: 0.01, value: 0.34 },
    { name: "bow", label: "Curve bow", type: "range", min: 0, max: 1, step: 0.01, value: 0.5 },
    { name: "vertical", label: "Vertical curves", type: "checkbox", value: true },
    { name: "solid", label: "Solid dots", type: "checkbox", value: false },
  ],
  draw: function draw(p, pen) {
    const margin = 60;
    const step = (pen.width - 2 * margin) / (p.grid - 1 || 1);
    const r = (p.dot * step) / 2;
    const reach = p.bow * step;
    const f = (n) => n.toFixed(2);
    const at = (i, j) => [margin + i * step, margin + j * step];
    // An S-curve from a, leaving along direction da, to b, arriving along db.
    const s = (a, da, b, db) =>
      pen.path(
        `M${f(a[0])} ${f(a[1])}C${f(a[0] + da[0] * reach)} ${f(a[1] + da[1] * reach)} ` +
          `${f(b[0] - db[0] * reach)} ${f(b[1] - db[1] * reach)} ${f(b[0])} ${f(b[1])}`
      );

    for (let j = 0; j < p.grid; j++) {
      for (let i = 0; i < p.grid; i++) {
        const [x, y] = at(i, j);
        if (i + 1 < p.grid) {
          const [x2, y2] = at(i + 1, j);
          s([x, y - r], [1, 0], [x2, y2 + r], [1, 0]);
        }
        if (p.vertical && j + 1 < p.grid) {
          const [x2, y2] = at(i, j + 1);
          s([x + r, y], [0, 1], [x2 - r, y2], [0, 1]);
        }
      }
    }
    for (let j = 0; j < p.grid; j++) {
      for (let i = 0; i < p.grid; i++) {
        const [x, y] = at(i, j);
        pen.circle(x, y, r, p.solid ? { fill: p.ink } : { fill: p.paper });
      }
    }
  },
});
