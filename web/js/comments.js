// Comments below the studio (Giscus, one GitHub Discussion per painting) and the
// "Publish to gallery" button. Reads only location and the DOM; app.js stays untouched.
(function () {
  if (typeof document === "undefined") return;

  // Filled in once Discussions and the giscus app are set up (see README, "Public gallery and comments").
  const GISCUS_CONFIG = {
    repo: "brancan/tangle-machine",
    repoId: "R_kgDOVAPagg",
    category: "Announcements",
    categoryId: "DIC_kwDOVAPags4DHTj4",
  };

  const $ = (selector) => document.querySelector(selector);
  const section = $("#comments");
  if (!section) return;
  let currentId = null;

  function paintingFromHash() {
    const id = location.hash.replace(/^#\/?/, "").split("?")[0];
    return (id && window.Gallery?.find(id)) || null;
  }

  function loadGiscus(id) {
    const container = $("#giscus");
    container.replaceChildren();
    if (!GISCUS_CONFIG.repoId || !GISCUS_CONFIG.categoryId) {
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = "Comments are not configured yet.";
      container.append(note);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    const data = {
      repo: GISCUS_CONFIG.repo,
      repoId: GISCUS_CONFIG.repoId,
      category: GISCUS_CONFIG.category,
      categoryId: GISCUS_CONFIG.categoryId,
      mapping: "specific",
      term: `painting:${id}`,
      strict: "1",
      reactionsEnabled: "1",
      emitMetadata: "0",
      inputPosition: "top",
      // The site follows the system color scheme, so giscus does too.
      theme: "preferred_color_scheme",
      lang: "en",
      loading: "lazy",
    };
    for (const [key, value] of Object.entries(data)) script.dataset[key] = value;
    container.append(script);
  }

  function publish() {
    const painting = paintingFromHash();
    if (!painting) return;
    // The edited badge means the address bar lacks the code: the visitor pastes a Copy link link instead.
    const edited = $("#code-edited")?.hidden === false;
    const note = $("#publish-note");
    note.hidden = !edited;
    note.textContent = edited
      ? "Your code is edited: press Copy link above, then paste the link where the new post asks for it."
      : "";
    window.open(PublishLink.build({ href: location.href, title: painting.title, edited }), "_blank", "noopener");
  }

  function update() {
    const painting = paintingFromHash();
    section.hidden = !painting;
    if (!painting) {
      currentId = null;
      return;
    }
    if (painting.id === currentId) return;
    currentId = painting.id;
    $("#publish-note").hidden = true;
    loadGiscus(painting.id);
  }

  $("#publish-gallery").addEventListener("click", publish);
  window.addEventListener("hashchange", update);
  update();
})();
