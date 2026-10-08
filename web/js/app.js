// Gallery and studio views: pick a painting, tweak its params, edit its code.
(function () {
  const { STYLE_PARAMS, HAND_PARAMS } = Gallery;
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
    document.title = "Zentangles";
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
    $("#shared-code").hidden = true;
    buildControls(painting, state.values);
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
