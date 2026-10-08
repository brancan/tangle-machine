Gallery.register({
  id: "color-fields",
  title: "Color Fields",
  description:
    "Soft-edged stacked color fields: two to four rectangles of color hover on a colored " +
    "ground, their edges feathered from many thin translucent layers so they seem to glow.",
  tags: ["color"],
  instruction:
    "Paint the wall one color, chosen with palette {palette}. Stack {fields} rectangles on " +
    "it, one above the other, in related colors. Build each from many thin translucent " +
    "layers, so its edge fades over {softness}. Then dust the surface with {grain%} grain.",
  params: [
    { name: "fields", label: "Fields", type: "range", min: 2, max: 4, step: 1, value: 3 },
    { name: "softness", label: "Softness", type: "range", min: 2, max: 60, step: 1, value: 22 },
    { name: "palette", label: "Palette seed", type: "range", min: 1, max: 100, step: 1, value: 14 },
    { name: "grain", label: "Grain", type: "range", min: 0, max: 1, step: 0.01, value: 0.4 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.palette);
    const W = pen.width;
    // HSL in [0,1] to an rgba() string.
    const color = (h, s, l, a = 1) => {
      const k = (n) => (n + h * 12) % 12;
      const c = s * Math.min(l, 1 - l);
      const ch = (n) => Math.round(255 * (l - c * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
      return `rgba(${ch(0)},${ch(8)},${ch(4)},${a.toFixed(3)})`;
    };
    const quad = (x0, y0, x1, y1, fill) => pen.polygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { fill, stroke: "none" });

    const hue = rand();
    quad(0, 0, W, W, color(hue, 0.55 + rand() * 0.3, 0.25 + rand() * 0.2));

    const margin = 70;
    const gap = 28;
    const weights = Array.from({ length: p.fields }, () => 0.6 + rand());
    const total = weights.reduce((a, b) => a + b, 0);
    const usable = W - 2 * margin - gap * (p.fields - 1);
    const layers = 26;
    let y = margin;
    for (const weight of weights) {
      const h = (weight / total) * usable;
      const fh = (hue + (rand() - 0.5) * 0.22 + 1) % 1;
      const s = 0.5 + rand() * 0.4;
      const l = 0.3 + rand() * 0.4;
      // Layers shrink inward; the overlap builds an opaque core with a feathered rim.
      for (let k = 0; k < layers; k++) {
        const inset = p.softness * (k / layers - 0.5);
        const j = () => (rand() - 0.5) * p.softness * 0.25;
        pen.polygon(
          [
            [margin + inset + j(), y + inset + j()],
            [W - margin - inset + j(), y + inset + j()],
            [W - margin - inset + j(), y + h - inset + j()],
            [margin + inset + j(), y + h - inset + j()],
          ],
          { fill: color(fh, s, l, 0.11), stroke: "none" }
        );
      }
      y += h + gap;
    }

    const specks = Math.round(p.grain * 2500);
    for (let i = 0; i < specks; i++) {
      const x = rand() * W;
      const yy = rand() * W;
      const a = rand() * Math.PI;
      const len = 1 + rand() * 3;
      pen.line(x, yy, x + Math.cos(a) * len, yy + Math.sin(a) * len, {
        stroke: rand() < 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        width: 1,
      });
    }
  },
});
