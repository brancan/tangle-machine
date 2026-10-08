Gallery.register({
  id: "ribbon-arcs",
  title: "Ribbon Arcs",
  description:
    "White striped ribbons arch and wave across a black ground. Where two ribbons cross, one " +
    "passes over the other, and along each ribbon over and under take turns, like a weave.",
  tags: ["organic", "random"],
  instruction:
    "Paint a square black, leaving a white margin of {margin} px. On it lay {ribbons} white " +
    "ribbons, {width} px wide, each split lengthwise into {stripes} stripes by thin black lines. " +
    "Bend about {waves%} of them into waves running from side to side, and the rest into " +
    "arches whose short legs run off the nearest edge. Weave them: following any ribbon, it " +
    "passes over the first ribbon it crosses, under the next, and so on.",
  params: [
    { name: "ribbons", label: "Ribbons", type: "range", min: 1, max: 20, step: 1, value: 9 },
    { name: "stripes", label: "Stripes per ribbon", type: "range", min: 1, max: 8, step: 1, value: 4 },
    { name: "width", label: "Ribbon width", type: "range", min: 16, max: 140, step: 1, value: 62 },
    { name: "waves", label: "Waves", type: "range", min: 0, max: 1, step: 0.01, value: 0.35 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 100, step: 1, value: 36 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 2 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const f = (n) => n.toFixed(1);
    const M = p.margin;
    const line = 1.2 * p.strokeWidth;
    const out = p.width / 2 + 2 * line + 4;

    // An arch: a half-circle whose two short legs run down past the bottom edge, then
    // turned by some quarter turns so the legs leave through any side.
    const arch = () => {
      const r = p.width * 0.9 + rand() * Math.max(p.width * 2, (W - 2 * M) * 0.4);
      const x = M + rand() * (W - 2 * M);
      // Keep the legs short: the half-circle sits close to the edge the legs leave by.
      const y = H - M - r * (0.05 + rand() * 0.4);
      const turn = Math.floor(rand() * 4) * (Math.PI / 2);
      const [c, s] = [Math.cos(turn), Math.sin(turn)];
      const at = (u, v) => [W / 2 + (u - W / 2) * c - (v - H / 2) * s, H / 2 + (u - W / 2) * s + (v - H / 2) * c];
      const end = H - M + out;
      const pts = [];
      for (let v = end; v > y; v -= 8) pts.push(at(x - r, v));
      const steps = Math.max(12, Math.ceil((Math.PI * r) / 6));
      for (let k = 0; k <= steps; k++) {
        const a = Math.PI + (Math.PI * k) / steps;
        pts.push(at(x + r * Math.cos(a), y + r * Math.sin(a)));
      }
      for (let v = y + 8; v <= end; v += 8) pts.push(at(x + r, v));
      pts.push(at(x + r, end));
      return pts;
    };
    // A wave from beyond the left edge to beyond the right, then possibly turned upright.
    const wave = () => {
      const y = M + rand() * (H - 2 * M);
      const amp = p.width * (0.3 + rand() * 0.9);
      const period = p.width * (3 + rand() * 4);
      const phase = rand() * 6.3;
      const upright = rand() < 0.4;
      const pts = [];
      for (let x = M - out; x <= W - M + out + 8; x += 8) {
        const v = y + amp * Math.sin((x / period) * 2 * Math.PI + phase);
        pts.push(upright ? [v, x] : [x, v]);
      }
      return pts;
    };

    const ribbons = [];
    for (let i = 0; i < p.ribbons; i++) {
      const pts = rand() < p.waves ? wave() : arch();
      ribbons.push({ pts, crossings: [] });
    }

    // Find where the centre lines cross inside the frame.
    const crossings = [];
    const inside = (x, y) => x > M && x < W - M && y > M && y < H - M;
    for (let i = 0; i < ribbons.length; i++) {
      for (let j = i + 1; j < ribbons.length; j++) {
        const A = ribbons[i].pts;
        const B = ribbons[j].pts;
        const found = [];
        for (let a = 0; a < A.length - 1; a++) {
          const [ax, ay] = A[a];
          const dx = A[a + 1][0] - ax;
          const dy = A[a + 1][1] - ay;
          for (let b = 0; b < B.length - 1; b++) {
            const [bx, by] = B[b];
            const ex = B[b + 1][0] - bx;
            const ey = B[b + 1][1] - by;
            const den = dx * ey - dy * ex;
            if (Math.abs(den) < 1e-9) continue;
            const t = ((bx - ax) * ey - (by - ay) * ex) / den;
            const u = ((bx - ax) * dy - (by - ay) * dx) / den;
            if (t < 0 || t >= 1 || u < 0 || u >= 1) continue;
            const x = ax + dx * t;
            const y = ay + dy * t;
            if (!inside(x, y)) continue;
            const sin = Math.abs(den) / (Math.hypot(dx, dy) * Math.hypot(ex, ey));
            found.push({ x, y, i, j, si: a + t, sj: b + u, sin });
          }
        }
        // Shallow crossings, or two close together, are a graze, not a weave: leave those stacked.
        for (const c of found) {
          if (c.sin < 0.5) continue;
          if (found.some((o) => o !== c && Math.hypot(o.x - c.x, o.y - c.y) < p.width)) continue;
          crossings.push(c);
        }
      }
    }
    for (const c of crossings) {
      ribbons[c.i].crossings.push({ c, s: c.si });
      ribbons[c.j].crossings.push({ c, s: c.sj });
    }
    for (const r of ribbons) {
      r.crossings.sort((a, b) => a.s - b.s);
      r.crossings.forEach((k, n) => (k.c[r === ribbons[k.c.i] ? "ni" : "nj"] = n));
    }

    // Ribbon i passes over at its n-th crossing when (n + phase[i]) is even. At a crossing
    // exactly one of the two passes over, so the phases of i and j must differ by ni + nj + 1:
    // spread the phases through the crossings, ribbon by ribbon.
    const phase = ribbons.map(() => null);
    for (let start = 0; start < ribbons.length; start++) {
      if (phase[start] !== null) continue;
      phase[start] = 0;
      const queue = [start];
      while (queue.length) {
        const r = queue.shift();
        for (const { c } of ribbons[r].crossings) {
          const other = c.i === r ? c.j : c.i;
          if (phase[other] === null) {
            phase[other] = (phase[r] + c.ni + c.nj + 1) % 2;
            queue.push(other);
          }
        }
      }
    }

    // Nested strokes: a black rim, a white body, then thin black lines between stripes.
    const ribbon = (d) => {
      pen.path(d, { stroke: p.ink, width: f(p.width + 4 * line) });
      pen.path(d, { stroke: p.paper, width: f(p.width) });
      for (let k = 1; 2 * k <= p.stripes; k++) {
        const w = p.width * (1 - (2 * k) / p.stripes);
        if (w > 0) {
          pen.path(d, { stroke: p.ink, width: f(w + line) });
          pen.path(d, { stroke: p.paper, width: f(Math.max(0, w - line)) });
        } else {
          pen.path(d, { stroke: p.ink, width: f(line) });
        }
      }
    };

    // Ribbon i passes over at crossing c when this is true.
    for (const c of crossings) c.iOver = (c.ni + phase[c.i]) % 2 === 0;

    // Cut every ribbon where it passes under another, right at the crossing. Each over
    // stretch is drawn after the two cut ends below it, and its band hides their round ends.
    const at = (pts, t) => {
      const k = Math.min(pts.length - 2, Math.floor(t));
      const u = t - k;
      return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u];
    };
    const plan = () => {
      const stretches = [];
      ribbons.forEach((r, index) => {
        const cuts = [0];
        for (const { c, s } of r.crossings) if (c.iOver !== (c.i === index)) cuts.push(s);
        cuts.push(r.pts.length - 1);
        r.stretches = [];
        for (let n = 0; n + 1 < cuts.length; n++) {
          const stretch = { a: cuts[n], b: cuts[n + 1], ribbon: r, after: [], tops: [], before: 0 };
          r.stretches.push(stretch);
          stretches.push(stretch);
        }
      });
      for (const c of crossings) {
        const [o, u, so, su] = c.iOver ? [c.i, c.j, c.si, c.sj] : [c.j, c.i, c.sj, c.si];
        const top = ribbons[o].stretches.find((x) => so >= x.a && so <= x.b);
        c.below = ribbons[u].stretches.filter((x) => x.a === su || x.b === su);
        for (const x of c.below) {
          x.after.push(top);
          top.before++;
        }
        top.tops.push(c);
      }
      // Draw a stretch only once everything it passes over is down.
      const order = [];
      while (order.length < stretches.length) {
        const next = stretches.find((x) => !x.done && x.before <= 0);
        if (!next) {
          const waiting = stretches.find((x) => !x.done && x.before > 0);
          return { stuck: waiting.tops.find((c) => c.below.some((x) => !x.done)) };
        }
        next.done = true;
        order.push(next);
        for (const x of next.after) x.before--;
      }
      return { order };
    };
    // Two ribbons crossing twice, or three in a ring, can each be over the other: no order
    // works. Then let one of those crossings simply stack instead of alternating, and retry.
    let result = plan();
    for (let tries = 0; result.stuck && tries <= crossings.length; tries++) {
      result.stuck.iOver = !result.stuck.iOver;
      result = plan();
    }
    const order = result.order || ribbons.map((r) => ({ a: 0, b: r.pts.length - 1, ribbon: r }));

    const frame = `M${M} ${M}H${W - M}V${H - M}H${M}Z`;
    pen.path(frame, { fill: p.ink });
    pen.clip(frame, () => {
      for (const { a, b, ribbon: r } of order) {
        const pts = [at(r.pts, a)];
        for (let k = Math.floor(a) + 1; k < b; k++) pts.push(r.pts[k]);
        pts.push(at(r.pts, b));
        ribbon("M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L"));
      }
    });
  },
});
