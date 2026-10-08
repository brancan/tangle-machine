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
    "with soft graphite reaching {shading%} of the way across; leave about one cell in five bare.",
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

    // Graphite: nested translucent bands that grow from one edge of a cell, darkest at the edge.
    const LAYERS = 7;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(p.ink.slice(i, i + 2), 16) || 0);
    const layers = Array.from({ length: LAYERS }, () => "");
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
      for (let k = 0; k < LAYERS; k++) {
        const share = p.shading * 0.9 * ((k + 1) / LAYERS) ** 1.5;
        const edge = cell.rows.map(([y, xa, xb]) => [y, cell.side ? xb : xa]);
        const inner = cell.rows.map(([y, xa, xb]) => [y, cell.side ? xb - (xb - xa) * share : xa + (xb - xa) * share]);
        const pts = edge.concat(inner.reverse());
        layers[k] += "M" + pts.map(([y, x]) => `${f(x)} ${f(y)}`).join("L") + "Z";
      }
    }

    if (p.shading > 0) {
      for (const d of layers) if (d) pen.path(d, { fill: `rgba(${r},${g},${b},0.08)`, stroke: "none" });
    }

    for (const w of waves) {
      const pts = [];
      for (let y = -STEP; y <= H + STEP; y += STEP) pts.push([xAt(w, y), y]);
      pen.polyline(pts, { width: f(p.thickness * p.strokeWidth) });
    }
  },
});
