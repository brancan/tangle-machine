Gallery.register({
  id: "moire",
  title: "Moiré",
  description:
    "Two layers of fine lines laid over each other, the second slightly turned or shifted; " +
    "where they cross, large ghostly bands appear that neither layer contains. When playing, " +
    "the second layer turns slowly and the bands sweep across.",
  tags: ["op-art", "geometric", "animated"],
  instruction:
    "Inside a circle, draw {circles?concentric circles:parallel lines} {spacing} apart. Draw " +
    "the same again on top, {circles?its center moved aside:turned} (offset {offset}, turn " +
    "{angle}°), so the two layers interfere.",
  params: [
    { name: "spacing", label: "Line spacing", type: "range", min: 3, max: 20, step: 0.5, value: 6 },
    { name: "angle", label: "Turn", type: "range", min: 0, max: 45, step: 0.5, value: 6 },
    { name: "circles", label: "Concentric circles", type: "checkbox", value: false },
    { name: "offset", label: "Circle offset", type: "range", min: 0, max: 200, step: 1, value: 40 },
  ],
  draw: function draw(p, pen) {
    const cx = pen.width / 2;
    const cy = pen.height / 2;
    const R = pen.width * 0.44;
    const f = (n) => n.toFixed(2);
    // Time turns the second layer (p.time is 0 when the studio is not playing).
    const spin = (p.time || 0) * 0.04;

    if (p.circles) {
      const disc = `M${f(cx - R)} ${f(cy)}A${f(R)} ${f(R)} 0 1 0 ${f(cx + R)} ${f(cy)}A${f(R)} ${f(R)} 0 1 0 ${f(cx - R)} ${f(cy)}Z`;
      const around = Math.PI / 4 + spin * 4;
      const ox = cx + p.offset * Math.cos(around);
      const oy = cy + p.offset * Math.sin(around);
      for (let r = p.spacing; r <= R; r += p.spacing) pen.circle(cx, cy, r);
      pen.clip(disc, () => {
        for (let r = p.spacing; r <= R + p.offset; r += p.spacing) pen.circle(ox, oy, r);
      });
    } else {
      // Chords of the circle, perpendicular offset `o` from the center along direction `a`.
      const family = (a) => {
        const [ux, uy] = [Math.cos(a), Math.sin(a)];
        for (let o = -R + p.spacing / 2; o < R; o += p.spacing) {
          const half = Math.sqrt(R * R - o * o);
          const [px, py] = [cx - uy * o, cy + ux * o];
          pen.line(px - ux * half, py - uy * half, px + ux * half, py + uy * half);
        }
      };
      family(0);
      family((p.angle * Math.PI) / 180 + spin);
    }
    pen.circle(cx, cy, R, { width: p.strokeWidth * 1.6 });
  },
});
