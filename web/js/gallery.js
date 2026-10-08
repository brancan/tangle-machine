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

  // Optional per-shape style: { fill, stroke, width }.
  function attrs(style) {
    if (!style) return "";
    let out = "";
    if (style.fill) out += ` fill="${style.fill}"`;
    if (style.stroke) out += ` stroke="${style.stroke}"`;
    if (style.width != null) out += ` stroke-width="${style.width}"`;
    return out;
  }

  // Deterministic PRNG (mulberry32): same seed, same drawing.
  function random(seed = 1) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createPen(width, height) {
    const shapes = [];
    return {
      width,
      height,
      shapes,
      random,
      polygon(list, style) {
        shapes.push(`<polygon points="${points(list)}"${attrs(style)}/>`);
      },
      polyline(list, style) {
        shapes.push(`<polyline points="${points(list)}"${attrs(style)}/>`);
      },
      line(x1, y1, x2, y2, style) {
        shapes.push(`<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"${attrs(style)}/>`);
      },
      circle(cx, cy, r, style) {
        shapes.push(`<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"${attrs(style)}/>`);
      },
      // Arc of a circle from angle a0 to a1 (radians, clockwise on screen when a1 > a0).
      arc(cx, cy, r, a0, a1, style) {
        const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
        const sweep = a1 > a0 ? 1 : 0;
        const x0 = cx + r * Math.cos(a0);
        const y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        shapes.push(
          `<path d="M${fmt(x0)} ${fmt(y0)}A${fmt(r)} ${fmt(r)} 0 ${large} ${sweep} ${fmt(x1)} ${fmt(y1)}"${attrs(style)}/>`
        );
      },
      path(d, style) {
        shapes.push(`<path d="${d}"${attrs(style)}/>`);
      },
    };
  }

  function defaults(params) {
    return Object.fromEntries(params.map((param) => [param.name, param.value]));
  }

  // Starting values for a painting: shared style, its style overrides, its own params.
  function initialValues(painting) {
    return { ...defaults(STYLE_PARAMS), ...(painting.style || {}), ...defaults(painting.params) };
  }

  // Runs a draw function and returns a standalone SVG document string.
  function render(draw, values, size = 800) {
    const pen = createPen(size, size);
    draw(values, pen);
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
      `<rect width="100%" height="100%" fill="${values.paper}"/>` +
      `<g fill="none" stroke="${values.ink}" stroke-width="${values.strokeWidth}" stroke-linejoin="round" stroke-linecap="round">` +
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
    initialValues,
    render,
    compile,
  };
})();
