Gallery.register({
  id: "paradox-circle",
  title: "Paradox Circle",
  description:
    "A disc cut into rings and wedges. The center wedges are triangles, the outer ones " +
    "are trapezoids, and each one spirals inward as a Paradox, alternating direction.",
  tags: ["geometric", "paradox", "radial"],
  instruction:
    "Draw a circle and divide it into {rings} rings and {sectors} equal wedges: triangles " +
    "at the center, four-sided pieces outside. Inside each piece, draw lines that start " +
    "where the last one ended and land {ratio%} along the next side, {steps} times, turning " +
    "{alternate?the opposite way in neighbouring pieces:the same way everywhere}.{outline? " +
    "Trace the circle.:}",
  params: [
    { name: "sectors", label: "Wedges", type: "range", min: 3, max: 32, step: 1, value: 12 },
    { name: "rings", label: "Rings", type: "range", min: 1, max: 6, step: 1, value: 3 },
    { name: "steps", label: "Lines per piece", type: "range", min: 1, max: 60, step: 1, value: 22 },
    { name: "ratio", label: "Ratio", type: "range", min: 0.02, max: 0.5, step: 0.01, value: 0.14 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 150, step: 1, value: 30 },
    { name: "alternate", label: "Alternate spin", type: "checkbox", value: true },
    { name: "outline", label: "Circle outline", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const cx = pen.width / 2;
    const cy = pen.height / 2;
    const radius = pen.width / 2 - p.margin;

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

    const at = (angle, r) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];

    for (let ring = 0; ring < p.rings; ring++) {
      const inner = (radius * ring) / p.rings;
      const outer = (radius * (ring + 1)) / p.rings;
      for (let k = 0; k < p.sectors; k++) {
        const a0 = (2 * Math.PI * k) / p.sectors;
        const a1 = (2 * Math.PI * (k + 1)) / p.sectors;
        const clockwise = p.alternate ? (k + ring) % 2 === 0 : true;
        const piece =
          ring === 0
            ? [[cx, cy], at(a0, outer), at(a1, outer)]
            : [at(a0, inner), at(a0, outer), at(a1, outer), at(a1, inner)];
        spiral(piece, clockwise);
      }
    }

    if (p.outline) pen.circle(cx, cy, radius);
  },
});
