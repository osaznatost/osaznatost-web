// Публичните предприятия (държавните дружества): кой упражнява правата на държавата и кой е в бордовете им.
// Източник: Електронно-информационна система за публичните предприятия на АППК (reports.appk.government.bg).
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const B = "https://reports.appk.government.bg/Public/Public/CompanyDetails/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (u) => { try { return execFileSync("curl", ["-sS", "-L", "--fail", "-m", "40", "-A", "Mozilla/5.0 (osaznatost.bg; отворени данни)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return null; } };
const dec = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x, 16))).replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
const txt = (h) => dec(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<br\s*\/?>|<\/(p|div|li|dd|dt|td|tr|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n");
const between = (t, a, b) => { const i = t.indexOf(a); if (i < 0) return null; const j = t.indexOf(b, i + a.length); return t.slice(i + a.length, j < 0 ? undefined : j).trim(); };
const out = [];
let miss = 0;
for (let id = 1; id <= 1200 && miss < 120; id++) {
  const h = get(B + id);
  await sleep(250);
  const t = h ? txt(h) : "";
  if (!/ЕИК\/Булстат/.test(t)) { miss++; continue; }
  miss = 0;
  const name = dec((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<[^>]+>/g, "")).trim() || (between(t, "Предприятия", "За предприятието") ?? "").split("\n").pop()?.trim();
  const eik = t.match(/ЕИК\/Булстат\s*(\d{9,13})/)?.[1] ?? null;
  const principal = between(t, "Орган, упражняващ правата на държавата", "Членове на органите")?.replace(/\s+/g, " ") ?? null;
  const boardRaw = between(t, "Членове на органите на управление и контрол", "КИД") ?? "";
  const board = boardRaw.split(/\n|,\s*БЪЛГАРИЯ/).map((x) => x.replace(/,?\s*БЪЛГАРИЯ\s*$/i, "").trim()).filter((x) => /^[А-ЯЁ][А-ЯЁ-]+(\s+[А-ЯЁ][А-ЯЁ-]+){1,3}$/.test(x));
  const kind = between(t, "Вид", "Правна форма")?.trim() ?? null;
  const form = between(t, "Правна форма", "Седалище")?.trim() ?? null;
  const town = t.match(/обл\.\s*([^,]+),\s*общ\.\s*([^,]+)/)?.slice(1, 3).map((x) => x.trim()) ?? null;
  const activity = between(t, "КИД 2008", "Категория")?.trim() ?? null;
  const size = between(t, "Категория на предприятието по смисъла на ЗС", "Предмет")?.trim() ?? null;
  out.push({ id, name, eik, kind, form, principal, board, town, activity, size, url: B + id });
}
if (out.length < 100) { console.error("Твърде малко предприятия:", out.length); process.exit(1); }
writeFileSync("data/public-companies.json", JSON.stringify({ source: "АППК, Електронно-информационна система за публичните предприятия", url: "https://reports.appk.government.bg/Public/Public/Companies", updated: new Date().toISOString().slice(0, 10), companies: out }, null, 1));
console.log("Предприятия:", out.length, "с борд:", out.filter((c) => c.board.length).length);
