Gallery.register({
  id: "bosch-garden",
  title: "Garden of Delights (after Bosch)",
  description:
    "After Hieronymus Bosch's Garden of Earthly Delights (c. 1490–1510): an interpretation, " +
    "not a copy. Strange branching stems sprout from a green meadow and end in giant fruit, " +
    "glassy bubbles, seed pods and spiky crowns.",
  tags: ["organic", "random"],
  style: { paper: "#ece4cc" },
  instruction:
    "Draw a meadow. Grow {plants} plants from it at random (seed {seed}). Let each stem bend " +
    "and fork, {depth} times. End about {fruit%} of the tips in a large round fruit and the " +
    "rest in a glassy bubble, a seed pod or a spiky crown.",
  params: [
    { name: "plants", label: "Plants", type: "range", min: 1, max: 12, step: 1, value: 6 },
    { name: "depth", label: "Growth depth", type: "range", min: 1, max: 6, step: 1, value: 4 },
    { name: "fruit", label: "Fruit share", type: "range", min: 0, max: 1, step: 0.01, value: 0.45 },
    { name: "seed", label: "Seed", type: "range", min: 1, max: 100, step: 1, value: 10 },
  ],
  draw: function draw(p, pen) {
    const rand = pen.random(p.seed);
    const W = pen.width;
    const ground = W * 0.82;
    const f = (n) => n.toFixed(2);
    const fruits = ["#c4473a", "#e59aa2", "#d9803a", "#9b3f6a", "#e8c14b"];
    const stemColor = "#4f6b3a";
    const pick = (list) => list[Math.floor(rand() * list.length)];

    // Meadow: a gently rolling filled band.
    const hills = [[0, W]];
    for (let x = 0; x <= W; x += 20) hills.push([x, ground + 10 * Math.sin(x / 70) + 6 * Math.sin(x / 23 + 1)]);
    hills.push([W, W]);
    pen.polygon(hills, { fill: "#8fae6a", stroke: "#4f6b3a" });

    const fruit = (x, y, r) => {
      pen.circle(x, y, r, { fill: pick(fruits), stroke: p.ink, width: 1 });
      pen.circle(x - r * 0.35, y - r * 0.35, r * 0.22, { fill: "rgba(255,255,255,0.6)", stroke: "none" });
    };
    const bubble = (x, y, r) => {
      pen.circle(x, y, r, { fill: "rgba(150,200,220,0.35)", stroke: "#5c8ea8", width: 1.2 });
      pen.circle(x, y, r * 0.7, { stroke: "rgba(92,142,168,0.6)", width: 0.8 });
      pen.arc(x, y, r * 0.82, Math.PI * 1.1, Math.PI * 1.45, { stroke: "#ffffff", width: 2.5 });
      if (rand() < 0.5) pen.circle(x + r * 0.1, y + r * 0.15, r * 0.25, { fill: pick(fruits), stroke: "none" });
    };
    const pod = (x, y, r, angle) => {
      const [ux, uy] = [Math.cos(angle), Math.sin(angle)];
      const [vx, vy] = [-uy, ux];
      const tip = [x + ux * r * 2, y + uy * r * 2];
      pen.path(
        `M${f(x)} ${f(y)}Q${f(x + ux * r + vx * r)} ${f(y + uy * r + vy * r)} ${f(tip[0])} ${f(tip[1])}` +
          `Q${f(x + ux * r - vx * r)} ${f(y + uy * r - vy * r)} ${f(x)} ${f(y)}Z`,
        { fill: "#b9c46a", stroke: stemColor, width: 1 }
      );
      for (let k = 1; k <= 3; k++) pen.circle(x + ux * r * k * 0.5, y + uy * r * k * 0.5, r * 0.15, { fill: "#5a3b22", stroke: "none" });
    };
    const crown = (x, y, r) => {
      const spikes = 9 + Math.floor(rand() * 6);
      const points = [];
      for (let k = 0; k < spikes * 2; k++) {
        const a = (k / (spikes * 2)) * 2 * Math.PI;
        const rr = k % 2 ? r * 0.55 : r * 1.15;
        points.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]);
      }
      pen.polygon(points, { fill: "#d65a3a", stroke: p.ink, width: 1 });
      pen.circle(x, y, r * 0.4, { fill: "#f0d36b", stroke: p.ink, width: 0.8 });
    };

    const grow = (x, y, angle, len, depth) => {
      const bend = (rand() - 0.5) * 0.8;
      const x2 = x + Math.cos(angle) * len;
      const y2 = y + Math.sin(angle) * len;
      const qx = x + Math.cos(angle + bend) * len * 0.6;
      const qy = y + Math.sin(angle + bend) * len * 0.6;
      pen.path(`M${f(x)} ${f(y)}Q${f(qx)} ${f(qy)} ${f(x2)} ${f(y2)}`, { stroke: stemColor, width: 1 + depth * 1.2 });
      if (depth <= 1) {
        const r = 8 + rand() * 16;
        const roll = rand();
        if (roll < p.fruit) fruit(x2, y2, r * 1.2);
        else if (roll < p.fruit + (1 - p.fruit) / 3) bubble(x2, y2, r * 1.3);
        else if (roll < p.fruit + (2 * (1 - p.fruit)) / 3) pod(x2, y2, r * 0.8, angle);
        else crown(x2, y2, r);
        return;
      }
      const forks = rand() < 0.3 ? 3 : 2;
      for (let k = 0; k < forks; k++) {
        const spread = (k - (forks - 1) / 2) * (0.5 + rand() * 0.4);
        grow(x2, y2, angle + spread, len * (0.68 + rand() * 0.15), depth - 1);
      }
    };

    for (let i = 0; i < p.plants; i++) {
      const x = W * (0.1 + (0.8 * (i + 0.5)) / p.plants) + (rand() - 0.5) * 40;
      // First stem length chosen so the whole plant reaches about two thirds of the wall.
      const reach = (1 - 0.75 ** p.depth) / 0.25;
      const len = ((W * 0.62) / reach) * (0.65 + rand() * 0.4);
      grow(x, ground + 4, -Math.PI / 2 + (rand() - 0.5) * 0.4, len, p.depth);
    }
  },
});
