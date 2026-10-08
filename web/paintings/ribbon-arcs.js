Gallery.register({
  id: "ribbon-arcs",
  title: "Ribbon Arcs",
  description:
    "White striped ribbons arch and wave across a black ground. Each new ribbon is laid over " +
    "the ones before it, so they seem to weave over and under each other.",
  tags: ["organic", "random"],
  instruction:
    "Paint a square black, leaving a white margin of {margin} px. On it lay {ribbons} white " +
    "ribbons, {width} px wide, each split lengthwise into {stripes} stripes by thin black lines. " +
    "Bend about {waves%} of them into waves running from side to side, and the rest into " +
    "arches whose legs run off an edge. Lay each ribbon over the ones before it.",
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
    const far = W + p.width * 2;

    // An arch: two legs from beyond the bottom edge joined by a half-circle, then turned
    // by a quarter turn or more so the legs leave through any side.
    const arch = () => {
      const r = p.width * (0.8 + rand() * 2.2);
      const x = M + rand() * (W - 2 * M);
      const y = M + p.width + rand() * (H - 2 * M);
      const turn = Math.floor(rand() * 4) * (Math.PI / 2);
      const [c, s] = [Math.cos(turn), Math.sin(turn)];
      const at = (u, v) => `${f(W / 2 + (u - W / 2) * c - (v - H / 2) * s)} ${f(H / 2 + (u - W / 2) * s + (v - H / 2) * c)}`;
      return `M${at(x - r, far)}L${at(x - r, y)}A${f(r)} ${f(r)} 0 0 1 ${at(x + r, y)}L${at(x + r, far)}`;
    };
    // A wave from beyond the left edge to beyond the right, then possibly turned upright.
    const wave = () => {
      const y = M + rand() * (H - 2 * M);
      const amp = p.width * (0.3 + rand() * 0.9);
      const period = p.width * (3 + rand() * 4);
      const phase = rand() * 6.3;
      const upright = rand() < 0.4;
      let d = "";
      for (let x = -p.width * 2, i = 0; x <= W + p.width * 2; x += 8, i++) {
        const v = y + amp * Math.sin((x / period) * 2 * Math.PI + phase);
        d += `${i ? "L" : "M"}${upright ? `${f(v)} ${f(x)}` : `${f(x)} ${f(v)}`}`;
      }
      return d;
    };

    const frame = `M${M} ${M}H${W - M}V${H - M}H${M}Z`;
    pen.path(frame, { fill: p.ink });
    pen.clip(frame, () => {
      for (let i = 0; i < p.ribbons; i++) {
        const d = rand() < p.waves ? wave() : arch();
        // Nested strokes: a black rim, a white body, then thin black lines between stripes.
        const line = 1.2 * p.strokeWidth;
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
      }
    });
  },
});
