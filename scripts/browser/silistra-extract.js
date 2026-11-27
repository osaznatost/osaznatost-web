// Изпълнява се в браузъра (Claude in Chrome) на страницата
// https://obs-silistra.com/mandat-2023-2027/zasedaniya/protokoli/ — сайтът показва файловете само на обикновен браузър.
// Сваля текста на всички протоколи (.odt → content.xml) и записва файл silistra-protokoli.json в Downloads.
// Пуска се на фона; напредъкът е в window.SLS.st ({done, total, errs, fin}). После: node scripts/import-silistra.mjs <файла>.
(() => {
  const odtText = async (u) => {
    const b = new Uint8Array(await (await fetch(u)).arrayBuffer());
    const dv = new DataView(b.buffer);
    let e = b.length - 22; while (e > 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true);
    for (let i = 0; i < n; i++) {
      const m = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), fl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(b.slice(p + 46, p + 46 + fl));
      if (name === "content.xml") {
        const lf = dv.getUint16(off + 26, true), lx = dv.getUint16(off + 28, true);
        const data = b.slice(off + 30 + lf + lx, off + 30 + lf + lx + cs);
        const xml = m === 0 ? new TextDecoder().decode(data) : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
        return xml.replace(/<\/text:p>|<\/text:h>|<text:line-break\/>/g, "\n").replace(/<text:tab\/>/g, "\t").replace(/<[^>]+>/g, "")
          .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      }
      p += 46 + fl + xl + cl;
    }
    return null;
  };
  const st = { done: 0, total: 0, errs: [], fin: false };
  window.SLS = { st };
  (async () => {
    const base = "https://obs-silistra.com/mandat-2023-2027/zasedaniya/protokoli/";
    const get = async (u) => { const d = new DOMParser().parseFromString(await (await fetch(u)).text(), "text/html"); return [...d.querySelectorAll('a[href*="wp-content/uploads"]')].map((x) => [x.textContent.trim(), x.href]).filter((h) => /protokol/i.test(h[1])); };
    const all = [];
    for (let pg = 1; pg <= 6; pg++) { const r = await get(pg === 1 ? base : `${base}page/${pg}/`).catch(() => []); if (!r.length) break; all.push(...r); }
    const list = [...new Map(all.map((x) => [x[1], x])).values()];
    st.total = list.length;
    const out = [];
    for (const [label, url] of list) {
      try {
        if (/\.odt$/i.test(url)) out.push({ label, url, text: await odtText(url) });
        else st.errs.push("не е .odt: " + url);
      } catch (e) { st.errs.push(url + " " + e.message); }
      st.done++;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: "application/json" }));
    a.download = "silistra-protokoli.json"; document.body.appendChild(a); a.click();
    st.fin = true;
  })();
  return "started";
})();
