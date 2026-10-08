Gallery.register({
  id: "pebble-cells",
  title: "Pebble Cells",
  description:
    "Rounded pebbles packed edge to edge, floating on black. Each one has a double outline " +
    "and is filled with parallel hatching at its own angle.",
  instruction:
    "On a black square, scatter {cells} points and give each the region closest to it. " +
    "Pull every region back {gap} px from its neighbours and round its corners by {roundness%}. " +
    "Fill it white, draw a second outline {band} px inside, and fill that with parallel lines " +
    "{spacing} px apart at a random angle.",
  params: [
    { name: "cells", label: "Pebbles", type: "range", min: 3, max: 90, step: 1, value: 30 },
    { name: "roundness", label: "Roundness", type: "range", min: 0, max: 1, step: 0.01, value: 0.95 },
    { name: "gap", label: "Gap", type: "range", min: 2, max: 40, step: 1, value: 12 },
    { name: "band", label: "Rim", type: "range", min: 0, max: 20, step: 1, value: 7 },
    { name: "spacing", label: "Hatch spacing", type: "range", min: 2, max: 20, step: 0.5, value: 5 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 9 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const f = (n) => n.toFixed(1);
    const M = 24;

    // Keeps the part of a convex polygon where nx*x + ny*y <= c.
    const cut = (poly, nx, ny, c) => {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const da = nx * a[0] + ny * a[1] - c;
        const db = nx * b[0] + ny * b[1] - c;
        if (da <= 0) out.push(a);
        if (da * db < 0) {
          const t = da / (da - db);
          out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      return out;
    };
    // Voronoi cell of site i, pulled back by `inset` from every neighbour and from the frame.
    const cell = (sites, i, inset) => {
      const lo = M + inset;
      const hi = W - M - inset;
      let poly = [[lo, lo], [hi, lo], [hi, hi], [lo, hi]];
      if (hi <= lo) return [];
      const [sx, sy] = sites[i];
      for (let j = 0; j < sites.length && poly.length > 2; j++) {
        if (j === i) continue;
        const nx = sites[j][0] - sx;
        const ny = sites[j][1] - sy;
        const len = Math.hypot(nx, ny);
        if (len < 1e-9) continue;
        poly = cut(poly, nx, ny, nx * (sx + nx / 2) + ny * (sy + ny / 2) - (len * inset) / 2);
      }
      return poly.length > 2 ? poly : [];
    };
    const centroid = (poly) => [
      poly.reduce((s, q) => s + q[0], 0) / poly.length,
      poly.reduce((s, q) => s + q[1], 0) / poly.length,
    ];

    // Jittered grid of sites, relaxed twice towards their cell centres for even pebbles.
    const side = Math.ceil(Math.sqrt(p.cells));
    const w = (W - 2 * M) / side;
    const h = (H - 2 * M) / Math.ceil(p.cells / side);
    let sites = [];
    for (let k = 0; k < p.cells; k++) {
      sites.push([M + ((k % side) + 0.15 + rand() * 0.7) * w, M + (Math.floor(k / side) + 0.15 + rand() * 0.7) * h]);
    }
    for (let it = 0; it < 1; it++) {
      sites = sites.map((s, i) => {
        const poly = cell(sites, i, 0);
        return poly.length ? centroid(poly) : s;
      });
    }

    // Corners become quadratic curves; roundness 1 runs them from edge midpoint to edge midpoint.
    const rounded = (poly) => {
      const t = Math.max(0.001, p.roundness / 2);
      const lerp = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
      const n = poly.length;
      let d = "";
      for (let i = 0; i < n; i++) {
        const v = poly[i];
        const a = lerp(v, poly[(i + n - 1) % n], t);
        const b = lerp(v, poly[(i + 1) % n], t);
        d += `${i ? "L" : "M"}${f(a[0])} ${f(a[1])}Q${f(v[0])} ${f(v[1])} ${f(b[0])} ${f(b[1])}`;
      }
      return d + "Z";
    };

    pen.polygon([[M, M], [W - M, M], [W - M, H - M], [M, H - M]], { fill: p.ink });
    sites.forEach((s, i) => {
      const outer = cell(sites, i, p.gap);
      if (!outer.length) return;
      pen.path(rounded(outer), { fill: p.paper, width: f(1.5 * p.strokeWidth) });
      const inner = cell(sites, i, p.gap + 2 * p.band);
      if (!inner.length) return;
      const shape = rounded(inner);
      // Hatching across the inner pebble, at a random angle.
      const [cx, cy] = centroid(inner);
      const reach = Math.max(...inner.map(([x, y]) => Math.hypot(x - cx, y - cy)));
      const a = rand() * Math.PI;
      const [ux, uy] = [Math.cos(a), Math.sin(a)];
      let d = "";
      for (let o = -reach; o <= reach; o += p.spacing) {
        const [x, y] = [cx - uy * o, cy + ux * o];
        d += `M${f(x - ux * reach)} ${f(y - uy * reach)}L${f(x + ux * reach)} ${f(y + uy * reach)}`;
      }
      pen.clip(shape, () => pen.path(d, { width: f(0.8 * p.strokeWidth) }));
      pen.path(shape, { width: f(1.2 * p.strokeWidth) });
    });
  },
});
