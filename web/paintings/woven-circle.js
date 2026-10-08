Gallery.register({
  id: "woven-circle",
  title: "Woven Circle",
  description:
    "A basket weave seen through a round window. Strands alternate between horizontal " +
    "and vertical, pinched where they tuck under their neighbours and hatched with ink.",
  tags: ["geometric", "tessellation"],
  instruction:
    "Inside a {window?circle:square} with a margin of {margin} px, weave {n} × {n} strands, " +
    "horizontal and vertical by turns, each pinched by {pinch%} toward its ends, with gaps " +
    "of {gap%} between them. Hatch every strand with {lines} lines along its length. Fill " +
    "the gaps with ink.",
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

    // With a still hand, each strand is two paths (its paper-filled outline and its hatch
    // lines) in tenths of a pixel, each point relative to the one before, keeping only the
    // points a line needs to stay within 0.1 px of its full curve. A moving hand bends
    // polygons and polylines but not raw paths, so then the strand keeps those.
    const still = !p.handWobble && !p.handJitter && !p.handPressure;
    const tolerance = 0.1;
    const simplify = (points) => {
      const out = [points[0]];
      for (let a = 0; a < points.length - 1; ) {
        const [ax, ay] = points[a];
        const [ux, uy] = [points[a + 1][0] - ax, points[a + 1][1] - ay];
        let [lo, hi, far] = [-Math.PI, Math.PI, 0];
        let b = a + 1;
        for (let k = a + 1; k < points.length; k++) {
          const [dx, dy] = [points[k][0] - ax, points[k][1] - ay];
          const d = Math.hypot(dx, dy);
          const angle = Math.atan2(ux * dy - uy * dx, ux * dx + uy * dy);
          if (d < far || angle < lo || angle > hi) break;
          b = k;
          far = d;
          const w = Math.asin(Math.min(1, tolerance / d));
          [lo, hi] = [Math.max(lo, angle - w), Math.min(hi, angle + w)];
        }
        out.push(points[b]);
        a = b;
      }
      return out;
    };
    const num = (t) => String(t / 10).replace(/^(-?)0\./, "$1.");
    // A path's first move is absolute, so every path starts from the origin.
    const pathData = (lines, closed) => {
      let at = [0, 0];
      let d = "";
      const to = (command, [x, y]) => {
        const point = [Math.round(x * 10), Math.round(y * 10)];
        const [dx, dy] = [num(point[0] - at[0]), num(point[1] - at[1])];
        at = point;
        return command + dx + (dy[0] === "-" ? "" : " ") + dy;
      };
      for (const line of lines) {
        const start = to("m", line[0]);
        const first = at;
        d += start + simplify(line).slice(1).map((point) => to("l", point)).join("");
        if (closed) {
          d += "z";
          at = first;
        }
      }
      return d;
    };

    // A strand along its local axis t in [0, 1]; `place` maps (t, offset) to canvas.
    const strand = (place) => {
      const top = [];
      const bottom = [];
      for (let s = 0; s <= res; s++) {
        const t = s / res;
        top.push(place(t, -half(t)));
        bottom.unshift(place(t, half(t)));
      }
      const lines = [];
      for (let k = 1; k < p.lines; k++) {
        const share = -1 + (2 * k) / p.lines;
        const line = [];
        for (let s = 0; s <= res; s++) line.push(place(s / res, share * half(s / res)));
        lines.push(line);
      }
      if (still) {
        pen.path(pathData([top.concat(bottom)], true), { fill: p.paper });
        if (lines.length) pen.path(pathData(lines, false));
        return;
      }
      pen.polygon(top.concat(bottom), { fill: p.paper });
      for (const line of lines) pen.polyline(line);
    };

    // Strands wholly outside a round window would be clipped away entirely.
    const hidden = (x, y) => {
      if (!p.window || !still) return false;
      const nx = Math.max(x, Math.min(c, x + cell));
      const ny = Math.max(y, Math.min(c, y + cell));
      return Math.hypot(nx - c, ny - c) > R + p.strokeWidth;
    };

    const shape = p.window ? round : frame;
    pen.path(shape, { fill: p.ink });
    pen.clip(shape, () => {
      for (let i = 0; i < p.n; i++) {
        for (let j = 0; j < p.n; j++) {
          const x = p.margin + i * cell;
          const y = p.margin + j * cell;
          if (hidden(x, y)) continue;
          if ((i + j) % 2 === 0) strand((t, o) => [x + t * cell, y + cell / 2 + o]);
          else strand((t, o) => [x + cell / 2 + o, y + t * cell]);
        }
      }
    });
    pen.path(shape, { width: 3 });
  },
});
