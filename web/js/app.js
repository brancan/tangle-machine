// Gallery and studio views: pick a painting, tweak its params, edit its code.
(function () {
  const { STYLE_PARAMS } = Gallery;
  const $ = (selector) => document.querySelector(selector);

  const storage = {
    key: (id) => `zentangles:code:${id}`,
    get(id) {
      try {
        return localStorage.getItem(this.key(id));
      } catch {
        return null;
      }
    },
    set(id, source) {
      try {
        localStorage.setItem(this.key(id), source);
      } catch {
        /* storage unavailable: edits live only for this visit */
      }
    },
    clear(id) {
      try {
        localStorage.removeItem(this.key(id));
      } catch {
        /* ignore */
      }
    },
  };

  // ---------- Gallery ----------

  function showGallery() {
    $("#studio").hidden = true;
    $("#gallery").hidden = false;
    document.title = "Zentangles";
    const values = (painting) => ({ ...Gallery.defaults(STYLE_PARAMS), ...Gallery.defaults(painting.params) });
    $("#gallery-grid").innerHTML = Gallery.paintings
      .map(
        (painting) => `
        <a class="card" href="#/${painting.id}">
          <div class="frame">${Gallery.render(painting.draw, values(painting))}</div>
          <h2>${painting.title}</h2>
          <p>${painting.description}</p>
        </a>`
      )
      .join("");
  }

  // ---------- Studio ----------

  let editor = null;
  let state = null;
  let codeTimer = null;

  function createEditor(textarea) {
    if (window.CodeMirror) {
      const cm = CodeMirror.fromTextArea(textarea, {
        mode: "javascript",
        lineNumbers: true,
        lineWrapping: true,
        tabSize: 2,
        indentUnit: 2,
        viewportMargin: Infinity,
        extraKeys: { "Ctrl-Enter": runCode, "Cmd-Enter": runCode },
      });
      return {
        get: () => cm.getValue(),
        set: (value) => cm.setValue(value),
        onChange: (fn) => cm.on("change", fn),
        refresh: () => cm.refresh(),
      };
    }
    // Fallback when the CDN is unreachable: a plain textarea.
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) runCode();
      if (event.key === "Tab") {
        event.preventDefault();
        textarea.setRangeText("  ", textarea.selectionStart, textarea.selectionEnd, "end");
      }
    });
    return {
      get: () => textarea.value,
      set: (value) => (textarea.value = value),
      onChange: (fn) => textarea.addEventListener("input", fn),
      refresh: () => {},
    };
  }

  function controlHtml(param) {
    const id = `param-${param.name}`;
    if (param.type === "checkbox") {
      return `<label class="control check" for="${id}">
        <input type="checkbox" id="${id}" data-param="${param.name}" ${param.value ? "checked" : ""}>
        <span>${param.label}</span></label>`;
    }
    if (param.type === "color") {
      return `<label class="control color" for="${id}"><span>${param.label}</span>
        <input type="color" id="${id}" data-param="${param.name}" value="${param.value}"></label>`;
    }
    return `<label class="control" for="${id}">
      <span>${param.label}<output data-for="${param.name}">${param.value}</output></span>
      <input type="range" id="${id}" data-param="${param.name}"
        min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}"></label>`;
  }

  function readControl(input) {
    if (input.type === "checkbox") return input.checked;
    if (input.type === "range") return Number(input.value);
    return input.value;
  }

  function buildControls(painting) {
    $("#controls-painting").innerHTML = painting.params.map(controlHtml).join("");
    $("#controls-style").innerHTML = STYLE_PARAMS.map(controlHtml).join("");
  }

  function setStatus(message, isError = false) {
    const status = $("#status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function draw() {
    try {
      const started = performance.now();
      $("#canvas").innerHTML = Gallery.render(state.draw, state.values);
      const ms = Math.round(performance.now() - started);
      const shapes = $("#canvas").querySelectorAll("g > *").length;
      setStatus(`${shapes.toLocaleString()} shapes · ${ms} ms`);
    } catch (error) {
      setStatus(`Runtime error: ${error.message}`, true);
    }
  }

  function runCode() {
    const source = editor.get();
    try {
      state.draw = Gallery.compile(source);
    } catch (error) {
      setStatus(`Syntax error: ${error.message}`, true);
      return;
    }
    if (source === state.original) storage.clear(state.painting.id);
    else storage.set(state.painting.id, source);
    $("#code-edited").hidden = source === state.original;
    draw();
  }

  function resetParams() {
    state.values = { ...Gallery.defaults(STYLE_PARAMS), ...Gallery.defaults(state.painting.params) };
    buildControls(state.painting);
    draw();
  }

  function download() {
    const blob = new Blob([$("#canvas").innerHTML], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${state.painting.id}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function showStudio(painting) {
    $("#gallery").hidden = true;
    $("#studio").hidden = false;
    document.title = `${painting.title} · Zentangles`;
    $("#studio-title").textContent = painting.title;
    $("#studio-description").textContent = painting.description;

    const original = painting.draw.toString();
    const saved = storage.get(painting.id);
    state = {
      painting,
      original,
      draw: painting.draw,
      values: { ...Gallery.defaults(STYLE_PARAMS), ...Gallery.defaults(painting.params) },
    };
    buildControls(painting);
    editor.set(saved ?? original);
    editor.refresh();
    if (saved) runCode();
    else {
      $("#code-edited").hidden = true;
      draw();
    }
  }

  // ---------- Wiring ----------

  function route() {
    const id = location.hash.replace(/^#\/?/, "");
    const painting = id && Gallery.find(id);
    if (painting) showStudio(painting);
    else showGallery();
    window.scrollTo(0, 0);
  }

  function init() {
    editor = createEditor($("#code"));
    editor.onChange(() => {
      clearTimeout(codeTimer);
      codeTimer = setTimeout(runCode, 500);
    });

    $("#controls").addEventListener("input", (event) => {
      const input = event.target.closest("[data-param]");
      if (!input) return;
      const value = readControl(input);
      state.values[input.dataset.param] = value;
      const output = $(`output[data-for="${input.dataset.param}"]`);
      if (output) output.textContent = value;
      draw();
    });

    $("#run").addEventListener("click", runCode);
    $("#reset-code").addEventListener("click", () => {
      editor.set(state.original);
      runCode();
    });
    $("#reset-params").addEventListener("click", resetParams);
    $("#download").addEventListener("click", download);

    window.addEventListener("hashchange", route);
    route();
  }

  init();
})();
