Gallery.register({
  id: "warped-grid",
  title: "Warped Grid",
  description:
    "A grid bent by slow waves, drawn in heavy ink. Every cell is filled with fine lines " +
    "that follow the curve of its walls, switching direction from cell to cell.",
  params: [
    { name: "cols", label: "Columns", type: "range", min: 2, max: 16, step: 1, value: 7 },
    { name: "rows", label: "Rows", type: "range", min: 2, max: 16, step: 1, value: 8 },
    { name: "warp", label: "Warp", type: "range", min: 0, max: 1.5, step: 0.01, value: 1.1 },
    { name: "density", label: "Lines per cell", type: "range", min: 2, max: 40, step: 1, value: 16 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 3 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const f = (n) => n.toFixed(1);
    const cw = W / p.cols;
    const ch = H / p.rows;

    // Two waves per axis: columns sway sideways along their length, rows bob up and down.
    const wave = () => ({ k: ((0.8 + rand() * 1.4) * 2 * Math.PI) / W, k2: ((0.3 + rand() * 0.6) * 2 * Math.PI) / W, ph: rand() * 6.3, ph2: rand() * 6.3 });
    const wx = wave();
    const wy = wave();
    const ax = Math.min(cw, 140) * 0.45 * p.warp;
    const ay = Math.min(ch, 140) * 0.45 * p.warp;
    const map = (u, v) => [
      u + ax * (Math.sin(v * wx.k + wx.ph) * 0.8 + Math.sin((u + v) * wx.k2 + wx.ph2) * 0.4),
      v + ay * (Math.sin(u * wy.k + wy.ph) * 0.8 + Math.sin((u - v) * wy.k2 + wy.ph2) * 0.4),
    ];
    const trace = (u0, v0, u1, v1, steps) => {
      let d = "";
      for (let s = 0; s <= steps; s++) {
        const [x, y] = map(u0 + ((u1 - u0) * s) / steps, v0 + ((v1 - v0) * s) / steps);
        d += `${s ? "L" : "M"}${f(x)} ${f(y)}`;
      }
      return d;
    };

    // Fine lines: checkerboard of cells hatched along one family or the other.
    let hatch = "";
    for (let i = -1; i <= p.cols; i++) {
      for (let j = -1; j <= p.rows; j++) {
        const u0 = i * cw;
        const v0 = j * ch;
        for (let t = 1; t < p.density; t++) {
          const s = t / p.density;
          if ((i + j) % 2) hatch += trace(u0 + cw * s, v0, u0 + cw * s, v0 + ch, 6);
          else hatch += trace(u0, v0 + ch * s, u0 + cw, v0 + ch * s, 6);
        }
      }
    }

    pen.clip(`M0 0H${W}V${H}H0Z`, () => {
      pen.path(hatch, { width: f(0.6 * p.strokeWidth) });
      // Heavy grid lines on top.
      let grid = "";
      for (let i = -1; i <= p.cols + 1; i++) grid += trace(i * cw, -ch, i * cw, H + ch, 100);
      for (let j = -1; j <= p.rows + 1; j++) grid += trace(-cw, j * ch, W + cw, j * ch, 100);
      pen.path(grid, { width: f(3.2 * p.strokeWidth) });
    });
  },
});
