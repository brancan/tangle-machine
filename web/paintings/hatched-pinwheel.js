Gallery.register({
  id: "hatched-pinwheel",
  title: "Hatched Pinwheel",
  description:
    "Rings of triangles turn a little more with every step outwards, spinning a vortex " +
    "around a small empty eye. Every triangle is filled with fine parallel hatching.",
  instruction:
    "Around a point near the middle, draw {rings} rings of {blades} points each, every ring " +
    "larger than the last and turned {twist%} of a step further, with {jitter%} of disorder. " +
    "Join each band of two rings into triangles. Fill every triangle with parallel lines " +
    "{spacing} px apart, running along one of its two longer sides, and outline it in heavy ink.",
  params: [
    { name: "blades", label: "Blades", type: "range", min: 3, max: 12, step: 1, value: 7 },
    { name: "rings", label: "Rings", type: "range", min: 2, max: 14, step: 1, value: 7 },
    { name: "twist", label: "Twist", type: "range", min: 0, max: 1, step: 0.01, value: 0.42 },
    { name: "spacing", label: "Hatch spacing", type: "range", min: 2, max: 20, step: 0.5, value: 5.5 },
    { name: "jitter", label: "Irregularity", type: "range", min: 0, max: 0.4, step: 0.01, value: 0.18 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 5 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const f = (n) => n.toFixed(1);
    const n = p.blades;
    const cx = W / 2 + (rand() - 0.5) * W * 0.2;
    const cy = H / 2 + (rand() - 0.5) * H * 0.2;

    // Rings grow geometrically from a small eye until they cover the corners.
    const inner = 22;
    const outer = Math.hypot(W, H);
    const grow = (outer / inner) ** (1 / p.rings);
    const rings = [];
    for (let k = 0; k <= p.rings; k++) {
      const ring = [];
      for (let i = 0; i < n; i++) {
        const a = ((i + k * p.twist + (rand() - 0.5) * p.jitter) * 2 * Math.PI) / n;
        const r = inner * grow ** k * (1 + (rand() - 0.5) * p.jitter);
        ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      rings.push(ring);
    }

    // Each band between two rings splits into quads, and each quad into two triangles.
    const triangles = [];
    for (let k = 0; k < p.rings; k++) {
      for (let i = 0; i < n; i++) {
        const A = rings[k][i];
        const B = rings[k][(i + 1) % n];
        const C = rings[k + 1][i];
        const D = rings[k + 1][(i + 1) % n];
        triangles.push([A, B, D], [A, D, C]);
      }
    }

    // Hatch parallel to one of the two longer edges, stepping towards the opposite corner.
    let d = "";
    for (const tri of triangles) {
      const edges = [0, 1, 2]
        .map((e) => [e, Math.hypot(tri[(e + 1) % 3][0] - tri[e][0], tri[(e + 1) % 3][1] - tri[e][1])])
        .sort((a, b) => b[1] - a[1]);
      const [e, length] = edges[rand() < 0.5 ? 0 : 1];
      if (length < 1e-6) continue;
      const P = tri[e];
      const Q = tri[(e + 1) % 3];
      const R = tri[(e + 2) % 3];
      const h = Math.abs((Q[0] - P[0]) * (R[1] - P[1]) - (Q[1] - P[1]) * (R[0] - P[0])) / length;
      for (let t = p.spacing / h; t < 1; t += p.spacing / h) {
        const x1 = P[0] + (R[0] - P[0]) * t;
        const y1 = P[1] + (R[1] - P[1]) * t;
        const x2 = Q[0] + (R[0] - Q[0]) * t;
        const y2 = Q[1] + (R[1] - Q[1]) * t;
        d += `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
      }
    }
    pen.clip(`M0 0H${W}V${H}H0Z`, () => {
      if (d) pen.path(d, { width: f(0.7 * p.strokeWidth) });
      for (const tri of triangles) pen.polygon(tri, { width: f(2 * p.strokeWidth) });
    });
  },
});
