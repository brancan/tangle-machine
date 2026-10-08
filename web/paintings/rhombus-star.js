Gallery.register({
  id: "rhombus-star",
  title: "Rhombus Star",
  description:
    "A rosette built only from rhombi. Each ring is spanned by pairs of the star's edge " +
    "directions, and three tones turn the flat tiles into a faceted, folding star.",
  instruction:
    "Around a center, draw {rings} rings of rhombi built from the {points} directions of a " +
    "{points}-pointed star, reaching {scale%} of the way to the edge. Fill the rhombi of " +
    "odd rings black and white by turns and those of even rings in the mid tone. Hatch the " +
    "white ones with {hatch} lines.",
  params: [
    { name: "points", label: "Points", type: "range", min: 5, max: 16, step: 1, value: 8 },
    { name: "rings", label: "Rings", type: "range", min: 1, max: 7, step: 1, value: 2 },
    { name: "scale", label: "Size", type: "range", min: 0.2, max: 1, step: 0.01, value: 0.92 },
    { name: "hatch", label: "Hatch light faces", type: "range", min: 0, max: 12, step: 1, value: 0 },
    { name: "mid", label: "Mid tone", type: "color", value: "#8f8a80" },
  ],
  draw: function draw(p, pen) {
    const n = p.points;
    // Ring m uses directions k and k + m, which flatten into a line once m reaches n / 2.
    const rings = Math.min(p.rings, Math.ceil(n / 2) - 1);
    const dir = (k) => {
      const a = (2 * Math.PI * k) / n - Math.PI / 2;
      return [Math.cos(a), Math.sin(a)];
    };
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

    // Unit-size rhombi first, then scale so the outermost vertex reaches the chosen size.
    const tiles = [];
    for (let m = 1; m <= rings; m++) {
      for (let k = 0; k < n; k++) {
        let s = [0, 0];
        for (let j = k + 1; j < k + m; j++) s = add(s, dir(j));
        tiles.push({ m, k, pts: [s, add(s, dir(k)), add(add(s, dir(k)), dir(k + m)), add(s, dir(k + m))] });
      }
    }
    const far = Math.max(...tiles.flatMap((t) => t.pts.map(([x, y]) => Math.hypot(x, y))));
    const size = (p.scale * pen.width) / 2 / far;
    const cx = pen.width / 2;
    const cy = pen.height / 2;

    for (const { m, k, pts } of tiles) {
      const poly = pts.map(([x, y]) => [cx + x * size, cy + y * size]);
      // Odd rings alternate dark and light facets; even rings sit in the mid tone.
      const tone = m % 2 === 0 ? p.mid : (k + (m - 1) / 2) % 2 ? p.paper : p.ink;
      pen.polygon(poly, { fill: tone });
      if (tone === p.paper && p.hatch > 0) {
        // Hatch parallel to the rhombus' second edge.
        const [a, b, , d] = poly;
        for (let h = 1; h <= p.hatch; h++) {
          const t = h / (p.hatch + 1);
          const x = a[0] + (b[0] - a[0]) * t;
          const y = a[1] + (b[1] - a[1]) * t;
          pen.line(x, y, x + d[0] - a[0], y + d[1] - a[1], { width: p.strokeWidth * 0.6 });
        }
      }
    }
  },
});
