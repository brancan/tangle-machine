Gallery.register({
  id: "harmonograph",
  title: "Harmonograph",
  description:
    "The trace of a harmonograph: two swinging pendulums steer a pen, and as their swing " +
    "dies away the line winds inward into a dense, shimmering knot. When playing, the phase " +
    "between them drifts slowly.",
  tags: ["geometric", "radial", "animated"],
  instruction:
    "Let one pendulum swing the pen sideways {fx} times while another swings it up and down " +
    "{fy} times, out of step by {phase} radians, both detuned by {detune} percent. Let the " +
    "swing fade by {damping} per thousand at every step and draw the pen's path for {beats} beats.",
  params: [
    { name: "fx", label: "Horizontal frequency", type: "range", min: 1, max: 7, step: 1, value: 2 },
    { name: "fy", label: "Vertical frequency", type: "range", min: 1, max: 7, step: 1, value: 3 },
    { name: "detune", label: "Detune (%)", type: "range", min: 0, max: 5, step: 0.1, value: 0.8 },
    { name: "phase", label: "Phase", type: "range", min: 0, max: 3.14, step: 0.01, value: 1.2 },
    { name: "damping", label: "Damping (‰)", type: "range", min: 0.5, max: 20, step: 0.5, value: 4 },
    { name: "beats", label: "Beats", type: "range", min: 20, max: 160, step: 1, value: 90 },
  ],
  draw: function draw(p, pen) {
    const cx = pen.width / 2;
    const cy = pen.height / 2;
    const amp = pen.width * 0.21;
    // Time slowly shifts the phase (p.time is 0 when the studio is not playing).
    const phase = p.phase + (p.time || 0) * 0.15;
    const tMax = p.beats * 2 * Math.PI;
    const dt = 0.02;
    const points = [];
    for (let t = 0; t <= tMax; t += dt) {
      const decay = Math.exp((-p.damping / 1000) * t);
      // Two pendulums per axis: the main one and a detuned partner from the other axis.
      const detune = p.detune / 100;
      const x = Math.sin(p.fx * t + phase) + Math.sin(p.fy * (1 + detune) * t + phase / 2);
      const y = Math.sin(p.fy * t) + Math.sin(p.fx * (1 - detune) * t + Math.PI / 2);
      points.push([cx + amp * decay * x, cy + amp * decay * y]);
    }
    pen.polyline(points, { width: p.strokeWidth * 0.6 });
  },
});
