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
    $("#gallery-count").textContent = `${Gallery.paintings.length} paintings`;
    $("#gallery-grid").innerHTML = Gallery.paintings
      .map(
        (painting) => `
        <a class="card" href="#/${painting.id}">
          <div class="frame">${Gallery.render(painting.draw, Gallery.initialValues(painting))}</div>
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

  function controlHtml(param, value) {
    const id = `param-${param.name}`;
    if (param.type === "checkbox") {
      return `<label class="control check" for="${id}">
        <input type="checkbox" id="${id}" data-param="${param.name}" ${value ? "checked" : ""}>
        <span>${param.label}</span></label>`;
    }
    if (param.type === "color") {
      return `<label class="control color" for="${id}"><span>${param.label}</span>
        <input type="color" id="${id}" data-param="${param.name}" value="${value}"></label>`;
    }
    return `<label class="control" for="${id}">
      <span>${param.label}<output data-for="${param.name}">${value}</output></span>
      <input type="range" id="${id}" data-param="${param.name}"
        min="${param.min}" max="${param.max}" step="${param.step}" value="${value}"></label>`;
  }

  function readControl(input) {
    if (input.type === "checkbox") return input.checked;
    if (input.type === "range") return Number(input.value);
    return input.value;
  }

  function buildControls(painting, values) {
    const html = (param) => controlHtml(param, values[param.name]);
    $("#controls-painting").innerHTML = painting.params.map(html).join("");
    $("#controls-style").innerHTML = STYLE_PARAMS.map(html).join("");
  }

  function setStatus(message, isError = false) {
    const status = $("#status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  // ---------- URL state ----------

  const allParams = (painting) => [...painting.params, ...STYLE_PARAMS];

  // Parses "n=6&ink=%23000" into typed, range-checked values for this painting.
  function parseQuery(painting, query) {
    const values = {};
    const search = new URLSearchParams(query);
    for (const param of allParams(painting)) {
      const raw = search.get(param.name);
      if (raw === null) continue;
      if (param.type === "checkbox") values[param.name] = raw === "1";
      else if (param.type === "color") {
        if (/^#[0-9a-f]{6}$/i.test(raw)) values[param.name] = raw;
      } else {
        const n = Number(raw);
        if (Number.isFinite(n)) values[param.name] = Math.min(param.max, Math.max(param.min, n));
      }
    }
    return values;
  }

  // Encodes only the values that differ from the painting's starting values.
  function buildQuery(painting, values) {
    const initial = Gallery.initialValues(painting);
    const search = new URLSearchParams();
    for (const param of allParams(painting)) {
      const value = values[param.name];
      if (value === initial[param.name]) continue;
      search.set(param.name, param.type === "checkbox" ? (value ? "1" : "0") : String(value));
    }
    return search.toString();
  }

  function updateUrl() {
    const query = buildQuery(state.painting, state.values);
    history.replaceState(null, "", `#/${state.painting.id}${query ? `?${query}` : ""}`);
  }

  let frame = 0;
  function scheduleDraw() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
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

  function applyValues(values) {
    state.values = values;
    buildControls(state.painting, state.values);
    updateUrl();
    draw();
  }

  function resetParams() {
    applyValues(Gallery.initialValues(state.painting));
  }

  // Random value for every painting variable, snapped to its slider step.
  function randomize() {
    const values = { ...state.values };
    for (const param of state.painting.params) {
      if (param.type === "checkbox") values[param.name] = Math.random() < 0.5;
      if (param.type === "range") {
        const steps = Math.round((param.max - param.min) / param.step);
        const value = param.min + Math.floor(Math.random() * (steps + 1)) * param.step;
        values[param.name] = Number(value.toFixed(6));
      }
    }
    applyValues(values);
  }

  function save(blob, extension) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${state.painting.id}.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function downloadSvg() {
    save(new Blob([$("#canvas").innerHTML], { type: "image/svg+xml" }), "svg");
  }

  function downloadPng(size = 2000) {
    const url = URL.createObjectURL(new Blob([$("#canvas").innerHTML], { type: "image/svg+xml" }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      canvas.getContext("2d").drawImage(image, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => save(blob, "png"), "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus("Could not export PNG", true);
    };
    image.src = url;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setStatus("Link copied to clipboard");
    } catch {
      window.prompt("Copy this link:", location.href);
    }
  }

  // Wraps around: the last painting's "next" is the first one.
  function neighbour(offset) {
    const list = Gallery.paintings;
    const index = list.indexOf(state.painting);
    return list[(index + offset + list.length) % list.length];
  }

  function showStudio(painting, query) {
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
      values: { ...Gallery.initialValues(painting), ...parseQuery(painting, query) },
    };
    $("#prev").href = `#/${neighbour(-1).id}`;
    $("#prev").textContent = `← ${neighbour(-1).title}`;
    $("#next").href = `#/${neighbour(1).id}`;
    $("#next").textContent = `${neighbour(1).title} →`;
    buildControls(painting, state.values);
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
    const [id, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
    const painting = id && Gallery.find(id);
    if (painting) showStudio(painting, query);
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
      updateUrl();
      scheduleDraw();
    });

    $("#run").addEventListener("click", runCode);
    $("#reset-code").addEventListener("click", () => {
      editor.set(state.original);
      runCode();
    });
    $("#reset-params").addEventListener("click", resetParams);
    $("#randomize").addEventListener("click", randomize);
    $("#copy-link").addEventListener("click", copyLink);
    $("#download-svg").addEventListener("click", downloadSvg);
    $("#download-png").addEventListener("click", () => downloadPng());

    // Arrow keys browse paintings, unless the user is typing or sliding.
    document.addEventListener("keydown", (event) => {
      if ($("#studio").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target.closest("input, textarea, .CodeMirror")) return;
      if (event.key === "ArrowLeft") location.hash = `#/${neighbour(-1).id}`;
      if (event.key === "ArrowRight") location.hash = `#/${neighbour(1).id}`;
    });

    window.addEventListener("hashchange", route);
    route();
  }

  init();
})();
