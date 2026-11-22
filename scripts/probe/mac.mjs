import { execFileSync } from "node:child_process"; import { mkdirSync, writeFileSync } from "node:fs";
const UA = "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)"; mkdirSync("out", { recursive: true });
const curl = (u, o) => { try { return execFileSync("curl", ["-sSL", "-m", "90", "-A", UA, ...(o ? ["-o", o] : []), u], { maxBuffer: 1 << 27 }).toString("utf8"); } catch (e) { console.log("## ERR", u); return ""; } };
const nd = (h) => JSON.parse(h.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
try { const c = nd(curl("https://blagoevgrad.bg/category/397/arhiv-na-resheniia-2024")).props.pageProps.item.content; writeFileSync("out/blg2024.html", c.slice(0, 5000)); } catch (e) { console.log("## blg2024", e.message); }
curl("https://admin.blagoevgrad.bg/ckeditor_assets/attachments/53346/R-482-_31.10.2025_g.-1.pdf", "out/r482.pdf");
curl("https://admin.blagoevgrad.bg/ckeditor_assets/attachments/53119/R-481-_05.10.2025_g..docx", "out/r481.docx");
curl("https://kyustendil.bg/index.php?option=com_jdownloads&view=download&id=5403&catid=9&lang=bg", "out/knl14.bin");
const z = curl("https://obs.kyustendil.bg/zasedaniaobs"); writeFileSync("out/knlz.html", [...z.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,140}?)<\/a>/g)].map((m) => m[1] + " | " + m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).join("\n"));
const p = curl("https://www.plovdiv.bg/%d0%be%d0%b1%d1%89%d0%b8%d0%bd%d1%81%d0%ba%d0%b8-%d1%81%d1%8a%d0%b2%d0%b5%d1%82/"); writeFileSync("out/pdv.html", [...p.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,140}?)<\/a>/g)].map((m) => m[1] + " | " + m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((x) => /plovdiv|^\//.test(x)).slice(0, 150).join("\n"));
