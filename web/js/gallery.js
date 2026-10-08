// Painting registry and the pen API that drawing code uses to emit SVG.
(function () {
  const paintings = [];

  const STYLE_PARAMS = [
    { name: "ink", label: "Ink", type: "color", value: "#1a1a1a" },
    { name: "paper", label: "Paper", type: "color", value: "#fbf8f0" },
    { name: "strokeWidth", label: "Stroke width", type: "range", min: 0.2, max: 4, step: 0.1, value: 1 },
  ];

  function fmt(n) {
    return Math.round(n * 100) / 100;
  }

  function points(list) {
    return list.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" ");
  }

  function createPen(width, height) {
    const shapes = [];
    return {
      width,
      height,
      shapes,
      polygon(list) {
        shapes.push(`<polygon points="${points(list)}"/>`);
      },
      polyline(list) {
        shapes.push(`<polyline points="${points(list)}"/>`);
      },
      line(x1, y1, x2, y2) {
        shapes.push(`<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"/>`);
      },
      circle(cx, cy, r) {
        shapes.push(`<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"/>`);
      },
      path(d) {
        shapes.push(`<path d="${d}"/>`);
      },
    };
  }

  function defaults(params) {
    return Object.fromEntries(params.map((param) => [param.name, param.value]));
  }

  // Runs a draw function and returns a standalone SVG document string.
  function render(draw, values, size = 800) {
    const pen = createPen(size, size);
    draw(values, pen);
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
      `<rect width="100%" height="100%" fill="${values.paper}"/>` +
      `<g fill="none" stroke="${values.ink}" stroke-width="${values.strokeWidth}" stroke-linejoin="round">` +
      pen.shapes.join("") +
      `</g></svg>`
    );
  }

  // Turns edited source text back into a callable draw function.
  function compile(source) {
    const fn = new Function(`"use strict"; return (${source});`)();
    if (typeof fn !== "function") throw new Error("The code must be a function: function draw(p, pen) { ... }");
    return fn;
  }

  window.Gallery = {
    STYLE_PARAMS,
    paintings,
    register(painting) {
      paintings.push(painting);
    },
    find(id) {
      return paintings.find((painting) => painting.id === id);
    },
    defaults,
    render,
    compile,
  };
})();
