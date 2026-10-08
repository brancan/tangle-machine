Gallery.register({
  id: "rainbow-petals",
  title: "Rainbow Petals",
  description:
    "An op-art flower: petals radiate from the centre, each built from nested U-shaped bands " +
    "that shrink towards the middle. Petals alternate black-and-white and rainbow stripes.",
  tags: ["op-art", "radial", "color"],
  instruction:
    "Divide the wall into {petals} equal petals around its centre. In each petal draw {bands} " +
    "nested cones capped with a half-circle, each one smaller than the last as they near the " +
    "centre, turning {twist} of a half-turn in all from the largest to the smallest. Fill the " +
    "bands black and white by turns{rainbow?, and in every other petal fill them with the " +
    "colors of the rainbow instead:}.",
  params: [
    { name: "petals", label: "Petals", type: "range", min: 3, max: 24, step: 1, value: 14 },
    { name: "bands", label: "Bands", type: "range", min: 4, max: 80, step: 1, value: 44 },
    { name: "twist", label: "Twist", type: "range", min: -1, max: 1, step: 0.01, value: 0.2 },
    { name: "rainbow", label: "Rainbow", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const W = pen.width;
    const H = pen.height;
    const f = (n) => n.toFixed(1);
    const cx = W / 2;
    const cy = H / 2;
    const colors = ["#e8312f", "#f58a1f", "#f7d927", "#45c048", "#2fc4e6", "#3156d3", "#d53ac4"];
    const alpha = (2 * Math.PI) / p.petals;
    const sinh = Math.sin(Math.min(alpha, Math.PI * 0.9) / 2);

    // A cone of length L along angle a: a wedge as wide as the petal, capped by a tangent circle.
    const cone = (a, L) => {
      const c = (L * sinh) / (1 + sinh);
      const reach = Math.sqrt(Math.max(0, (L - c) ** 2 - c * c));
      const half = Math.asin(sinh);
      const [x1, y1] = [cx + reach * Math.cos(a - half), cy + reach * Math.sin(a - half)];
      const [x2, y2] = [cx + reach * Math.cos(a + half), cy + reach * Math.sin(a + half)];
      return `M${f(cx)} ${f(cy)}L${f(x1)} ${f(y1)}A${f(c)} ${f(c)} 0 1 1 ${f(x2)} ${f(y2)}Z`;
    };

    // How far point (x, y) (relative to the centre) sits inside cone (a, L): its distance
    // to the nearer side, or to the cap where the cap is the nearer boundary.
    const room = (x, y, a, L) => {
      const c = (L * sinh) / (1 + sinh);
      const reach = Math.sqrt(Math.max(0, (L - c) ** 2 - c * c));
      const [u, v] = [x * Math.cos(a) + y * Math.sin(a), Math.abs(y * Math.cos(a) - x * Math.sin(a))];
      const cosh = Math.sqrt(1 - sinh * sinh);
      const along = u * cosh + v * sinh;
      const side = along <= reach ? u * sinh - v * cosh : Infinity;
      const toCap = Math.atan2(v, u - (L - c)) <= Math.PI / 2 + Math.asin(sinh) ? c - Math.hypot(u - (L - c), v) : Infinity;
      return Math.min(side, toCap);
    };

    // The part of cone (a, L) that the next band's cone (b, next) hides on screen, kept
    // `margin` px inside both and traced backwards so it cuts a hole: hidden fill costs
    // nothing on screen, but a plotter would hatch all of it. Both cones are convex (the
    // hull of the centre and their cap circle), so the hull of a point and a circle that
    // sit inside both is inside both too.
    const hidden = (a, L, b, next, margin) => {
      const mid = (a + b) / 2;
      const spread = Math.asin(sinh) - Math.abs(b - a) / 2;
      if (spread <= 0) return "";
      const apex = margin / Math.sin(spread);
      const q = next / (1 + sinh);
      const [qx, qy] = [q * Math.cos(mid), q * Math.sin(mid)];
      const r = Math.min(room(qx, qy, a, L), room(qx, qy, b, next)) - margin;
      if (!(r > 0) || q - apex <= r + 1) return "";
      const tangent = Math.sqrt((q - apex) ** 2 - r * r);
      const phi = Math.asin(r / (q - apex));
      const [ax, ay] = [cx + apex * Math.cos(mid), cy + apex * Math.sin(mid)];
      const [x1, y1] = [ax + tangent * Math.cos(mid + phi), ay + tangent * Math.sin(mid + phi)];
      const [x2, y2] = [ax + tangent * Math.cos(mid - phi), ay + tangent * Math.sin(mid - phi)];
      return `M${f(ax)} ${f(ay)}L${f(x1)} ${f(y1)}A${f(r)} ${f(r)} 0 1 0 ${f(x2)} ${f(y2)}Z`;
    };

    // Lengths shrink quadratically from past the corners, so bands thin out towards the centre.
    const longest = Math.hypot(W, H) * 0.85;
    pen.polygon([[0, 0], [W, 0], [W, H], [0, H]], { fill: p.ink, stroke: "none" });
    const length = (k) => longest * (1 - k / p.bands) ** 2;
    const turn = (k) => (p.twist * Math.PI * k) / p.bands;
    for (let k = 0; k < p.bands; k++) {
      const L = length(k);
      const width = Math.max(0.3, (0.9 * p.strokeWidth * L) / longest + 0.3);
      for (let i = 0; i < p.petals; i++) {
        const colored = p.rainbow && i % 2 === 1;
        const fill = colored ? colors[k % colors.length] : k % 2 ? p.ink : p.paper;
        const a = i * alpha - Math.PI / 2;
        const hole = k + 1 < p.bands ? hidden(a + turn(k), L, a + turn(k + 1), length(k + 1), width / 2 + 1.5) : "";
        pen.path(cone(a + turn(k), L) + hole, { fill, width: f(width) });
      }
    }
  },
});
