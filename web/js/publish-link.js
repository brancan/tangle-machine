// Builds the "Publish to gallery" link: a prefilled GitHub Discussion in the Gallery category.
// Pure: it only reads the href it is given, so it runs in the browser and in tests.
(function () {
  const SITE = "https://brancan.github.io/tangle-machine/";
  const NEW_DISCUSSION = "https://github.com/brancan/tangle-machine/discussions/new";
  const MAX_URL = 7500;

  // Any local or deployed address -> the canonical site address with the same hash.
  function canonicalLink(href) {
    const hash = new URL(href).hash;
    return SITE + hash;
  }

  function discussionUrl(title, body) {
    const search = new URLSearchParams({ category: "show-and-tell", title: `${title} variant`, body });
    return `${NEW_DISCUSSION}?${search}`;
  }

  const NOTE =
    "Made with Tangle Machine. The first Tangle Machine link in this post is what the public " +
    "gallery shows; add a few words about your variant below.";

  const PASTE =
    "PASTE YOUR LINK HERE: in the studio, press Copy link (it packs your edited code into the " +
    "link) and paste it on this line.";

  // edited: the code in the studio differs from the original, so the address bar lacks it.
  function build({ href, title, edited = false }) {
    if (!edited) {
      const url = discussionUrl(title, `${canonicalLink(href)}\n\n${NOTE}\n`);
      if (url.length <= MAX_URL) return url;
    }
    return discussionUrl(title, `${PASTE}\n\n${NOTE}\n`);
  }

  window.PublishLink = { SITE, canonicalLink, build };
})();
