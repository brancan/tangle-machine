Gallery.register({
  id: "shaded-ribbons",
  title: "Shaded Ribbons",
  description:
    "Thick wavy lines run from top to bottom and cross each other. The lens-shaped cells " +
    "between neighbours are shaded with soft graphite along one of their edges.",
  tags: ["organic", "random"],
  instruction:
    "Draw {lines} thick lines from top to bottom, {thickness} px wide, each one a sum of two " +
    "slow waves swinging up to {waviness} times the space between lines, so neighbours cross. " +
    "Between each pair of neighbouring lines, until they cross, shade one side of the cell " +
    "with soft graphite that fades from dark at the edge to bare paper {shading%} of the way across, " +
    "flecked with fine grain; leave about one cell in five bare.",
  params: [
    { name: "lines", label: "Lines", type: "range", min: 2, max: 14, step: 1, value: 7 },
    { name: "waviness", label: "Waviness", type: "range", min: 0, max: 2, step: 0.01, value: 1.1 },
    { name: "thickness", label: "Line thickness", type: "range", min: 1, max: 16, step: 0.5, value: 9 },
    { name: "shading", label: "Shading", type: "range", min: 0, max: 1, step: 0.01, value: 0.75 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 12 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const f = (n) => n.toFixed(1);
    const gap = W / p.lines;

    // Each line is two sine waves with random phases and 1 to 3 swings over the height.
    const waves = [];
    for (let i = 0; i < p.lines; i++) {
      waves.push({
        x: gap * (i + 0.5),
        a1: gap * p.waviness * (0.5 + rand() * 0.6),
        f1: ((1 + rand() * 2) * 2 * Math.PI) / H,
        p1: rand() * 6.3,
        a2: gap * p.waviness * rand() * 0.35,
        f2: ((2 + rand() * 3) * 2 * Math.PI) / H,
        p2: rand() * 6.3,
      });
    }
    const xAt = (w, y) => w.x + w.a1 * Math.sin(w.f1 * y + w.p1) + w.a2 * Math.sin(w.f2 * y + w.p2);

    // Graphite: many faint nested bands that grow from one edge of a cell, so their sum
    // fades smoothly from dark at the edge to bare paper.
    const LAYERS = 24;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(p.ink.slice(i, i + 2), 16) || 0);
    const layers = Array.from({ length: LAYERS }, () => "");
    let grain = "";
    const STEP = 8;
    const sample = (y) => {
      const pos = waves.map((w) => Math.min(W, Math.max(0, xAt(w, y))));
      pos[-1] = 0;
      pos[p.lines] = W;
      return pos;
    };
    // Each gap between neighbouring lines is one cell until its two lines cross and pinch it shut.
    const cells = [];
    const open = () => {
      const pick = rand();
      // Pick the shaded side, or leave about a fifth of the cells blank.
      return { rows: [], side: pick < 0.4 ? 0 : 1, blank: pick > 0.8 };
    };
    let prev = null;
    let prevOrder = null;
    let current = [];
    for (let y = 0; y <= H; y += STEP) {
      const pos = sample(y);
      const order = [-1, ...waves.map((w, id) => id).sort((a, b) => pos[a] - pos[b]), p.lines];
      for (let i = 0; i < order.length - 1; i++) {
        if (prev) {
          const [a, b] = [prevOrder[i], prevOrder[i + 1]];
          if (pos[a] > pos[b]) {
            // The lines crossed between rows: close the cell at the crossing, open a new one.
            const m = (pos[a] + pos[b]) / 2;
            current[i].rows.push([y, m, m]);
            cells.push(current[i]);
            current[i] = open();
            const n = (prev[order[i]] + prev[order[i + 1]]) / 2;
            current[i].rows.push([y - STEP, n, n]);
          }
        } else {
          current[i] = open();
        }
        current[i].rows.push([y, pos[order[i]], pos[order[i + 1]]]);
      }
      prev = pos;
      prevOrder = order;
    }
    cells.push(...current);

    for (const cell of cells) {
      if (cell.blank || cell.rows.length < 2) continue;
      // Every other row is plenty for soft edges and keeps the drawing light.
      const rows = cell.rows.filter((row, i) => i % 2 === 0 || i === cell.rows.length - 1);
      const edge = rows.map(([y, xa, xb]) => [y, cell.side ? xb : xa]);
      for (let k = 0; k < LAYERS; k++) {
        const base = p.shading * 0.95 * ((k + 1) / LAYERS) ** 1.6;
        // Each band's inner edge sways a little on its own, which blurs the steps between bands.
        const phase = k * 2.39;
        const inner = rows.map(([y, xa, xb]) => {
          const share = base * (1 + 0.1 * Math.sin(y * 0.021 + phase));
          return [y, cell.side ? xb - (xb - xa) * share : xa + (xb - xa) * share];
        });
        const pts = edge.concat(inner.reverse());
        layers[k] += "M" + pts.map(([y, x]) => `${f(x)} ${f(y)}`).join("L") + "Z";
      }
      // Graphite grain: tiny flecks at random slants, packed most tightly against the dark edge.
      for (const [y, xa, xb] of cell.rows) {
        const span = (xb - xa) * p.shading;
        for (let n = 0; n < span / 18; n++) {
          const t = rand() ** 2.5;
          const x = cell.side ? xb - span * t : xa + span * t;
          const a = 0.6 + rand() * 1.2;
          const len = 1 + rand() * 2;
          grain += `M${f(x)} ${f(y + rand() * 8)}l${f(len * Math.cos(a))} ${f(-len * Math.sin(a))}`;
        }
      }
    }

    if (p.shading > 0) {
      for (const d of layers) if (d) pen.path(d, { fill: `rgba(${r},${g},${b},0.03)`, stroke: "none" });
      if (grain) pen.path(grain, { stroke: `rgba(${r},${g},${b},0.22)`, width: f(0.7 * p.strokeWidth) });
    }

    for (const w of waves) {
      const pts = [];
      for (let y = -STEP; y <= H + STEP; y += STEP) pts.push([xAt(w, y), y]);
      pen.polyline(pts, { width: f(p.thickness * p.strokeWidth) });
    }
  },
});
