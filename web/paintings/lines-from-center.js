Gallery.register({
  id: "lines-from-center",
  title: "Lines from the Center",
  description:
    "After Sol LeWitt's Wall Drawing #254 (1975): an interpretation, not the original. " +
    "Straight lines leave the middle of the wall for points scattered at random, and the " +
    "crowd of rays gathers into a small sun.",
  tags: ["radial", "random"],
  instruction:
    "Find the center of the wall. Choose {count} points at random (seed {seed}) anywhere " +
    "on the wall, keeping {margin} away from its edges, and join each one to the center " +
    "with a straight line.{frame? Draw the edge of the area the points may use.:}",
  params: [
    { name: "count", label: "Lines", type: "range", min: 50, max: 1500, step: 10, value: 400 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 200, step: 5, value: 50 },
    { name: "frame", label: "Show frame", type: "checkbox", value: false },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 1 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const cx = pen.width / 2;
    const cy = pen.height / 2;
    const left = p.margin;
    const top = p.margin;
    const w = pen.width - 2 * p.margin;
    const h = pen.height - 2 * p.margin;

    for (let i = 0; i < p.count; i++) {
      // Every line starts at the center, so the pen never travels far between strokes.
      pen.line(cx, cy, left + rand() * w, top + rand() * h);
    }
    if (p.frame) pen.polygon([[left, top], [left + w, top], [left + w, top + h], [left, top + h]]);
  },
});
