// Pure helpers for animation and gallery tags.
(function () {
  // The shared tag vocabulary; every painting picks one or more.
  const TAGS = ["geometric", "organic", "paradox", "op-art", "tessellation", "radial", "random", "color", "animated"];

  // A variable swinging smoothly from its minimum to its maximum and back, once per period,
  // snapped to its slider step so the instruction shows the same value as the control.
  function oscillate(param, seconds, period) {
    const wave = 0.5 - 0.5 * Math.cos((2 * Math.PI * seconds) / period);
    const raw = param.min + (param.max - param.min) * wave;
    const snapped = param.min + Math.round((raw - param.min) / param.step) * param.step;
    return Number(Math.min(param.max, Math.max(param.min, snapped)).toFixed(6));
  }

  function filterByTag(paintings, tag) {
    return tag ? paintings.filter((painting) => (painting.tags || []).includes(tag)) : paintings;
  }

  window.Motion = { TAGS, oscillate, filterByTag };
})();
