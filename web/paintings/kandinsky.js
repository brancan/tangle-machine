Gallery.register({
  id: "kandinsky",
  title: "Composition (after Kandinsky)",
  description:
    "After Wassily Kandinsky's geometric abstractions of the 1920s: an interpretation, not a " +
    "copy of any one painting. Ringed circles, arcs, triangles, crossing lines and little " +
    "checkerboards float and overlap in translucent color on warm paper.",
  tags: ["geometric", "color", "random"],
  style: { paper: "#f1e4c6" },
  instruction:
    "Set one large ringed circle on the paper. Around it scatter {shapes} more shapes chosen " +
    "at random (seed {seed}): circles with rings, open arcs, triangles, straight lines that " +
    "cross the others and small checkerboards. Paint the fills so you can see {transparency%} " +
    "of what lies beneath.",
  params: [
    { name: "shapes", label: "Shapes", type: "range", min: 5, max: 120, step: 1, value: 45 },
    { name: "transparency", label: "Transparency", type: "range", min: 0, max: 0.9, step: 0.01, value: 0.35 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 8 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const palette = ["#d23c32", "#2b5ba8", "#f0bf2c", "#1d1d1b", "#3d8a58", "#e0782f", "#7b4b9c"];
    const alpha = (1 - p.transparency).toFixed(2);
    const tint = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
    };
    const pick = () => palette[Math.floor(rand() * palette.length)];
    const between = (a, b) => a + rand() * (b - a);

    // The dominant ringed circle with a dark halo.
    const bx = between(0.25, 0.45) * W;
    const by = between(0.25, 0.45) * W;
    const br = between(90, 140);
    pen.circle(bx, by, br * 1.15, { fill: tint("#1d1d1b"), stroke: "none" });
    for (let k = 0; k < 4; k++) pen.circle(bx, by, br * (1 - k * 0.22), { fill: tint(pick()), stroke: "none" });

    for (let i = 0; i < p.shapes; i++) {
      const x = between(0.08, 0.92) * W;
      const y = between(0.08, 0.92) * W;
      const kind = Math.floor(rand() * 5);
      if (kind === 0) {
        const r = between(10, 60);
        pen.circle(x, y, r, { fill: tint(pick()), stroke: "none" });
        if (rand() < 0.6) pen.circle(x, y, r * between(0.3, 0.7), { fill: tint(pick()), stroke: "none" });
        if (rand() < 0.4) pen.circle(x, y, r * 1.2, { width: 1.2 });
      } else if (kind === 1) {
        const a0 = rand() * 2 * Math.PI;
        pen.arc(x, y, between(30, 160), a0, a0 + between(0.5, 2.2), { stroke: pick(), width: between(2, 7) });
      } else if (kind === 2) {
        const size = between(30, 120);
        const turn = rand() * 2 * Math.PI;
        const corners = [0, 1, 2].map((k) => {
          const a = turn + (k * 2 * Math.PI) / 3 + between(-0.3, 0.3);
          return [x + size * Math.cos(a), y + size * Math.sin(a) * between(0.5, 1)];
        });
        pen.polygon(corners, { fill: tint(pick()), width: 1 });
      } else if (kind === 3) {
        const a = rand() * Math.PI;
        const len = between(120, 420);
        const count = rand() < 0.4 ? 3 : 1;
        for (let k = 0; k < count; k++) {
          const off = (k - (count - 1) / 2) * 9;
          const [ox, oy] = [-Math.sin(a) * off, Math.cos(a) * off];
          pen.line(x + ox - Math.cos(a) * len / 2, y + oy - Math.sin(a) * len / 2, x + ox + Math.cos(a) * len / 2, y + oy + Math.sin(a) * len / 2, {
            width: between(1, 3.5),
          });
        }
      } else {
        const n = 3 + Math.floor(rand() * 3);
        const s = between(8, 14);
        const a = rand() * Math.PI;
        const [ux, uy, vx, vy] = [Math.cos(a) * s, Math.sin(a) * s, -Math.sin(a) * s, Math.cos(a) * s];
        const color = pick();
        for (let i2 = 0; i2 < n; i2++) {
          for (let j = 0; j < n; j++) {
            const px = x + i2 * ux + j * vx;
            const py = y + i2 * uy + j * vy;
            pen.polygon([[px, py], [px + ux, py + uy], [px + ux + vx, py + uy + vy], [px + vx, py + vy]], {
              fill: (i2 + j) % 2 ? "#1d1d1b" : color,
              stroke: "none",
            });
          }
        }
      }
    }
  },
});
