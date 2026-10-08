Gallery.register({
  id: "static",
  title: "Static",
  description:
    "Parallel zigzag bands crackle across the square like lightning or radio static; every " +
    "other band is filled in solid.",
  tags: ["op-art", "geometric", "random"],
  instruction:
    "Draw one zigzag with {zigs} sharp turns, each corner reaching {amplitude%} of a band " +
    "sideways and shifted at random by up to {irregular%} (seed {seed}). Repeat it {bands} " +
    "times, side by side, tilted {angle}°, and {fill?fill every other band:leave the bands open}.",
  params: [
    { name: "bands", label: "Bands", type: "range", min: 4, max: 60, step: 1, value: 22 },
    { name: "zigs", label: "Zigzag turns", type: "range", min: 2, max: 40, step: 1, value: 12 },
    { name: "amplitude", label: "Amplitude", type: "range", min: 0.2, max: 3, step: 0.05, value: 1.6 },
    { name: "irregular", label: "Irregularity", type: "range", min: 0, max: 1, step: 0.05, value: 0.5 },
    { name: "angle", label: "Tilt", type: "range", min: -90, max: 90, step: 1, value: 20 },
    { name: "fill", label: "Fill alternate bands", type: "checkbox", value: true },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 4 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 40;
    const side = pen.width - 2 * margin;
    const c = pen.width / 2;
    const f = (n) => n.toFixed(2);
    // Work in a rotated frame big enough to cover the square at any tilt.
    const span = side * Math.SQRT2;
    const band = span / p.bands;
    const angle = (p.angle * Math.PI) / 180;
    const rotate = ([u, v]) => [
      c + u * Math.cos(angle) - v * Math.sin(angle),
      c + u * Math.sin(angle) + v * Math.cos(angle),
    ];

    // One zigzag: v runs along the band, u swings side to side.
    const zig = [];
    for (let i = 0; i <= p.zigs; i++) {
      const v = -span / 2 + (i / p.zigs) * span + (i > 0 && i < p.zigs ? (rand() - 0.5) * p.irregular * (span / p.zigs) : 0);
      const u = (i % 2 === 0 ? -0.5 : 0.5) * p.amplitude * band * (1 - p.irregular * 0.5 * rand());
      zig.push([u, v]);
    }
    const shifted = (k) => zig.map(([u, v]) => rotate([u - span / 2 + k * band, v]));

    const frame = `M${margin} ${margin}H${margin + side}V${margin + side}H${margin}Z`;
    pen.clip(frame, () => {
      const extra = Math.ceil(p.amplitude) + 1;
      for (let k = -extra; k <= p.bands + extra; k++) {
        const line = shifted(k);
        if (p.fill && k % 2 === 0) {
          const next = shifted(k + 1).reverse();
          pen.polygon([...line, ...next], { fill: p.ink });
        }
        pen.polyline(line);
      }
    });
    pen.polygon([[margin, margin], [margin + side, margin], [margin + side, margin + side], [margin, margin + side]]);
  },
});
