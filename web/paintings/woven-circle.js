Gallery.register({
  id: "woven-circle",
  title: "Woven Circle",
  description:
    "A basket weave seen through a round window. Strands alternate between horizontal " +
    "and vertical, pinched where they tuck under their neighbours and hatched with ink.",
  params: [
    { name: "n", label: "Strands", type: "range", min: 3, max: 20, step: 1, value: 8 },
    { name: "lines", label: "Lines per strand", type: "range", min: 2, max: 24, step: 1, value: 12 },
    { name: "pinch", label: "Pinch", type: "range", min: 0, max: 0.6, step: 0.01, value: 0.4 },
    { name: "gap", label: "Gap", type: "range", min: 0, max: 0.4, step: 0.01, value: 0.1 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 150, step: 1, value: 50 },
    { name: "window", label: "Round window", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const size = pen.width - 2 * p.margin;
    const cell = size / p.n;
    const c = pen.width / 2;
    const R = size / 2;
    const res = 14;
    const f = (n) => n.toFixed(2);
    const round = `M${f(c - R)} ${f(c)}A${f(R)} ${f(R)} 0 1 1 ${f(c + R)} ${f(c)}A${f(R)} ${f(R)} 0 1 1 ${f(c - R)} ${f(c)}Z`;
    const frame = `M${p.margin} ${p.margin}h${size}v${size}h${-size}Z`;

    // Half thickness along the strand: full in the middle, pinched at both ends.
    const half = (t) => (cell / 2) * (1 - p.gap) * (1 - p.pinch * (1 - Math.sin(Math.PI * t)));

    // A strand along its local axis t in [0, 1]; `place` maps (t, offset) to canvas.
    const strand = (place) => {
      const top = [];
      const bottom = [];
      for (let s = 0; s <= res; s++) {
        const t = s / res;
        top.push(place(t, -half(t)));
        bottom.unshift(place(t, half(t)));
      }
      pen.polygon(top.concat(bottom), { fill: p.paper });
      for (let k = 1; k < p.lines; k++) {
        const share = -1 + (2 * k) / p.lines;
        const line = [];
        for (let s = 0; s <= res; s++) line.push(place(s / res, share * half(s / res)));
        pen.polyline(line);
      }
    };

    const shape = p.window ? round : frame;
    pen.path(shape, { fill: p.ink });
    pen.clip(shape, () => {
      for (let i = 0; i < p.n; i++) {
        for (let j = 0; j < p.n; j++) {
          const x = p.margin + i * cell;
          const y = p.margin + j * cell;
          if ((i + j) % 2 === 0) strand((t, o) => [x + t * cell, y + cell / 2 + o]);
          else strand((t, o) => [x + cell / 2 + o, y + t * cell]);
        }
      }
    });
    pen.path(shape, { width: 3 });
  },
});
