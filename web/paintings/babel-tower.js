Gallery.register({
  id: "babel-tower",
  title: "Tower of Babel (after Bruegel)",
  description:
    "After Pieter Bruegel the Elder's The Tower of Babel (1563): an interpretation, not a " +
    "copy. A tapering tower of tiers, each ringed with rows of arches, a ramp winding around " +
    "it on its way to the unfinished top.",
  tags: ["geometric"],
  style: { paper: "#e9e6da" },
  instruction:
    "Stack {tiers} tiers, each narrower than the one below, until the top is {taper%} of the " +
    "base. Ring every tier with an arcade of about {arches} arches, fewer as the tiers shrink. " +
    "Let a ramp climb across the front of each tier, turning back at every level, and leave " +
    "the top unfinished (seed {seed}).",
  params: [
    { name: "tiers", label: "Tiers", type: "range", min: 3, max: 12, step: 1, value: 7 },
    { name: "arches", label: "Arches per tier", type: "range", min: 4, max: 30, step: 1, value: 16 },
    { name: "taper", label: "Taper", type: "range", min: 0.1, max: 0.8, step: 0.01, value: 0.3 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 9 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const c = W * 0.5;
    const base = W * 0.86;
    const height = W * 0.66;
    const w0 = W * 0.82;
    const f = (n) => n.toFixed(2);
    const stone = "#c9a676";
    const shade = "#9c7b52";
    const dark = "#4a3a2a";

    // Ground and a strip of sea.
    pen.polygon([[0, base], [W, base], [W, W], [0, W]], { fill: "#8d9a6a", stroke: "none" });
    pen.polygon([[0, base - 6], [W * 0.18, base - 6], [W * 0.22, base], [0, base]], { fill: "#7a95a6", stroke: "none" });

    let y = base;
    const tierHeight = (i) => (height / p.tiers) * (1.25 - (0.5 * i) / Math.max(1, p.tiers - 1));
    const total = Array.from({ length: p.tiers }, (_, i) => tierHeight(i)).reduce((a, b) => a + b, 0);
    for (let i = 0; i < p.tiers; i++) {
      const t = p.tiers === 1 ? 0 : i / (p.tiers - 1);
      const w = w0 * (1 - (1 - p.taper) * t);
      const h = (tierHeight(i) / total) * height;
      const x0 = c - w / 2;
      const top = y - h;
      // Tier body with a shaded right side, so it reads as round.
      pen.polygon([[x0, y], [x0 + w, y], [x0 + w, top], [x0, top]], { fill: stone, stroke: dark, width: 1 });
      pen.polygon([[x0 + w * 0.72, y], [x0 + w, y], [x0 + w, top], [x0 + w * 0.72, top]], { fill: shade, stroke: "none" });

      // Arcade: dark arched openings in a row.
      const n = Math.max(3, Math.round(p.arches * (w / w0)));
      const bay = w / n;
      const aw = bay * 0.62;
      const ah = h * 0.5;
      for (let k = 0; k < n; k++) {
        const ax = x0 + k * bay + (bay - aw) / 2;
        const ay = y - h * 0.12;
        const r = aw / 2;
        const side = (k + 0.5) / n;
        const fill = side > 0.72 ? "#2e241a" : dark;
        pen.path(`M${f(ax)} ${f(ay)}L${f(ax)} ${f(ay - ah + r)}A${f(r)} ${f(r)} 0 0 1 ${f(ax + aw)} ${f(ay - ah + r)}L${f(ax + aw)} ${f(ay)}Z`, {
          fill,
          stroke: "none",
        });
      }

      // Ramp: a sloping band across the front, alternating direction per tier.
      const left = i % 2 === 0;
      const [ya, yb] = left ? [y, top] : [top, y];
      const rh = Math.min(10, h * 0.22);
      pen.polygon([[x0, ya], [x0 + w, yb], [x0 + w, yb - rh], [x0, ya - rh]], { fill: "#dcc296", stroke: dark, width: 0.8 });
      y = top;
    }

    // Unfinished top: broken stubs and scaffolding.
    const wt = w0 * p.taper;
    for (let k = 0; k < 7; k++) {
      const x = c - wt / 2 + (k + 0.5) * (wt / 7);
      const hgt = 8 + rand() * 30;
      pen.polygon([[x - 6, y], [x + 6, y], [x + 5, y - hgt], [x - 5, y - hgt * 0.8]], { fill: stone, stroke: dark, width: 0.8 });
    }
    for (let k = 0; k < 5; k++) {
      const x = c - wt / 2 + rand() * wt;
      pen.line(x, y, x + (rand() - 0.5) * 20, y - 50 - rand() * 30, { stroke: dark, width: 1 });
    }
  },
});
