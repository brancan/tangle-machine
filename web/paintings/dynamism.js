Gallery.register({
  id: "dynamism",
  title: "Dynamism (after Boccioni)",
  description:
    "After the Futurist studies of motion by Umberto Boccioni (1911–13): an interpretation, " +
    "not a copy. A small group of shapes is repeated again and again along its direction of " +
    "travel, fading as it goes, crossed by lines of force. When playing, the echoes advance.",
  tags: ["geometric", "animated"],
  instruction:
    "Draw a small group of flat shapes chosen at random (seed {seed}). Repeat it {echoes} " +
    "times along a direction of {angle}°, {spread} apart, each copy paler and slightly turned. " +
    "Cross the whole with long lines of force running the same way.",
  params: [
    { name: "echoes", label: "Echoes", type: "range", min: 3, max: 30, step: 1, value: 12 },
    { name: "angle", label: "Direction", type: "range", min: -180, max: 180, step: 1, value: -20 },
    { name: "spread", label: "Spread", type: "range", min: 8, max: 70, step: 1, value: 40 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 3 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const c = W / 2;
    const f = (n) => n.toFixed(2);
    const a = (p.angle * Math.PI) / 180;
    const [ux, uy] = [Math.cos(a), Math.sin(a)];
    const [vx, vy] = [-uy, ux];
    const hex = /^#[0-9a-f]{6}$/i.test(p.ink) ? parseInt(p.ink.slice(1), 16) : 0x1b1b1b;
    const ink = (alpha) => `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${alpha.toFixed(3)})`;

    // The group: a few triangles and quads around the origin.
    const group = Array.from({ length: 5 }, () => {
      const cx = (rand() - 0.5) * 200;
      const cy = (rand() - 0.5) * 200;
      const sides = rand() < 0.5 ? 3 : 4;
      const size = 40 + rand() * 60;
      const turn = rand() * Math.PI;
      return Array.from({ length: sides }, (_, k) => {
        const t = turn + (k / sides) * 2 * Math.PI + (rand() - 0.5) * 0.5;
        return [cx + size * Math.cos(t), cy + size * Math.sin(t) * 0.7];
      });
    });

    // Lines of force: long gentle curves along the direction of travel.
    for (let i = 0; i < 14; i++) {
      const off = (rand() - 0.5) * W * 0.9;
      const bow = (rand() - 0.5) * 120;
      const L = W * 0.75;
      const [sx, sy] = [c - ux * L + vx * off, c - uy * L + vy * off];
      const [ex, ey] = [c + ux * L + vx * (off + bow * 0.5), c + uy * L + vy * (off + bow * 0.5)];
      pen.path(`M${f(sx)} ${f(sy)}Q${f(c + vx * (off + bow))} ${f(c + vy * (off + bow))} ${f(ex)} ${f(ey)}`, {
        stroke: ink(0.25),
        width: 1 + rand() * 2,
      });
    }

    // Time slides every echo forward by one spacing per period (p.time is 0 when not playing).
    const phase = ((p.time || 0) * 0.6) % 1;
    const span = (p.echoes - 1) * p.spread;
    for (let k = 0; k < p.echoes; k++) {
      const s = k + phase;
      const along = s * p.spread - span / 2;
      const fade = 0.08 + 0.92 * (s / p.echoes) ** 1.5;
      const spin = (s - p.echoes) * 0.035;
      const [cs, sn] = [Math.cos(spin), Math.sin(spin)];
      const ox = c + ux * along;
      const oy = c + uy * along;
      for (const shape of group) {
        const pts = shape.map(([x, y]) => {
          const [rx, ry] = [x * cs - y * sn, x * sn + y * cs];
          return [ox + rx * ux + ry * vx, oy + rx * uy + ry * vy];
        });
        pen.polygon(pts, { fill: ink(fade * 0.35), stroke: ink(fade), width: 1 });
      }
    }
  },
});
