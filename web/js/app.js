// Gallery and studio views: pick a painting, tweak its params, edit its code.
(function () {
  const { STYLE_PARAMS, HAND_PARAMS } = Gallery;
  const $ = (selector) => document.querySelector(selector);

  const storage = {
    // Kept from the project's former name so visitors keep their saved edits.
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

  // Named presets per painting: every value (style, hand and painting params), never code.
  const presetStorage = {
    key: (id) => `zentangles:presets:${id}`,
    get(id) {
      try {
        return StudioTools.parsePresets(localStorage.getItem(this.key(id)));
      } catch {
        return [];
      }
    },
    set(id, list) {
      try {
        localStorage.setItem(this.key(id), StudioTools.serializePresets(list));
        return true;
      } catch {
        return false;
      }
    },
  };

  // ---------- Gallery ----------

  // Thumbnails render only when a card scrolls near the viewport, and are cached
  // so coming back to the gallery is instant.
  const thumbnails = new Map();
  let thumbnailObserver = null;

  function renderThumbnail(frame) {
    const painting = Gallery.find(frame.dataset.id);
    if (!thumbnails.has(painting.id)) {
      thumbnails.set(painting.id, Gallery.render(painting.draw, Gallery.initialValues(painting)));
    }
    frame.innerHTML = thumbnails.get(painting.id);
  }

  function showGallery() {
    $("#studio").hidden = true;
    $("#gallery").hidden = false;
    toggleFocus(false);
    document.title = "Tangle Machine";
    $("#gallery-count").textContent = `${Gallery.paintings.length} paintings`;
    $("#gallery-grid").innerHTML = Gallery.paintings
      .map(
        (painting) => `
        <a class="card" href="#/${painting.id}">
          <div class="frame thumb" data-id="${painting.id}"></div>
          <h2>${painting.title}</h2>
          <p>${painting.description}</p>
        </a>`
      )
      .join("");

    const frames = document.querySelectorAll("#gallery-grid .thumb");
    if (!("IntersectionObserver" in window)) {
      frames.forEach(renderThumbnail);
      return;
    }
    thumbnailObserver?.disconnect();
    thumbnailObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          renderThumbnail(entry.target);
        }
      },
      { rootMargin: "300px 0px" }
    );
    frames.forEach((frame) => thumbnailObserver.observe(frame));
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
        extraKeys: { "Ctrl-Enter": () => runCode(), "Cmd-Enter": () => runCode() },
      });
      let marked = null;
      return {
        get: () => cm.getValue(),
        set: (value) => cm.setValue(value),
        onChange: (fn) => cm.on("change", fn),
        refresh: () => cm.refresh(),
        markError(line) {
          this.clearError();
          if (line > cm.lineCount()) return;
          marked = cm.addLineClass(line - 1, "background", "cm-error-line");
        },
        clearError() {
          if (marked) cm.removeLineClass(marked, "background", "cm-error-line");
          marked = null;
        },
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
      // The textarea cannot highlight a line; the status bar names it instead.
      markError: () => {},
      clearError: () => {},
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
    if (param.type === "select") {
      const options = param.options.map(
        (option) => `<option value="${option.value}"${option.value === value ? " selected" : ""}>${option.label}</option>`
      );
      return `<label class="control select" for="${id}"><span>${param.label}</span>
        <select id="${id}" data-param="${param.name}">${options.join("")}</select></label>`;
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

  // Not a value of its own: picking a palette rewrites ink, paper and the color params.
  function paletteHtml() {
    const options = StudioTools.PALETTES.map((p) => `<option value="${p.id}">${p.label}</option>`);
    return `<label class="control select" for="palette-preset"><span>Palette</span>
      <select id="palette-preset"><option value="">Apply…</option>${options.join("")}</select></label>`;
  }

  function applyPalette(id) {
    const initial = Gallery.initialValues(state.painting);
    applyValues(StudioTools.applyPalette(state.painting, state.values, id, initial));
    const palette = StudioTools.PALETTES.find((p) => p.id === id);
    if (palette) setStatus(`${palette.label} palette applied`);
  }

  function buildControls(painting, values) {
    const html = (param) => controlHtml(param, values[param.name]);
    $("#controls-painting").innerHTML = painting.params.map(html).join("");
    $("#controls-style").innerHTML = paletteHtml() + STYLE_PARAMS.map(html).join("");
    $("#controls-hand").innerHTML = HAND_PARAMS.map(html).join("");
  }

  function setStatus(message, isError = false) {
    const status = $("#status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  // ---------- URL state ----------

  const allParams = (painting) => [...painting.params, ...STYLE_PARAMS, ...HAND_PARAMS];

  const parseQuery = (painting, query) => Share.parseQuery(allParams(painting), query);
  const buildQuery = (painting, values) =>
    Share.buildQuery(allParams(painting), values, Gallery.initialValues(painting));

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

  // Shows a code error and, when the stack tells, marks its line in the editor.
  function reportError(kind, error) {
    const line = state.draw === state.painting.draw ? null : StudioTools.errorLine(error);
    setStatus(`${kind}: ${error.message}${line ? ` (line ${line})` : ""}`, true);
    if (line) editor?.markError(line);
  }

  function draw() {
    stopReplay();
    editor?.clearError();
    try {
      const started = performance.now();
      $("#canvas").innerHTML = Gallery.render(state.draw, state.values);
      const ms = Math.round(performance.now() - started);
      const shapes = $("#canvas").querySelectorAll("g > *").length;
      setStatus(`${shapes.toLocaleString()} shapes · ${ms} ms`);
    } catch (error) {
      reportError("Runtime error", error);
    }
  }

  // The editor loads lazily, so the current code also lives in state.source.
  const currentSource = () => (editor ? editor.get() : state.source);

  function setSource(source) {
    state.source = source;
    if (editor) editor.set(source);
  }

  function runCode(source = currentSource()) {
    state.source = source;
    try {
      state.draw = Gallery.compile(source);
    } catch (error) {
      editor?.clearError();
      reportError("Syntax error", error);
      return;
    }
    if (source === state.original) storage.clear(state.painting.id);
    else storage.set(state.painting.id, source);
    $("#code-edited").hidden = source === state.original;
    draw();
  }

  const escapeHtml = (text) =>
    text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // The written instruction, with its blanks filled by the current variables.
  function showInstruction() {
    const number = Gallery.paintings.indexOf(state.painting) + 1;
    const parts = Instruction.render(state.painting.instruction || "", state.values);
    $("#studio-instruction").innerHTML =
      `<span class="instruction-label">Instruction #${number}</span> ` +
      parts
        .map(({ text, param, choice }) =>
          param
            ? `<span class="blank${choice ? " choice" : ""}" data-blank="${param}">${escapeHtml(text)}</span>`
            : escapeHtml(text)
        )
        .join("");
  }

  function applyValues(values) {
    state.values = values;
    buildControls(state.painting, state.values);
    showInstruction();
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

  function downloadPng(size = Number($("#png-size").value)) {
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

  // ---------- Replay ----------

  // Running stroke animations; cancelling them shows the finished drawing again.
  let replay = null;

  function stopReplay() {
    if (!replay) return;
    const running = replay;
    replay = null;
    running.forEach((animation) => animation.cancel());
    $("#replay").setAttribute("aria-pressed", "false");
  }

  // Draws the current picture again, stroke by stroke. Only the on-screen elements are
  // animated (Web Animations), so the exported SVG never changes.
  function startReplay() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStatus("Replay is off because your system prefers reduced motion");
      return;
    }
    const shapes = [...$("#canvas").querySelectorAll("path, polyline, polygon, line, circle")].filter(
      (el) => !el.closest("clipPath")
    );
    if (!shapes.length) return;
    const { delay, duration } = StudioTools.replaySchedule(shapes.length);
    replay = shapes.map((el, index) => {
      let length = 0;
      try {
        length = el.getTotalLength();
      } catch {
        /* not measurable: it only fades in */
      }
      const dash = length > 0 ? `${length} ${length}` : "none";
      return el.animate(
        [
          { strokeDasharray: dash, strokeDashoffset: length, fillOpacity: 0 },
          { strokeDasharray: dash, strokeDashoffset: 0, fillOpacity: 1 },
        ],
        { duration, delay: delay(index), easing: "ease-in-out", fill: "backwards" }
      );
    });
    $("#replay").setAttribute("aria-pressed", "true");
    const current = replay;
    current[current.length - 1].finished
      .then(() => {
        if (replay === current) stopReplay();
      })
      .catch(() => {});
  }

  function toggleReplay() {
    if (replay) stopReplay();
    else startReplay();
  }

  // The link carries the variables and, when the code was edited, the code itself.
  async function copyLink() {
    const source = currentSource();
    const search = new URLSearchParams(buildQuery(state.painting, state.values));
    if (source !== state.original) search.set("code", await Share.encodeCode(source));
    const query = search.toString();
    const url = `${location.href.split("#")[0]}#/${state.painting.id}${query ? `?${query}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus(source !== state.original ? "Link with your code copied" : "Link copied to clipboard");
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  // Code from a link is someone else's JavaScript: show it, but run it only on request.
  async function offerSharedCode(painting, encoded) {
    const source = await Share.decodeCode(encoded);
    if (state.painting !== painting) return;
    if (!source) {
      setStatus("The shared code in this link is damaged", true);
      return;
    }
    state.sharedCode = source;
    $("#shared-code").hidden = false;
  }

  function acceptSharedCode() {
    $("#shared-code").hidden = true;
    const source = state.sharedCode;
    state.sharedCode = null;
    setSource(source);
    runCode(source);
  }

  function rejectSharedCode() {
    $("#shared-code").hidden = true;
    state.sharedCode = null;
    updateUrl();
  }

  // ---------- Presets ----------

  function renderPresets(selected = "") {
    const list = presetStorage.get(state.painting.id);
    const options = list.map(
      (p) => `<option${p.name === selected ? " selected" : ""}>${p.name.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)}</option>`
    );
    $("#preset-list").innerHTML = `<option value="">${list.length ? "Load preset…" : "No presets yet"}</option>${options.join("")}`;
    $("#delete-preset").disabled = !selected;
  }

  function savePreset() {
    const name = window.prompt("Name for this preset:", $("#preset-list").value);
    if (name === null || !name.trim()) return;
    const list = StudioTools.savePreset(presetStorage.get(state.painting.id), name, state.values);
    if (!presetStorage.set(state.painting.id, list)) {
      setStatus("Presets cannot be saved in this browser", true);
      return;
    }
    renderPresets(name.trim());
    setStatus(`Preset "${name.trim()}" saved`);
  }

  function loadPreset(name) {
    $("#delete-preset").disabled = !name;
    const preset = presetStorage.get(state.painting.id).find((p) => p.name === name);
    if (!preset) return;
    const values = StudioTools.presetValues(allParams(state.painting), preset.values);
    applyValues({ ...Gallery.initialValues(state.painting), ...values });
    setStatus(`Preset "${name}" loaded`);
  }

  function deletePreset() {
    const name = $("#preset-list").value;
    if (!name || !window.confirm(`Delete the preset "${name}"?`)) return;
    presetStorage.set(state.painting.id, StudioTools.deletePreset(presetStorage.get(state.painting.id), name));
    renderPresets();
    setStatus(`Preset "${name}" deleted`);
  }

  // ---------- Pen help ----------

  function buildPenHelp() {
    const item = (entry) => `<dt><code>${entry.signature}</code></dt><dd>${entry.description}</dd>`;
    $("#pen-help").innerHTML =
      `<h4>pen</h4><dl>${StudioTools.PEN_HELP.map(item).join("")}</dl>` +
      `<h4>Style and shared values</h4><dl>${StudioTools.STYLE_HELP.map(item).join("")}</dl>`;
  }

  function togglePenHelp() {
    const panel = $("#pen-help");
    panel.hidden = !panel.hidden;
    $("#pen-help-toggle").setAttribute("aria-expanded", String(!panel.hidden));
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
    document.title = `${painting.title} · Tangle Machine`;
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
    $("#shared-code").hidden = true;
    buildControls(painting, state.values);
    showInstruction();
    renderPresets();
    setSource(saved ?? original);
    if (saved) runCode(saved);
    else {
      $("#code-edited").hidden = true;
      draw();
    }
    ensureEditor().then(() => {
      if (state.painting !== painting) return;
      editor.set(state.source);
      editor.refresh();
    });
    const shared = new URLSearchParams(query).get("code");
    if (shared) offerSharedCode(painting, shared);
  }

  // Focus mode hides the panels so the canvas fills the window.
  function toggleFocus(on = !document.body.classList.contains("focus")) {
    document.body.classList.toggle("focus", on);
    $("#focus").setAttribute("aria-pressed", String(on));
  }

  // ---------- Wiring ----------

  function route() {
    const [id, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
    const painting = id && Gallery.find(id);
    if (painting) showStudio(painting, query);
    else showGallery();
    window.scrollTo(0, 0);
  }

  // CodeMirror is only needed in the studio, so it is fetched on the first visit there.
  // If the CDN is slow or down, the editor falls back to a plain textarea.
  const CODEMIRROR = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/";
  let editorReady = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function ensureEditor() {
    if (!editorReady) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = `${CODEMIRROR}codemirror.min.css`;
      document.head.appendChild(css);
      const load = loadScript(`${CODEMIRROR}codemirror.min.js`).then(() =>
        loadScript(`${CODEMIRROR}mode/javascript/javascript.min.js`)
      );
      const timeout = new Promise((_, reject) => setTimeout(reject, 5000));
      editorReady = Promise.race([load, timeout])
        .catch(() => {})
        .then(() => {
          editor = createEditor($("#code"));
          editor.onChange(() => {
            if (editor.get() === state.source) return;
            clearTimeout(codeTimer);
            codeTimer = setTimeout(() => runCode(editor.get()), 500);
          });
        });
    }
    return editorReady;
  }

  function init() {

    $("#controls").addEventListener("change", (event) => {
      if (event.target.id === "palette-preset" && event.target.value) applyPalette(event.target.value);
    });

    $("#controls").addEventListener("input", (event) => {
      const input = event.target.closest("[data-param]");
      if (!input) return;
      const value = readControl(input);
      // Dark and kraft paper come with their own colors, so the color controls must follow.
      if (input.dataset.param === "paperTexture") {
        applyValues(StudioTools.textureValues(state.values, value));
        return;
      }
      state.values[input.dataset.param] = value;
      showInstruction();
      const output = $(`output[data-for="${input.dataset.param}"]`);
      if (output) output.textContent = value;
      updateUrl();
      scheduleDraw();
    });

    $("#run").addEventListener("click", () => runCode());
    $("#reset-code").addEventListener("click", () => {
      setSource(state.original);
      runCode(state.original);
    });
    $("#reset-params").addEventListener("click", resetParams);
    $("#randomize").addEventListener("click", randomize);
    $("#copy-link").addEventListener("click", copyLink);
    $("#accept-code").addEventListener("click", acceptSharedCode);
    $("#reject-code").addEventListener("click", rejectSharedCode);
    $("#download-svg").addEventListener("click", downloadSvg);
    $("#download-png").addEventListener("click", () => downloadPng());
    $("#focus").addEventListener("click", () => toggleFocus());
    $("#replay").addEventListener("click", toggleReplay);
    $("#save-preset").addEventListener("click", savePreset);
    $("#delete-preset").addEventListener("click", deletePreset);
    $("#preset-list").addEventListener("change", (event) => loadPreset(event.target.value));
    $("#pen-help-toggle").addEventListener("click", togglePenHelp);
    buildPenHelp();
    $("#png-size").innerHTML = StudioTools.PNG_SIZES.map(
      (s) => `<option value="${s.size}"${s.default ? " selected" : ""}>${s.label}</option>`
    ).join("");

    // Capture phase, so the shortcut wins over the code editor's own key handling.
    document.addEventListener(
      "keydown",
      (event) => {
        if ($("#studio").hidden) return;
        if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s") {
          event.preventDefault();
          downloadSvg();
        }
      },
      true
    );

    // Arrow keys browse paintings, unless the user is typing or sliding.
    document.addEventListener("keydown", (event) => {
      if ($("#studio").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Escape" && document.body.classList.contains("focus")) toggleFocus(false);
      if (event.target.closest("input, textarea, select, .CodeMirror")) return;
      if (event.key === "ArrowLeft") location.hash = `#/${neighbour(-1).id}`;
      if (event.key === "ArrowRight") location.hash = `#/${neighbour(1).id}`;
      if (event.key === "f" || event.key === "F") toggleFocus();
    });

    window.addEventListener("hashchange", route);
    route();
  }

  init();
})();
