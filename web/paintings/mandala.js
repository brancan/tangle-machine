Gallery.register({
  id: "mandala",
  title: "Mandala",
  description:
    "Concentric rings around a center, each holding its own motif, petals, dots, zigzags, " +
    "arches or spokes, all repeated with the same rotational symmetry.",
  tags: ["radial", "geometric"],
  instruction:
    "Draw a rosette of {symmetry} petals, then {rings} rings around it. Divide every ring " +
    "into {symmetry} equal sectors and fill each ring with one motif repeated in every sector, " +
    "petals, beads, teeth, arches, spokes, scallops, diamonds or a fine comb, chosen at random " +
    "(seed {seed}). Edge the rings with double lines or rows of beads.",
  params: [
    { name: "symmetry", label: "Symmetry", type: "range", min: 4, max: 32, step: 1, value: 12 },
    { name: "rings", label: "Rings", type: "range", min: 2, max: 14, step: 1, value: 8 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 4 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const cx = pen.width / 2;
    const cy = pen.height / 2;
    const R = pen.width * 0.46;
    const r0 = Math.max(30, R * 0.15);
    const N = p.symmetry;
    const wedge = (2 * Math.PI) / N;
    const ring = (R - r0) / p.rings;
    const f = (n) => n.toFixed(2);
    const at = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const pt = (r, a) => at(r, a).map(f).join(" ");
    const ink = { fill: p.ink };
    // A petal (two quadratic curves) from radius r1 to r2 around angle a, bulging by angle w.
    const petal = (r1, r2, a, w, style) =>
      pen.path(`M${pt(r1, a)}Q${pt((r1 + r2) / 2, a - w)} ${pt(r2, a)}Q${pt((r1 + r2) / 2, a + w)} ${pt(r1, a)}Z`, style);
    const beads = (r, count, size, offset = 0) => {
      for (let j = 0; j < count; j++) pen.circle(...at(r, ((j + offset) * 2 * Math.PI) / count), size, ink);
    };

    // Center rosette: a dot, a ring of petals and a second, offset ring of smaller ones.
    pen.circle(cx, cy, r0 * 0.22, ink);
    pen.circle(cx, cy, r0 * 0.3);
    for (let i = 0; i < N; i++) {
      const a = i * wedge;
      petal(r0 * 0.3, r0 * 0.95, a, wedge * 0.42, { fill: i % 2 || N % 2 ? p.ink : "none" });
      petal(r0 * 0.45, r0 * 0.78, a + wedge / 2, wedge * 0.18);
    }
    pen.circle(cx, cy, r0);

    let last = -1;
    for (let k = 0; k < p.rings; k++) {
      const inner = r0 + k * ring;
      const outer = inner + ring;
      const mid = (inner + outer) / 2;
      // Wide outer rings repeat the motif several times per sector, so cells stay about square.
      const n = N * Math.max(1, Math.round((mid * wedge) / (ring * 1.2)));
      const sector = (2 * Math.PI) / n;
      // Room for a motif: the smaller of the ring depth and the cell's width at mid radius.
      const cell = Math.min(ring, mid * sector);
      // Alternate filled and open cells only when they pair up all the way round.
      const filled = (i) => (i % 2 || n % 2 ? p.ink : "none");
      // Each ring picks a motif, never the same as the ring inside it.
      let motif = Math.floor(rand() * 8);
      if (motif === last) motif = (motif + 1) % 8;
      last = motif;
      const twist = k % 2 ? sector / 2 : 0;
      for (let i = 0; i < n; i++) {
        const a = i * sector + twist;
        const b = a + sector / 2;
        if (motif === 0) {
          // Nested petals, alternately filled, with a bead between them.
          petal(inner + 1, outer - 2, a, sector * 0.45, { fill: filled(i) });
          petal(inner + ring * 0.25, outer - ring * 0.25, a, sector * 0.2);
          pen.circle(...at(outer - ring * 0.25, b), cell * 0.08, ink);
        } else if (motif === 1) {
          // Beads: a large dot, a ringed dot between, tiny dots along both edges.
          pen.circle(...at(mid, a), cell * 0.28, ink);
          pen.circle(...at(mid, b), cell * 0.16);
          pen.circle(...at(mid, b), cell * 0.06, ink);
          pen.circle(...at(inner + ring * 0.15, b), cell * 0.05, ink);
          pen.circle(...at(outer - ring * 0.15, b), cell * 0.05, ink);
        } else if (motif === 2) {
          // Teeth: filled triangles on the inner edge under a zigzag.
          pen.polygon([at(inner, a), at(inner + ring * 0.55, b), at(inner, a + sector)], ink);
          pen.polyline([at(inner + ring * 0.2, a), at(outer - 3, b), at(inner + ring * 0.2, a + sector)]);
          pen.circle(...at(outer - ring * 0.2, a), cell * 0.07, ink);
        } else if (motif === 3) {
          // Arches: a tall bump, a smaller one inside it, a dot under each peak.
          pen.path(`M${pt(inner, a)}Q${pt(outer * 1.04 - ring * 0.1, b)} ${pt(inner, a + sector)}`);
          pen.path(`M${pt(inner, a + sector * 0.2)}Q${pt(mid + ring * 0.1, b)} ${pt(inner, a + sector * 0.8)}`);
          pen.circle(...at(inner + ring * 0.2, b), cell * 0.08, ink);
          pen.circle(...at(outer - ring * 0.18, a), cell * 0.06, ink);
        } else if (motif === 4) {
          // Spokes: a fan of three lines per sector, tipped with dots.
          pen.line(...at(inner, a), ...at(outer, a));
          pen.line(...at(inner, a + sector / 3), ...at(mid, a + sector / 3));
          pen.line(...at(inner, a + (2 * sector) / 3), ...at(mid, a + (2 * sector) / 3));
          pen.circle(...at(outer - ring * 0.25, b), cell * 0.14, ink);
          pen.circle(...at(mid + ring * 0.08, a + sector / 3), cell * 0.05, ink);
          pen.circle(...at(mid + ring * 0.08, a + (2 * sector) / 3), cell * 0.05, ink);
        } else if (motif === 5) {
          // Scallops hanging from the outer circle, a teardrop inside, small scallops below.
          pen.path(`M${pt(outer, a)}Q${pt(inner - ring * 0.1, b)} ${pt(outer, a + sector)}`);
          pen.path(`M${pt(outer, a + sector * 0.25)}Q${pt(mid, b)} ${pt(outer, a + sector * 0.75)}`);
          petal(mid - ring * 0.05, outer - ring * 0.1, b, sector * 0.06, ink);
          pen.path(`M${pt(inner, a - sector / 2)}Q${pt(inner + ring * 0.35, a)} ${pt(inner, a + sector / 2)}`);
        } else if (motif === 6) {
          // Diamonds touching tip to tip, alternately filled, with a dot inside the open ones.
          const d = [at(inner + 1, b), at(mid, a + sector), at(outer - 1, b), at(mid, a)];
          pen.polygon(d, { fill: filled(i) });
          if (filled(i) === "none") pen.circle(...at(mid, b), cell * 0.1, ink);
          pen.circle(...at(inner + ring * 0.15, a), cell * 0.05, ink);
          pen.circle(...at(outer - ring * 0.15, a), cell * 0.05, ink);
        } else {
          // A fine comb of radial lines, every other one shorter, with a bead on the long ones.
          const teeth = 6;
          for (let j = 0; j < teeth; j++) {
            const aj = a + (j * sector) / teeth;
            const end = j % 2 ? mid : outer - ring * 0.2;
            pen.line(...at(inner, aj), ...at(end, aj));
          }
          pen.circle(...at(outer - ring * 0.1, a), cell * 0.06, ink);
        }
      }
      // Ring edges: a double line or a row of beads, alternating outward.
      pen.circle(cx, cy, outer);
      if (k === p.rings - 1) pen.circle(cx, cy, outer + 4);
      else if (k % 2 === 0) pen.circle(cx, cy, outer - 3);
      else beads(outer, n * 3, Math.min(1.8, ring * 0.05), 0.5);
    }
  },
});
