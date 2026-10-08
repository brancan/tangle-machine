Gallery.register({
  id: "bulge-checker",
  title: "Bulge Checker",
  description:
    "A checkerboard pushed through a lens: the grid swells toward you (or sinks away) " +
    "while its border stays put. Op art in the style of Vasarely.",
  tags: ["op-art", "color"],
  instruction:
    "Draw a {n} × {n} checkerboard with a margin of {margin} px and push it through a lens " +
    "of strength {strength}: squares near the center swell while the border stays put. Fill " +
    "every other square{color? with colors running from blue to green:}.",
  params: [
    { name: "n", label: "Squares per side", type: "range", min: 2, max: 40, step: 1, value: 16 },
    { name: "strength", label: "Bulge (negative = pinch)", type: "range", min: -0.5, max: 0.5, step: 0.01, value: 0.5 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 40 },
    { name: "color", label: "Gradient color", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const size = pen.width - 2 * p.margin;
    const res = 6;

    // Lens on [-1, 1]^2: magnifies the center, leaves the border fixed.
    const warp = (u, v) => {
      const k = 1 + p.strength * (1 - u * u) * (1 - v * v);
      return [p.margin + ((u * k + 1) / 2) * size, p.margin + ((v * k + 1) / 2) * size];
    };
    const grid = (i) => -1 + (2 * i) / p.n;

    for (let i = 0; i < p.n; i++) {
      for (let j = 0; j < p.n; j++) {
        if ((i + j) % 2) continue;
        const [u0, u1, v0, v1] = [grid(i), grid(i + 1), grid(j), grid(j + 1)];
        const poly = [];
        for (let s = 0; s < res; s++) poly.push(warp(u0 + ((u1 - u0) * s) / res, v0));
        for (let s = 0; s < res; s++) poly.push(warp(u1, v0 + ((v1 - v0) * s) / res));
        for (let s = 0; s < res; s++) poly.push(warp(u1 - ((u1 - u0) * s) / res, v1));
        for (let s = 0; s < res; s++) poly.push(warp(u0, v1 - ((v1 - v0) * s) / res));
        const t = (i + j) / (2 * p.n);
        const fill = p.color ? `hsl(${190 - 60 * t} 65% ${32 + 20 * t}%)` : p.ink;
        pen.polygon(poly, { fill, stroke: fill });
      }
    }
    pen.polygon([warp(-1, -1), warp(1, -1), warp(1, 1), warp(-1, 1)]);
  },
});
