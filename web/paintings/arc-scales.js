Gallery.register({
  id: "arc-scales",
  title: "Arc Scales",
  description:
    "Rainbow bumps of nested half-circles, each with a black dot at its base, piled up " +
    "around an empty clearing. Every bump bulges towards the middle.",
  instruction:
    "Inside a frame with a margin of {margin} px, pile half-discs about {size} px across, each " +
    "bulging towards the centre and filled with {rings} nested arcs, with a black half-dot " +
    "{dot%} of its size at the base. Start from the middle and work outwards, so every new " +
    "bump hides the base of the last. Leave a clearing of {clearing} px in the middle.",
  params: [
    { name: "size", label: "Bump size", type: "range", min: 20, max: 160, step: 1, value: 72 },
    { name: "rings", label: "Arcs per bump", type: "range", min: 1, max: 20, step: 1, value: 9 },
    { name: "dot", label: "Dot size", type: "range", min: 0, max: 0.6, step: 0.01, value: 0.2 },
    { name: "clearing", label: "Clearing", type: "range", min: 0, max: 300, step: 1, value: 120 },
    { name: "margin", label: "Margin", type: "range", min: 0, max: 120, step: 1, value: 50 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 6 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const H = pen.height;
    const f = (n) => n.toFixed(1);
    const cx = W / 2;
    const cy = H / 2;

    // Bumps sit on a jittered grid that overflows the frame; none starts inside the clearing.
    const bumps = [];
    const gap = p.size * 0.9;
    for (let y = p.margin - gap / 2; y < H - p.margin + gap; y += gap) {
      for (let x = p.margin - gap / 2; x < W - p.margin + gap; x += gap) {
        const bx = x + (rand() - 0.5) * gap * 0.8;
        const by = y + (rand() - 0.5) * gap * 0.8;
        const dist = Math.hypot(bx - cx, by - cy);
        const r = p.size * (0.7 + rand() * 0.6);
        if (dist < p.clearing + r * 0.3) continue;
        // The dome faces the centre; a little noise keeps the pile from looking radial.
        const a = Math.atan2(cy - by, cx - bx) + (rand() - 0.5) * 0.8;
        bumps.push({ x: bx, y: by, r, a, dist });
      }
    }
    // Inner bumps first: each outer dome then hides the flat base of the ones before it.
    bumps.sort((u, v) => u.dist - v.dist);

    const halfDisc = (b, r) => {
      const x0 = b.x + r * Math.cos(b.a - Math.PI / 2);
      const y0 = b.y + r * Math.sin(b.a - Math.PI / 2);
      const x1 = b.x + r * Math.cos(b.a + Math.PI / 2);
      const y1 = b.y + r * Math.sin(b.a + Math.PI / 2);
      return `M${f(x0)} ${f(y0)}A${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(y1)}`;
    };

    const frame = `M${p.margin} ${p.margin}H${W - p.margin}V${H - p.margin}H${p.margin}Z`;
    pen.clip(frame, () => {
      for (const b of bumps) {
        pen.path(halfDisc(b, b.r) + "Z", { fill: p.paper, width: f(1.4 * p.strokeWidth) });
        for (let k = 1; k < p.rings; k++) pen.path(halfDisc(b, b.r * (1 - k / p.rings)));
        if (p.dot > 0) pen.path(halfDisc(b, b.r * p.dot) + "Z", { fill: p.ink });
      }
    });
    pen.path(frame, { width: f(1.5 * p.strokeWidth) });
  },
});
