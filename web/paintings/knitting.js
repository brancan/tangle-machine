Gallery.register({
  id: "knitting",
  title: "Knitting",
  description:
    "Columns of V-shaped stitches, each one two leaves leaning together, stacked so every " +
    "row tucks into the one above. Darken one leaf of each stitch for a ribbed knit.",
  tags: ["tessellation"],
  instruction:
    "Divide the wall into {cols} columns and {rows} rows. In each cell, draw a stitch: two " +
    "leaves, {swell%} as wide as they are long, leaning from a shared point at the bottom " +
    "to the upper corners, with {veins} veins each{dark?; fill the left leaf with ink:}. " +
    "Let each row overlap the one above.",
  params: [
    { name: "cols", label: "Columns", type: "range", min: 2, max: 20, step: 1, value: 7 },
    { name: "rows", label: "Rows", type: "range", min: 3, max: 30, step: 1, value: 11 },
    { name: "swell", label: "Leaf width", type: "range", min: 0.05, max: 0.4, step: 0.01, value: 0.2 },
    { name: "veins", label: "Veins", type: "range", min: 0, max: 4, step: 1, value: 1 },
    { name: "dark", label: "Dark left leaves", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const cw = pen.width / p.cols;
    const rh = pen.height / p.rows;
    const f = (n) => n.toFixed(2);

    // Leaf from tip a to tip b: two quadratic curves bulging to either side.
    const leaf = ([ax, ay], [bx, by], style) => {
      const len = Math.hypot(bx - ax, by - ay);
      const [nx, ny] = [-(by - ay) / len, (bx - ax) / len];
      const [mx, my] = [(ax + bx) / 2, (ay + by) / 2];
      const w = p.swell * len;
      pen.path(
        `M${f(ax)} ${f(ay)}Q${f(mx + nx * w)} ${f(my + ny * w)} ${f(bx)} ${f(by)}` +
          `Q${f(mx - nx * w)} ${f(my - ny * w)} ${f(ax)} ${f(ay)}Z`,
        style
      );
      for (let k = 1; k <= p.veins; k++) {
        const o = w * (k / (p.veins + 1) - 0.5) * 0.9;
        pen.path(`M${f(ax)} ${f(ay)}Q${f(mx + nx * o)} ${f(my + ny * o)} ${f(bx)} ${f(by)}`, {
          stroke: style.fill === p.ink ? p.paper : p.ink,
        });
      }
    };

    // Top rows first; each stitch spans 1.5 rows so the next row overlaps its tips.
    for (let r = -1; r <= p.rows; r++) {
      for (let c = 0; c < p.cols; c++) {
        const cx = (c + 0.5) * cw;
        const bottom = [cx, (r + 1.5) * rh];
        leaf(bottom, [cx - cw * 0.46, r * rh], { fill: p.dark ? p.ink : p.paper });
        leaf(bottom, [cx + cw * 0.46, r * rh], { fill: p.paper });
      }
    }
  },
});
