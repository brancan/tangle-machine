Gallery.register({
  id: "spider-web",
  title: "Spider Web",
  description:
    "Radial threads with sagging spiral rings that get denser toward the center. " +
    "White ink on black paper, like a chalk doodle.",
  style: { ink: "#f4f1ea", paper: "#141414", strokeWidth: 2.4 },
  params: [
    { name: "spokes", label: "Spokes", type: "range", min: 5, max: 36, step: 1, value: 16 },
    { name: "rings", label: "Rings", type: "range", min: 3, max: 40, step: 1, value: 15 },
    { name: "growth", label: "Ring spacing growth", type: "range", min: 1, max: 3, step: 0.05, value: 1.7 },
    { name: "sag", label: "Sag", type: "range", min: 0, max: 0.6, step: 0.01, value: 0.22 },
    { name: "jitter", label: "Spoke jitter", type: "range", min: 0, max: 0.6, step: 0.01, value: 0.15 },
    { name: "offsetX", label: "Center X offset", type: "range", min: -300, max: 300, step: 1, value: 0 },
    { name: "offsetY", label: "Center Y offset", type: "range", min: -300, max: 300, step: 1, value: 40 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 7 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const cx = pen.width / 2 + p.offsetX;
    const cy = pen.height / 2 + p.offsetY;
    const reach = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(pen.width - cx, cy),
      Math.hypot(cx, pen.height - cy),
      Math.hypot(pen.width - cx, pen.height - cy)
    );

    const step = (2 * Math.PI) / p.spokes;
    const angles = [];
    for (let k = 0; k < p.spokes; k++) angles.push((k + (rand() - 0.5) * p.jitter) * step);

    for (const a of angles) pen.line(cx, cy, cx + reach * Math.cos(a), cy + reach * Math.sin(a));

    const f = (n) => n.toFixed(2);
    for (let j = 1; j <= p.rings; j++) {
      const r = reach * Math.pow(j / p.rings, p.growth);
      for (let k = 0; k < p.spokes; k++) {
        const a = angles[k];
        const b = k + 1 < p.spokes ? angles[k + 1] : angles[0] + 2 * Math.PI;
        const mid = (a + b) / 2;
        // Control point pulled from the chord midpoint toward the center.
        const pull = r * Math.cos((b - a) / 2) * (1 - p.sag);
        const x0 = cx + r * Math.cos(a);
        const y0 = cy + r * Math.sin(a);
        const x1 = cx + r * Math.cos(b);
        const y1 = cy + r * Math.sin(b);
        const qx = cx + pull * Math.cos(mid);
        const qy = cy + pull * Math.sin(mid);
        pen.path(`M${f(x0)} ${f(y0)}Q${f(qx)} ${f(qy)} ${f(x1)} ${f(y1)}`);
      }
    }
  },
});
