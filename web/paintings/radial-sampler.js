Gallery.register({
  id: "radial-sampler",
  title: "Radial Sampler",
  description:
    "Pie wedges fanning out from one off-centre point, each filled with a different tangle: " +
    "zigzags, beads, scales, checks, spirals, triangles, diamonds, loops and stripes.",
  tags: ["geometric", "radial", "random"],
  instruction:
    "From a point {centerX%} across and {centerY%} down, draw {wedges} spokes to the edges. " +
    "Fill each wedge with a different tangle about {density} px to a motif — zigzags, a dotted " +
    "triangle grid, beaded waves, scales, a checkerboard, spirals, nested triangles, diamonds, " +
    "loops or stripes — laid along the wedge. Draw the spokes in heavy ink.",
  params: [
    { name: "wedges", label: "Wedges", type: "range", min: 4, max: 20, step: 1, value: 12 },
    { name: "centerX", label: "Centre X", type: "range", min: 0.15, max: 0.85, step: 0.01, value: 0.47 },
    { name: "centerY", label: "Centre Y", type: "range", min: 0.15, max: 0.85, step: 0.01, value: 0.53 },
    { name: "density", label: "Pattern size", type: "range", min: 12, max: 70, step: 1, value: 30 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 4 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const f = (n) => n.toFixed(1);
    const s = p.density;
    const C = [W * p.centerX, H * p.centerY];
    const R = Math.max(...[[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => Math.hypot(x - C[0], y - C[1]))) + 10;
    const thin = { width: f(0.8 * p.strokeWidth) };
    const solid = { fill: p.ink, stroke: "none" };
    // Set per wedge: is the local point (u, v) on the page and within a cell of the wedge?
    let near = () => true;

    // Every pattern draws in a local frame: u runs out along the wedge, v across it.
    const patterns = {
      zigzag(box, to) {
        let bold = "";
        let fine = "";
        for (let v = box.v0, k = 0; v <= box.v1 + s; v += s, k++) {
          for (let u = box.u0, i = 0; u <= box.u1 + s; u += s * 0.4, i++) {
            const z = i % 2 ? s * 0.22 : -s * 0.22;
            bold += (i ? "L" : "M") + to(u, v + z);
            fine += (i ? "L" : "M") + to(u, v + s / 2 + z);
          }
        }
        pen.path(bold, { width: f(s * 0.28) });
        pen.path(fine, thin);
      },
      triangleGrid(box, to) {
        const h = s * 0.866;
        let d = "";
        const nodes = [];
        for (let j = Math.floor(box.v0 / h) - 1; j * h <= box.v1 + h; j++) {
          for (let u = box.u0 - s + (j % 2 ? s / 2 : 0); u <= box.u1 + s; u += s) {
            const v = j * h;
            d += `M${to(u, v)}L${to(u + s, v)}M${to(u, v)}L${to(u + s / 2, v + h)}M${to(u, v)}L${to(u - s / 2, v + h)}`;
            if (near(u, v)) nodes.push([u, v]);
          }
        }
        pen.path(d, thin);
        for (const [u, v] of nodes) {
          const [x, y] = to(u, v, true);
          pen.circle(x, y, s * 0.13, { fill: p.paper });
          pen.circle(x, y, s * 0.05, solid);
        }
      },
      beads(box, to) {
        let d = "";
        const step = s * 1.4;
        for (let v = box.v0; v <= box.v1 + step; v += step) {
          for (let u = box.u0, i = 0; u <= box.u1; u += s * 0.2, i++) d += (i ? "L" : "M") + to(u, v + s * 0.3 * Math.sin(u / s));
        }
        pen.path(d, { width: f(s * 0.2) });
        for (let v = box.v0; v <= box.v1 + step; v += step) {
          for (let u = box.u0; u <= box.u1; u += s * 0.55) {
            if (!near(u, v + step / 2)) continue;
            const [x, y] = to(u, v + step / 2 + s * 0.3 * Math.sin(u / s), true);
            pen.circle(x, y, s * 0.24, { fill: p.paper });
          }
        }
      },
      scales(box, to, m) {
        const r = s * 0.7;
        const half = (u, v, rr) => {
          const [x0, y0] = to(u, v - rr, true);
          const [x1, y1] = to(u, v + rr, true);
          return `M${f(x0)} ${f(y0)}A${f(rr)} ${f(rr)} 0 0 ${m}${f(x1)} ${f(y1)}`;
        };
        for (let u = box.u1 + r, row = 0; u >= box.u0 - r; u -= r * 0.75, row++) {
          for (let v = box.v0 - s + (row % 2 ? r : 0); v <= box.v1 + s; v += s) {
            if (!near(u, v)) continue;
            pen.path(half(u, v, r) + "Z", { fill: p.paper, width: thin.width });
            pen.path(half(u, v, r * 0.6), thin);
          }
        }
      },
      checker(box, to) {
        let d = "";
        for (let u = Math.floor(box.u0 / s) * s, i = 0; u <= box.u1; u += s, i++) {
          for (let v = Math.floor(box.v0 / s) * s, j = 0; v <= box.v1; v += s, j++) {
            if ((Math.round(u / s) + Math.round(v / s)) % 2 || !near(u, v)) continue;
            d += `M${to(u, v)}L${to(u + s, v)}L${to(u + s, v + s)}L${to(u, v + s)}Z`;
          }
        }
        pen.path(d, solid);
      },
      spirals(box, to) {
        const step = s * 1.3;
        for (let v = box.v0, j = 0; v <= box.v1 + step; v += step * 0.87, j++) {
          for (let u = box.u0 + (j % 2 ? step / 2 : 0); u <= box.u1 + step; u += step) {
            if (!near(u, v)) continue;
            const [x, y] = to(u, v, true);
            pen.circle(x, y, s * 0.55, { fill: p.paper, width: f(1.4 * p.strokeWidth) });
            const pts = [];
            for (let t = 0; t <= 1; t += 0.03) pts.push([x + s * 0.45 * t * Math.cos(t * 6 * Math.PI), y + s * 0.45 * t * Math.sin(t * 6 * Math.PI)]);
            pen.polyline(pts, thin, true);
          }
        }
      },
      triangles(box, to) {
        let dark = "";
        let light = "";
        let core = "";
        const tri = (u, v, k) => `M${to(u, v - (s / 2) * k)}L${to(u + s * k, v)}L${to(u, v + (s / 2) * k)}Z`;
        for (let u = box.u0, row = 0; u <= box.u1; u += s * 1.1, row++) {
          for (let v = box.v0 + (row % 2 ? s / 2 : 0); v <= box.v1 + s; v += s) {
            if (!near(u, v)) continue;
            dark += tri(u, v, 1);
            light += tri(u + s * 0.22, v, 0.55);
            core += tri(u + s * 0.38, v, 0.2);
          }
        }
        pen.path(dark, solid);
        pen.path(light, { fill: p.paper, width: thin.width });
        pen.path(core, solid);
      },
      diamonds(box, to) {
        let d = "";
        let grid = "";
        const k = s * 0.42;
        for (let u = Math.floor(box.u0 / s) * s; u <= box.u1 + s; u += s) {
          for (let v = Math.floor(box.v0 / s) * s; v <= box.v1 + s; v += s) {
            if (!near(u, v)) continue;
            d += `M${to(u - k, v)}L${to(u, v - k)}L${to(u + k, v)}L${to(u, v + k)}Z`;
          }
        }
        // Thin lines run through the gaps, half a cell off the diamond centres.
        for (let c = Math.floor((box.u0 - box.v1) / s) * s + s / 2; c <= box.u1 - box.v0; c += s) {
          grid += `M${to(box.v0 + c, box.v0)}L${to(box.v1 + c, box.v1)}`;
        }
        for (let c = Math.floor((box.u0 + box.v0) / s) * s + s / 2; c <= box.u1 + box.v1; c += s) {
          grid += `M${to(c - box.v0, box.v0)}L${to(c - box.v1, box.v1)}`;
        }
        pen.path(d, solid);
        pen.path(grid, thin);
      },
      loops(box, to) {
        const count = Math.min(400, Math.ceil(((box.u1 - box.u0) * (box.v1 - box.v0)) / (s * s)));
        for (let i = 0; i < count; i++) {
          const [u, v] = [box.u0 + rand() * (box.u1 - box.u0), box.v0 + rand() * (box.v1 - box.v0)];
          if (!near(u, v)) continue;
          const [x, y] = to(u, v, true);
          pen.circle(x, y, s * (0.35 + rand() * 0.5), thin);
        }
      },
      stripes(box, to) {
        let d = "";
        for (let u = box.u0; u <= box.u1 + s; u += s * 0.5) d += `M${to(u, box.v0)}L${to(u, box.v1)}`;
        pen.path(d, { width: f(s * 0.2) });
      },
    };

    // Shuffle the patterns with the seed, then deal them round the wedges.
    const names = Object.keys(patterns);
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
    const start = rand() * 2 * Math.PI;
    const angles = [];
    for (let i = 0; i <= p.wedges; i++) {
      const jitter = i > 0 && i < p.wedges ? (rand() - 0.5) * 0.5 : 0;
      angles.push(start + ((i + jitter) * 2 * Math.PI) / p.wedges);
    }

    for (let i = 0; i < p.wedges; i++) {
      const a0 = angles[i];
      const a1 = angles[i + 1];
      const m = (a0 + a1) / 2;
      const half = (a1 - a0) / 2;
      const [cu, su] = [Math.cos(m), Math.sin(m)];
      // Local (u, v) to page coordinates; `raw` returns numbers instead of an "x y" string.
      const to = (u, v, raw) => {
        const x = C[0] + u * cu - v * su;
        const y = C[1] + u * su + v * cu;
        return raw ? [x, y] : `${f(x)} ${f(y)}`;
      };
      near = (u, v) => {
        const [x, y] = to(u, v, true);
        if (x < -2 * s || y < -2 * s || x > W + 2 * s || y > H + 2 * s) return false;
        return Math.abs(v) * Math.cos(half) - u * Math.sin(half) <= 2 * s;
      };
      const reach = Math.min(R, R * Math.tan(Math.min(half, 1.5)));
      const box = { u0: half < Math.PI / 2 ? 0 : -R, u1: R, v0: -reach, v1: reach };
      let wedge = `M${f(C[0])} ${f(C[1])}`;
      const steps = Math.ceil((a1 - a0) / 0.2);
      for (let k = 0; k <= steps; k++) {
        const a = a0 + ((a1 - a0) * k) / steps;
        wedge += `L${f(C[0] + R * 1.5 * Math.cos(a))} ${f(C[1] + R * 1.5 * Math.sin(a))}`;
      }
      wedge += "Z";
      pen.clip(wedge, () => patterns[names[i % names.length]](box, to, 1));
    }

    // Heavy spokes between the wedges, and a frame.
    let spokes = "";
    for (const a of angles.slice(0, -1)) spokes += `M${f(C[0])} ${f(C[1])}L${f(C[0] + R * Math.cos(a))} ${f(C[1] + R * Math.sin(a))}`;
    pen.path(spokes, { width: f(3 * p.strokeWidth) });
    pen.polygon([[0, 0], [W, 0], [W, H], [0, H]], { width: f(4 * p.strokeWidth) });
  },
});
