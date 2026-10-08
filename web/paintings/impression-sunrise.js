Gallery.register({
  id: "impression-sunrise",
  title: "Impression, Sunrise (after Monet)",
  description:
    "After Claude Monet's Impression, Sunrise (1872): an interpretation, not a copy. Short " +
    "directional brush marks build a blue-gray harbor haze, an orange sun hangs low, its " +
    "reflection broken on the water, and a few dark boats drift by.",
  tags: ["color", "random"],
  instruction:
    "Lay a blue-gray haze over the wall with {marks} short brush marks, mostly level, laid " +
    "at random (seed {seed}). Place an orange sun {sunHeight%} of the way up the sky and " +
    "break its reflection into short strokes on the water below. Add a few dark boats.",
  params: [
    { name: "marks", label: "Brush marks", type: "range", min: 300, max: 5000, step: 50, value: 2600 },
    { name: "sunHeight", label: "Sun height", type: "range", min: 0.05, max: 0.9, step: 0.01, value: 0.45 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 7 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const horizon = W * 0.55;
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const top = [96, 118, 140];
    const haze = [150, 160, 166];
    const water = [70, 98, 122];
    const tone = (y) => (y < horizon ? mix(top, haze, y / horizon) : mix(haze, water, (y - horizon) / (W - horizon)));

    // Ground gradient in thin strips.
    for (let y = 0; y < W; y += 10) pen.polygon([[0, y - 1], [W, y - 1], [W, y + 11], [0, y + 11]], { fill: rgba(tone(y + 10), 1), stroke: "none" });

    // Faint harbor silhouettes on the left horizon.
    for (let i = 0; i < 9; i++) {
      const x = W * (0.04 + rand() * 0.4);
      pen.line(x, horizon, x + (rand() - 0.5) * 10, horizon - 60 - rand() * 120, { stroke: "rgba(70,80,95,0.35)", width: 2 + rand() * 3 });
    }

    // Brush marks, colored by height with a little scatter, steeper in the sky.
    for (let i = 0; i < p.marks; i++) {
      const x = rand() * W;
      const y = rand() * W;
      const sky = y < horizon;
      const angle = (rand() - 0.5) * (sky ? 0.9 : 0.25) - (sky ? 0.2 : 0);
      const len = 8 + rand() * 18;
      // Most marks scatter around the local tone; near the sun some catch its orange.
      const nearSun = Math.hypot(x - W * 0.56, y - (horizon - p.sunHeight * horizon * 0.9)) < 220 && rand() < 0.25;
      const c = nearSun
        ? mix(tone(y), [235, 130, 70], 0.45)
        : tone(y).map((v) => Math.max(0, Math.min(255, Math.round(v + (rand() - 0.5) * 60))));
      pen.line(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len, { stroke: rgba(c, 0.6), width: 3 + rand() * 4 });
    }

    // Sun and its broken reflection.
    const sx = W * 0.56;
    const sy = horizon - p.sunHeight * horizon * 0.9;
    pen.circle(sx, sy, 22, { fill: "#f0662a", stroke: "none" });
    for (let i = 0; i < 26; i++) {
      const y = horizon + 12 + i * ((W - horizon - 30) / 26);
      const width = 34 * (1 - i / 30) + rand() * 10;
      const x = sx + (rand() - 0.5) * 16;
      pen.line(x - width / 2, y, x + width / 2, y + (rand() - 0.5) * 3, { stroke: rgba([240, 110, 50], 0.85), width: 4 + rand() * 3 });
    }

    // Dark boats: a hull and a figure or mast.
    const boats = 3;
    for (let i = 0; i < boats; i++) {
      const bx = W * (0.15 + 0.55 * rand());
      const by = horizon + 80 + i * 70 + rand() * 30;
      const s = 0.6 + (by - horizon) / (W - horizon);
      pen.polygon([[bx - 34 * s, by], [bx + 34 * s, by - 4 * s], [bx + 22 * s, by + 9 * s], [bx - 24 * s, by + 9 * s]], { fill: "#1f2a35", stroke: "none" });
      pen.line(bx, by - 2 * s, bx + 2 * s, by - 26 * s, { stroke: "#1f2a35", width: 4 * s });
      pen.line(bx + 12 * s, by - 2 * s, bx + 30 * s, by - 18 * s, { stroke: "#1f2a35", width: 2 * s });
    }
  },
});
