// Земеделски субсидии: публичната справка на ДФ „Земеделие“ „Данни за изплатени субсидии за финансова година“
// (seu.dfz.bg, по чл. 98 от Регламент (ЕС) 2021/2116). Справката е формуляр (Oracle APEX) с по 50 реда на страница,
// затова се обхожда с браузър (Playwright) по области, бавно и с нашия User-Agent. Не заобикаля защити (няма такива).
// Пазим само юридическите лица (за физическите лица колоната „Фамилно име“ е попълнена) и само реда „ОБЩО“ за всеки бенефициент.
// Имената в справката са отрязани от ДФЗ до 35 знака; ЕИК не се публикува.
//   node scripts/fetch-dfz.mjs [години, напр. 2024,2025] [мин. сума в лв.]
// Изход: data/dfz/subsidies-<година>.json — { year, minLv, fetched, rows: [[име, област, община, ЕФГЗ, ЕЗФРСР, НБ, общо]] } (в лева, както е в справката)
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";

const YEARS = (process.argv[2] ?? "2024,2025").split(",");
const MIN = process.argv[3] ?? "20000";
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const MINUTES = Number(process.env.MINUTES ?? 300);
const T0 = Date.now();
const URL0 = "https://seu.dfz.bg/seu/f?p=727:8110:::NO:::";
mkdirSync("data/dfz", { recursive: true });

const num = (s) => { const v = Number(String(s ?? "").replace(/\s/g, "").replace(",", ".")); return Number.isFinite(v) ? v : 0; };
async function retry(fn, n = 5) { for (let i = 0; ; i++) { try { return await fn(); } catch (e) { if (i >= n) throw e; await new Promise((r) => setTimeout(r, 1500)); } } }
const browser = await chromium.launch();
const page = await browser.newPage({ userAgent: "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)" });

for (const year of YEARS) {
  const f = `data/dfz/subsidies-${year}.json`;
  const prev = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  const done = new Set(prev?.minLv === MIN ? prev.oblasti ?? [] : []);
  const rows = new Map((prev?.minLv === MIN ? prev.rows : []).map((r) => [r.slice(0, 3).join("\u0001"), r]));
  await page.goto(URL0, { waitUntil: "networkidle" });
  const oblasti = (await page.$$eval("#P8110_OBLAST option", (os) => os.map((o) => o.value))).filter(Boolean);
  for (const ob of oblasti) {
    if (done.has(ob) || (ONLY && !ONLY.has(ob))) continue;
    if ((Date.now() - T0) / 60e3 > MINUTES) break;
    await page.goto(URL0, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await retry(() => page.evaluate(([y, o, m]) => { apex.item("P8110_FORYEAR").setValue(y); apex.item("P8110_OBLAST").setValue(o); apex.item("P8110_AMOUNT_FUND").setValue("TOTAL"); apex.item("P8110_AMOUNT_FTYPE").setValue("GT"); apex.item("P8110_AMOUNT_FILTER").setValue(m); }, [year, ob, MIN]));
    await page.waitForTimeout(1500);
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {}), page.click("button:has-text('Покажи')")]);
    if (process.env.DEBUG) {
      await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(2000);
      console.log("DBG env", await retry(() => page.evaluate(() => JSON.stringify({ gReport: typeof window.gReport, irr: !!(window.apex?.jQuery?.fn?.interactiveReport), regions: [...document.querySelectorAll(".a-IRR-container,[id$=_ir]")].map((x) => x.id), label: document.querySelector(".a-IRR-pagination-label")?.textContent }))));
      await page.route("**/wwv_flow.ajax", async (route) => {
        const pd = route.request().postData() || "";
        const resp = await route.fetch();
        const t = await resp.text();
        console.log("DBG post", pd.slice(0, 700));
        console.log("DBG resp", resp.status(), t.length, JSON.stringify(t.slice(0, 300)), "rows:", (t.match(/<tr/g) || []).length);
        await route.fulfill({ response: resp, body: t });
      });
      const nb = await page.$("button.a-IRR-button--pagination[title='Next']");
      await page.evaluate(() => { const b = document.querySelector("button.a-IRR-button--pagination[title='Next']"); b.setAttribute("data-pagination", "pgR_min_row=1max_rows=5000rows_fetched=5000"); });
      console.log("DBG nb", !!nb); await page.evaluate(() => document.querySelector("button.a-IRR-button--pagination[title='Next']")?.click());
      await page.waitForTimeout(15000);
      console.log("DBG after", await page.$eval(".a-IRR-pagination-label", (x) => x.textContent).catch(() => "?"));
      break;
    }
    let pages = 0, kept = 0;
    for (;;) {
      await page.waitForTimeout(800);
      let got = [];
      for (let k = 0; k < 5; k++) {
        try { got = await page.$$eval("table tr", (trs) => trs.map((tr) => [...tr.cells].map((c) => c.textContent.trim())).filter((r) => r.length >= 18)); break; }
        catch { await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(1500); }
      }
      for (const r of got) {
        if (r[6] !== "ОБЩО") continue; // само обобщението по бенефициент
        if (r[1] && r[1] !== "-") continue; // физическо лице (има фамилия) — не пазим
        rows.set([r[0], r[3], r[4]].join("\u0001"), [r[0], r[3], r[4], num(r[11]), num(r[13]), num(r[15]), num(r[17])]);
        kept++;
      }
      if (pages % 20 === 0) console.log(`  … ${ob}: страница ${pages + 1}, ${rows.size} общо`);
      pages++;
      const next = await page.$("button.a-IRR-button--pagination[title='Next'], button.a-IRR-button--pagination[aria-label='Next'], button.a-IRR-button--pagination[title='Следващ']");
      if (process.env.DEBUG && pages === 1) console.log("DBG", got.length, JSON.stringify(await page.$$eval("button.a-IRR-button--pagination, .a-IRR-pagination-label", (bs) => bs.map((b) => b.outerHTML.slice(0, 160)))), [...new Set(got.map((r) => r[4]))].join(","));
      if (!next || (await next.isDisabled().catch(() => true))) break;
      const before = got.map((r) => r.join("|")).join("\n"); // заглавният ред е еднакъв на всяка страница: сравняваме цялата таблица
      await next.click();
      // страницирането е с AJAX или с презареждане: чакаме таблицата да се смени
      let changed = false;
      for (let k = 0; k < 30; k++) { await page.waitForTimeout(500); const first = await page.$$eval("table tr", (trs) => trs.map((tr) => [...tr.cells].map((c) => c.textContent.trim())).filter((r) => r.length >= 18).map((r) => r.join("|")).join("\n")).catch(() => null); if (first && first !== before) { changed = true; break; } }
      if (!changed || pages > 2000) break; // последната страница или нещо се е объркало
    }
    done.add(ob);
    console.log(`${year} ${ob}: ${pages} стр., ${kept} юридически лица`);
    writeFileSync(f, JSON.stringify({ year, minLv: MIN, fetched: new Date().toISOString().slice(0, 10), oblasti: [...done], complete: done.size === oblasti.length, rows: [...rows.values()] }));
  }
}
await browser.close();
