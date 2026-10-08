// Public gallery: renders showcase.json (built from the "Show and tell" Discussions at deploy time).
// Thumbnails always use the original registered painting with the entry's params; shared code
// (code=) is never run here, the studio's "Run shared code" gate handles it.
// The painting scripts are read from index.html, so the studio's list is the only one to maintain.
(function () {
  const $ = (selector) => document.querySelector(selector);
  const SITE = "https://brancan.github.io/tangle-machine/";
  const AVATAR = /^https:\/\/([a-z0-9-]+\.)*(githubusercontent\.com|github\.com)\//;
  const PAINTING_SCRIPT = /<script src="(paintings\/[a-z0-9-]+\.js)"/g;

  // Painting script paths in index.html, in page order; anything but a plain local file is ignored.
  function paintingScripts(html) {
    return [...String(html).matchAll(PAINTING_SCRIPT)].map((m) => m[1]);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`could not load ${src}`));
      document.body.append(script);
    });
  }

  async function loadPaintings() {
    const response = await fetch("index.html", { cache: "no-cache" });
    if (!response.ok) throw new Error(String(response.status));
    for (const src of paintingScripts(await response.text())) await loadScript(src);
  }

  function allParams(painting) {
    return [...Gallery.STYLE_PARAMS, ...Gallery.HAND_PARAMS, ...painting.params];
  }

  // Share.parseQuery types, clamps and validates every value, so the SVG only gets safe numbers and colors.
  function thumbnail(painting, params) {
    const query = new URLSearchParams(params).toString();
    const values = { ...Gallery.initialValues(painting), ...Share.parseQuery(allParams(painting), query) };
    return Gallery.render(painting.draw, values);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function link(text, href) {
    const a = element("a", null, text);
    a.href = href;
    return a;
  }

  function formatDate(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
  }

  // Entries come from user posts: everything is checked again here and written with textContent.
  function card(entry) {
    const painting = typeof entry?.paintingId === "string" && Gallery.find(entry.paintingId);
    const studio = typeof entry?.link === "string" && entry.link.startsWith(SITE) ? entry.link : null;
    if (!painting || !studio) return null;

    const node = element("article", "card showcase-card");
    const frame = element("a", "frame thumb");
    frame.href = `index.html${studio.slice(studio.indexOf("#"))}`;
    frame.setAttribute("aria-label", `Open ${painting.title} in the studio`);
    frame.dataset.pending = "1";
    frame._render = () => {
      try {
        frame.innerHTML = thumbnail(painting, entry.params || {});
      } catch {
        frame.innerHTML = thumbnail(painting, {});
      }
    };
    node.append(frame);

    const title = element("h2", null, String(entry.title || painting.title));
    if (entry.hasCode) {
      const badge = element("span", "showcase-badge", "custom code");
      badge.title = "This variant includes edited code. The studio asks before running it.";
      title.append(badge);
    }
    node.append(title);

    const meta = element("p", "showcase-meta");
    const login = String(entry.author?.login || "ghost");
    if (AVATAR.test(entry.author?.avatarUrl || "")) {
      const avatar = element("img");
      avatar.src = entry.author.avatarUrl;
      avatar.alt = "";
      avatar.loading = "lazy";
      avatar.referrerPolicy = "no-referrer";
      meta.append(avatar);
    }
    const date = formatDate(entry.createdAt);
    meta.append(element("span", null, [login, painting.title, date].filter(Boolean).join(" · ")));
    node.append(meta);

    const links = element("p", "showcase-links");
    links.append(link(entry.hasCode ? "Open in studio (custom code)" : "Open in studio", frame.href));
    if (typeof entry.url === "string" && entry.url.startsWith("https://github.com/")) {
      const comments = link("Comments on GitHub", entry.url);
      comments.rel = "noopener";
      links.append(comments);
    }
    node.append(links);
    return node;
  }

  function renderLazily(frames) {
    const draw = (frame) => {
      if (!frame.dataset.pending) return;
      delete frame.dataset.pending;
      frame._render();
    };
    if (!("IntersectionObserver" in window)) return frames.forEach(draw);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          draw(entry.target);
        }
      },
      { rootMargin: "300px 0px" }
    );
    frames.forEach((frame) => observer.observe(frame));
  }

  function setState(message) {
    $("#showcase-state").textContent = message;
    $("#showcase-state").hidden = !message;
  }

  async function init() {
    let entries;
    try {
      const response = await fetch("showcase.json", { cache: "no-cache" });
      if (!response.ok) throw new Error(String(response.status));
      entries = await response.json();
      if (!Array.isArray(entries)) throw new Error("not a list");
      if (entries.length) await loadPaintings();
    } catch {
      setState("The gallery could not be loaded right now. Try again later.");
      return;
    }
    const cards = entries.map(card).filter(Boolean);
    if (!cards.length) {
      setState("No variants yet. Open any painting in Tangle Machine and press Publish to gallery to be the first.");
      return;
    }
    setState("");
    $("#showcase-count").textContent = `${cards.length} ${cards.length === 1 ? "variant" : "variants"}`;
    $("#showcase-grid").replaceChildren(...cards);
    renderLazily(cards.map((node) => node.querySelector(".thumb")));
  }

  window.Showcase = { paintingScripts };
  // Headless (tests) there is no page to render.
  if (typeof document !== "undefined") init();
})();
