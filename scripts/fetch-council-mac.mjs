// Сваля файловете с решения на общински съвети, чиито сайтове отговарят само на български IP (върви на Mac-а).
// Засега: Благоевград. Пише out/BLG03/index.json + новите файлове; разчитането е в import-council-sites.mjs (BLG_DIR).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app; отворени данни)";
const curl = (u, out) => { for (let i = 0; i < 3; i++) { try { return execFileSync("curl", ["-sSLf", "-m", "120", "-A", UA, ...(out ? ["-o", out] : []), u], { maxBuffer: 1 << 28 }); } catch { execFileSync("sleep", ["5"]); } } return null; };
const nd = (h) => { const m = h?.toString("utf8").match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); return m ? JSON.parse(m[1]) : null; };
const dir = "out/BLG03"; mkdirSync(dir, { recursive: true });
const known = existsSync("data/council/BLG03.json") ? JSON.parse(readFileSync("data/council/BLG03.json", "utf8")).files ?? {} : {};
const menu = nd(curl("https://blagoevgrad.bg/header-menu/resheniia-na-obshtinski-suvet"));
if (!menu) { console.log("Благоевград: менюто не се зареди"); process.exit(0); }
const leaves = []; const walk = (xs) => xs.forEach((x) => { if (/resheni.*20(2[3-9])/.test(x.slug) && !(x.children ?? []).length) leaves.push(x); walk(x.children ?? []); });
walk(menu.props.headerItems);
const index = [];
for (const c of leaves) {
  const p = nd(curl(`https://blagoevgrad.bg/category/${c.id}/${c.slug}`))?.props?.pageProps;
  const html = p?.item?.content ?? "";
  for (const m of html.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const link = m[1].match(/href="(https:\/\/admin\.blagoevgrad\.bg\/ckeditor_assets\/attachments\/\d+\/[^"]+)"/);
    if (!link) continue;
    const label = m[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    index.push({ url: link[1], label, page: `https://blagoevgrad.bg/category/${c.id}/${c.slug}` });
  }
}
let got = 0;
for (const [i, e] of index.entries()) {
  if (e.url in known) continue;
  const ext = (e.url.match(/\.(pdf|docx|doc)$/i)?.[1] ?? "bin").toLowerCase();
  e.file = `${i}.${ext}`;
  if (curl(e.url, `${dir}/${e.file}`)) got++; else delete e.file;
}
writeFileSync(`${dir}/index.json`, JSON.stringify(index, null, 1));
console.log(`Благоевград: ${leaves.length} страници, ${index.length} файла в списъка, свалени нови ${got}`);
