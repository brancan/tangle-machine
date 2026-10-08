Gallery.register({
  id: "tumbling-blocks",
  title: "Tumbling Blocks",
  description:
    "A field of isometric cubes, each with a white top, a solid side and a hatched side. " +
    "Three rhombi per hexagon, and the eye cannot decide which way the stairs go.",
  params: [
    { name: "size", label: "Cube size", type: "range", min: 15, max: 140, step: 1, value: 52 },
    { name: "hatch", label: "Hatch lines", type: "range", min: 0, max: 24, step: 1, value: 8 },
    { name: "solid", label: "Solid side", type: "checkbox", value: true },
    { name: "flip", label: "Flip lighting", type: "checkbox", value: false },
  ],
  draw: function draw(p, pen) {
    const s = p.size;
    const dx = Math.sqrt(3) * s;
    const dy = 1.5 * s;
    const half = (Math.sqrt(3) / 2) * s;

    // Pointy-top hexagons; odd rows shift by half a hexagon.
    for (let j = -1; j <= pen.height / dy + 1; j++) {
      for (let i = -1; i <= pen.width / dx + 1; i++) {
        const [cx, cy] = [i * dx + (j % 2 ? dx / 2 : 0), j * dy];
        const c = [cx, cy];
        const top = [cx, cy - s];
        const bottom = [cx, cy + s];
        const upperLeft = [cx - half, cy - s / 2];
        const upperRight = [cx + half, cy - s / 2];
        const lowerLeft = [cx - half, cy + s / 2];
        const lowerRight = [cx + half, cy + s / 2];

        // Three rhombi meet at the center: the top face and two sides.
        const topFace = [c, upperLeft, top, upperRight];
        const leftFace = [c, upperLeft, lowerLeft, bottom];
        const rightFace = [c, upperRight, lowerRight, bottom];
        const [dark, hatched] = p.flip ? [rightFace, leftFace] : [leftFace, rightFace];

        pen.polygon(topFace, { fill: p.paper });
        pen.polygon(dark, { fill: p.solid ? p.ink : p.paper });
        pen.polygon(hatched, { fill: p.paper });

        // Hatch lines run parallel to the face's slanted edge (center -> upper corner).
        const [h0, h1, , h3] = hatched;
        for (let k = 1; k <= p.hatch; k++) {
          const t = k / (p.hatch + 1);
          const x = h0[0] + (h3[0] - h0[0]) * t;
          const y = h0[1] + (h3[1] - h0[1]) * t;
          pen.line(x, y, x + h1[0] - h0[0], y + h1[1] - h0[1]);
        }
      }
    }
  },
});
