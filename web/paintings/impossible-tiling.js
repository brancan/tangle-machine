Gallery.register({
  id: "impossible-tiling",
  title: "Impossible Tiling",
  description:
    "A tessellation of impossible triangles: every triangle of a triangular grid holds a " +
    "three-bar figure whose bars twist into one another in a way no solid object could, " +
    "shaded in three tones.",
  tags: ["paradox", "tessellation", "geometric"],
  instruction:
    "Divide the wall into a triangular grid with {tiles} triangles along each row. In every " +
    "triangle draw an impossible tribar from three bent pieces, each the outer face of one " +
    "side turning into the inner face of the next. Shade the three pieces light, middle and " +
    "dark, {shading%} apart, and mirror some figures at random (seed {seed}).",
  params: [
    { name: "tiles", label: "Tiles per row", type: "range", min: 1, max: 8, step: 1, value: 3 },
    { name: "shading", label: "Shading", type: "range", min: 0, max: 1, step: 0.01, value: 0.75 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 2 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const n = 7; // lattice units per tile side
    const u = W / (p.tiles * n);
    const h = (Math.sqrt(3) / 2) * u;
    const gray = (v) => {
      const c = Math.round(255 * v);
      return `rgb(${c},${c},${c})`;
    };
    const tones = [gray(0.5 + 0.45 * p.shading), gray(0.5), gray(0.5 - 0.45 * p.shading)];

    // One piece in lattice coordinates (a along the base, b up the left side).
    const piece = [[0, 0], [n - 1, 0], [n - 2, 1], [2, 1], [2, n - 4], [1, n - 3], [1, 1], [0, 1]];
    const turn = ([a, b]) => [n - a - b, a]; // 120° about the tile's center
    const pieces = [piece, piece.map(turn), piece.map(turn).map(turn)];

    const frame = `M0 0L${W} 0L${W} ${W}L0 ${W}Z`;
    pen.clip(frame, () => {
      const rows = Math.ceil(W / (n * h)) + 1;
      for (let row = 0; row < rows; row++) {
        for (let col = -row - 1; col <= p.tiles + 1; col++) {
          // Lattice origin of the upward tile; rows climb from the bottom edge.
          const oa = col * n;
          const ob = row * n;
          const toScreen = (A, B) => [(A + B / 2) * u, W - B * h];
          for (const down of [false, true]) {
            const mirror = rand() < 0.5;
            const place = ([a, b]) => {
              // Shrink each figure a little toward its center, leaving a paper seam between tiles.
              const [sa, sb] = [n / 3 + (a - n / 3) * 0.93, n / 3 + (b - n / 3) * 0.93];
              const [x, y] = mirror ? [sb, sa] : [sa, sb];
              return down ? toScreen(oa + n - x, ob + n - y) : toScreen(oa + x, ob + y);
            };
            pieces.forEach((shape, k) => pen.polygon(shape.map(place), { fill: tones[k], width: 0.8 }));
          }
        }
      }
    });
  },
});
