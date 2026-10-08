Gallery.register({
  id: "mandala",
  title: "Mandala",
  description:
    "Concentric rings around a center, each holding its own motif, petals, dots, zigzags, " +
    "arches or spokes, all repeated with the same rotational symmetry.",
  tags: ["radial", "geometric"],
  instruction:
    "Draw {rings} rings around a filled center. Divide every ring into {symmetry} equal " +
    "sectors and fill each ring with one motif repeated in every sector, petals, dots, a " +
    "zigzag, arches or spokes, chosen at random (seed {seed}).",
  params: [
    { name: "symmetry", label: "Symmetry", type: "range", min: 4, max: 32, step: 1, value: 12 },
    { name: "rings", label: "Rings", type: "range", min: 2, max: 14, step: 1, value: 8 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 4 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const cx = pen.width / 2;
    const cy = pen.height / 2;
    const r0 = 34;
    const R = pen.width * 0.46;
    const N = p.symmetry;
    const sector = (2 * Math.PI) / N;
    const ring = (R - r0) / p.rings;
    const f = (n) => n.toFixed(2);
    const at = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const pt = (r, a) => at(r, a).map(f).join(" ");

    pen.circle(cx, cy, r0 * 0.45, { fill: p.ink });
    pen.circle(cx, cy, r0);

    let last = -1;
    for (let k = 0; k < p.rings; k++) {
      const inner = r0 + k * ring;
      const outer = inner + ring;
      const mid = (inner + outer) / 2;
      // Each ring picks a motif, never the same as the ring inside it.
      let motif = Math.floor(rand() * 6);
      if (motif === last) motif = (motif + 1) % 6;
      last = motif;
      const twist = k % 2 ? sector / 2 : 0;
      for (let i = 0; i < N; i++) {
        const a = i * sector + twist;
        if (motif === 0) {
          // Petal: two quadratic curves from the inner to the outer circle.
          pen.path(`M${pt(inner, a)}Q${pt(mid, a - sector * 0.45)} ${pt(outer - 2, a)}Q${pt(mid, a + sector * 0.45)} ${pt(inner, a)}Z`, {
            fill: i % 2 ? p.ink : "none",
          });
        } else if (motif === 1) {
          const size = Math.min(ring * 0.3, mid * sector * 0.28);
          pen.circle(...at(mid, a), size, { fill: p.ink });
          pen.circle(...at(mid, a + sector / 2), size * 0.45);
        } else if (motif === 2) {
          pen.polyline([at(inner + 2, a), at(outer - 2, a + sector / 2), at(inner + 2, a + sector)]);
          pen.polyline([at(inner + ring * 0.3, a), at(outer - ring * 0.3, a + sector / 2), at(inner + ring * 0.3, a + sector)]);
        } else if (motif === 3) {
          // Arch: a quadratic bump from one sector edge to the next.
          pen.path(`M${pt(inner, a)}Q${pt(outer * 1.04 - ring * 0.1, a + sector / 2)} ${pt(inner, a + sector)}`);
          pen.path(`M${pt(inner, a + sector * 0.25)}Q${pt(mid, a + sector / 2)} ${pt(inner, a + sector * 0.75)}`);
        } else if (motif === 4) {
          pen.line(...at(inner, a), ...at(outer, a));
          pen.circle(...at(outer - ring * 0.25, a + sector / 2), ring * 0.12, { fill: p.ink });
        } else {
          // Scallops hanging from the outer circle, with a teardrop inside.
          pen.path(`M${pt(outer, a)}Q${pt(inner - ring * 0.1, a + sector / 2)} ${pt(outer, a + sector)}`);
          pen.circle(...at(mid + ring * 0.15, a + sector / 2), ring * 0.1);
        }
      }
      pen.circle(cx, cy, outer);
    }
  },
});
