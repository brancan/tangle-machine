Gallery.register({
  id: "drips",
  title: "Drips",
  description:
    "Ink running down from the top of the page, with loose drops below. Every shape " +
    "is outlined with rainbow halos and catches a small highlight.",
  tags: ["organic", "random", "color"],
  instruction:
    "Paint a band {band} px deep across the top. Let {drips} drips run down from it, up to " +
    "{length} px long and about {width} px wide, and let {drops} loose drops fall below " +
    "(seed {seed}). Outline every shape with {rainbow?rainbow:black} halos {halo} px wide " +
    "and give each drip a highlight.",
  style: { ink: "#111111", paper: "#fbf8f0", strokeWidth: 1 },
  params: [
    { name: "drips", label: "Drips", type: "range", min: 2, max: 20, step: 1, value: 8 },
    { name: "band", label: "Top band", type: "range", min: 20, max: 350, step: 1, value: 140 },
    { name: "length", label: "Drip length", type: "range", min: 40, max: 600, step: 1, value: 300 },
    { name: "width", label: "Drip width", type: "range", min: 8, max: 50, step: 1, value: 26 },
    { name: "drops", label: "Loose drops", type: "range", min: 0, max: 30, step: 1, value: 9 },
    { name: "halo", label: "Halo width", type: "range", min: 0, max: 20, step: 0.5, value: 7 },
    { name: "rainbow", label: "Rainbow halo", type: "checkbox", value: true },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 2 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const top = p.band;
    const slot = W / p.drips;
    const f = (n) => n.toFixed(2);

    const drips = [];
    for (let k = 0; k < p.drips; k++) {
      const w = Math.min(p.width * (0.6 + 0.8 * rand()), slot * 0.3);
      const x = slot * (k + 0.5) + (rand() - 0.5) * (slot - 2.8 * w);
      const fillet = w * 0.6;
      const length = Math.max(p.length * (0.25 + 0.75 * rand()), fillet + 5);
      drips.push({ x, w, fillet, length });
    }

    // One outline for the band and all its drips, walked right to left along the band edge.
    let d = `M-20 -20L${W + 20} -20L${W + 20} ${top}`;
    for (const { x, w, fillet: r, length } of [...drips].reverse()) {
      const end = top + length;
      d +=
        `L${f(x + w + r)} ${top}Q${f(x + w)} ${top} ${f(x + w)} ${f(top + r)}` +
        `L${f(x + w)} ${f(end)}C${f(x + w)} ${f(end + w * 1.4)} ${f(x - w)} ${f(end + w * 1.4)} ${f(x - w)} ${f(end)}` +
        `L${f(x - w)} ${f(top + r)}Q${f(x - w)} ${top} ${f(x - w - r)} ${top}`;
    }
    d += `L-20 ${top}Z`;

    const shapes = [d];
    for (let k = 0; k < p.drops; k++) {
      const s = 5 + rand() * 12;
      const x = rand() * W;
      const y = top + 40 + rand() * (pen.height - top - 60);
      shapes.push(
        `M${f(x)} ${f(y - 1.8 * s)}C${f(x + 1.2 * s)} ${f(y - 0.4 * s)} ${f(x + s)} ${f(y + s)} ${f(x)} ${f(y + s)}` +
          `C${f(x - s)} ${f(y + s)} ${f(x - 1.2 * s)} ${f(y - 0.4 * s)} ${f(x)} ${f(y - 1.8 * s)}Z`
      );
    }

    // Halos are wide strokes, widest first; the ink fill then covers their inner half.
    const colors = p.rainbow ? ["#2a9df4", "#fcbf49", "#f77f00", "#e63946"] : [p.ink];
    for (const shape of shapes) {
      colors.forEach((color, i) => {
        const width = 2 * p.halo * (colors.length - i);
        if (width > 0) pen.path(shape, { stroke: color, width });
      });
      pen.path(shape, { fill: p.ink, stroke: p.ink });
    }

    for (const { x, w, length } of drips) {
      const end = top + length;
      pen.line(x - w * 0.45, end - w * 0.7, x - w * 0.45, end + w * 0.2, { stroke: p.paper, width: w * 0.2 });
    }
  },
});
