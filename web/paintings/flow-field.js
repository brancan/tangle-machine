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
    { name: "lines", label: "Lines", type: "range", min: 20, max: 1200, step: 10, value: 420 },
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
    const f = (n) => n.toFixed(1);

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

    // Midpoint integration in one direction (sign = 1 forward, -1 backward).
    const trace = (x, y, sign) => {
      const points = [];
      for (let s = 0; s < p.length; s++) {
        if (x < -10 || y < -10 || x > W + 10 || y > H + 10) break;
        points.push([x, y]);
        const [ax, ay] = velocity(x, y);
        const [bx, by] = velocity(x + (sign * ax * stepSize) / 2, y + (sign * ay * stepSize) / 2);
        x += sign * bx * stepSize;
        y += sign * by * stepSize;
      }
      return points;
    };

    for (let i = 0; i < p.lines; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const points = trace(x, y, -1).reverse().concat(trace(x, y, 1).slice(1));
      if (points.length < 2) continue;
      pen.path("M" + points.map(([px, py]) => `${f(px)} ${f(py)}`).join("L"));
    }
  },
});
