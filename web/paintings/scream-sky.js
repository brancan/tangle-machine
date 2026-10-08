Gallery.register({
  id: "scream-sky",
  title: "Scream Sky (after Munch)",
  description:
    "After the sky of Edvard Munch's The Scream (1893): an interpretation, not a copy, and " +
    "with no figure. Bands of blood-orange and yellow sky swirl over a dark blue fjord, " +
    "seen past a bridge railing that cuts across on a steep diagonal. When playing, the " +
    "bands flow.",
  tags: ["organic", "color", "animated"],
  instruction:
    "Fill the upper half of the wall with {bands} wavy bands of orange, red and yellow sky, " +
    "made restless by {turbulence%} turbulence (seed {seed}). Below, paint a dark blue fjord " +
    "between dark hills with swirling lines on the water. Across the foreground run a bridge " +
    "railing on a steep diagonal.",
  params: [
    { name: "bands", label: "Bands", type: "range", min: 4, max: 30, step: 1, value: 14 },
    { name: "turbulence", label: "Turbulence", type: "range", min: 0, max: 1, step: 0.01, value: 0.55 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 5 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const horizon = W * 0.5;
    const flow = (p.time || 0) * 0.5; // p.time is 0 when the studio is not playing
    const sky = ["#e2552f", "#f08a2c", "#f4c24a", "#c9472f", "#e9a13b", "#b8442c", "#f2b84b", "#7d8fa8"];

    // Band boundaries: sums of sines with random phases, sliding sideways with time.
    const waves = Array.from({ length: p.bands + 1 }, () => [rand() * 6.28, 0.6 + rand() * 0.8, rand() * 6.28]);
    const boundary = (k, x) => {
      const [ph, fr, ph2] = waves[k];
      const base = (k / p.bands) * (horizon + 40) - 20;
      const swirl = Math.sin((x / W) * 6.28 * fr + ph + flow) * 18;
      const churn = Math.sin((x / W) * 6.28 * 2.7 * fr + ph2 - flow * 1.3) * 26 * p.turbulence;
      return base + swirl + churn * (0.4 + k / p.bands);
    };
    for (let k = 0; k < p.bands; k++) {
      const top = [];
      const bottom = [];
      for (let x = 0; x <= W; x += 10) {
        top.push([x, k === 0 ? 0 : boundary(k, x)]);
        bottom.push([x, k === p.bands - 1 ? horizon + 30 : boundary(k + 1, x)]);
      }
      pen.polygon([...top, ...bottom.reverse()], { fill: sky[k % sky.length], stroke: "none" });
    }

    // The fjord and its dark shores.
    pen.polygon([[0, horizon], [W, horizon], [W, W], [0, W]], { fill: "#25365e", stroke: "none" });
    for (let i = 0; i < 9; i++) {
      const y = horizon + 30 + i * 30;
      const points = [];
      for (let x = W * 0.25; x <= W; x += 10) points.push([x, y + Math.sin(x / 60 + i + flow) * 8 * (1 + p.turbulence)]);
      pen.polyline(points, { stroke: "#3f5c8c", width: 3 });
    }
    const hills = [[W * 0.45, horizon + 10]];
    for (let x = W * 0.45; x <= W; x += 15) hills.push([x, horizon - 30 * Math.sin(((x - W * 0.45) / (W * 0.55)) * Math.PI) - 10]);
    hills.push([W, horizon + 40]);
    pen.polygon(hills, { fill: "#2f4a2c", stroke: "none" });
    const shore = [[0, horizon - 40]];
    for (let y = horizon - 40; y <= W; y += 20) shore.push([W * 0.18 + Math.sin(y / 50) * 30 + (y - horizon) * 0.25, y]);
    shore.push([0, W]);
    pen.polygon(shore, { fill: "#3b3220", stroke: "none" });

    // Bridge: the railing falls steeply from the left edge to the bottom right; the deck lies below it.
    const rail = (t) => [t * W * 1.05, W * 0.6 + t * W * 0.42];
    pen.polygon([rail(0), rail(1), [W, W], [0, W]], { fill: "#8a5a3a", stroke: "none" });
    pen.line(...rail(0), ...rail(1), { stroke: "#4a2c1c", width: 7 });
    pen.line(...rail(0).map((v, i) => (i ? v + 22 : v)), ...rail(1).map((v, i) => (i ? v + 22 : v)), { stroke: "#4a2c1c", width: 4 });
    for (let t = 0.04; t < 1; t += 0.08) {
      const [x, y] = rail(t);
      pen.line(x, y, x, y + 40 + (1 - t) * 30, { stroke: "#4a2c1c", width: 4 });
    }
  },
});
