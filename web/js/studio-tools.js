// Pure helpers for the studio: error lines, export sizes, palettes, presets and pen help.
(function () {
  // Line and column of the first frame that ran inside code built by `new Function`
  // (Chrome: "<anonymous>:3:5", Firefox: "> Function:3:5").
  function functionFrame(stack) {
    const match = /(?:<anonymous>|> Function):(\d+):(\d+)/.exec(String(stack || ""));
    return match ? Number(match[1]) : null;
  }

  // Engines number `new Function` lines from a hidden header; measure it once with a probe
  // shaped like Gallery.compile, whose throw sits on the source's second line.
  let lineOffset = null;
  function functionLineOffset() {
    if (lineOffset === null) {
      try {
        new Function('"use strict"; return (function () {\nthrow new Error("probe");\n});')()();
      } catch (error) {
        const line = functionFrame(error.stack);
        lineOffset = line === null ? 2 : line - 2;
      }
    }
    return lineOffset;
  }

  // Editor line (1-based) where compiled code threw, or null when it cannot be told.
  function errorLine(error) {
    const line = functionFrame(error && error.stack);
    if (line === null) return null;
    const editorLine = line - functionLineOffset();
    return editorLine >= 1 ? editorLine : null;
  }

  // PNG export sizes; the drawing is square, so A4 at 300 DPI uses its long side.
  const PNG_SIZES = [
    { size: 800, label: "1x · 800 px" },
    { size: 1600, label: "2x · 1600 px", default: true },
    { size: 3200, label: "4x · 3200 px" },
    { size: 3508, label: "A4 300 DPI · 3508 px" },
  ];

  // Replay timing: every stroke starts a little after the previous one and the last one
  // ends at `total` ms, whatever the number of strokes.
  function replaySchedule(count, total = 4000) {
    const duration = count <= 1 ? total : Math.min(total * 0.25, Math.max(60, (total / count) * 4));
    const step = count > 1 ? (total - duration) / (count - 1) : 0;
    return { duration, delay: (index) => index * step };
  }

  // Global palettes: ink, paper and colors handed out in order to a painting's color params.
  // "default" brings back the painting's own starting colors.
  const PALETTES = [
    { id: "default", label: "Default" },
    { id: "mono", label: "Mono", ink: "#111111", paper: "#ffffff", colors: ["#111111", "#555555", "#999999", "#d4d4d4"] },
    { id: "pastel", label: "Pastel", ink: "#4a4a5a", paper: "#fdf6ec", colors: ["#f4a6a6", "#a6d8f4", "#c6e8a6", "#f4e1a6", "#d2b6f4"] },
    { id: "sepia", label: "Sepia", ink: "#3b2a1a", paper: "#f1e3c8", colors: ["#7a5230", "#a67b4f", "#c9a27a", "#5c3d22"] },
    { id: "duotone", label: "Duotone", ink: "#1b2a49", paper: "#f4efe6", colors: ["#1b2a49", "#e4572e"] },
    { id: "cyberpunk", label: "Cyberpunk", ink: "#05d9e8", paper: "#0d0221", colors: ["#ff2a6d", "#05d9e8", "#d1f7ff", "#7700ff"] },
    { id: "vintage", label: "Vintage", ink: "#2f2a24", paper: "#efe6d2", colors: ["#c0563f", "#d9a441", "#4f7c6d", "#2e4a62"] },
  ];

  // New values with the palette applied, like a user moving the color controls.
  // `initial` is the painting's starting values (used by "default"); unknown ids change nothing.
  function applyPalette(painting, values, id, initial) {
    const palette = PALETTES.find((p) => p.id === id);
    if (!palette) return values;
    const colorParams = painting.params.filter((param) => param.type === "color");
    const out = { ...values };
    if (palette.id === "default") {
      for (const name of ["ink", "paper", ...colorParams.map((param) => param.name)]) out[name] = initial[name];
      return out;
    }
    out.ink = palette.ink;
    out.paper = palette.paper;
    colorParams.forEach((param, index) => {
      out[param.name] = palette.colors[index % palette.colors.length];
    });
    return out;
  }

  // Textures that only make sense on their own paper color (and, for dark, a light ink).
  const TEXTURE_COLORS = {
    dark: { paper: "#1d1d1f", ink: "#ece8df" },
    kraft: { paper: "#c8a878" },
  };

  function textureValues(values, texture) {
    return { ...values, ...(TEXTURE_COLORS[texture] || {}), paperTexture: texture };
  }

  window.StudioTools = { errorLine, PNG_SIZES, replaySchedule, PALETTES, applyPalette, textureValues };
})();
