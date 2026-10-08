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

  window.StudioTools = { errorLine };
})();
