Gallery.register({
  id: "crescent-moon",
  title: "Crescent Moon",
  description:
    "Half moons line the inside of the frame, and echo after echo of their scalloped " +
    "outline ripples toward the middle, the classic Crescent Moon tangle.",
  tags: ["geometric", "radial"],
  instruction:
    "Inside a square frame, draw {moons} half circles along each side, bulging inward" +
    "{fill? and fill them in:}. Then trace the scalloped outline again and again, {gap} " +
    "further in each time, {auras} times, letting each echo round off between the moons.",
  params: [
    { name: "moons", label: "Moons per side", type: "range", min: 2, max: 12, step: 1, value: 5 },
    { name: "auras", label: "Auras", type: "range", min: 1, max: 40, step: 1, value: 16 },
    { name: "gap", label: "Aura gap", type: "range", min: 4, max: 30, step: 1, value: 12 },
    { name: "fill", label: "Fill the moons", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const margin = 40;
    const side = pen.width - 2 * margin;
    const center = pen.width / 2;
    const step = side / p.moons;
    const r = step * 0.42;
    const f = (n) => n.toFixed(2);

    // Each side is drawn in a local frame: t runs along the side, depth points inward.
    const sides = [
      (t, d) => [margin + t, margin + d],
      (t, d) => [margin + side - d, margin + t],
      (t, d) => [margin + side - t, margin + side - d],
      (t, d) => [margin + d, margin + side - t],
    ];
    const centers = Array.from({ length: p.moons }, (_, i) => (i + 0.5) * step);
    // Depth of the outline offset by `off` from the moons and the frame line.
    const depth = (t, off) => {
      let best = off;
      for (const c of centers) {
        const R = r + off;
        if (Math.abs(t - c) < R) best = Math.max(best, Math.sqrt(R * R - (t - c) ** 2));
      }
      return best;
    };

    pen.polygon([[margin, margin], [margin + side, margin], [margin + side, margin + side], [margin, margin + side]], {
      width: p.strokeWidth * 1.6,
    });

    for (const at of sides) {
      // Clip to the triangle between this side and the center, so the four sides meet on the diagonals.
      const [a, b] = [at(0, 0), at(side, 0)];
      const tri = `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}L${f(center)} ${f(center)}Z`;
      pen.clip(tri, () => {
        for (const c of centers) {
          const [x, y] = at(c, 0);
          const angle = Math.atan2(center - y, center - x);
          // Half moon: the arc bulging inward from the frame line.
          const ends = [at(c - r, 0), at(c + r, 0)];
          const d =
            `M${f(ends[0][0])} ${f(ends[0][1])}A${f(r)} ${f(r)} 0 0 0 ${f(ends[1][0])} ${f(ends[1][1])}Z`;
          if (p.fill) pen.path(d, { fill: p.ink });
          else pen.arc(x, y, r, angle - Math.PI / 2, angle + Math.PI / 2);
        }
        for (let k = 1; k <= p.auras; k++) {
          const off = k * p.gap;
          if (off > side / 2) break;
          const points = [];
          for (let t = -off; t <= side + off; t += 3) points.push(at(t, depth(t, off)));
          pen.polyline(points);
        }
      });
    }
  },
});
