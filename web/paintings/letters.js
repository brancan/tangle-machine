Gallery.register({
  id: "letters",
  title: "Letters",
  description:
    "After Vera Molnar's Lettres de ma mère (1981–1991): an interpretation, not the " +
    "original. Rows of joined loops and arches that read like a letter in a familiar hand, " +
    "yet never spell a word.",
  tags: ["organic", "random"],
  instruction:
    "Write {lines} rows across the wall in a script that cannot be read. Each word is a " +
    "single stroke of joined loops about {size} tall, leaning {slant}° from upright, with an " +
    "occasional tall loop or one that dips below the line. Let heights, widths and the line " +
    "itself wander by {irregularity%}, leave a gap between words and end the last row " +
    "early. Random choices follow seed {seed}.",
  params: [
    { name: "lines", label: "Rows", type: "range", min: 3, max: 24, step: 1, value: 12 },
    { name: "size", label: "Letter size", type: "range", min: 6, max: 30, step: 1, value: 14 },
    { name: "slant", label: "Slant", type: "range", min: -20, max: 40, step: 1, value: 16 },
    { name: "irregularity", label: "Irregularity", type: "range", min: 0, max: 1, step: 0.05, value: 0.4 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 1 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const margin = 60;
    const right = pen.width - margin;
    const gap = (pen.height - 2 * margin) / p.lines;
    const vary = (amount) => 1 + (rand() * 2 - 1) * amount * p.irregularity;
    const steps = 12;
    const lean = Math.tan((p.slant * Math.PI) / 180);

    for (let row = 0; row < p.lines; row++) {
      // The last row stops somewhere along the page, like the end of a letter.
      const end = row === p.lines - 1 ? margin + (0.3 + 0.4 * rand()) * (right - margin) : right;
      let base = margin + (row + 0.7) * gap;
      let cursor = margin + (row === 0 ? 0 : rand() * p.size * p.irregularity);
      while (cursor < end - p.size) {
        const letters = 2 + Math.floor(rand() * 6);
        const points = [];
        for (let i = 0; i < letters && cursor < end; i++) {
          const w = p.size * 0.6 * vary(0.5);
          // Mostly small letters; now and then an ascender or a descender.
          const pick = rand();
          const h = p.size * vary(0.4) * (pick < 0.15 ? 2.2 : pick < 0.25 ? -1.6 : 1);
          const loop = w * (0.15 + 0.25 * rand());
          for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
            const t = (2 * Math.PI * k) / steps;
            const up = (h * (1 - Math.cos(t))) / 2;
            points.push([cursor + (w * t) / (2 * Math.PI) - loop * Math.sin(t) + up * lean, base - up]);
          }
          cursor += w;
          base += (rand() * 2 - 1) * 0.6 * p.irregularity;
        }
        pen.polyline(points, undefined, true);
        cursor += p.size * 0.9 * vary(0.5);
      }
    }
  },
});
