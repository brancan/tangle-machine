Gallery.register({
  id: "tube-network",
  title: "Tube Network",
  description:
    "Organic tubes branching between random nodes, striped with fine contour lines. " +
    "Each color is its own network, woven over the ones drawn before it.",
  instruction:
    "For each of {groups} colors, scatter {nodes} points (seed {seed}) and join each to its " +
    "{links} nearest neighbours with tubes {tube} px wide, bent sideways by up to {bend%} " +
    "of their length. Stripe every tube with {stripes} lines along its length. Draw each " +
    "color over the ones before it.",
  params: [
    { name: "nodes", label: "Nodes per color", type: "range", min: 4, max: 60, step: 1, value: 26 },
    { name: "links", label: "Links per node", type: "range", min: 1, max: 4, step: 1, value: 2 },
    { name: "tube", label: "Tube width", type: "range", min: 10, max: 90, step: 1, value: 48 },
    { name: "stripes", label: "Stripes", type: "range", min: 2, max: 24, step: 1, value: 9 },
    { name: "bend", label: "Bend", type: "range", min: 0, max: 0.8, step: 0.01, value: 0.35 },
    { name: "groups", label: "Colors", type: "range", min: 1, max: 3, step: 1, value: 3 },
    { name: "color1", label: "Color 1", type: "color", value: "#d9a441" },
    { name: "color2", label: "Color 2", type: "color", value: "#1fb3bf" },
    { name: "color3", label: "Color 3", type: "color", value: "#f0567a" },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 8 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const colors = [p.color1, p.color2, p.color3];
    const f = (n) => n.toFixed(1);

    for (let g = 0; g < p.groups; g++) {
      const nodes = [];
      for (let i = 0; i < p.nodes; i++) nodes.push([-60 + rand() * (W + 120), -60 + rand() * (H + 120)]);

      // Link every node to its nearest neighbours, skipping duplicates.
      const seen = new Set();
      let d = "";
      nodes.forEach(([x, y], i) => {
        const nearest = nodes
          .map(([nx, ny], j) => [Math.hypot(nx - x, ny - y), j])
          .filter(([, j]) => j !== i)
          .sort((a, b) => a[0] - b[0])
          .slice(0, p.links);
        for (const [length, j] of nearest) {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const [nx, ny] = nodes[j];
          // Bow the tube sideways by a random share of its length.
          const swing = (rand() * 2 - 1) * p.bend * length;
          const qx = (x + nx) / 2 + (-(ny - y) / length) * swing;
          const qy = (y + ny) / 2 + ((nx - x) / length) * swing;
          d += `M${f(x)} ${f(y)}Q${f(qx)} ${f(qy)} ${f(nx)} ${f(ny)}`;
        }
      });

      // Stripes are nested strokes, widest first: a thin ink line, then color, narrower each time.
      // The outer rim is heavier so overlapping tubes read clearly.
      const width = p.tube * (1 - 0.15 * g);
      for (let k = 0; k < p.stripes; k++) {
        const w = width * (1 - k / p.stripes);
        const line = (k === 0 ? 1.5 : 0.45) * p.strokeWidth;
        pen.path(d, { stroke: p.ink, width: f(w) });
        pen.path(d, { stroke: colors[g], width: f(Math.max(0, w - 2 * line)) });
      }
    }
  },
});
