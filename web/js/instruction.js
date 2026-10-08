// LeWitt-style instructions with live blanks, filled from a painting's variables.
//   {n}          the value of n (decimals trimmed to two)
//   {ratio%}     a fraction shown as a percentage
//   {flag?a:b}   text a when flag is on, text b when it is off
(function () {
  const PLACEHOLDER = /\{(\w+)(%|\?([^:}]*):([^}]*))?\}/g;

  function format(value) {
    if (typeof value !== "number") return String(value);
    return String(Math.round(value * 100) / 100);
  }

  // Splits the template into text parts; filled blanks remember which param they came from,
  // and conditional ones are flagged as `choice`.
  function render(template, values) {
    const parts = [];
    let last = 0;
    for (const match of template.matchAll(PLACEHOLDER)) {
      const [whole, name, suffix, ifOn, ifOff] = match;
      if (!(name in values)) continue;
      if (match.index > last) parts.push({ text: template.slice(last, match.index) });
      const value = values[name];
      if (suffix && suffix !== "%") {
        const text = value ? ifOn : ifOff;
        if (text) parts.push({ text, param: name, choice: true });
      } else {
        parts.push({ text: suffix === "%" ? `${Math.round(value * 100)}%` : format(value), param: name });
      }
      last = match.index + whole.length;
    }
    if (last < template.length) parts.push({ text: template.slice(last) });
    return parts;
  }

  function placeholders(template) {
    return new Set([...template.matchAll(PLACEHOLDER)].map((match) => match[1]));
  }

  window.Instruction = { render, placeholders };
})();
