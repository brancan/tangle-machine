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
    "with radial rungs {spacing} px apart, spread wider when the sheet would need more than 12,000 of them.",
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
    // Distance from a point to the framed sheet (0 inside it).
    const outside = (x, y) => Math.hypot(Math.max(M - x, 0, x - (W - M)), Math.max(M - y, 0, y - (H - M)));

    // Path data in tenths of a pixel: an absolute start, then each point relative to the last.
    const tenth = (n) => Math.round(n * 10);
    const relPath = (pts) => {
      let [px, py] = pts[0].map(tenth);
      let d = `M${px / 10} ${py / 10}l`;
      for (let i = 1; i < pts.length; i++) {
        const [x, y] = pts[i].map(tenth);
        d += `${(x - px) / 10} ${(y - py) / 10} `;
        [px, py] = [x, y];
      }
      return d.trimEnd();
    };

    // Band k runs between these angles; its outline and rungs only matter where it crosses the sheet.
    const t0 = (k) => k * turn + Math.log(rMin) / b;
    // One extra turn so the inner edge also clears the far corners.
    const t1 = (k) => (k + 1) * turn + 2 * Math.PI + Math.log(reach) / b;
    // Radial rungs across band k, about `spacing` apart along its outer edge.
    const rungsOf = (k, spacing) => {
      const rungs = [];
      for (let t = t0(k); t < t1(k); ) {
        const r = radius(t, k);
        if (r > 2) {
          const [x0, y0] = at(t, Math.min(r, reach));
          const [x1, y1] = at(t, Math.min(radius(t, k + 1), reach));
          // Rungs wholly beyond one side of the frame would be clipped away anyway.
          const hidden = (x0 < M && x1 < M) || (x0 > W - M && x1 > W - M) || (y0 < M && y1 < M) || (y0 > H - M && y1 > H - M);
          if (!hidden && Math.hypot(x0 - x1, y0 - y1) > 0.5) rungs.push([[x0, y0], [x1, y1]]);
        }
        t += Math.max(spacing / (Math.max(r, 2) * stretch), 0.002);
        if (radius(t, k + 1) > reach) break;
      }
      return rungs;
    };
    // With an odd count the last band would touch the first: leave it hatched.
    const solid = (k) => p.alternate && k % 2 === 0 && !(N % 2 === 1 && k === N - 1);
    const hatched = [...Array(N).keys()].filter((k) => !solid(k));
    let rungs = hatched.map((k) => rungsOf(k, p.spacing));
    // Very thin bands at fine spacing would need tens of thousands of rungs: past the budget,
    // the rungs spread out just enough to fit it.
    const MAX_RUNGS = 12000;
    const count = rungs.reduce((sum, list) => sum + list.length, 0);
    if (count > MAX_RUNGS) rungs = hatched.map((k) => rungsOf(k, (p.spacing * count) / MAX_RUNGS));

    const frame = `M${M} ${M}H${W - M}V${H - M}H${M}Z`;
    pen.clip(frame, () => {
      for (let k = 0; k < N; k++) {
        // Angle samples, denser where the outer edge is far from the centre (chord error ≈ 0.3 px).
        // Off the sheet the step grows with the distance to the frame, never far enough to cut in.
        const thetas = [];
        for (let t = t0(k); t < t1(k); ) {
          thetas.push(t);
          const r = radius(t, k);
          const away = Math.min(outside(...at(t, r)), outside(...at(t, radius(t, k + 1))));
          t += Math.min(0.25, Math.max(Math.sqrt(2.4 / r), (away - 1) / (r * (stretch + 0.04))));
        }
        thetas.push(t1(k));
        const outer = thetas.map((t) => at(t, radius(t, k)));
        const inner = thetas.map((t) => at(t, radius(t, k + 1))).reverse();
        const d = relPath([...outer, ...inner]) + "Z";
        if (solid(k)) {
          pen.path(d, { fill: p.ink });
          continue;
        }
        const list = rungs[hatched.indexOf(k)];
        if (list.length) pen.path(list.map(relPath).join(""), { width: f(0.7 * p.strokeWidth) });
        pen.path(d, { width: f(p.strokeWidth) });
      }
    });
    pen.path(frame, { width: f(1.5 * p.strokeWidth) });
  },
});
