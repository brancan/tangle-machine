Gallery.register({
  id: "lightning-bolt",
  title: "Lightning Bolt",
  description:
    "Parallel zigzag lines march across the page, and a few of the gaps between them are " +
    "filled with ink, so solid lightning bolts flash through the stripes.",
  instruction:
    "At an angle of {angle}°, draw {lines} parallel zigzag lines {spacing} px apart, each " +
    "zig {period} px long and {amplitude} px high. Fill {bolts} runs of {boltWidth} " +
    "neighbouring gaps with ink, spread evenly between the lines.",
  params: [
    { name: "lines", label: "Lines", type: "range", min: 4, max: 160, step: 1, value: 96 },
    { name: "spacing", label: "Spacing", type: "range", min: 4, max: 40, step: 0.5, value: 13 },
    { name: "amplitude", label: "Zigzag height", type: "range", min: 0, max: 250, step: 1, value: 80 },
    { name: "period", label: "Zigzag length", type: "range", min: 30, max: 500, step: 1, value: 210 },
    { name: "angle", label: "Angle", type: "range", min: -90, max: 90, step: 1, value: 28 },
    { name: "bolts", label: "Bolts", type: "range", min: 0, max: 6, step: 1, value: 3 },
    { name: "boltWidth", label: "Bolt width (gaps)", type: "range", min: 1, max: 6, step: 1, value: 2 },
  ],
  draw: function draw(p, pen) {
    const cx = pen.width / 2;
    const cy = pen.height / 2;
    const reach = Math.hypot(pen.width, pen.height) / 2 + p.period;
    const a = (p.angle * Math.PI) / 180;
    const [ux, uy] = [Math.cos(a), Math.sin(a)];
    // Local (u along the bolt, v across it) to canvas coordinates.
    const toCanvas = (u, v) => [cx + u * ux - v * uy, cy + u * uy + v * ux];

    // A zigzag only needs its corners: every half period it flips between +A and -A.
    const corners = (v0) => {
      const list = [];
      const start = Math.floor(-reach / (p.period / 2));
      for (let k = start; k * (p.period / 2) <= reach; k++) {
        const u = k * (p.period / 2);
        list.push(toCanvas(u, v0 + (k % 2 ? p.amplitude : -p.amplitude) / 2));
      }
      return list;
    };

    const offset = (k) => (k - p.lines / 2) * p.spacing;
    const lines = [];
    for (let k = 0; k <= p.lines; k++) lines.push(corners(offset(k)));

    // Bolts fill a run of consecutive gaps, spread evenly through the stripes.
    for (let b = 1; b <= p.bolts; b++) {
      const k = Math.floor((p.lines * b) / (p.bolts + 1) - p.boltWidth / 2);
      const from = Math.max(0, k);
      const to = Math.min(p.lines, k + p.boltWidth);
      if (to <= from) continue;
      pen.polygon(lines[from].concat([...lines[to]].reverse()), { fill: p.ink });
    }
    for (const line of lines) pen.polyline(line);
  },
});
