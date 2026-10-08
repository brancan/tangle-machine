Gallery.register({
  id: "pattern-hills",
  title: "Pattern Hills",
  description:
    "A landscape of rounded hills, the front ones overlapping those behind, each filled with " +
    "its own tangle under a big moon and a speckled sky.",
  tags: ["organic", "random"],
  instruction:
    "Draw {layers} rows of {hills} rounded hills, each row lower on the wall and in front of " +
    "the last. Fill every hill with its own tangle about {size} px to a motif: zigzags, scales, " +
    "spirals, dots, waves, vines, ovals or rings. Speckle the sky with dots and hang a moon " +
    "{moon} px in radius above.{colored? Color the sky, the moon and every hill.:}",
  params: [
    { name: "hills", label: "Hills per layer", type: "range", min: 1, max: 6, step: 1, value: 3 },
    { name: "layers", label: "Layers", type: "range", min: 1, max: 6, step: 1, value: 4 },
    { name: "moon", label: "Moon size", type: "range", min: 0, max: 200, step: 1, value: 80 },
    { name: "size", label: "Pattern size", type: "range", min: 10, max: 40, step: 1, value: 18 },
    { name: "colored", label: "Colors", type: "checkbox", value: true },
    { name: "sky", label: "Sky", type: "color", value: "#8fb8e8" },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 7 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const f = (n) => n.toFixed(1);
    const s = p.size;
    const thin = { width: f(0.8 * p.strokeWidth) };
    const solid = { fill: p.ink, stroke: "none" };
    const palette = ["#9b7fd4", "#2fa39a", "#ef9a4a", "#7cbf5a", "#f0d04f", "#d46fb8", "#5f8fd8", "#e0675a"];
    const horizon = H * 0.36;

    // Set per hill: does a motif at (x, y) touch the hill?
    let keep = () => true;
    // A polyline through the kept points only, broken wherever it dives out of sight.
    const run = (pts) => {
      let d = "";
      let on = false;
      for (const [x, y] of pts) {
        const k = keep(x, y);
        if (k) d += `${on ? "L" : "M"}${f(x)} ${f(y)}`;
        on = k;
      }
      return d;
    };

    // Fill patterns, drawn over the bounding box [x0, x1] x [y0, y1] of a hill.
    const patterns = [
      function zigzag(x0, y0, x1, y1) {
        let d = "";
        for (let y = y0; y <= y1 + s; y += s * 0.8) {
          const pts = [];
          for (let x = x0, i = 0; x <= x1 + s; x += s / 2, i++) pts.push([x, y + (i % 2 ? s * 0.3 : 0)]);
          d += run(pts);
        }
        pen.path(d, { width: f(1.6 * p.strokeWidth) });
      },
      function scales(x0, y0, x1, y1) {
        const r = s * 0.6;
        let d = "";
        for (let y = y0, row = 0; y <= y1 + r; y += r * 0.8, row++) {
          for (let x = x0 - r + (row % 2 ? r : 0); x <= x1 + r; x += 2 * r) {
            if (!keep(x, y + r)) continue;
            d += `M${f(x - r)} ${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y + r)}`;
            d += `M${f(x - r / 2)} ${f(y + r)}A${f(r / 2)} ${f(r / 2)} 0 0 1 ${f(x + r / 2)} ${f(y + r)}`;
          }
        }
        pen.path(d, thin);
      },
      function spirals(x0, y0, x1, y1) {
        let d = "";
        for (let y = y0, row = 0; y <= y1 + s; y += s * 1.1, row++) {
          for (let x = x0 + (row % 2 ? s * 0.6 : 0); x <= x1 + s; x += s * 1.2) {
            if (!keep(x, y)) continue;
            for (let t = 0, i = 0; t <= 1; t += 0.07, i++) {
              const a = t * 5 * Math.PI;
              d += `${i ? "L" : "M"}${f(x + s * 0.5 * t * Math.cos(a))} ${f(y + s * 0.5 * t * Math.sin(a))}`;
            }
          }
        }
        pen.path(d, thin);
      },
      function dots(x0, y0, x1, y1) {
        for (let y = y0, row = 0; y <= y1 + s; y += s * 0.7, row++) {
          for (let x = x0 + (row % 2 ? s * 0.4 : 0); x <= x1 + s; x += s * 0.8) if (keep(x, y)) pen.circle(x, y, s * 0.16, solid);
        }
      },
      function waves(x0, y0, x1, y1) {
        let d = "";
        for (let y = y0; y <= y1 + s; y += s * 0.45) {
          const pts = [];
          for (let x = x0; x <= x1 + 10; x += 8) pts.push([x, y + s * 0.25 * Math.sin((x / s) * 1.6)]);
          d += run(pts);
        }
        pen.path(d, thin);
      },
      function vines(x0, y0, x1, y1) {
        let stem = "";
        let leaves = "";
        for (let x = x0; x <= x1 + s; x += s * 2) {
          const phase = rand() * 6;
          const pts = [];
          for (let y = y1; y >= y0 - 10; y -= 6) pts.push([x + s * 0.5 * Math.sin(y / (s * 1.5) + phase), y]);
          stem += run(pts);
          for (let y = y1 - s * 0.5, k = 0; y >= y0; y -= s * 0.9, k++) {
            const sx = x + s * 0.5 * Math.sin(y / (s * 1.5) + phase);
            if (!keep(sx, y)) continue;
            const dir = k % 2 ? 1 : -1;
            const [tx, ty] = [sx + dir * s * 0.8, y - s * 0.5];
            const [mx, my] = [(sx + tx) / 2, (y + ty) / 2];
            leaves += `M${f(sx)} ${f(y)}Q${f(mx - s * 0.2)} ${f(my - s * 0.3)} ${f(tx)} ${f(ty)}Q${f(mx + s * 0.2)} ${f(my + s * 0.3)} ${f(sx)} ${f(y)}Z`;
          }
        }
        pen.path(stem, { width: f(1.4 * p.strokeWidth) });
        pen.path(leaves, thin);
      },
      function ovals(x0, y0, x1, y1) {
        let d = "";
        const [rx, ry] = [s * 0.45, s * 0.3];
        for (let y = y0, row = 0; y <= y1 + s; y += ry * 2.2, row++) {
          for (let x = x0 + (row % 2 ? rx * 1.1 : 0); x <= x1 + s; x += rx * 2.2) {
            if (!keep(x, y)) continue;
            d += `M${f(x - rx)} ${f(y)}A${f(rx)} ${f(ry)} 0 1 1 ${f(x + rx)} ${f(y)}A${f(rx)} ${f(ry)} 0 1 1 ${f(x - rx)} ${f(y)}Z`;
          }
        }
        pen.path(d, thin);
      },
      function rings(x0, y0, x1, y1) {
        for (let y = y0, row = 0; y <= y1 + s; y += s * 1.4, row++) {
          for (let x = x0 + (row % 2 ? s * 0.8 : 0); x <= x1 + s; x += s * 1.6) {
            if (!keep(x, y)) continue;
            for (let k = 1; k <= 3; k++) pen.circle(x, y, (s * 0.7 * k) / 3, thin);
          }
        }
      },
    ];

    // Sky: a wash of colour, speckles and the moon.
    if (p.colored) pen.polygon([[0, 0], [W, 0], [W, H], [0, H]], { fill: p.sky, stroke: "none" });
    for (let i = 0; i < 260; i++) pen.circle(rand() * W, rand() * (horizon + 40), 0.6 + rand() * 1.4, solid);
    if (p.moon > 0) {
      const mx = W * (0.2 + rand() * 0.6);
      pen.circle(mx, Math.max(p.moon + 12, horizon * 0.45), p.moon, { fill: p.colored ? "#f6e27a" : p.paper, width: f(2 * p.strokeWidth) });
    }

    // Hills: half-ellipses rising from below the canvas, back layers first.
    let next = Math.floor(rand() * patterns.length);
    const hills = [];
    const base = H + 40;
    for (let l = 0; l < p.layers; l++) {
      const top = horizon + ((H - horizon) * l) / (p.layers + 0.6);
      const span = W / p.hills;
      for (let h = 0; h < p.hills; h++) {
        const cx = span * (h + 0.5) + (rand() - 0.5) * span * 0.5 + (l % 2 ? span / 2 : 0) - span / 4;
        const rx = span * (0.85 + rand() * 0.5);
        const ry = base - (top + (rand() - 0.3) * ((H - horizon) / p.layers) * 0.6);
        next = (next + 1 + Math.floor(rand() * 2)) % patterns.length;
        hills.push({ cx, rx, ry, pattern: next, color: palette[(next + l) % palette.length] });
      }
    }
    // Motifs are skipped where they miss their hill or hide under a hill in front of it.
    const inside = (hill, x, y, grow) => ((x - hill.cx) / (hill.rx + grow)) ** 2 + ((y - base) / (hill.ry + grow)) ** 2 <= 1;
    hills.forEach((hill, i) => {
      const { cx, rx, ry } = hill;
      const d = `M${f(cx - rx)} ${f(base)}A${f(rx)} ${f(ry)} 0 0 1 ${f(cx + rx)} ${f(base)}Z`;
      pen.path(d, { fill: p.colored ? hill.color : p.paper, stroke: "none" });
      keep = (x, y) => inside(hill, x, y, s) && !hills.slice(i + 1).some((front) => inside(front, x, y, -s));
      const box = [Math.max(0, cx - rx), Math.max(0, base - ry), Math.min(W, cx + rx), H];
      pen.clip(d, () => patterns[hill.pattern](...box));
      pen.path(d, { width: f(2 * p.strokeWidth) });
    });
    pen.polygon([[0, 0], [W, 0], [W, H], [0, H]], { width: f(4 * p.strokeWidth) });
  },
});
