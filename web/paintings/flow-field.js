Gallery.register({
  id: "flow-field",
  title: "Flow Field",
  description:
    "Hundreds of fine lines carried by invisible whirlpools. Each line follows the " +
    "current from a random starting point, and together they reveal the eddies.",
  tags: ["organic", "random"],
  instruction:
    "Place {vortices} whirlpools at random (seed {seed}), each about {core} px across, in a " +
    "current drifting by {drift}. From {lines} random points, follow the current both ways " +
    "for {length} steps and draw the path.",
  style: { ink: "#1c1c1c", paper: "#f2efe8", strokeWidth: 0.7 },
  params: [
    { name: "vortices", label: "Whirlpools", type: "range", min: 1, max: 14, step: 1, value: 6 },
    { name: "lines", label: "Lines", type: "range", min: 20, max: 800, step: 10, value: 420 },
    { name: "length", label: "Line length", type: "range", min: 10, max: 400, step: 5, value: 110 },
    { name: "core", label: "Whirlpool size", type: "range", min: 10, max: 300, step: 5, value: 90 },
    { name: "drift", label: "Drift", type: "range", min: 0, max: 0.02, step: 0.0005, value: 0.004 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 12 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const stepSize = 3;

    const vortices = [];
    for (let i = 0; i < p.vortices; i++) {
      vortices.push({ x: rand() * W, y: rand() * H, spin: (rand() < 0.5 ? -1 : 1) * (0.6 + rand()) });
    }

    // Velocity: each vortex adds a swirl that fades with distance, plus a gentle drift.
    const velocity = (x, y) => {
      let vx = p.drift;
      let vy = p.drift * 0.5;
      for (const v of vortices) {
        const dx = x - v.x;
        const dy = y - v.y;
        const k = v.spin / (dx * dx + dy * dy + p.core * p.core);
        vx += -dy * k;
        vy += dx * k;
      }
      const len = Math.hypot(vx, vy) || 1;
      return [vx / len, vy / len];
    };

    // Distance from point q to the segment a-b.
    const gap = ([qx, qy], [ax, ay], [bx, by]) => {
      const dx = bx - ax;
      const dy = by - ay;
      const t = Math.max(0, Math.min(1, ((qx - ax) * dx + (qy - ay) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(qx - ax - t * dx, qy - ay - t * dy);
    };

    // Midpoint integration in one direction (sign = 1 forward, -1 backward). A line caught
    // in a closed eddy stops after a few laps: by then overlapping laps are as dark as they
    // get, and further laps only retrace them.
    const LAPS = 3;
    const trace = (x, y, sign) => {
      const points = [];
      let away = false;
      let laps = 0;
      for (let s = 0; s < p.length; s++) {
        if (x < -10 || y < -10 || x > W + 10 || y > H + 10) break;
        points.push([x, y]);
        if (s > 0) {
          const d = gap(points[0], points[s - 1], points[s]);
          if (d > 2 * stepSize) away = true;
          else if (away && d < 0.1) {
            away = false;
            if (++laps === LAPS) return { points, closed: true };
          }
        }
        const [ax, ay] = velocity(x, y);
        const [bx, by] = velocity(x + (sign * ax * stepSize) / 2, y + (sign * ay * stepSize) / 2);
        x += sign * bx * stepSize;
        y += sign * by * stepSize;
      }
      return { points, closed: false };
    };

    // Keeps only the points the line needs: from each kept point, the line jumps to the
    // farthest later point whose chord passes within `tolerance` px of every point skipped.
    // The chord's direction must stay inside the window each skipped point allows.
    const tolerance = 0.2;
    const simplify = (points) => {
      const out = [points[0]];
      for (let a = 0; a < points.length - 1; ) {
        const [ax, ay] = points[a];
        // Angles are measured from the first step, so they never wrap around.
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

    // Path data in tenths of a pixel, relative to the previous rounded point (so no drift).
    const num = (t) => String(t / 10).replace(/^(-?)0\./, "$1.");
    const pathData = (points) => {
      let [px, py] = points[0].map((v) => Math.round(v * 10));
      let d = `M${num(px)} ${num(py)}l`;
      for (const [i, [x, y]] of points.slice(1).entries()) {
        const [qx, qy] = [Math.round(x * 10), Math.round(y * 10)];
        const [dx, dy] = [num(qx - px), num(qy - py)];
        d += (i > 0 && dx[0] !== "-" ? " " : "") + dx + (dy[0] === "-" ? "" : " ") + dy;
        [px, py] = [qx, qy];
      }
      return d;
    };

    for (let i = 0; i < p.lines; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const back = trace(x, y, -1);
      const points = back.closed ? back.points.reverse() : back.points.reverse().concat(trace(x, y, 1).points.slice(1));
      if (points.length < 2) continue;
      pen.path(pathData(simplify(points)));
    }
  },
});
