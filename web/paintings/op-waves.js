Gallery.register({
  id: "op-waves",
  title: "Op Waves",
  description:
    "A checkerboard whose columns and rows ripple like fabric. Optional color fringes " +
    "trail each column edge for a chromatic, vibrating look.",
  params: [
    { name: "cols", label: "Columns", type: "range", min: 2, max: 24, step: 1, value: 8 },
    { name: "rows", label: "Rows", type: "range", min: 2, max: 30, step: 1, value: 11 },
    { name: "ampX", label: "Column wave", type: "range", min: 0, max: 60, step: 1, value: 18 },
    { name: "ampY", label: "Row wave", type: "range", min: 0, max: 60, step: 1, value: 22 },
    { name: "freq", label: "Waves", type: "range", min: 0.25, max: 4, step: 0.05, value: 1.25 },
    { name: "fringe", label: "Color fringes", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const W = pen.width;
    const H = pen.height;
    const cw = W / p.cols;
    const rh = H / p.rows;
    const res = 8;
    const tau = 2 * Math.PI;

    const warp = (x, y) => [
      x + p.ampX * Math.sin((tau * p.freq * y) / H),
      y + p.ampY * Math.sin((tau * p.freq * x) / W + Math.PI / 3),
    ];

    // One extra row and column on each side so warped edges still cover the canvas.
    for (let i = -1; i <= p.cols; i++) {
      for (let j = -1; j <= p.rows; j++) {
        if ((i + j + 2) % 2) continue;
        const [x0, x1, y0, y1] = [i * cw, (i + 1) * cw, j * rh, (j + 1) * rh];
        const poly = [];
        for (let s = 0; s < res; s++) poly.push(warp(x0 + (cw * s) / res, y0));
        for (let s = 0; s < res; s++) poly.push(warp(x1, y0 + (rh * s) / res));
        for (let s = 0; s < res; s++) poly.push(warp(x1 - (cw * s) / res, y1));
        for (let s = 0; s < res; s++) poly.push(warp(x0, y1 - (rh * s) / res));
        pen.polygon(poly, { fill: p.ink });
      }
    }

    if (p.fringe) {
      const fringes = [["#e63946", 3], ["#f4a261", 7], ["#2a9df4", 11]];
      for (let i = 0; i <= p.cols; i++) {
        for (const [color, offset] of fringes) {
          const line = [];
          for (let y = -rh; y <= H + rh; y += rh / res) line.push(warp(i * cw + offset, y));
          pen.polyline(line, { stroke: color, width: 2.5 });
        }
      }
    }
  },
});
