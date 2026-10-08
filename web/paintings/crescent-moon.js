Gallery.register({
  id: "crescent-moon",
  title: "Crescent Moon",
  description:
    "Half moons line the inside of the frame, and echo after echo of their scalloped " +
    "outline ripples toward the middle, the classic Crescent Moon tangle.",
  tags: ["geometric", "radial"],
  instruction:
    "Inside a square frame, draw a quarter circle in each corner and {moons} half circles " +
    "along each side between them, all bulging inward{fill? and filled in:}. Then trace the " +
    "scalloped outline again and again, {gap} further in each time, {auras} times, letting " +
    "each echo round off between the moons.",
  params: [
    { name: "moons", label: "Moons per side", type: "range", min: 2, max: 12, step: 1, value: 5 },
    { name: "auras", label: "Auras", type: "range", min: 1, max: 40, step: 1, value: 16 },
    { name: "gap", label: "Aura gap", type: "range", min: 4, max: 30, step: 1, value: 12 },
    { name: "fill", label: "Fill the moons", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const margin = 40;
    const side = pen.width - 2 * margin;
    const step = side / (p.moons + 1);
    const r = step * 0.42;
    const f = (n) => n.toFixed(2);

    // Each side is drawn in a local frame: t runs along the side, depth points inward.
    const sides = [
      (t, d) => [margin + t, margin + d],
      (t, d) => [margin + side - d, margin + t],
      (t, d) => [margin + side - t, margin + side - d],
      (t, d) => [margin + d, margin + side - t],
    ];
    // Moon centers along a side; the first and last sit on the corners, shared with the next side.
    const centers = Array.from({ length: p.moons + 2 }, (_, i) => i * step);
    // Depth of the outline offset by `off` from the moons and the frame line.
    const depth = (t, off) => {
      const R = r + off;
      let best = off;
      for (const c of centers) {
        if (Math.abs(t - c) < R) best = Math.max(best, Math.sqrt(R * R - (t - c) ** 2));
      }
      return best;
    };
    // Where an echo crosses the corner diagonal (depth = t), searching from the middle outward.
    const diagonal = (off) => {
      let t = side / 2;
      if (depth(t, off) >= t) return null;
      while (depth(t, off) < t) t -= 1;
      let [lo, hi] = [t, t + 1];
      for (let i = 0; i < 30; i++) {
        const m = (lo + hi) / 2;
        if (depth(m, off) >= m) lo = m;
        else hi = m;
      }
      return (lo + hi) / 2;
    };

    pen.polygon([[margin, margin], [margin + side, margin], [margin + side, margin + side], [margin, margin + side]], {
      width: p.strokeWidth * 1.6,
    });

    // Moons: a quarter circle in each corner and half circles along the sides, none overlapping.
    sides.forEach((at, s) => {
      const base = (s * Math.PI) / 2;
      for (let i = 0; i <= p.moons; i++) {
        const [x, y] = at(centers[i], 0);
        const corner = i === 0;
        const [a0, a1] = [base, base + (corner ? Math.PI / 2 : Math.PI)];
        if (!p.fill) {
          pen.arc(x, y, r, a0, a1);
          continue;
        }
        const [sx, sy, ex, ey] = [x + r * Math.cos(a0), y + r * Math.sin(a0), x + r * Math.cos(a1), y + r * Math.sin(a1)];
        const close = corner ? `L${f(x)} ${f(y)}Z` : "Z";
        pen.path(`M${f(sx)} ${f(sy)}A${f(r)} ${f(r)} 0 0 1 ${f(ex)} ${f(ey)}${close}`, { fill: p.ink });
      }
    });

    // Each echo is one closed loop whose four sides meet exactly on the diagonals.
    for (let k = 1; k <= p.auras; k++) {
      const off = k * p.gap;
      const t0 = diagonal(off);
      if (t0 === null) break;
      // Sample evenly, plus the cusps halfway between moons so the points stay sharp.
      const ts = [];
      for (let t = t0; t < side - t0; t += 3) ts.push(t);
      for (let i = 0; i + 1 < centers.length; i++) {
        const cusp = centers[i] + step / 2;
        if (cusp > t0 && cusp < side - t0) ts.push(cusp);
      }
      ts.sort((a, b) => a - b);
      const points = [];
      for (const at of sides) for (const t of ts) points.push(at(t, depth(t, off)));
      pen.polygon(points);
    }
  },
});
