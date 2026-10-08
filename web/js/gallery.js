// Painting registry and the pen API that drawing code uses to emit SVG.
(function () {
  const paintings = [];
  // Clip ids must be unique across every SVG on the page (gallery thumbnails share the DOM).
  let clipCounter = 0;

  const STYLE_PARAMS = [
    { name: "ink", label: "Ink", type: "color", value: "#1a1a1a" },
    { name: "paper", label: "Paper", type: "color", value: "#fbf8f0" },
    { name: "strokeWidth", label: "Stroke width", type: "range", min: 0.2, max: 4, step: 0.1, value: 1 },
    {
      name: "paperTexture",
      label: "Paper texture",
      type: "select",
      value: "plain",
      options: [
        { value: "plain", label: "Plain" },
        { value: "dark", label: "Dark" },
        { value: "kraft", label: "Kraft" },
        { value: "grain", label: "Grain" },
        { value: "watercolor", label: "Watercolor" },
      ],
    },
  ];

  // Noise laid over the paper: feTurbulence tinted by a color matrix whose alpha row
  // turns the noise into specks, fibers or blotches. Plain paper has no entry.
  const PAPER_TEXTURES = {
    dark: { frequency: "0.9", octaves: 2, rgb: "1 1 1", alpha: "0.6 0 0 0 -0.25" },
    kraft: { frequency: "0.03 0.5", octaves: 3, rgb: "0.35 0.22 0.1", alpha: "1.3 0 0 0 -0.5" },
    grain: { frequency: "0.9", octaves: 2, rgb: "0.2 0.15 0.1", alpha: "0.9 0 0 0 -0.38" },
    watercolor: { frequency: "0.008", octaves: 4, rgb: "0.45 0.35 0.25", alpha: "0.7 0 0 0 -0.2" },
  };

  function paperFilter(id, texture) {
    const [r, g, b] = texture.rgb.split(" ");
    const matrix = `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${texture.alpha}`;
    return (
      `<filter id="${id}" x="0" y="0" width="100%" height="100%">` +
      `<feTurbulence type="fractalNoise" baseFrequency="${texture.frequency}" numOctaves="${texture.octaves}" seed="7" stitchTiles="stitch"/>` +
      `<feColorMatrix type="matrix" values="${matrix}"/>` +
      `</filter>`
    );
  }

  // Shared by every painting: make the strokes look drawn by hand.
  const HAND_PARAMS = [
    { name: "handWobble", label: "Wobble", type: "range", min: 0, max: 8, step: 0.1, value: 0 },
    { name: "handJitter", label: "Jitter", type: "range", min: 0, max: 8, step: 0.1, value: 0 },
    { name: "handPressure", label: "Pressure", type: "range", min: 0, max: 0.9, step: 0.01, value: 0 },
    { name: "handRoughness", label: "Roughness", type: "range", min: 0, max: 6, step: 0.1, value: 0 },
    { name: "handSeed", label: "Hand seed", type: "range", min: 1, max: 100, step: 1, value: 1 },
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

  // Turns perfect geometry into hand-drawn strokes. Every value at 0 leaves shapes untouched.
  function createHand({ handWobble: wobble = 0, handJitter: jitter = 0, handPressure: pressure = 0, handSeed = 1, strokeWidth = 1 }) {
    const rand = random(handSeed * 7919 + 13);
    const bends = wobble > 0 || jitter > 0;
    const spread = (amount) => (rand() * 2 - 1) * amount;

    // Low-frequency waves with random phases: a slow, continuous drift of the pen.
    function drift() {
      const waves = [1, 2, 3].map((k) => ({ f: (0.006 + rand() * 0.012) * k, x: rand() * 6.3, y: rand() * 6.3 }));
      return (d) => {
        let dx = 0;
        let dy = 0;
        for (const [i, w] of waves.entries()) {
          dx += Math.sin(w.f * d + w.x) / (i + 1);
          dy += Math.sin(w.f * d + w.y) / (i + 1);
        }
        return [(dx * wobble) / 1.83, (dy * wobble) / 1.83];
      };
    }

    // Jitters the vertices, then resamples every ~6px and adds the drift along the way.
    // Sampled curves (arcs, circles) move as a whole instead, or jitter would saw-tooth them.
    function stroke(list, closed, curve = false) {
      if (!bends || list.length < 2) return list;
      let moved;
      if (curve) {
        const dx = spread(jitter);
        const dy = spread(jitter);
        moved = list.map(([x, y]) => [x + dx, y + dy]);
      } else {
        moved = list.map(([x, y]) => [x + spread(jitter), y + spread(jitter)]);
      }
      // A closing stroke ends near, not exactly on, its start: the hand never quite meets itself.
      if (closed) moved.push([moved[0][0] + spread(jitter), moved[0][1] + spread(jitter)]);
      if (wobble <= 0) return moved;
      const offset = drift();
      const out = [];
      let travelled = 0;
      for (let i = 0; i < moved.length - 1; i++) {
        const [ax, ay] = moved[i];
        const [bx, by] = moved[i + 1];
        const length = Math.hypot(bx - ax, by - ay);
        const steps = Math.max(1, Math.ceil(length / 6));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const [ox, oy] = offset(travelled + t * length);
          out.push([ax + (bx - ax) * t + ox, ay + (by - ay) * t + oy]);
        }
        travelled += length;
      }
      const [lx, ly] = moved[moved.length - 1];
      const [ox, oy] = offset(travelled);
      out.push([lx + ox, ly + oy]);
      return out;
    }

    // Pressure: each stroke gets its own width around the nominal one.
    function style(base) {
      if (pressure <= 0) return base;
      const width = (base && base.width != null ? base.width : strokeWidth) * Math.max(0.15, 1 + spread(pressure));
      return { ...(base || {}), width: fmt(width) };
    }

    return { bends, stroke, style };
  }

  // `record`, when given, receives every shape as data (points, style) as well, so the
  // plotter export sees exactly the geometry the screen shows, hand-drawn bends included.
  function createPen(width, height, hand, record = () => {}) {
    const shapes = [];
    const pen = {
      width,
      height,
      shapes,
      random,
      polygon(list, style, curve) {
        // A hand-drawn closed shape is an open stroke that ends near its start; fills still close.
        const tag = hand.bends ? "polyline" : "polygon";
        const stroked = hand.stroke(list, true, curve);
        const styled = hand.style(style);
        shapes.push(`<${tag} points="${points(stroked)}"${attrs(styled)}/>`);
        record({ kind: "poly", points: stroked, closed: !hand.bends, style: styled });
      },
      polyline(list, style, curve) {
        const stroked = hand.stroke(list, false, curve);
        const styled = hand.style(style);
        shapes.push(`<polyline points="${points(stroked)}"${attrs(styled)}/>`);
        record({ kind: "poly", points: stroked, closed: false, style: styled });
      },
      line(x1, y1, x2, y2, style) {
        if (hand.bends) return pen.polyline([[x1, y1], [x2, y2]], style);
        const styled = hand.style(style);
        shapes.push(`<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"${attrs(styled)}/>`);
        record({ kind: "poly", points: [[x1, y1], [x2, y2]], closed: false, style: styled });
      },
      circle(cx, cy, r, style) {
        if (hand.bends) return pen.polygon(arcPoints(cx, cy, r, 0, 2 * Math.PI).slice(0, -1), style, true);
        const styled = hand.style(style);
        shapes.push(`<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"${attrs(styled)}/>`);
        record({ kind: "poly", points: arcPoints(cx, cy, r, 0, 2 * Math.PI).slice(0, -1), closed: true, style: styled });
      },
      // Arc of a circle from angle a0 to a1 (radians, clockwise on screen when a1 > a0).
      arc(cx, cy, r, a0, a1, style) {
        if (hand.bends) return pen.polyline(arcPoints(cx, cy, r, a0, a1), style, true);
        const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
        const sweep = a1 > a0 ? 1 : 0;
        const x0 = cx + r * Math.cos(a0);
        const y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const styled = hand.style(style);
        shapes.push(
          `<path d="M${fmt(x0)} ${fmt(y0)}A${fmt(r)} ${fmt(r)} 0 ${large} ${sweep} ${fmt(x1)} ${fmt(y1)}"${attrs(styled)}/>`
        );
        record({ kind: "poly", points: arcPoints(cx, cy, r, a0, a1), closed: false, style: styled });
      },
      // Raw SVG paths keep their geometry (only the roughness filter bends them).
      path(d, style) {
        const styled = hand.style(style);
        shapes.push(`<path d="${d}"${attrs(styled)}/>`);
        record({ kind: "path", d, style: styled });
      },
      // Everything drawn inside fn is clipped to the path d.
      clip(d, fn) {
        const id = `clip-${++clipCounter}`;
        shapes.push(`<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">`);
        record({ kind: "clip", d });
        try {
          fn();
        } finally {
          shapes.push("</g>");
          record({ kind: "unclip" });
        }
      },
    };
    return pen;
  }

  // Points along an arc, about every 6px.
  function arcPoints(cx, cy, r, a0, a1) {
    const steps = Math.max(8, Math.ceil((Math.abs(a1 - a0) * r) / 6));
    const list = [];
    for (let s = 0; s <= steps; s++) {
      const a = a0 + ((a1 - a0) * s) / steps;
      list.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return list;
  }

  function defaults(params) {
    return Object.fromEntries(params.map((param) => [param.name, param.value]));
  }

  // Starting values for a painting: shared style, its style overrides, its own params.
  function initialValues(painting) {
    return {
      ...defaults(STYLE_PARAMS),
      ...defaults(HAND_PARAMS),
      ...(painting.style || {}),
      ...defaults(painting.params),
    };
  }

  // Runs a draw function and returns a standalone SVG document string.
  function render(draw, values, size = 800) {
    const pen = createPen(size, size, createHand(values));
    draw(values, pen);
    let filter = "";
    let defs = "";
    let texture = "";
    if (values.handRoughness > 0) {
      // Displaces every pixel with fractal noise, so even raw paths and fills tremble.
      const id = `rough-${++clipCounter}`;
      defs +=
        `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">` +
        `<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${values.handSeed || 1}"/>` +
        `<feDisplacementMap in="SourceGraphic" scale="${values.handRoughness * 2}" xChannelSelector="R" yChannelSelector="G"/>` +
        `</filter>`;
      filter = ` filter="url(#${id})"`;
    }
    const paper = PAPER_TEXTURES[values.paperTexture];
    if (paper) {
      const id = `paper-${++clipCounter}`;
      defs += paperFilter(id, paper);
      texture = `<rect width="100%" height="100%" filter="url(#${id})"/>`;
    }
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
      (defs ? `<defs>${defs}</defs>` : "") +
      `<rect width="100%" height="100%" fill="${values.paper}"/>` +
      texture +
      `<g fill="none" stroke="${values.ink}" stroke-width="${values.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"${filter}>` +
      pen.shapes.join("") +
      `</g></svg>`
    );
  }

  // Runs a draw function and returns its shapes as data instead of SVG (see createPen).
  function trace(draw, values, size = 800) {
    const shapes = [];
    draw(values, createPen(size, size, createHand(values), (shape) => shapes.push(shape)));
    return shapes;
  }

  // Turns edited source text back into a callable draw function.
  function compile(source) {
    const fn = new Function(`"use strict"; return (${source});`)();
    if (typeof fn !== "function") throw new Error("The code must be a function: function draw(p, pen) { ... }");
    return fn;
  }

  window.Gallery = {
    STYLE_PARAMS,
    HAND_PARAMS,
    paintings,
    register(painting) {
      paintings.push(painting);
    },
    find(id) {
      return paintings.find((painting) => painting.id === id);
    },
    initialValues,
    random,
    render,
    trace,
    compile,
  };
})();
