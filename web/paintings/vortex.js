Gallery.register({
  id: "vortex",
  title: "Vortex",
  description:
    "Logarithmic spiral arms swirl into the center, and the bands between them are " +
    "ribbed with bulging arcs, like a ribbed tunnel twisting away from you.",
  params: [
    { name: "arms", label: "Arms", type: "range", min: 3, max: 30, step: 1, value: 12 },
    { name: "twist", label: "Openness", type: "range", min: 0.06, max: 0.5, step: 0.01, value: 0.2 },
    { name: "ribs", label: "Ribs per turn", type: "range", min: 6, max: 120, step: 1, value: 40 },
    { name: "bulge", label: "Rib bulge", type: "range", min: -0.6, max: 0.6, step: 0.01, value: 0.25 },
    { name: "fill", label: "Shade every other band", type: "checkbox", value: true },
    { name: "clockwise", label: "Clockwise", type: "checkbox", value: true },
  ],
  draw: function draw(p, pen) {
    const cx = pen.width / 2;
    const cy = pen.height / 2;
    const rMin = 3;
    const rMax = Math.hypot(cx, cy) * 1.1;
    const thetaMax = Math.log(rMax / rMin) / p.twist;
    const dir = p.clockwise ? 1 : -1;
    const sector = (2 * Math.PI) / p.arms;
    const f = (n) => n.toFixed(2);

    const radius = (theta) => rMin * Math.exp(p.twist * theta);
    const point = (theta, arm) => {
      const a = dir * (theta + arm * sector);
      const r = radius(theta);
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };

    // Ribs cross each band radially: from arm `arm` at theta to the next arm one sector
    // earlier, which lies on the same ray. The control point leans sideways for a bulge.
    const dTheta = (2 * Math.PI) / p.ribs;
    for (let arm = 0; arm < p.arms; arm++) {
      const shaded = p.fill && arm % 2 === 0;
      let previous = null;
      for (let theta = sector; theta <= thetaMax + sector; theta += dTheta) {
        const [x0, y0] = point(theta, arm);
        const [x1, y1] = point(theta - sector, arm + 1);
        const r = (radius(theta) + radius(theta - sector)) / 2;
        const a = dir * (theta + arm * sector + p.bulge * sector);
        const qx = cx + r * Math.cos(a);
        const qy = cy + r * Math.sin(a);
        const rib = `M${f(x0)} ${f(y0)}Q${f(qx)} ${f(qy)} ${f(x1)} ${f(y1)}`;
        if (shaded && previous) {
          // Close the strip between this rib and the previous one and fill it.
          pen.path(`${rib}L${previous.end}Q${previous.q} ${previous.start}Z`, { fill: p.ink, stroke: p.ink });
        } else if (!shaded) {
          pen.path(rib);
        }
        previous = { start: `${f(x0)} ${f(y0)}`, end: `${f(x1)} ${f(y1)}`, q: `${f(qx)} ${f(qy)}` };
      }
    }

    for (let arm = 0; arm < p.arms; arm++) {
      const line = [];
      for (let theta = 0; theta <= thetaMax; theta += 0.04) line.push(point(theta, arm));
      pen.polyline(line, { width: p.strokeWidth * 1.6 });
    }
  },
});
