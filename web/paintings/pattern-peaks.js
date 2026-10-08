Gallery.register({
  id: "pattern-peaks",
  title: "Pattern Peaks",
  description:
    "Overlapping triangular mountains inside a heavy frame, each one filled with a different " +
    "tangle, under a sky of chevron stripes that echo the summits.",
  instruction:
    "Inside a frame {border} px thick, draw {peaks} triangular mountains, tallest at the back. " +
    "Above the tallest, stack nested chevrons {stripe} px apart. Fill each mountain with a " +
    "different tangle about {size} px to a motif: a star lattice, check squares, zigzags with " +
    "dots, diamond dots, a wavy checker or rows of birds.",
  params: [
    { name: "peaks", label: "Peaks", type: "range", min: 2, max: 9, step: 1, value: 6 },
    { name: "size", label: "Pattern size", type: "range", min: 10, max: 40, step: 1, value: 24 },
    { name: "stripe", label: "Stripe spacing", type: "range", min: 12, max: 60, step: 1, value: 30 },
    { name: "border", label: "Border", type: "range", min: 0, max: 20, step: 1, value: 8 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 11 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const f = (n) => n.toFixed(1);
    const s = p.size;
    const M = 40;
    const thin = { width: f(0.8 * p.strokeWidth) };
    const solid = { fill: p.ink, stroke: "none" };
    const R = Math.hypot(W, H) / 2;

    // Mountains: tallest at the back, lower ones in front. Bases sink below the frame.
    const peaks = [];
    for (let i = 0; i < p.peaks; i++) {
      const ax = M + rand() * (W - 2 * M);
      const ay = M + 60 + rand() * (H - 2 * M) * 0.55;
      const slope = 0.45 + rand() * 0.25;
      const half = (H - M + 20 - ay) * slope;
      peaks.push({ apex: [ax, ay], left: [ax - half, H - M + 20], right: [ax + half, H - M + 20] });
    }
    peaks.sort((a, b) => a.apex[1] - b.apex[1]);

    // Is (x, y) inside triangle t, grown by `grow` pixels (negative shrinks it)?
    const inside = (t, x, y, grow) => {
      const pts = [t.apex, t.right, t.left];
      for (let i = 0; i < 3; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % 3];
        const len = Math.hypot(bx - ax, by - ay);
        if ((((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / len) < -grow) return false;
      }
      return true;
    };
    let keep = () => true;

    // Parallel lines at `angle` (radians), `gap` apart, across the whole canvas.
    const family = (angle, gap, offset) => {
      let d = "";
      const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
      for (let t = -R + (offset % gap); t <= R; t += gap) {
        const [cx, cy] = [W / 2 - dy * t, H / 2 + dx * t];
        d += `M${f(cx - dx * R)} ${f(cy - dy * R)}L${f(cx + dx * R)} ${f(cy + dy * R)}`;
      }
      return d;
    };

    const patterns = [
      function starLattice() {
        const third = Math.PI / 3;
        let d = "";
        for (let k = 0; k < 3; k++) d += family(k * third, s, 0);
        pen.path(d, thin);
        d = "";
        for (let k = 0; k < 3; k++) d += family(k * third + Math.PI / 2, s * 0.866, s * 0.433);
        pen.path(d, { width: f(0.5 * p.strokeWidth) });
      },
      function checkSquares() {
        let d = "";
        const k = s * 0.32;
        for (let y = M; y <= H; y += s) {
          for (let x = M; x <= W; x += s) {
            if (!keep(x, y)) continue;
            d += `M${f(x - k)} ${f(y - k)}H${f(x + k)}V${f(y + k)}H${f(x - k)}Z`;
          }
        }
        pen.path(family(0, s, s / 2) + family(Math.PI / 2, s, s / 2), thin);
        pen.path(d, solid);
        let inner = "";
        for (let y = M; y <= H; y += s) {
          for (let x = M; x <= W; x += s) {
            if (keep(x, y)) inner += `M${f(x - k)} ${f(y + k * 0.4)}H${f(x + k * 0.4)}V${f(y - k)}`;
          }
        }
        pen.path(inner, { stroke: p.paper, width: f(0.8 * p.strokeWidth) });
      },
      function zigzagDots() {
        let d = "";
        for (let y = M, row = 0; y <= H; y += s * 1.2, row++) {
          let on = false;
          for (let x = M - s, i = 0; x <= W; x += s / 2, i++) {
            const yy = y + (i % 2 ? -s * 0.3 : s * 0.3);
            const k = keep(x, yy);
            if (k) d += `${on ? "L" : "M"}${f(x)} ${f(yy)}`;
            on = k;
            if (i % 2 && keep(x, y + s * 0.5)) {
              pen.circle(x, y + s * 0.45, s * 0.1, (i + row) % 4 === 1 ? solid : thin);
            }
          }
        }
        pen.path(d, thin);
      },
      function diamondDots() {
        pen.path(family(Math.PI / 4, s, 0) + family(-Math.PI / 4, s, 0), thin);
        let d = "";
        const step = s * Math.SQRT2;
        const k = s * 0.16;
        for (let y = M - step / 2; y <= H; y += step / 2) {
          for (let x = (Math.round((y - M) / (step / 2)) % 2 ? step / 2 : 0) + W / 2 - Math.ceil(W / step) * step; x <= W; x += step) {
            if (!keep(x, y)) continue;
            d += `M${f(x)} ${f(y - k)}L${f(x + k)} ${f(y)}L${f(x)} ${f(y + k)}L${f(x - k)} ${f(y)}Z`;
          }
        }
        pen.path(d, solid);
      },
      function wavyChecker(t) {
        // Op-art checker in polar coordinates around a point low on the mountain.
        const [cx, cy] = [t.apex[0] + (rand() - 0.5) * 40, (t.apex[1] + t.left[1]) / 2];
        const sectors = 12;
        let d = "";
        for (let r = 0, ring = 0; r < 700; r += s * 1.2, ring++) {
          for (let j = 0; j < sectors; j++) {
            if ((ring + j) % 2) continue;
            const pts = [];
            const twist = (rr) => 0.6 * Math.sin(rr / (s * 3));
            for (let k = 0; k <= 4; k++) {
              const a = ((j + k / 4) * 2 * Math.PI) / sectors + twist(r);
              pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
            }
            for (let k = 4; k >= 0; k--) {
              const a = ((j + k / 4) * 2 * Math.PI) / sectors + twist(r + s * 1.2);
              pts.push([cx + (r + s * 1.2) * Math.cos(a), cy + (r + s * 1.2) * Math.sin(a)]);
            }
            if (!pts.some(([x, y]) => keep(x, y))) continue;
            d += "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";
          }
        }
        pen.path(d, solid);
      },
      function birds() {
        let d = "";
        for (let y = M, row = 0; y <= H; y += s * 0.8, row++) {
          for (let x = M + (row % 2 ? s / 2 : 0); x <= W; x += s) {
            if (!keep(x, y)) continue;
            d += `M${f(x - s * 0.4)} ${f(y)}Q${f(x - s * 0.2)} ${f(y - s * 0.35)} ${f(x)} ${f(y)}Q${f(x + s * 0.2)} ${f(y - s * 0.35)} ${f(x + s * 0.4)} ${f(y)}`;
          }
        }
        pen.path(d, thin);
      },
    ];

    const frame = `M${M} ${M}H${W - M}V${H - M}H${M}Z`;
    pen.clip(frame, () => {
      // Chevron sky: nested summits stacked above the tallest peak, evenly spaced.
      let sky = "";
      for (const t of peaks.slice(0, 1)) {
        const [ax, ay] = t.apex;
        const kx = (t.right[0] - ax) / (t.right[1] - ay);
        const lift = (p.stripe * Math.hypot(1, kx)) / kx;
        for (let o = lift; o < ay + W / kx; o += lift) {
          sky += `M${f(ax - kx * (H + o))} ${f(ay + H)}L${f(ax)} ${f(ay - o)}L${f(ax + kx * (H + o))} ${f(ay + H)}`;
        }
      }
      pen.path(sky, { width: f(p.stripe * 0.3) });

      const order = patterns.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      peaks.forEach((t, i) => {
        const d = `M${f(t.left[0])} ${f(t.left[1])}L${f(t.apex[0])} ${f(t.apex[1])}L${f(t.right[0])} ${f(t.right[1])}Z`;
        pen.path(d, { fill: p.paper, stroke: "none" });
        keep = (x, y) => inside(t, x, y, s) && !peaks.slice(i + 1).some((front) => inside(front, x, y, -s));
        pen.clip(d, () => patterns[order[i % order.length]](t));
        pen.path(d, { width: f(2.5 * p.strokeWidth) });
      });
    });
    if (p.border > 0) pen.path(frame, { width: f(p.border * p.strokeWidth) });
  },
});
