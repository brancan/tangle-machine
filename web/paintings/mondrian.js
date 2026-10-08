Gallery.register({
  id: "mondrian",
  title: "Composition (after Mondrian)",
  description:
    "After Piet Mondrian's grid compositions of the 1920s: an interpretation, not a copy of " +
    "any one painting. A rectangle is split again and again by thick black lines, and a few " +
    "of the resulting cells are painted red, blue or yellow.",
  tags: ["geometric", "color", "random"],
  instruction:
    "Split the wall across its longer side, somewhere near the middle. Keep splitting each " +
    "part the same way, up to {depth} times deep, each time with a {split%} chance (seed " +
    "{seed}). Paint about {colorShare%} of the final cells red, blue or yellow, leave the rest " +
    "white, and draw every border as a black line {thickness} thick.",
  params: [
    { name: "depth", label: "Depth", type: "range", min: 1, max: 7, step: 1, value: 5 },
    { name: "split", label: "Split chance", type: "range", min: 0.2, max: 1, step: 0.01, value: 0.7 },
    { name: "colorShare", label: "Color share", type: "range", min: 0, max: 1, step: 0.01, value: 0.3 },
    { name: "thickness", label: "Line width", type: "range", min: 2, max: 24, step: 1, value: 10 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 12 },
    { name: "red", label: "Red", type: "color", value: "#c8282a" },
    { name: "blue", label: "Blue", type: "color", value: "#1f4e9c" },
    { name: "yellow", label: "Yellow", type: "color", value: "#f2c81f" },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 30;
    const cells = [];
    const minSide = p.thickness * 3;
    const total = (pen.width - 2 * margin) * (pen.height - 2 * margin);

    const divide = (x, y, w, h, level) => {
      const wide = w >= h;
      const long = wide ? w : h;
      // The first two levels and any cell over a fifth of the wall always split, so no block dominates.
      const go = level < p.depth && long > 2 * minSide && (level < 2 || w * h > total / 5 || rand() < p.split);
      if (!go) {
        cells.push([x, y, w, h]);
        return;
      }
      const cut = long * (0.3 + rand() * 0.4);
      if (wide) {
        divide(x, y, cut, h, level + 1);
        divide(x + cut, y, w - cut, h, level + 1);
      } else {
        divide(x, y, w, cut, level + 1);
        divide(x, y + cut, w, h - cut, level + 1);
      }
    };
    divide(margin, margin, pen.width - 2 * margin, pen.height - 2 * margin, 0);

    const colors = [p.red, p.blue, p.yellow];
    for (const [x, y, w, h] of cells) {
      // Only cells up to a tenth of the wall get color, as in the paintings large planes stay white.
      const fill = rand() < p.colorShare && w * h < total / 10 ? colors[Math.floor(rand() * 3)] : "#f7f4ec";
      pen.polygon([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { fill, stroke: p.ink, width: p.thickness });
    }
  },
});
