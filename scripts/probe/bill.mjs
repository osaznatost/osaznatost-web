const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/bg/bills", Accept: "application/json" };
const j = async (u) => (await fetch(`https://www.parliament.bg/api/v1/${u}`, { headers: H })).json();
const s = await j("com-stan/3807/22614");
console.log("STANDP", JSON.stringify(s).slice(0, 1500));
const b = await j("bill/166945");
console.log("STAN_LIST", JSON.stringify(b.stan_list).slice(0, 800));
console.log("FILE", JSON.stringify(b.file_list));
const r = await fetch("https://www.parliament.bg/bills/52/52-654-01-8.pdf"); const buf = Buffer.from(await r.arrayBuffer());
console.log("PDF head", buf.slice(0, 1200).toString("latin1").replace(/[^\x20-\x7e]/g, "."));
import { writeFileSync } from "node:fs"; import { execFileSync } from "node:child_process";
writeFileSync("/tmp/b.pdf", buf);
try { console.log("PDFINFO", execFileSync("pdfinfo", ["/tmp/b.pdf"]).toString()); console.log("TXT", execFileSync("pdftotext", ["-l", "2", "/tmp/b.pdf", "-"]).toString().slice(0, 500)); } catch (e) { console.log("ERR", e.message); }
const b2 = await j("bill/167400"); console.log("B2", b2?.L_ActL_title, JSON.stringify(b2?.file_list), JSON.stringify(b2?.stan_list)?.slice(0, 300));
