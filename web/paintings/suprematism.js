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
    "{seed}): one or two large planes first, then mid-sized rectangles and thin bars, then a " +
    "few small ones, spaced out along the diagonal so few of them pile up, each leaning with " +
    "the diagonal or across it. Add one circle and one cross. Paint them black, red, blue and yellow.",
  params: [
    { name: "shapes", label: "Shapes", type: "range", min: 3, max: 50, step: 1, value: 18 },
    { name: "tilt", label: "Tilt", type: "range", min: -60, max: 60, step: 1, value: -28 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 15 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const c = pen.width / 2;
    const margin = 36;
    const tilt = (p.tilt * Math.PI) / 180;
    const colors = ["#1b1b1b", "#c42f2a", "#21408e", "#e1b23a", "#1b1b1b", "#6e8b4f"];
    const between = (a, b) => a + rand() * (b - a);
    const pick = () => colors[Math.floor(rand() * colors.length)];
    // Position along the diagonal band: t along it, s across it.
    const place = (t, s) => [c + t * Math.cos(tilt) - s * Math.sin(tilt), c + t * Math.sin(tilt) + s * Math.cos(tilt)];
    const corners = (x, y, w, h, angle) => {
      const [ux, uy, vx, vy] = [Math.cos(angle) / 2, Math.sin(angle) / 2, -Math.sin(angle) / 2, Math.cos(angle) / 2];
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + a * w * ux + b * h * vx, y + a * w * uy + b * h * vy]);
    };
    const onSheet = (pts) =>
      pts.every(([x, y]) => x > margin && x < pen.width - margin && y > margin && y < pen.height - margin);

    // Shapes already placed, as rough discs, so new ones avoid piling onto them.
    const placed = [];
    // Tries a few spots along the diagonal and keeps the one that overlaps the least.
    const spot = (rad, spread, fits) => {
      let best = null;
      let bestScore = Infinity;
      for (let attempt = 0; attempt < 40 && bestScore > 0.1; attempt++) {
        const [x, y] = place(between(-330, 330), between(-spread, spread));
        if (!fits(x, y)) continue;
        let score = 0;
        for (const q of placed) {
          const overlap = (rad + q.rad - Math.hypot(x - q.x, y - q.y)) / Math.min(rad, q.rad);
          if (overlap > 0) score += overlap;
        }
        if (score < bestScore) [best, bestScore] = [[x, y], score];
      }
      const [x, y] = best || place(between(-120, 120), 0);
      placed.push({ x, y, rad });
      return [x, y];
    };
    const rect = (w, h, spread, rad, across) => {
      const angle = tilt + (across ? Math.PI / 2 : 0) + between(-0.12, 0.12);
      const [x, y] = spot(rad, spread, (x, y) => onSheet(corners(x, y, w, h, angle)));
      pen.polygon(corners(x, y, w, h, angle), { fill: pick(), stroke: "none" });
    };

    // Size hierarchy: one or two dominant planes, then mid-sized forms, then a few small ones.
    const large = p.shapes >= 8 ? 2 : 1;
    const small = Math.round((p.shapes - large) * 0.35);
    const mid = p.shapes - large - small;
    // Crowded compositions shrink their forms so the white ground still shows.
    const k = Math.min(1.1, Math.max(0.5, Math.sqrt(18 / p.shapes)));
    const kLarge = Math.max(0.75, Math.min(1, k));
    const circleAt = large + Math.floor(rand() * mid);
    let crossAt = large + Math.floor(rand() * mid);
    if (crossAt === circleAt && mid > 1) crossAt = large + ((crossAt - large + 1) % mid);
    for (let i = 0; i < p.shapes; i++) {
      const across = rand() < 0.2;
      if (i < large) {
        const [w, h] = [between(240, 340) * kLarge, between(90, 150) * kLarge];
        rect(w, h, 70, Math.hypot(w, h) * 0.4, across && i > 0);
      } else if (i === circleAt && i < large + mid) {
        const r = between(40, 75) * k;
        const [x, y] = spot(r, 180, (x, y) => onSheet([[x - r, y - r], [x + r, y + r]]));
        pen.circle(x, y, r, { fill: pick(), stroke: "none" });
      } else if (i === crossAt && i < large + mid) {
        const len = between(90, 150) * k;
        const angle = tilt + between(-0.12, 0.12);
        const arms = (x, y) => [...corners(x, y, len, len * 0.22, angle), ...corners(x, y, len * 0.22, len, angle)];
        const [x, y] = spot(len * 0.4, 180, (x, y) => onSheet(arms(x, y)));
        const fill = pick();
        pen.polygon(corners(x, y, len, len * 0.22, angle), { fill, stroke: "none" });
        pen.polygon(corners(x, y, len * 0.22, len, angle), { fill, stroke: "none" });
      } else if (i < large + mid) {
        if (rand() < 0.35) {
          // Thin bars may cross other forms, so they count as small discs.
          const [len, thick] = [between(160, 360) * k, between(5, 14)];
          rect(len, thick, 190, len * 0.15 + thick, across);
        } else {
          const [w, h] = [between(90, 190) * k, between(30, 80) * k];
          rect(w, h, 190, Math.hypot(w, h) * 0.42, across);
        }
      } else if (rand() < 0.4) {
        const [len, thick] = [between(60, 130), between(3, 6)];
        rect(len, thick, 240, len * 0.2, across);
      } else {
        const [w, h] = [between(20, 60), between(10, 35)];
        rect(w, h, 240, Math.hypot(w, h) * 0.5, across);
      }
    }
  },
});
