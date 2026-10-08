Gallery.register({
  id: "vortex",
  title: "Vortex",
  description:
    "Logarithmic spiral arms swirl into the center, and the bands between them are " +
    "ribbed with bulging arcs, like a ribbed tunnel twisting away from you.",
  tags: ["op-art", "radial", "animated"],
  instruction:
    "From the center, draw {arms} spiral arms that open by {twist} each turn, " +
    "{clockwise?clockwise:counterclockwise}. Across each band between two arms, draw {ribs} " +
    "ribs per turn, bowed sideways by {bulge}.{fill? Fill every other band.:}",
  params: [
    { name: "arms", label: "Arms", type: "range", min: 3, max: 30, step: 1, value: 12 },
    { name: "twist", label: "Openness", type: "range", min: 0.1, max: 0.5, step: 0.01, value: 0.2 },
    { name: "ribs", label: "Ribs per turn", type: "range", min: 6, max: 120, step: 1, value: 40 },
    { name: "bulge", label: "Rib bulge", type: "range", min: -0.6, max: 0.6, step: 0.01, value: 0.25 },
    { name: "fill", label: "Shade every other band", type: "checkbox", value: true },
    { name: "clockwise", label: "Clockwise", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const cx = pen.width / 2;
    const cy = pen.height / 2;
    const rMin = 3;
    const rMax = Math.hypot(cx, cy) * 1.1;
    const thetaMax = Math.log(rMax / rMin) / p.twist;
    const dir = p.clockwise ? 1 : -1;
    const sector = (2 * Math.PI) / p.arms;

    // Time turns the whole vortex (p.time is 0 when the studio is not playing).
    const spin = (p.time || 0) * 0.5;
    const radius = (theta) => rMin * Math.exp(p.twist * theta);
    const point = (theta, arm) => {
      const a = dir * (theta + arm * sector) + spin;
      const r = radius(theta);
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };

    // Path data in tenths of a pixel, each point relative to the one before, so one path can
    // hold many strokes. A path's first move is absolute, so it starts from the origin. A
    // command that repeats the previous one (pairs after a move are lines) is left out.
    const num = (t) => String(t / 10).replace(/^(-?)0\./, "$1.");
    const join = (parts) => parts.reduce((out, part) => out + (part[0] === "-" ? "" : " ") + part);
    const pathData = () => {
      let at = [0, 0];
      let start = at;
      let last = "";
      let d = "";
      const to = ([x, y]) => {
        const point = [Math.round(x * 10), Math.round(y * 10)];
        const delta = [num(point[0] - at[0]), num(point[1] - at[1])];
        at = point;
        return delta;
      };
      const add = (command, numbers) => {
        // Pairs after a move are lines, never more moves.
        const implied = command !== "m" && (command === last || (command === "l" && last === "m"));
        d += implied ? join(["", ...numbers]) : command + join(numbers);
        last = command;
      };
      return {
        move(point) {
          add("m", to(point));
          start = at;
        },
        line(point) {
          add("l", to(point));
        },
        // Quadratic curve: the control point is relative to the current point, like the end.
        curve(control, end) {
          const from = at;
          const c = to(control);
          at = from;
          add("q", [...c, ...to(end)]);
        },
        close() {
          d += "z";
          last = "z";
          at = start;
        },
        get d() {
          return d;
        },
      };
    };

    // Shapes wholly off the canvas are skipped: a curve stays inside its control points' box.
    const off = (points) =>
      points.every(([x]) => x < -5) || points.every(([x]) => x > pen.width + 5) ||
      points.every(([, y]) => y < -5) || points.every(([, y]) => y > pen.height + 5);

    // Keeps only the points a polyline needs to stay within `tolerance` px of it.
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

    // Ribs cross each band radially: from arm `arm` at theta to the next arm one sector
    // earlier, which lies on the same ray. The control point leans sideways for a bulge.
    // A shaded band is one filled shape: its ribs' ends along both arms, closed by the first
    // and last rib. The other bands' ribs share a path per band, unless pressure gives each
    // rib its own width.
    const dTheta = (2 * Math.PI) / p.ribs;
    for (let arm = 0; arm < p.arms; arm++) {
      const shaded = p.fill && arm % 2 === 0;
      const ribs = [];
      for (let theta = sector; theta <= thetaMax + sector; theta += dTheta) {
        const r = (radius(theta) + radius(theta - sector)) / 2;
        const a = dir * (theta + arm * sector + p.bulge * sector) + spin;
        ribs.push([point(theta, arm), [cx + r * Math.cos(a), cy + r * Math.sin(a)], point(theta - sector, arm + 1)]);
      }
      if (shaded) {
        for (let from = 0; from < ribs.length - 1; ) {
          // Each run of strips that touches the canvas becomes one shape.
          let to = from + 1;
          if (off([...ribs[from], ...ribs[to]])) {
            from = to;
            continue;
          }
          while (to + 1 < ribs.length && !off([...ribs[to], ...ribs[to + 1]])) to++;
          const band = pathData();
          band.move(ribs[from][0]);
          band.curve(ribs[from][1], ribs[from][2]);
          const outer = simplify(ribs.slice(from, to + 1).map((rib) => rib[2]));
          for (const q of outer.slice(1)) band.line(q);
          band.curve(ribs[to][1], ribs[to][0]);
          const inner = simplify(ribs.slice(from, to + 1).map((rib) => rib[0]).reverse());
          for (const q of inner.slice(1)) band.line(q);
          band.close();
          pen.path(band.d, { fill: p.ink, stroke: p.ink });
          from = to;
        }
        continue;
      }
      let band = pathData();
      for (const [k, rib] of ribs.entries()) {
        if (off(rib)) continue;
        // Every other rib runs backwards, so the pen hops only along an arm between ribs.
        const [from, control, to] = k % 2 ? [...rib].reverse() : rib;
        band.move(from);
        band.curve(control, to);
        if (p.handPressure) {
          pen.path(band.d);
          band = pathData();
        }
      }
      if (band.d) pen.path(band.d);
    }

    // With a still hand the arms are one path. A moving hand bends polylines but not raw paths.
    const still = !p.handWobble && !p.handJitter && !p.handPressure;
    const arms = pathData();
    for (let arm = 0; arm < p.arms; arm++) {
      const line = [];
      for (let theta = 0; theta <= thetaMax; theta += 0.04) line.push(point(theta, arm));
      if (!still) {
        pen.polyline(line, { width: p.strokeWidth * 1.6 });
        continue;
      }
      // An arm only grows outward, so its tail beyond the canvas is left out.
      let end = line.length;
      while (end > 2 && off(line.slice(end - 2, end))) end--;
      const kept = simplify(line.slice(0, end));
      arms.move(kept[0]);
      for (const q of kept.slice(1)) arms.line(q);
    }
    if (arms.d) pen.path(arms.d, { width: p.strokeWidth * 1.6 });
  },
});
