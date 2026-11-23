// Прост RTF → текст (без външни програми): законопроектите на Министерския съвет в parliament.bg са .rtf.
// Поддържа \'hh (windows-1251), \uN, \par/\line, групи с невидимо съдържание (fonttbl, pict, info и др.).
const SKIP = /^(fonttbl|colortbl|stylesheet|info|pict|object|header|footer|headerl|headerr|footerl|footerr|listtable|listoverridetable|rsidtbl|xmlnstbl|themedata|colorschememapping|latentstyles|datastore|generator|mmathPr|pgdsctbl|filetbl|revtbl)$/;
const dec = new TextDecoder("windows-1251");
export function rtfToText(src) {
  let out = "", i = 0, uc = 1, pendingSkip = 0;
  const stack = []; let skip = false;
  const bytes = [];
  const flush = () => { if (bytes.length) { out += dec.decode(Uint8Array.from(bytes)); bytes.length = 0; } };
  const emit = (s) => { if (!skip) { flush(); out += s; } };
  while (i < src.length) {
    const c = src[i];
    if (c === "{") { stack.push(skip); i++; if (src.startsWith("\\*", i)) { skip = true; } continue; }
    if (c === "}") { flush(); skip = stack.pop() ?? false; i++; continue; }
    if (c === "\\") {
      const n = src[i + 1];
      if (n === "'") { const h = parseInt(src.substr(i + 2, 2), 16); if (pendingSkip) pendingSkip--; else if (!skip) bytes.push(h); i += 4; continue; }
      if (n === "\\" || n === "{" || n === "}") { emit(n); i += 2; continue; }
      if (n === "~") { emit(" "); i += 2; continue; }
      if (n === "-" || n === "_") { i += 2; continue; }
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(src.slice(i, i + 40));
      if (!m) { i += 2; continue; }
      i += m[0].length;
      const w = m[1], arg = m[2] !== undefined ? Number(m[2]) : null;
      if (SKIP.test(w)) { skip = true; continue; }
      if (w === "uc") uc = arg ?? 1;
      else if (w === "u") { emit(String.fromCharCode(arg < 0 ? arg + 65536 : arg)); pendingSkip = uc; }
      else if (w === "par" || w === "line" || w === "sect" || w === "page") emit("\n");
      else if (w === "tab" || w === "cell") emit(" ");
      else if (w === "row") emit("\n");
      continue;
    }
    if (c === "\r" || c === "\n") { i++; continue; }
    if (pendingSkip) { pendingSkip--; i++; continue; }
    emit(c); i++;
  }
  flush();
  return out.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}
