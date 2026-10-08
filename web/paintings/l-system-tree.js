Gallery.register({
  id: "l-system-tree",
  title: "L-System Tree",
  description:
    "A plant grown from a rewriting rule. Every stroke is replaced by a small branching " +
    "figure, again and again, and a turtle draws the result with a little random wavering.",
  tags: ["organic", "random"],
  instruction:
    "Start from the {grammar} rule and rewrite it {iterations} times, stopping before 20,000 strokes. " +
    "Walk the result as a turtle pointing up: F steps forward, + and − turn {angle}°, brackets save and " +
    "return to a branch point. Let every turn waver by up to {jitter%} and every step by half as much " +
    "(seed {seed}). Draw thinner at each branching level and fit the plant to the sheet" +
    "{leaves?, then put a small blossom at the tip of every twig:}.",
  params: [
    {
      name: "grammar",
      label: "Grammar",
      type: "select",
      value: "bush",
      options: [
        { value: "bush", label: "Bush: F → FF+[+F−F−F]−[−F+F+F]" },
        { value: "weed", label: "Weed: X → F+[[X]−X]−F[−FX]+X" },
        { value: "twig", label: "Twig: F → F[+F]F[−F][F]" },
      ],
    },
    { name: "iterations", label: "Iterations", type: "range", min: 1, max: 7, step: 1, value: 4 },
    { name: "angle", label: "Angle", type: "range", min: 5, max: 45, step: 0.5, value: 22.5 },
    { name: "jitter", label: "Jitter", type: "range", min: 0, max: 1, step: 0.01, value: 0.25 },
    { name: "leaves", label: "Blossoms", type: "checkbox", value: true },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 7 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const M = 36;
    const f = (n) => n.toFixed(1);
    const GRAMMARS = {
      bush: { axiom: "F", rules: { F: "FF+[+F-F-F]-[-F+F+F]" } },
      weed: { axiom: "X", rules: { X: "F+[[X]-X]-F[-FX]+X", F: "FF" } },
      twig: { axiom: "F", rules: { F: "F[+F]F[-F][F]" } },
    };
    const grammar = GRAMMARS[p.grammar] || GRAMMARS.bush;
    const MAX_STROKES = 20000;

    // Rewrites while the next generation stays under the stroke budget.
    const strokes = (s) => s.split("F").length - 1;
    let word = grammar.axiom;
    for (let i = 0; i < p.iterations; i++) {
      let next = "";
      for (const c of word) next += grammar.rules[c] || c;
      if (strokes(next) > MAX_STROKES) break;
      word = next;
    }

    // Turtle walk in unit steps; segments remember their branch depth.
    const turn = (p.angle * Math.PI) / 180;
    const wobble = () => 1 + p.jitter * (rand() * 2 - 1);
    const segments = [];
    const tips = [];
    const stack = [];
    let x = 0;
    let y = 0;
    let heading = -Math.PI / 2;
    for (let i = 0; i < word.length; i++) {
      const c = word[i];
      if (c === "F") {
        const step = 1 + (wobble() - 1) / 2;
        const nx = x + step * Math.cos(heading);
        const ny = y + step * Math.sin(heading);
        segments.push([x, y, nx, ny, stack.length]);
        x = nx;
        y = ny;
        // A twig tip: no further stroke before the branch closes or the word ends.
        let j = i + 1;
        while (j < word.length && (word[j] === "+" || word[j] === "-" || word[j] === "X")) j++;
        if (j === word.length || word[j] === "]") tips.push([x, y]);
      } else if (c === "+") heading += turn * wobble();
      else if (c === "-") heading -= turn * wobble();
      else if (c === "[") stack.push([x, y, heading]);
      else if (c === "]" && stack.length) [x, y, heading] = stack.pop();
    }
    if (!segments.length) return;

    // Fit: scale the bounds into the sheet, centred, standing on the bottom margin.
    let [minX, minY, maxX, maxY] = [0, 0, 0, 0];
    for (const [ax, ay, bx, by] of segments) {
      minX = Math.min(minX, ax, bx);
      maxX = Math.max(maxX, ax, bx);
      minY = Math.min(minY, ay, by);
      maxY = Math.max(maxY, ay, by);
    }
    const scale = Math.min((W - 2 * M) / Math.max(maxX - minX, 1e-6), (H - 2 * M) / Math.max(maxY - minY, 1e-6));
    const ox = W / 2 - ((minX + maxX) / 2) * scale;
    const oy = H - M - maxY * scale;
    const X = (v) => ox + v * scale;
    const Y = (v) => oy + v * scale;

    // One path per depth, joining strokes that continue each other.
    const paths = new Map();
    for (const [ax, ay, bx, by, depth] of segments) {
      const entry = paths.get(depth) || { d: "", end: null };
      const start = `${f(X(ax))} ${f(Y(ay))}`;
      entry.d += (entry.end === start ? "" : `M${start}`) + `L${f(X(bx))} ${f(Y(by))}`;
      entry.end = `${f(X(bx))} ${f(Y(by))}`;
      paths.set(depth, entry);
    }
    const thickest = 2.6 + Math.min(scale, 12) * 0.25;
    for (const [depth, { d }] of [...paths].sort((a, b) => a[0] - b[0])) {
      pen.path(d, { width: f(Math.max(0.35, thickest * Math.pow(0.68, depth)) * p.strokeWidth) });
    }

    if (p.leaves) {
      const r = Math.max(1.5, Math.min(4, scale * 0.45));
      let d = "";
      for (const [tx, ty] of tips) {
        d += `M${f(X(tx) - r)} ${f(Y(ty))}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;
      }
      if (d) pen.path(d, { fill: p.paper, width: f(0.6 * p.strokeWidth) });
    }
  },
});
