Gallery.register({
  id: "reaction-diffusion",
  title: "Reaction Diffusion",
  description:
    "Two imaginary chemicals spreading and feeding on each other (the Gray-Scott model) until " +
    "they settle into coral, mazes or spots. The concentration is traced as smooth outlines.",
  tags: ["organic", "random"],
  instruction:
    "On a {resolution} × {resolution} grid full of chemical A, drop a few random squares of B (seed {seed}). " +
    "For {steps} steps, let both spread, let B eat A and grow, refill A and drain B at the {pattern} rates. " +
    "Trace {levels} nested outlines of B, evenly spaced between none and its peak{fill?, and fill the innermost with ink:}.",
  style: { strokeWidth: 1.2 },
  params: [
    {
      name: "pattern",
      label: "Pattern",
      type: "select",
      value: "maze",
      options: [
        { value: "coral", label: "Coral (feed 0.044, kill 0.0625)" },
        { value: "maze", label: "Maze (feed 0.029, kill 0.057)" },
        { value: "spots", label: "Spots (feed 0.035, kill 0.065)" },
        { value: "fingerprint", label: "Fingerprint (feed 0.037, kill 0.06)" },
      ],
    },
    { name: "steps", label: "Steps", type: "range", min: 200, max: 4000, step: 100, value: 2000 },
    { name: "resolution", label: "Resolution", type: "range", min: 60, max: 140, step: 4, value: 100 },
    { name: "fill", label: "Fill", type: "checkbox", value: true },
    { name: "levels", label: "Outlines", type: "range", min: 1, max: 4, step: 1, value: 2 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 5 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const M = 24;
    const f = (n) => n.toFixed(1);
    const RATES = {
      coral: [0.044, 0.0625],
      maze: [0.029, 0.057],
      spots: [0.035, 0.065],
      fingerprint: [0.037, 0.06],
    };
    const [feed, kill] = RATES[p.pattern] || RATES.coral;
    const N = Math.round(p.resolution);
    const size = N * N;

    // Gray-Scott on a wrapping grid: Karl Sims' kernel, diffusion halved for a finer pattern.
    const DA = 0.35;
    const DB = 0.175;
    let a = new Float32Array(size).fill(1);
    let b = new Float32Array(size);
    let a2 = new Float32Array(size);
    let b2 = new Float32Array(size);
    const spots = Math.max(3, Math.round(size / 200));
    for (let s = 0; s < spots; s++) {
      const sx = Math.floor(rand() * N);
      const sy = Math.floor(rand() * N);
      const r = 1 + Math.floor(rand() * 3);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const i = ((sy + dy + N) % N) * N + ((sx + dx + N) % N);
          a[i] = 0.5;
          b[i] = 0.25;
        }
      }
    }
    const left = new Int32Array(N);
    const right = new Int32Array(N);
    for (let i = 0; i < N; i++) {
      left[i] = (i + N - 1) % N;
      right[i] = (i + 1) % N;
    }
    for (let step = 0; step < p.steps; step++) {
      for (let y = 0; y < N; y++) {
        const up = left[y] * N;
        const row = y * N;
        const down = right[y] * N;
        for (let x = 0; x < N; x++) {
          const l = left[x];
          const r = right[x];
          const i = row + x;
          const av = a[i];
          const bv = b[i];
          const la =
            0.2 * (a[up + x] + a[down + x] + a[row + l] + a[row + r]) +
            0.05 * (a[up + l] + a[up + r] + a[down + l] + a[down + r]) -
            av;
          const lb =
            0.2 * (b[up + x] + b[down + x] + b[row + l] + b[row + r]) +
            0.05 * (b[up + l] + b[up + r] + b[down + l] + b[down + r]) -
            bv;
          const abb = av * bv * bv;
          a2[i] = av + DA * la - abb + feed * (1 - av);
          b2[i] = bv + DB * lb + abb - (kill + feed) * bv;
        }
      }
      [a, a2] = [a2, a];
      [b, b2] = [b2, b];
    }

    // Marching squares over B. The grid wraps, so its edge is not empty: a ring copying the edge
    // values sits on the frame, and a ring of zeros just outside it closes every outline beyond the
    // frame, where the clip trims it. Shapes run cleanly off the sheet instead of leaving slivers.
    const cell = (W - 2 * M) / (N + 1);
    const P = N + 4;
    const padded = new Float32Array(P * P);
    for (let y = -1; y <= N; y++) {
      const row = Math.min(N - 1, Math.max(0, y)) * N;
      for (let x = -1; x <= N; x++) padded[(y + 2) * P + x + 2] = b[row + Math.min(N - 1, Math.max(0, x))];
    }
    const value = (x, y) => padded[(y + 2) * P + x + 2];
    const contours = (t) => {
      // Crossing point on the grid edge from corner (x0, y0) to its right (h) or lower (v) neighbour.
      const cross = (x0, y0, horizontal) => {
        const x1 = horizontal ? x0 + 1 : x0;
        const y1 = horizontal ? y0 : y0 + 1;
        const v0 = value(x0, y0);
        const v1 = value(x1, y1);
        const s = (t - v0) / (v1 - v0);
        return [x0 + (x1 - x0) * s, y0 + (y1 - y0) * s];
      };
      const key = (x0, y0, horizontal) => ((y0 + 2) * P + (x0 + 2)) * 2 + (horizontal ? 0 : 1);
      const next = new Map();
      const where = new Map();
      for (let y = -2; y <= N; y++) {
        for (let x = -2; x <= N; x++) {
          const tl = value(x, y) >= t;
          const tr = value(x + 1, y) >= t;
          const br = value(x + 1, y + 1) >= t;
          const bl = value(x, y + 1) >= t;
          // Corners and edges clockwise: edge e runs from corner e to corner e + 1.
          const inside = [tl, tr, br, bl];
          const edges = [
            [x, y, true],
            [x + 1, y, false],
            [x, y + 1, true],
            [x, y, false],
          ];
          const entering = [];
          const leaving = [];
          for (let e = 0; e < 4; e++) {
            if (inside[e] === inside[(e + 1) % 4]) continue;
            (inside[e] ? leaving : entering).push(e);
          }
          if (!entering.length) continue;
          // Each segment runs from an entering crossing to a leaving one, keeping strong B on its left.
          // In a saddle the centre decides: inside joins the two strong corners, outside separates them.
          const centre = (value(x, y) + value(x + 1, y) + value(x + 1, y + 1) + value(x, y + 1)) / 4 >= t;
          for (const e0 of entering) {
            const e1 = leaving.length === 1 ? leaving[0] : centre ? (e0 + 3) % 4 : (e0 + 1) % 4;
            const k0 = key(...edges[e0]);
            const k1 = key(...edges[e1]);
            next.set(k0, k1);
            where.set(k0, cross(...edges[e0]));
            where.set(k1, cross(...edges[e1]));
          }
        }
      }
      // Chain the segments into closed loops.
      let d = "";
      const X = (gx) => f(M + (gx + 1) * cell);
      for (const start of next.keys()) {
        if (!next.has(start)) continue;
        let k = start;
        let part = "";
        while (next.has(k)) {
          const [gx, gy] = where.get(k);
          part += `${part ? "L" : "M"}${X(gx)} ${X(gy)}`;
          const n = next.get(k);
          next.delete(k);
          k = n;
        }
        d += part + "Z";
      }
      return d;
    };

    // Outlines evenly spaced between no B and its peak; the innermost one can be filled.
    let peak = 0;
    for (let i = 0; i < size; i++) peak = Math.max(peak, b[i]);
    const frame = `M${M} ${M}H${W - M}V${W - M}H${M}Z`;
    if (peak > 1e-3) {
      pen.clip(frame, () => {
        for (let level = 1; level <= p.levels; level++) {
          const d = contours((peak * level) / (p.levels + 1));
          if (!d) continue;
          const innermost = level === p.levels;
          if (p.fill && innermost) pen.path(d, { fill: p.ink, width: f(0.5 * p.strokeWidth) });
          else pen.path(d, { width: f(p.strokeWidth * (innermost ? 1 : 0.7)) });
        }
      });
    }
    pen.path(frame, { width: f(1.5 * p.strokeWidth) });
  },
});
