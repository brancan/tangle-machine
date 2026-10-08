Gallery.register({
  id: "log-spiral",
  title: "Logarithmic Spiral",
  description:
    "Logarithmic spirals turning out of one point like the arms of a nautilus or a sunflower. " +
    "The bands between them widen as they grow and alternate solid ink with radial hatching.",
  tags: ["geometric", "radial"],
  instruction:
    "From a point {centerX%} across and {centerY%} down, draw {arms} logarithmic spirals that grow " +
    "by a factor of e for every 1/{growth} radians, evenly turned around the point. " +
    "{alternate?Fill every other band between them with ink and cross the rest:Cross every band between them} " +
    "with radial rungs {spacing} px apart.",
  params: [
    { name: "arms", label: "Arms", type: "range", min: 2, max: 32, step: 1, value: 12 },
    { name: "growth", label: "Growth", type: "range", min: 0.08, max: 0.6, step: 0.01, value: 0.32 },
    { name: "spacing", label: "Hatch spacing", type: "range", min: 3, max: 20, step: 0.5, value: 5 },
    { name: "alternate", label: "Alternate fill", type: "checkbox", value: true },
    { name: "centerX", label: "Centre X", type: "range", min: 0, max: 1, step: 0.01, value: 0.5 },
    { name: "centerY", label: "Centre Y", type: "range", min: 0, max: 1, step: 0.01, value: 0.5 },
  ],
  draw: function draw(p, pen) {
    const W = pen.width;
    const H = pen.height;
    const M = 24;
    const f = (n) => n.toFixed(1);
    const cx = M + p.centerX * (W - 2 * M);
    const cy = M + p.centerY * (H - 2 * M);
    const b = p.growth;
    const N = p.arms;
    const turn = (2 * Math.PI) / N;
    const stretch = Math.sqrt(1 + b * b);
    // Far enough to leave the sheet from any centre.
    const reach = Math.max(...[[M, M], [W - M, M], [M, H - M], [W - M, H - M]].map(([x, y]) => Math.hypot(x - cx, y - cy))) + 4;
    const rMin = 0.3;
    // Spiral k: r = e^(b·(θ − k·turn)); band k lies between spiral k (outside) and k + 1 (inside).
    const radius = (theta, k) => Math.exp(b * (theta - k * turn));
    const at = (theta, r) => [cx + r * Math.cos(theta), cy + r * Math.sin(theta)];

    const frame = `M${M} ${M}H${W - M}V${H - M}H${M}Z`;
    pen.clip(frame, () => {
      for (let k = 0; k < N; k++) {
        const t0 = k * turn + Math.log(rMin) / b;
        // One extra turn so the inner edge also clears the far corners.
        const t1 = (k + 1) * turn + 2 * Math.PI + Math.log(reach) / b;
        // Angle samples, denser where the outer edge is far from the centre (chord error ≈ 0.3 px).
        const thetas = [];
        for (let t = t0; t < t1; t += Math.min(0.25, Math.sqrt(2.4 / radius(t, k)))) thetas.push(t);
        thetas.push(t1);
        const outer = thetas.map((t) => at(t, radius(t, k)));
        const inner = thetas.map((t) => at(t, radius(t, k + 1))).reverse();
        const d = "M" + [...outer, ...inner].map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";
        // With an odd count the last band would touch the first: leave it hatched.
        const solid = p.alternate && k % 2 === 0 && !(N % 2 === 1 && k === N - 1);
        if (solid) {
          pen.path(d, { fill: p.ink });
          continue;
        }
        // Radial rungs across the band, about `spacing` apart along its outer edge.
        let rungs = "";
        for (let t = t0; t < t1; ) {
          const r = radius(t, k);
          if (r > 2) {
            const [x0, y0] = at(t, Math.min(r, reach));
            const [x1, y1] = at(t, Math.min(radius(t, k + 1), reach));
            if (Math.hypot(x0 - x1, y0 - y1) > 0.5) rungs += `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
          }
          t += Math.max(p.spacing / (Math.max(r, 2) * stretch), 0.002);
          if (radius(t, k + 1) > reach) break;
        }
        if (rungs) pen.path(rungs, { width: f(0.7 * p.strokeWidth) });
        pen.path(d, { width: f(p.strokeWidth) });
      }
    });
    pen.path(frame, { width: f(1.5 * p.strokeWidth) });
  },
});
