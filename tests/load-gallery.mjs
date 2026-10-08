// Loads the browser scripts of the gallery into a sandbox, exactly as index.html does.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

export const WEB = new URL("../web/", import.meta.url).pathname;

export function scriptsFromIndex() {
  const html = readFileSync(join(WEB, "index.html"), "utf8");
  return [...html.matchAll(/<script src="((?:js|paintings)\/[^"]+)"/g)].map((m) => m[1]);
}

export function loadGallery() {
  const context = {
    window: {},
    Math,
    console,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Blob,
    Response,
    CompressionStream,
    DecompressionStream,
    btoa,
    atob,
  };
  vm.createContext(context);
  // app.js wires the DOM; everything else is pure and runs headless.
  for (const file of scriptsFromIndex().filter((f) => f !== "js/app.js")) {
    vm.runInContext(readFileSync(join(WEB, file), "utf8"), context, { filename: file });
    // Painting scripts call the global `Gallery`, which the browser exposes via window.
    if (context.window.Gallery && !context.Gallery) context.Gallery = context.window.Gallery;
  }
  return context.window;
}
