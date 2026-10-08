Gallery.register({
  id: "hilbert-curve",
  title: "Hilbert Curve",
  description:
    "David Hilbert's space-filling curve: one unbroken line that folds back and forth so " +
    "that, order by order, it passes through every cell of an ever finer grid.",
  tags: ["geometric", "tessellation"],
  instruction:
    "Divide the wall into a grid of 2 to the power {order} squares on a side. Visit every " +
    "square with one line, in Hilbert's order, turning only at right angles" +
    "{rounded?, and round off every corner:}. Keep {margin} clear around the edge.",
  params: [
    { name: "order", label: "Order", type: "range", min: 1, max: 7, step: 1, value: 5 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 150, step: 1, value: 50 },
    { name: "rounded", label: "Rounded corners", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const n = 2 ** p.order;
    const step = (pen.width - 2 * p.margin) / n;
    const f = (v) => v.toFixed(2);

    // Classic index-to-coordinate conversion for a Hilbert curve of side n.
    const toXY = (index) => {
      let x = 0;
      let y = 0;
      let t = index;
      for (let s = 1; s < n; s *= 2) {
        const rx = 1 & (t / 2);
        const ry = 1 & (t ^ rx);
        if (ry === 0) {
          if (rx === 1) {
            x = s - 1 - x;
            y = s - 1 - y;
          }
          [x, y] = [y, x];
        }
        x += s * rx;
        y += s * ry;
        t = Math.floor(t / 4);
      }
      return [p.margin + (x + 0.5) * step, p.margin + (y + 0.5) * step];
    };
    const points = Array.from({ length: n * n }, (_, i) => toXY(i));

    if (!p.rounded || points.length < 3) {
      pen.polyline(points);
      return;
    }
    // Rounded: run from midpoint to midpoint, bending through each vertex with a quadratic curve.
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let d = `M${f(points[0][0])} ${f(points[0][1])}`;
    for (let i = 1; i < points.length - 1; i++) {
      const m = mid(points[i], points[i + 1]);
      d += `Q${f(points[i][0])} ${f(points[i][1])} ${f(m[0])} ${f(m[1])}`;
    }
    const last = points[points.length - 1];
    d += `L${f(last[0])} ${f(last[1])}`;
    pen.path(d);
  },
});
