Gallery.register({
  id: "honeycomb-paradox",
  title: "Honeycomb Paradox",
  description:
    "A honeycomb of hexagons, each one twisting inward like a Paradox. Split them into " +
    "six triangles for a starry, faceted version.",
  params: [
    { name: "radius", label: "Hexagon size", type: "range", min: 25, max: 200, step: 1, value: 80 },
    { name: "steps", label: "Lines per piece", type: "range", min: 1, max: 60, step: 1, value: 20 },
    { name: "ratio", label: "Ratio", type: "range", min: 0.02, max: 0.5, step: 0.01, value: 0.12 },
    { name: "gap", label: "Gap", type: "range", min: 0, max: 30, step: 1, value: 4 },
    { name: "triangles", label: "Split into triangles", type: "checkbox", value: false },
    { name: "alternate", label: "Alternate spin", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const r = p.radius;
    const h = Math.sqrt(3) * r;
    const size = r - p.gap;

    const spiral = (poly, clockwise) => {
      const next = clockwise ? 1 : poly.length - 1;
      pen.polygon(poly);
      for (let s = 0; s < p.steps; s++) {
        poly = poly.map(([x, y], i) => {
          const [nx, ny] = poly[(i + next) % poly.length];
          return [x + p.ratio * (nx - x), y + p.ratio * (ny - y)];
        });
        pen.polygon(poly);
      }
    };

    const cols = Math.ceil(pen.width / (1.5 * r)) + 1;
    const rows = Math.ceil(pen.height / h) + 1;

    // Flat-topped hexagons; odd columns shift down by half a hexagon.
    for (let col = 0; col <= cols; col++) {
      for (let row = -1; row <= rows; row++) {
        const cx = col * 1.5 * r;
        const cy = row * h + (col % 2 ? h / 2 : 0);
        const hex = [];
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k;
          hex.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
        }
        const clockwise = p.alternate ? col % 2 === 0 : true;

        if (p.triangles) {
          for (let k = 0; k < 6; k++) {
            spiral([hex[k], hex[(k + 1) % 6], [cx, cy]], (k % 2 === 0) === clockwise);
          }
        } else {
          spiral(hex, clockwise);
        }
      }
    }
  },
});
