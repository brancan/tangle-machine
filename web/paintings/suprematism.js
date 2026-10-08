Gallery.register({
  id: "suprematism",
  title: "Suprematist Composition (after Malevich)",
  description:
    "After Kazimir Malevich's Suprematist compositions (1915–16): an interpretation, not a " +
    "copy of any one painting. Rectangles, thin bars, a circle and a cross drift on white " +
    "space, nearly all leaning along one dominant diagonal.",
  tags: ["geometric", "color", "random"],
  style: { paper: "#f4f1e8" },
  instruction:
    "Along a diagonal tilted {tilt}°, float {shapes} flat shapes chosen at random (seed " +
    "{seed}): large rectangles first, then smaller ones and thin bars, each leaning with the " +
    "diagonal or across it. Add one circle and one cross. Paint them black, red, blue and yellow.",
  params: [
    { name: "shapes", label: "Shapes", type: "range", min: 3, max: 50, step: 1, value: 18 },
    { name: "tilt", label: "Tilt", type: "range", min: -60, max: 60, step: 1, value: -28 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 15 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const c = pen.width / 2;
    const tilt = (p.tilt * Math.PI) / 180;
    const colors = ["#1b1b1b", "#c42f2a", "#21408e", "#e1b23a", "#1b1b1b", "#6e8b4f"];
    const between = (a, b) => a + rand() * (b - a);
    // Position along the diagonal band: t along it, s across it.
    const place = (t, s) => [c + t * Math.cos(tilt) - s * Math.sin(tilt), c + t * Math.sin(tilt) + s * Math.cos(tilt)];
    const rect = (x, y, w, h, angle, fill) => {
      const [ux, uy, vx, vy] = [Math.cos(angle) / 2, Math.sin(angle) / 2, -Math.sin(angle) / 2, Math.cos(angle) / 2];
      pen.polygon(
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + a * w * ux + b * h * vx, y + a * w * uy + b * h * vy]),
        { fill, stroke: "none" }
      );
    };

    const circleAt = Math.floor(rand() * p.shapes);
    const crossAt = Math.floor(rand() * p.shapes);
    for (let i = 0; i < p.shapes; i++) {
      // Sizes shrink as we go, so big planes sit underneath.
      const scale = 1 - (0.75 * i) / p.shapes;
      const [x, y] = place(between(-280, 280), between(-140, 140) * (0.4 + scale));
      const angle = tilt + (rand() < 0.2 ? Math.PI / 2 : 0) + between(-0.12, 0.12);
      const fill = colors[Math.floor(rand() * colors.length)];
      if (i === circleAt) {
        pen.circle(x, y, between(30, 70) * (0.5 + scale), { fill, stroke: "none" });
      } else if (i === crossAt) {
        const len = between(80, 160);
        rect(x, y, len, len * 0.22, angle, fill);
        rect(x, y, len * 0.22, len, angle, fill);
      } else if (rand() < 0.35) {
        rect(x, y, between(150, 420) * (0.4 + scale), between(5, 16), angle, fill);
      } else {
        rect(x, y, between(60, 260) * scale + 20, between(30, 140) * scale + 10, angle, fill);
      }
    }
  },
});
