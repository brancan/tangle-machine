Gallery.register({
  id: "great-wave",
  title: "Great Wave (after Hokusai)",
  description:
    "After Katsushika Hokusai's Great Wave off Kanagawa (c. 1831): an interpretation, not a " +
    "copy. A tall wave built from Bézier curves rears up and curls over, its crest breaking " +
    "into clawing fingers of foam, with a small snow-capped peak far behind.",
  tags: ["organic"],
  style: { paper: "#efe5ca" },
  instruction:
    "Draw a wave rising to {height%} of the wall and curling over by {curl%}. Inside it draw " +
    "{lines} lines that follow its back. Along the curling lip let foam break into claws that " +
    "split {foam} times, at random (seed {seed}). Below, draw {lines} rows of small waves and, " +
    "far behind, a small snow-capped peak.",
  params: [
    { name: "height", label: "Height", type: "range", min: 0.3, max: 0.75, step: 0.01, value: 0.58 },
    { name: "curl", label: "Curl", type: "range", min: 0.2, max: 1, step: 0.01, value: 0.75 },
    { name: "foam", label: "Foam detail", type: "range", min: 0, max: 5, step: 1, value: 3 },
    { name: "lines", label: "Water lines", type: "range", min: 2, max: 20, step: 1, value: 9 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 6 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const blue = "#1e3a63";
    const light = "#7d9cbb";
    const foam = "#f6f0de";
    const f = (n) => n.toFixed(2);
    const pt = ([x, y]) => `${f(x)} ${f(y)}`;
    const base = W * 0.72;
    const top = base - p.height * W;
    const crestX = W * 0.44;
    const R = (base - top) * 0.5;

    // The distant peak, behind everything.
    const peakX = W * 0.78;
    const peakTop = base - 80;
    pen.polygon([[peakX - 90, base], [peakX - 14, peakTop], [peakX + 14, peakTop], [peakX + 90, base]], { fill: blue, stroke: blue });
    pen.polygon([[peakX - 32, peakTop + 34], [peakX - 14, peakTop], [peakX + 14, peakTop], [peakX + 32, peakTop + 34], [peakX + 12, peakTop + 26], [peakX, peakTop + 36], [peakX - 12, peakTop + 26]], {
      fill: foam,
      stroke: blue,
      width: 1,
    });

    // Wave outline: back face up to the crest, the curl over and down, then the hollow front.
    const back = [[W * 0.7, base], [W * 0.64, base - R * 0.8], [crestX + R * 1.1, top + R * 0.05], [crestX, top]];
    const lip = [crestX - R * (0.55 + 0.45 * p.curl), top + R * (0.35 + 0.85 * p.curl)];
    const curl = [[crestX, top], [crestX - R * 1.0, top - R * 0.2], [crestX - R * (1.0 + 0.6 * p.curl), lip[1] - R * 0.5 * p.curl], lip];
    const front = [lip, [crestX + R * 0.15, top + R * 0.7], [crestX - R * 0.05, base - R * 0.35], [W * 0.04, base]];
    const outline =
      `M${pt(back[0])}C${pt(back[1])} ${pt(back[2])} ${pt(back[3])}` +
      `C${pt(curl[1])} ${pt(curl[2])} ${pt(curl[3])}` +
      `C${pt(front[1])} ${pt(front[2])} ${pt(front[3])}Z`;
    pen.path(outline, { fill: blue, stroke: blue });

    // Lines along the back of the wave, shifted down and in, clipped to the wave body.
    pen.clip(outline, () => {
      for (let k = 1; k <= p.lines; k++) {
        const d = (k / (p.lines + 1)) * R * 1.6;
        const shift = ([x, y]) => [x - d * 0.55, y + d];
        pen.path(`M${pt(shift(back[0]))}C${pt(shift(back[1]))} ${pt(shift(back[2]))} ${pt(shift(back[3]))}` +
          `C${pt(shift(curl[1]))} ${pt(shift(curl[2]))} ${pt(shift(curl[3]))}`, { stroke: light, width: 2 });
      }
    });

    // Foam: claws along the curl, each splitting into smaller claws.
    const bezier = (c, t) => {
      const u = 1 - t;
      return [0, 1].map((i) => u ** 3 * c[0][i] + 3 * u * u * t * c[1][i] + 3 * u * t * t * c[2][i] + t ** 3 * c[3][i]);
    };
    const claw = (x, y, angle, len, depth) => {
      const bend = angle + (rand() - 0.3) * 0.9;
      const x2 = x + Math.cos(bend) * len;
      const y2 = y + Math.sin(bend) * len;
      const qx = x + Math.cos(angle - 0.5) * len * 0.6;
      const qy = y + Math.sin(angle - 0.5) * len * 0.6;
      pen.path(`M${f(x)} ${f(y)}Q${f(qx)} ${f(qy)} ${f(x2)} ${f(y2)}`, { stroke: foam, width: Math.max(1, depth * 1.4 + 1) });
      if (depth > 0) {
        for (const turn of [-0.55, 0.45]) claw(x2, y2, bend + turn + (rand() - 0.5) * 0.3, len * 0.58, depth - 1);
      } else {
        pen.circle(x2, y2, 1.6, { fill: foam, stroke: "none" });
      }
    };
    pen.path(`M${pt(curl[0])}C${pt(curl[1])} ${pt(curl[2])} ${pt(curl[3])}`, { stroke: foam, width: 3 });
    const samples = 11;
    for (let i = 0; i < samples; i++) {
      const t = 0.15 + (0.85 * i) / (samples - 1);
      const [x, y] = bezier(curl, t);
      const [x2, y2] = bezier(curl, Math.min(1, t + 0.01));
      // Claws reach out from the outer side of the curl, leaning downward.
      const tangent = Math.atan2(y2 - y, x2 - x);
      claw(x, y, tangent - Math.PI / 2 + 0.4, R * (0.24 + 0.12 * rand()), p.foam);
    }

    // Foreground swell: rows of small waves.
    for (let k = 0; k < p.lines; k++) {
      const y = base + 14 + (k * (W - base - 20)) / p.lines;
      const wl = 50 + k * 6;
      const amp = 5 + k * 1.2;
      const phase = rand() * wl;
      let d = `M${f(-phase)} ${f(y)}`;
      for (let x = -phase; x < W; x += wl) d += `Q${f(x + wl / 4)} ${f(y - amp * 2)} ${f(x + wl / 2)} ${f(y)}Q${f(x + (3 * wl) / 4)} ${f(y + amp)} ${f(x + wl)} ${f(y)}`;
      pen.path(d, { stroke: blue, width: 1.6 });
    }
  },
});
