// Pure helpers for shareable links: variables and edited code in the URL hash.
(function () {
  // Parses "n=6&ink=%23000" into typed, range-checked values; unknown or invalid entries are dropped.
  function parseQuery(params, query) {
    const values = {};
    const search = new URLSearchParams(query);
    for (const param of params) {
      const raw = search.get(param.name);
      if (raw === null) continue;
      if (param.type === "checkbox") values[param.name] = raw === "1";
      else if (param.type === "color") {
        if (/^#[0-9a-f]{6}$/i.test(raw)) values[param.name] = raw;
      } else {
        const n = Number(raw);
        if (raw !== "" && Number.isFinite(n)) values[param.name] = Math.min(param.max, Math.max(param.min, n));
      }
    }
    return values;
  }

  // Encodes only the values that differ from the starting ones.
  function buildQuery(params, values, initial) {
    const search = new URLSearchParams();
    for (const param of params) {
      const value = values[param.name];
      if (value === initial[param.name]) continue;
      search.set(param.name, param.type === "checkbox" ? (value ? "1" : "0") : String(value));
    }
    return search.toString();
  }

  function toBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromBase64Url(text) {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  // Source code -> deflate -> base64url, short enough to live in a link.
  async function encodeCode(source) {
    const stream = new Blob([source]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
  }

  // Inverse of encodeCode; null when the text is not valid encoded code.
  async function decodeCode(text) {
    if (!text) return null;
    try {
      const stream = new Blob([fromBase64Url(text)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(stream).text();
    } catch {
      return null;
    }
  }

  window.Share = { parseQuery, buildQuery, encodeCode, decodeCode };
})();
