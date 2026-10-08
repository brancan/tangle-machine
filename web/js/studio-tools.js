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

  window.StudioTools = { errorLine, PNG_SIZES, replaySchedule };
})();
