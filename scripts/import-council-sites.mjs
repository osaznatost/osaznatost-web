// Решения на общински съвети, четени директно от сайтовете им (за общини, които „Наясно“ не покрива).
// Засега: Ботевград (годишни PDF-и с всички решения) и Столична община (по един PDF на решение, номериран). Всяко решение: номер, дата, кой докладва, по какъв въпрос, гласуване (за/против/въздържал се,
// дали е поименно) и текстът на решението. Нужен е pdftotext (poppler-utils).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (osaznatost.bg; open data)" };
const SITES = {
  // Общински съвет Варна: един PDF „РЕШЕНИЯ № <заседание> от <дата>“ на заседание; решенията са „<номер>-<точка>.“.
  VAR06: { name: "Варна", sessionPdfs: "https://varnacouncil.bg/reshenija-na-obshtinski-savet-varna-mandat-2023-2027/", pdfLink: /href="(https:\/\/varnacouncil\.bg\/wp-content\/uploads\/[^"]*?РЕШЕНИЯ[^"]*?\.pdf)"/g, from: "2023-11-01", parse: "varna" },
  // Общински съвет Стара Загора: страница на протокол със списък „Решение № N от ДД.ММ.ГГГГг. относно: …“ и PDF на всяко решение.
  SZR31: { name: "Стара Загора", listPages: (p) => `https://www.starazagora.bg/bg/resheniya-i-protokoli${p > 0 ? `/page/${p * 20}` : ""}`, protoLink: /href="(bg\/resheniya-i-protokoli\/resheniya-ot-protokol-[^"#]+)"/g, base: "https://www.starazagora.bg/", from: "2023-11-01" },
  // Общински съвет Русе (WordPress): всяко решение е отделна публикация „РЕШЕНИЕ № N Прието с Протокол № P/ДД.ММ.ГГГГг.“.
  RSE27: { name: "Русе", wpList: (p) => `https://obs.ruse-bg.eu/category/%d1%80%d0%b5%d1%88%d0%b5%d0%bd%d0%b8%d1%8f/${p > 1 ? `page/${p}/` : ""}`, wpPost: /href="(https:\/\/obs\.ruse-bg\.eu\/%d1%80%d0%b5%d1%88%d0%b5%d0%bd%d0%b8%d0%b5-%e2%84%96-\d+[^"]*)"/gi, from: "2023-11-01", council: "Общински съвет – Русе" },
  // Общински съвет Шумен: страница на година със списък; всяко решение е отделен файл (PDF или Word) с „РЕШЕНИЕ № N по протокол № P от дата“.
  SHU30: { name: "Шумен", yearFiles: (y) => `https://shumen.bg/bg/resheniya/resheniya-na-os-${y}-g`, base: "https://shumen.bg/", from: "2023-11-01" },
  // Великотърновски общински съвет: страница на година → страница на протокол → PDF на всяко решение („Препис-извлечение … РЕШЕНИЕ № N“).
  VTR04: { name: "Велико Търново", yearFiles: (y) => `https://savet.veliko-tarnovo.bg/bg/${y === 2026 ? "reshniya" : "resheniya"}-${y}-godina`, subLink: /href="(bg\/res?h?e?niya-\d{4}-godina\/[^"?#]+)"/g, base: "https://savet.veliko-tarnovo.bg/", from: "2023-11-01", parse: "vt" },
  // Общински съвет Бургас: страници със заседания → PDF „Препис-извлечение от протокол“ с всички решения (номерирани по точки от дневния ред).
  BGS04: { name: "Бургас", sessionNodes: (p) => `https://www.burgascouncil.org/reshenia${p ? `?page=${p}` : ""}`, base: "https://www.burgascouncil.org", from: "2023-11-01" },
  // Общински съвет Сливен: страница „Решения“ с PDF „Взети решения на сесията … на ДД.ММ.ГГГГ“ за всяко заседание.
  SLV20: { name: "Сливен", sessionList: "https://obs.sliven.bg/decisions", from: "2023-11-01" },
  // Общински съвет Плевен: списък на протоколите (по 12 на страница) → протокол в Word с всички решения и гласуването.
  PVN24: { name: "Плевен", protocolDocx: (p) => `https://obs.pleven.bg/bg/protokoli-i-resheniya${p ? `/page/${p * 12}` : ""}`, base: "https://obs.pleven.bg/", from: "2023-11-01" },
  // Общински съвет Кърджали: Word файл с решенията от всяко заседание („П Р О Т О К О Л № P … проведено на ДД.ММ.ГГГГ“, после „Р Е Ш Е Н И Е № N“).
  KRZ16: { name: "Кърджали", docList: "https://kardjali.bg/?pid=4,obs_6", docLink: /href="(https:\/\/kardjali\.bg\/obs_re6enia\/[^"]+?\.docx)"/gi, from: "2023-11-01" },
  // Общински съвет Монтана: всички решения на една страница, по един PDF „R<номер>-P<протокол>-ДД.ММ.ГГ.pdf“.
  MON29: { name: "Монтана", montana: "https://www.montana.bg/общински-съвет/заседания/решения", from: "2023-11-01" },
  // Общински съвет Ловеч (NK Software): списък по 12 решения на страница с номер, дата и предмет.
  LOV18: { name: "Ловеч", nkList: (p) => `http://os.lovech.bg/bg/resheniyabg-1bg-1${p ? `/page/${p * 12}` : ""}`, base: "http://os.lovech.bg/", from: "2023-11-01" },
  // Общински съвет Пазарджик: всяко решение е отделна страница („Р Е Ш Е Н И Е №N от ДД месец ГГГГ година, взето с Протокол № P / ОТНОСНО: …“).
  PAZ19: { name: "Пазарджик", pzStart: ["http://www.obspazardzhik.com/p/2185", "http://www.obspazardzhik.com/p/1383"], base: "http://www.obspazardzhik.com", from: "2023-11-01" },
  // Общински съвет Ямбол: страница на мандата с „Решение N“ за всяко заседание → един HTML файл с всички решения
  // („ПО ТОЧКА … - Предложение относно … ВНОСИТЕЛ: … ОБЩИНСКИ СЪВЕТ РЕШИ: …“). Без номера на решенията и без гласуване в текста.
  // Общински съвет Враца: списък с всички решения (WordPress/Elementor, по 10 на страница), всяко като .doc файл
  // с номер и дата в името („878-04_11_2026-p.doc“) и заглавие в текста на връзката. Само списъкът.
  VRC10: { name: "Враца", vratza: (p) => `https://vratza.bg/%d0%b8%d0%b7%d0%b1%d0%be%d1%80%d0%b8-2/${p > 1 ? `?e-page-08b6494=${p}` : ""}`, from: "2023-11-01" },
  JAM26: { name: "Ямбол", yambol: "https://yambol.bg/mandat-2023-2027", from: "2023-11-01" },
  // Общински съвет Благоевград: страница на година със списък „Решения № A-B … приети с Протокол № P от <дата>“ → PDF/Word с всички
  // решения на заседанието (точка, вносител, докладчик, поименно гласуване, решение). Файловете се свалят от Mac-а (само български IP),
  // виж scripts/fetch-council-mac.mjs; тук ги разчитаме от BLG_DIR.
  BLG03: { name: "Благоевград", blgDir: true, from: "2023-11-01" },
  // Общински съвет Кюстендил: до 08.2024 г. — PDF на заседание с всички решения (jDownloads на kyustendil.bg: „РЕШЕНИЕ № N … Относно: … Р Е Ш И:“);
  // от 09.2024 г. — пълните протоколи на obs.kyustendil.bg (поименно гласуване, „… прие РЕШЕНИЕ № N … Р Е Ш И:“).
  KNL29: { name: "Кюстендил", knl: true, from: "2023-11-01" },
  // Видин: новият сайт на съвета (vidinobs.com, посочен в отговора на ЗДОИ от 24.11.2026): по един файл (.doc/.docx/.pdf) на заседание.
  VID09: { name: "Видин", vidin: "https://vidinobs.com/resheniq", from: "2023-11-01" },
  SFO07: { name: "Ботевград", index: "https://botevgrad.bg/obs/reshenia", from: "2023-11-01", yearLink: /href="(https:\/\/botevgrad\.bg\/obs\/reshenie\/[^"]*?(\d{4})g-\d+)"/g },
  // Общински съвет Пловдив (посочено в решение по ЗДОИ № 5/25.11.2026): WordPress на plovdiv.bg/obs, всяко решение е публикация
  // („Р Е Ш Е Н И Е № N ВЗЕТО С ПРОТОКОЛ № P ОТ ДД.ММ.ГГГГ г. О Т Н О С Н О : … ПО ПРЕДЛОЖЕНИЕ НА : … Р Е Ш И : …“), а поименното
  // гласуване е отделен PDF („РЕЗУЛТАТИ ОТ ГЛАСУВАНЕТО“: съветник → За / Против / Въздържал се). Четем през публичния WordPress API.
  PDV22: { name: "Пловдив", wpApi: "https://www.plovdiv.bg/obs/wp-json/wp/v2/posts?categories=22&per_page=50&orderby=date&order=desc&after=2023-11-01T00:00:00", from: "2023-11-01" },
  // Общи четци: WordPress (публичният API) и „списък → страница на решение“. Номер, дата, протокол, „относно“, текст и
  // гласуване се разчитат от текста по общите формулировки на решенията (виж parseGeneric).
  PER32: { name: "Перник", wp: "https://www.obs-pernik.bg", wpCat: /^Решения$/, from: "2023-11-01" },
  SZR22: { name: "Мъглиж", wp: "https://www.maglizh.bg", wpCat: /^Решения$/, from: "2023-11-01" },
  HKV11: { name: "Ивайловград", wp: "https://www.ivaylovgrad.bg", wpCat: /^Решения$/, from: "2023-11-01" },
  VID06: { name: "Брегово", wp: "https://www.bregovo.bg", wpCat: /Решения на Общински съвет/, from: "2023-11-01" },
  BLG53: { name: "Якоруда", wp: "https://www.yakoruda.bg", wpCat: /Решения и протоколи/, from: "2023-11-01" },
  HKV34: { name: "Хасково", list: (p) => `https://www.haskovo.bg/bg/mandat-2023-2027${p ? `/page/${p * 18}` : ""}`, item: /href="\/?(bg\/mandat-2023-2027\/reshenie-\d+-ot-[\d-]+g?)"/g, base: "https://www.haskovo.bg/", from: "2023-11-01" },
  // „Страници с файлове“: страниците (по години/заседания) съдържат връзки към PDF/Word с решенията; всеки файл се чете веднъж.
  DOB28: { name: "Добрич", pages: () => ["2023-g", ...[2024, 2025, 2026, 2027].map((y) => `resheniya-ot-zasedaniya-na-obshtinski-savet-prez-${y}-g`)].map((x) => `https://www.dobrich.bg/bg/resheniya-mandat-2023-2027-g/${x}`), fileRe: /res|resh|\d+-\d+/i, base: "https://www.dobrich.bg/", from: "2023-11-01" },
  BGS08: { name: "Камено", pages: () => ["https://www.kameno.bg/bg/page/482"], sub: /href="((?:https:\/\/(?:www\.)?kameno\.bg)?\/bg\/page\/resheniya-20(?:2[3-9])-godina-\d+)"/g, fileRe: /РЕШЕНИ|%D0%A0%D0%95%D0%A8/i, base: "https://www.kameno.bg/", from: "2023-11-01" },
  HKV09: { name: "Димитровград", pages: () => [0, 1, 2, 3, 4, 5].map((p) => `https://www.dimitrovgrad.bg/bg/resheniya-na-obs${p ? `/page/${p * 10}` : ""}`), sub: /href="\/?(bg\/resheniya-na-obs\/zasedanie-na-obshtinski-savet[^"?#]+)"/g, inline: true, base: "https://www.dimitrovgrad.bg/", from: "2023-11-01" },
  RAZ26: { name: "Разград", pages: () => [0, 1, 2, 3, 4].map((p) => `https://www.razgrad.bg/protokoli-i-zapisi-na-zasedania-na-obsinski-s-vet${p ? `?start=${p * 10}` : ""}`), sub: /href="(\/protokoli-i-zapisi-na-zasedania-na-obsinski-s-vet\/protokol-no\d+)"/g, fileRe: /Protokol/i, base: "https://www.razgrad.bg/", from: "2023-11-01" },
  BLG33: { name: "Петрич", pages: () => ["https://www.petrich.bg/bg/obshinski-svet/zasedaniya/zasedaniya-na-obs/"], sub: /href="(\/bg\/council\/obshinski-svet\/zasedaniya\/zasedaniya-na-obs\/\d+\/)"/g, fileRe: /реш|resh/i, base: "https://www.petrich.bg/", from: "2023-11-01" },
  PDV01: { name: "Асеновград", pages: () => ["https://www.asenovgrad.bg/bg/resheniya/mandat-2023-g-2027-g"], whole: true, fileRe: /reshenie/i, base: "https://www.asenovgrad.bg/", from: "2023-11-01" },
  SLV16: { name: "Нова Загора", pages: () => [0, 1, 2].map((p) => `https://www.nova-zagora.bg/bg/zasedania-i-reshenia?page=${p}`), sub: /href="(\/bg\/node\/\d+)"[^>]*>\s*Заседание/g, whole: true, fileRe: /Протокол|\/p\d+\.pdf/i, base: "https://www.nova-zagora.bg/", from: "2023-11-01" },
  HKV33: { name: "Харманли", pages: () => ["https://www.harmanli.bg/bg/resheniya-na-obshtinski-savet-mandat-2023-2027"], whole: true, fileRe: /resheniya/i, base: "https://www.harmanli.bg/", from: "2023-11-01" },
  KRZ21: { name: "Момчилград", pages: () => ["https://www.momchilgrad.bg/resheniya.html"], whole: true, fileRe: /2023-2027/, base: "https://www.momchilgrad.bg/", from: "2023-11-01" },
  // Сайтове, които показват списъка чрез JavaScript (render: true → браузър без екран).
  SZR12: { name: "Казанлък", render: true, list: (p) => `https://obs.kazanlak.bg/r-6-${p + 1}.html`, item: /href="((?:https:\/\/obs\.kazanlak\.bg)?\/?page-\d+\.html)"[^>]*>\s*РЕШЕНИЕ/g, base: "https://obs.kazanlak.bg/", from: "2023-11-01" },
  HKV28: { name: "Свиленград", render: true, pages: () => [0, 1, 2, 3, 4, 5].map((p) => `https://www.svilengrad.bg/bg/resheniya-na-obshtinski-savet${p ? `/page/${p * 10}` : ""}`), sub: /href="((?:https:\/\/www\.svilengrad\.bg)?\/?bg\/resheniya-na-obshtinski-savet\/[^"?#]*zasedanie[^"?#]*)"/g, inline: true, base: "https://www.svilengrad.bg/", from: "2023-11-01" },
  BGS15: { name: "Несебър", render: true, pages: () => [1, 2, 3, 4, 5].map((p) => `https://os-nessebar.eu/resheniya${p > 1 ? `?page=${p}` : ""}`), sub: /href="(https:\/\/os-nessebar\.eu\/resheniya\/resheniya-ot-protokol-[^"#]+)"/g, inline: true, base: "https://os-nessebar.eu/", from: "2023-11-01" },
  TGV24: { name: "Попово", pages: () => ["https://www.popovo.bg/bg/obs-menu/reshenia-obs-new/reshenia-obs-2023-2027-.html"], sub: /href="((?:https?:\/\/www\.popovo\.bg)?\/?bg\/obs-menu\/reshenia-obs-new\/reshenia-obs-2023-2027-\/\d+-reshenia[^"#]*)"/g, whole: true, fileRe: /files\.popovo|Reshenia/i, base: "https://www.popovo.bg/", from: "2023-11-01" },
  DOB03: { name: "Балчик", index: "https://www.balchik.bg/bg/mandat-2023-2027", list: () => "https://www.balchik.bg/bg/mandat-2023-2027", indexRe: /href="(\/?bg\/mandat-2023-2027\/resheniya-ot-zasedanie[^"#]*)"/g, item: /href="(\/?bg\/mandat-2023-2027\/reshenie-\d+[^"#]*)"/g, urlDate: true, mainRe: /<div class="content">[\s\S]*?<\/article>/i, titleRe: /Дата на публикуване:\s*[\d.]+\s*г?\.?\s*([\s\S]{5,600}?)\s*Вносител:\s*([^\n]{3,150}?)\s*(?:В залата|Поименно|Явно|Гласуване|\n)/, base: "https://www.balchik.bg/", from: "2023-11-01" },
  BGS13: { name: "Царево", reshi: true, pages: () => ["https://tsarevo.bg/obshtinski-savet/resheniya"], whole: true, fileRe: /re6eniq_obs/i, base: "https://tsarevo.bg/", from: "2023-11-01" },
  LOV19: { name: "Луковит", list: (p) => `https://www.lukovit.bg/bg/reshenia${p ? `/page/${p * 12}` : ""}`, item: /href="(\/?bg\/resheniya\/[^"#]+)"/g, base: "https://www.lukovit.bg/", from: "2023-11-01" },
  SFO26: { name: "Костинброд", pages: () => ["https://www.obs.kostinbrod.bg/obsr/"], whole: true, fileRe: /РЕШЕНИ|%D0%A0%D0%95%D0%A8%D0%95%D0%9D%D0%98/i, base: "https://www.obs.kostinbrod.bg/", from: "2023-11-01" },
  BGS01: { name: "Айтос", pages: () => ["https://aytos.bg/resheniya-mandat-6391.html"], whole: true, fileRe: /\/files\//i, base: "https://aytos.bg/", from: "2023-11-01" },
  PAZ29: { name: "Септември", pages: () => ["https://obs.septemvri.org/index.php/resheniya"], whole: true, fileRe: /./, base: "https://obs.septemvri.org/", from: "2023-11-01" },
  VTR28: { name: "Свищов", pages: () => [2023, 2024, 2025, 2026, 2027].map((y) => `https://www.svishtov.bg/reshenia-na-obshtinski-savet-za-${y}-g`), fileRe: /./, base: "https://www.svishtov.bg/", from: "2023-11-01" },
  // Последна, защото чете бавно (по един PDF на решение) и изразходва остатъка от времето. Столичен общински съвет: https://council.sofia.bg/documents/d/guest/r-<номер>-<година>. Без докладчик и гласуване в текста.
  SOF46: { name: "Столична община", numbered: (n, y) => `https://council.sofia.bg/documents/d/guest/r-${n}-${y}`, from: "2024-01-01", parse: "sofia" },
};
// Сайтът на общината не подава пълната верига от сертификати и fetch() в Node отказва; curl се справя.
// Щадящо: пауза между заявките; ако сайтът покаже проверка срещу ботове, спираме и пазим прочетеното.
let blocked = false;
const T0 = Date.now(), BUDGET = Number(process.env.MINUTES ?? 20) * 60e3; // времеви лимит за едно пускане
const timeUp = () => Date.now() - T0 > BUDGET;
const get = async (u, bin = false, tries = 3) => {
  if (blocked) return null;
  for (let i = 0; i < tries; i++) {
    await new Promise((s) => setTimeout(s, 2500));
    try {
      const b = execFileSync("curl", ["-sSLf", "-m", "90", "-A", UA["User-Agent"], u], { maxBuffer: 1 << 28 });
      if (!bin && /request is being verified|One moment, please/i.test(b.toString("utf8").slice(0, 3000))) { blocked = true; console.log("Сайтът пусна проверка срещу ботове: спираме за днес"); return null; }
      return bin ? b : b.toString("utf8");
    } catch {}
  }
  return null;
};
// Сайтове, които зареждат списъка с решения чрез JavaScript: отваряме страницата в браузър без екран (Playwright, Chromium),
// със същия честен User-Agent, и взимаме готовия HTML. Само за обекти с render: true.
let browser = null;
const render = async (u) => {
  if (blocked) return null;
  try {
    if (!browser) { const { chromium } = await import("playwright"); browser = await (await chromium.launch()).newContext({ userAgent: UA["User-Agent"] }); }
    await new Promise((r) => setTimeout(r, 2500));
    const pg = await browser.newPage();
    try { await pg.goto(u, { waitUntil: "networkidle", timeout: 60000 }); return await pg.content(); } finally { await pg.close(); }
  } catch (e) { console.log("Браузър:", String(e).slice(0, 120)); return null; }
};
const fileKind = (buf) => { const h = buf.subarray(0, 4).toString("binary"); return h.startsWith("%PDF") ? "pdf" : h.startsWith("PK") ? "docx" : h === "\xD0\xCF\x11\xE0" ? "doc" : "pdf"; };
const ws = (s) => s.replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
const flat = (s) => s.replace(/\s+/g, " ").trim();

const TAGS = [
  ["procurement", /обществен[аи] поръчк/i],
  ["urban_planning", /\bПУП\b|подробен устройствен|УПИ|поземлен|имот|продажба|отдаване под наем|концеси|търг|застрояване|право на строеж|сервитут/i],
  ["personnel", /избира|освобождава|определя .*представител|управител|съвет на директорите|възнаграждени|назначава|кмет за .*отпуск/i],
  ["financial", /бюджет|кредит|заем|финансов|капиталов|субсиди|такс|цен[иа] на|данъ|дълг|авансов/i],
  ["social", /социал|здрав|болни|МБАЛ|образован|училищ|детск|градин|култур|читалищ|спорт/i],
];

function parse(text, url) {
  const out = [];
  const parts = text.split(/\n\s*Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*\n\s*№\s*(\d+)/);
  for (let i = 1; i < parts.length; i += 2) {
    const number = parts[i], chunk = parts[i + 1] ?? "";
    const dm = chunk.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s*г/);
    if (!dm) continue;
    const date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
    const [head, rest = ""] = chunk.split(/Р\s*Е\s*Ш\s*И\s*:/);
    const h = flat(head.slice(head.indexOf(dm[0]) + dm[0].length));
    // „ПО ДОКЛАДВАНЕ НА <ИМЕ> – <ДЛЪЖНОСТ> на <документ> /вх.№…/ и становища…“
    let rapporteur = null, title = h.replace(/^[.\s]+/, "");
    const pm = title.match(/ПО ДОКЛАДВАНЕ НА\s+(.+)/);
    if (pm) {
      const r = pm[1];
      const cut = r.search(/\s+на\s+(?=(?:[Дд]окладн|[Ии]нформаци|[Оо]тчет|[Пп]редложени|[Зз]аповед|[Гг]одишн|[Пп]рограм|[Сс]тановищ|[Пп]исмо|[Пп]ротест|[Пп]роект|[Аа]нализ|[Пп]лан|[Сс]тратеги|[Мм]отив|[Ии]скане|[Жж]алб|[Сс]игнал|[А-Я][а-я]))/);
      const who = cut > 0 ? r.slice(0, cut) : r;
      title = cut > 0 ? r.slice(cut).replace(/^\s+на\s+/, "") : title;
      const [nm, ...rl] = who.split(/\s+[–—-]\s+/);
      const role = rl.join(" – ").toLowerCase().replace(/\s*\/.*$/, "").replace(/\s+/g, " ").trim();
      rapporteur = {
        name: nm.replace(/^(д-р|инж\.?|арх\.?|ИНЖ\.?|Д-Р)\s*/i, "").trim(),
        role: /председател/.test(role) ? "председател на общинския съвет" : /^(за\s+)?кмет на общ/.test(role) ? (role.startsWith("за ") ? "за кмет на общината" : "кмет на общината") : /зам/.test(role) ? "заместник-кмет" : /общински съветник/.test(role) ? "общински съветник" : role,
      };
    }
    title = title.split(/\s*\/\s*вх|\s+и становищ|,\s*Общински съвет|\s+Общински съвет\s*[–-]/)[0].replace(/\s*\/$/, "").trim()
      .replace(/^[Дд]окладна записка\s+(относно|за)\s+/, "").replace(/^./, (c) => c.toUpperCase());
    const t = h.match(/(\d+)\s*глас\S*\s*„?\s*за\s*“?,?\s*(\d+)\s*глас\S*\s*„?\s*против\s*“?,?\s*(\d+)\s*глас\S*\s*„?\s*въздърж/);
    let body = rest.split(/\n[^\n]{0,60}:\s*\n\s*(?:ЗА\s+)?ПРЕДСЕДАТЕЛ|\n\s*(?:ЗА\s+)?ПРЕДСЕДАТЕЛ НА ОБЩИНСКИ|\nИзготвил|\nПриложение\s*(?:№\s*)?\d/)[0];
    body = ws(body);
    out.push({
      number, date, url, title: title.slice(0, 400),
      rapporteur,
      tally: t ? { for: +t[1], against: +t[2], abstain: +t[3], method: /поименно/.test(h) ? "named" : "open" } : null,
      result: /^\s*(1\.\s*)?не\s+(приема|одобрява|дава)/i.test(body) ? "rejected" : "adopted",
      tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
    });
  }
  return out;
}

// Столична община: един PDF = едно решение.
function parseSofia(text, url) {
  const t = text.replace(/\f/g, "\n");
  const nm = t.match(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*№\s*((?:\d\s*){1,4})/);
  const dm = t.match(/от\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*годин/);
  if (!nm || !dm) return [];
  const number = nm[1].replace(/\s/g, ""), date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  const afterDate = t.slice(t.indexOf(dm[0]) + dm[0].length);
  const title = flat(afterDate.split(/\n\s*(?:На основание|Мотиви|С Т О Л И Ч Н И Я Т|СТОЛИЧНИЯТ ОБЩИНСКИ)/)[0]).replace(/^(?:[А-ЯA-Z]\s+)?За\s+/, "").replace(/^./, (c) => c.toUpperCase());
  const rest = afterDate.split(/Р\s*Е\s*Ш\s*И\s*:/)[1] ?? "";
  const body = ws(rest.split(/\n\s*(?:Настоящото решение е прието|Решението е прието|ПРЕДСЕДАТЕЛ НА СТОЛИЧНИЯ|Приложени[ея]:?\s*\n)/)[0]);
  const pm = t.match(/Протокол\s*№\s*(\d+)[^\n]{0,40}?(?:т\.|точка)\s*(\d+)/);
  const doc = t.match(/(СО[АС]\d{2}-[А-Я]{2,3}\d{2,3}-\d+(?:[-/]\d+)?)/);
  // Номерът на докладната показва кой е внесъл въпроса: СОА — кметът и администрацията, СОС — общински съветници.
  const by = doc ? (doc[1].startsWith("СОА") ? "кмет и администрация" : "общински съветници") : null;
  return [{
    number, date, url, title: title.slice(0, 400), session: pm ? pm[1] : "",
    rapporteur: null, proposedBy: by, doc: doc ? doc[1] : null,
    tally: null,
    result: "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
  }];
}
const pdfText = (buf) => { writeFileSync("/tmp/c.pdf", buf); try { return execFileSync("pdftotext", ["-layout", "/tmp/c.pdf", "-"], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString(); } catch { return ""; } };

// Варна: протокол-извлечение на цяло заседание.
function parseVarna(text, url) {
  const t = text.replace(/\f/g, "\n");
  const dm = t.match(/проведено на\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const sm = t.match(/П\s*Р\s*О\s*Т\s*О\s*К\s*О\s*Л\s*\n\s*№\s*(\d+)/);
  if (!dm) return [];
  const date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  const out = [];
  // Всяка точка от дневния ред: „по точка … ОТНОСНО … Докл.: Име – длъжност … Р Е Ш Е Н И Я: <решения>“.
  for (const item of t.split(/Препис-извлечение!?/).slice(1)) {
    const dk = item.match(/Докл\.?:\s*([^\n–—-]+?)\s*[–—-]\s*([^\n]+)/);
    const rapporteur = dk ? { name: flat(dk[1]).replace(/^(д-р|инж\.?|арх\.?)\s*/i, ""), role: flat(dk[2]).toLowerCase().replace(/^председател на пк/, "председател на постоянна комисия").replace(/^председател на обс.*/, "председател на общинския съвет").slice(0, 80) } : null;
    const parts = item.split(/\n\s*(\d{2,5})-(\d{1,3})\.\s+/);
    for (let i = 1; i + 2 < parts.length; i += 3) {
      const number = parts[i], chunk = parts[i + 2] ?? "";
      const body = ws(chunk.split(/\n\s*ПРЕДСЕДАТЕЛ|\n\s*Общински съвет – Варна прие/)[0]).replace(/\n\s*\d+\s*\n/g, "\n");
      const by = body.match(/по (?:предложение|докладна записка) (?:на|от)\s+(?:г-н|г-жа)?\s*([^,\n]{3,120}?)(?:\s+с рег|,)/);
      const op = (flat(body).split(/Общински съвет\s*[–-]\s*Варна\s*/)[1] ?? flat(body)).replace(/^[,\s]*(?:РЕШИ|реши)\s*:\s*(?:1\.\s*)?/, "");
      const title = (op.length > 240 ? op.slice(0, 240).replace(/\s+\S*$/, "") + " …" : op).replace(/^./, (c) => c.toUpperCase());
      out.push({
        number, date, url, title, session: sm ? sm[1] : "", rapporteur, proposedBy: by ? flat(by[1]).replace(/^Кмета на Община Варна$/i, "кмета на общината") : null, tally: null,
        result: /^\s*не\s+(приема|одобрява|дава)/i.test(op) ? "rejected" : "adopted",
        tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
        text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
      });
    }
  }
  return out;
}
async function sessionPdfs(code, S, prev) {
  const idx = await get(S.sessionPdfs);
  if (!idx) return 0;
  const files = [...new Set([...idx.matchAll(S.pdfLink)].map((m) => m[1]))];
  let added = 0;
  for (const u of files) {
    if (timeUp() || blocked) break;
    if (u in prev.files) continue;
    const buf = await get(encodeURI(decodeURI(u)), true);
    if (!buf) continue;
    const ds = parseVarna(pdfText(buf), u).filter((d) => d.date >= S.from);
    prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
  }
  return added;
}
// Стара Загора: страници със списък на протоколите, на всяка — решенията със заглавие и PDF.
async function protocolPages(code, S, prev) {
  let added = 0;
  for (let p = 0; p < 30; p++) {
    if (timeUp() || blocked) break;
    const list = await get(S.listPages(p));
    if (!list) break;
    const links = [...new Set([...list.matchAll(S.protoLink)].map((m) => S.base + m[1]))];
    if (!links.length) break;
    let old = 0;
    for (const u of links) {
      if (timeUp() || blocked) break;
      if (u in prev.files && !(prev.files[u] === 0)) continue;
      const page = await get(u);
      if (!page) continue;
      const tx = htmlText(page);
      const pdfs = [...page.matchAll(/href="(uploads\/posts\/[^"]*?prepis_(\d+)[^"]*\.pdf)"/g)].map((m) => [m[2], S.base + m[1]]);
      const ds = [];
      for (const m of tx.matchAll(/Решение\s*№\s*(\d+)\s*от\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*г?\.?\s*относно\s*:?\s*([^\n]+)/g)) {
        const date = `${m[4]}-${m[3].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
        if (date < S.from) { old++; continue; }
        const title = flat(m[5]).replace(/^./, (c) => c.toUpperCase());
        ds.push({ number: m[1], date, url: pdfs.find((x) => x[0] === m[1])?.[1] ?? u, page: u, title: title.slice(0, 400), session: (u.match(/protokol-(\d+)/) ?? [])[1] ?? "", rapporteur: null, tally: null, result: "adopted",
          tags: TAGS.filter(([, re]) => re.test(title)).map(([k]) => k).slice(0, 2) });
      }
      prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
    }
    if (old > 0) break;
  }
  return added;
}

// WordPress: списък с публикации по страници, всяка публикация е едно решение в HTML.
const htmlText = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h\d>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&#8211;|&ndash;/g, "–").replace(/&#8220;|&#8222;|&bdquo;/g, "„").replace(/&#8221;|&ldquo;|&rdquo;/g, "“").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
function parseWpPost(html, url, S) {
  const t = htmlText(html);
  const h = t.match(/РЕШЕНИЕ\s*№\s*(\d+)\s*Прието с Протокол\s*№\s*(\d+)\s*\/\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!h) return [];
  const date = `${h[5]}-${h[4].padStart(2, "0")}-${h[3].padStart(2, "0")}`;
  // Текстът: след последното заглавие до „ПРЕДСЕДАТЕЛ“.
  // Заглавието се повтаря (меню, „последни публикации“); взимаме срещането, след което идва самият текст.
  let after = "";
  for (let i = t.indexOf(h[0]); i >= 0; i = t.indexOf(h[0], i + 1)) {
    const a = t.slice(i + h[0].length);
    if (/^[\s\S]{0,600}?(На основание|\sреши\s*:)/i.test(a)) { after = a; break; }
  }
  if (!after) return [];
  const main = after.slice(Math.max(0, after.search(/На основание|Общински съвет/))).split(/\n\s*ПРЕДСЕДАТЕЛ|This website uses cookies|\nСподели/)[0];
  const op = (main.split(/\sреши\s*:/i)[1] ?? main).trim();
  const body = ws(op);
  // Решенията в Русе нямат отделно заглавие: взимаме първата точка от решението (без да режем на „гр.“, „м.“ и т.н.).
  const first = flat(body.split(/\n(?=\d+\.\s)/)[0]).replace(/^\d+\.\s*/, "");
  const title = first.length > 240 ? first.slice(0, 240).replace(/\s+\S*$/, "") + " …" : first;
  const pdf = html.match(/href="([^"]+\.pdf)"/)?.[1] ?? null;
  return [{
    number: h[1], date, url: pdf ?? url, page: url, title, session: h[2], rapporteur: null, tally: null,
    result: /^\s*(1\.\s*)?не\s+(приема|одобрява|дава)/i.test(body) ? "rejected" : "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
  }];
}
async function wordpress(code, S, prev) {
  let added = 0, ended = false; // ended: стигнахме края на списъка или решения отпреди мандата
  for (let p = 1; p < 400; p++) {
    if (timeUp() || blocked) break;
    const list = await get(S.wpList(p), false, 2);
    if (!list) break;
    const links = [...new Set([...list.matchAll(S.wpPost)].map((m) => m[1]))];
    if (!links.length) { ended = true; break; }
    let fresh = 0, old = 0;
    for (const u of links) {
      if (timeUp() || blocked) break;
      if (u in prev.files) continue;
      fresh++;
      const page = await get(u);
      if (!page) continue;
      const ds = parseWpPost(page, u, S);
      prev.files[u] = ds.length;
      for (const d of ds) { if (d.date >= S.from) { prev.decisions.push(d); added++; } else old++; }
    }
    // Списъкът е от най-новите към най-старите: при пълно обхождане спираме, щом стигнем до решения отпреди мандата
    // или до страница без нищо ново (когато вече сме прочели всичко веднъж).
    if (old > 0) { ended = true; break; }
    if (fresh === 0 && prev.complete) break;
    if (p > 1 && fresh === 0 && !prev.complete) continue;
  }
  if (ended) prev.complete = true;
  return added;
}

// „РЕШЕНИЕ № N / по протокол № P от ДД.ММ.ГГГГ / ОТНОСНО: … / (с X гласа „за“ …) / текст / ПРЕДСЕДАТЕЛ“ — един файл е едно решение.
const num = (w) => (/^без$/i.test(w) ? 0 : +w);
function parseSingle(text, url) {
  const t = text.replace(/\f/g, "\n");
  const hm = t.match(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*№\s*(\d+)\s*\n?\s*по\s+протокол\s*№\s*(\d+)\s*от\s*([\d.\-– ]+?)\s*г/i);
  if (!hm) return [];
  const dd = hm[3].match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/) ?? hm[3].match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!dd) return [];
  const date = `${dd[3]}-${dd[2].padStart(2, "0")}-${dd[1].padStart(2, "0")}`;
  const after = t.slice(t.indexOf(hm[0]) + hm[0].length);
  const om = after.match(/ОТНОСНО\s*:\s*([\s\S]*?)\n\s*\n/);
  if (!om) return []; // приложение към решение, не самото решение
  const title = flat(om[1]).replace(/^./, (c) => c.toUpperCase());
  const vm = after.match(/с\s+(\d+|без)\s+глас\S*\s*„?за“?,?\s*(\d+|без)\s*(?:глас\S*\s*)?„?против“?\s*и\s*(\d+|без)\s*(?:глас\S*\s*)?„?въздърж\S*(?:\s+се)?\S*/i);
  const bodyStart = vm ? after.indexOf(vm[0]) + vm[0].length : om ? after.indexOf(om[0]) + om[0].length : 0;
  const body = ws(after.slice(bodyStart).replace(/^[\s/)]+/, "").split(/\n\s*ПРЕДСЕДАТЕЛ|\n\s*Приложени[ея]\s*:/)[0]);
  return [{
    number: hm[1], date, url, title: title.slice(0, 400), session: hm[2], rapporteur: null,
    tally: vm ? { for: num(vm[1]), against: num(vm[2]), abstain: num(vm[3]), method: /поименно/i.test(after.slice(0, 600)) ? "named" : "open" } : null,
    result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
  }];
}
// Велико Търново: „Препис-извлечение от Протокол №P … проведено на ДД.ММ.ГГГГ … ОТНОСНО: … РЕШЕНИЕ № N … текст“.
function parseVT(text, url) {
  const t = text.replace(/\f/g, "\n");
  const pm = t.match(/Протокол\s*№\s*(\d+)/), dm = t.match(/проведено на\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/), nm = t.match(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*№\s*(\d+)/);
  if (!dm || !nm) return [];
  const date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  const om = t.match(/ОТНОСНО\s*:\s*([\s\S]*?)\n\s*\n/);
  const title = om ? flat(om[1]).replace(/^./, (c) => c.toUpperCase()) : "";
  const body = ws(t.slice(t.indexOf(nm[0]) + nm[0].length).split(/\n\s*ПРЕДСЕДАТЕЛ|\n\s*Приложени[ея]\s*:/)[0]);
  return [{ number: nm[1], date, url, title: title.slice(0, 400), session: pm ? pm[1] : "", rapporteur: null, tally: null,
    result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body }];
}
// Бургас: една точка от дневния ред = едно решение; „N. ОбС … Докладна записка от <кой> – <длъжност>, относно: <въпрос> РЕШЕНИЕ: <текст>“.
function parseBurgas(text, url) {
  const t = text.replace(/\f/g, "\n");
  const pm = t.match(/от\s+Протокол\s*№\s*(\d+)/), dm = t.match(/проведеното на\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!pm || !dm) return [];
  const date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  const parts = t.split(/\n\s{0,8}(\d{1,3})\.\s+(?=ОбС\s*\d|Вх\.?\s*№|Докладна|Проект на решение|Предложение|Питане|Отчет)/);
  const out = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const point = parts[i], chunk = parts[i + 1];
    const [head, rest] = chunk.split(/\n\s*Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*:?\s*\n/);
    if (rest === undefined) continue;
    const h = flat(head);
    const wm = h.match(/(?:Докладна записка|Доклад|Проект на решение|Предложение)\s+от\s+(.+?)\s*[–—-]\s*([^,]+?),\s*относно\s*:?\s*(.*)$/i);
    const title = (wm ? wm[3] : h.replace(/^ОбС\s*[\d-]+\s*/, "")).replace(/^./, (c) => c.toUpperCase());
    const role = wm ? wm[2].toLowerCase() : "";
    const rapporteur = wm ? { name: wm[1].replace(/^(д-р|инж\.?|арх\.?)\s*/i, "").trim(), role: /председател/.test(role) ? "председател на общинския съвет" : /^кмет на общ/.test(role) ? "кмет на общината" : /зам/.test(role) ? "заместник-кмет" : /съветник/.test(role) ? "общински съветник" : role.slice(0, 80) } : null;
    const body = ws(rest.split(/\n\s*(?:ПРЕДСЕДАТЕЛ|Протоколист|Вярно с оригинала)/i)[0]);
    out.push({ number: `${pm[1]}-${point}`, date, url, title: title.slice(0, 400), session: pm[1], rapporteur, tally: null,
      result: /^\s*(I\.\s*|1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
      tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body });
  }
  return out;
}
// Сливен: „Р Е Ш Е Н И Е / № N / заглавие / На основание … / Р Е Ш И: / текст“; датата е от списъка.
function parseSliven(text, url, date) {
  const t = text.replace(/\f/g, "\n");
  const parts = t.split(/\n\s*Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*\n\s*№\s*(\d+)\s*\n/);
  const out = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const chunk = parts[i + 1];
    const [head, rest = ""] = chunk.split(/Р\s*Е\s*Ш\s*И\s*:/);
    const title = flat(head.split(/\n\s*На основание/)[0]).replace(/^./, (c) => c.toUpperCase());
    if (!title || !rest) continue;
    const body = ws(rest.split(/\n\s*(?:ПРЕДСЕДАТЕЛ|Препис!|ОБЩИНСКИ СЪВЕТ\s*-\s*СЛИВЕН)/)[0]);
    const vm = chunk.match(/(\d+)\s*глас\S*\s*„?за“?[^\n]{0,40}?(\d+|без)\s*„?против“?[^\n]{0,40}?(\d+|без)\s*„?въздърж/i);
    out.push({ number: parts[i], date, url, title: title.slice(0, 400), session: "", rapporteur: null,
      tally: vm ? { for: num(vm[1]), against: num(vm[2]), abstain: num(vm[3]), method: "open" } : null,
      result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
      tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body });
  }
  return out;
}
async function sessionList(code, S, prev) {
  const page = await get(S.sessionList);
  if (!page) return 0;
  let added = 0;
  const items = [...page.matchAll(/href="(https?:\/\/obs\.sliven\.bg\/uploads\/[A-F0-9]+)"[^>]*>\s*Взет[ои] решени[ея][^<]*?(\d{2})\.(\d{2})\.(\d{4})/g)]
    .map((m) => ({ u: m[1], date: `${m[4]}-${m[3]}-${m[2]}` })).filter((x) => x.date >= S.from);
  for (const { u, date } of items) {
    if (timeUp() || blocked) break;
    if (prev.files[u] > 0) continue;
    const buf = await get(u, true);
    if (!buf) continue;
    const ds = parseSliven(pdfText(buf), u, date);
    prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
  }
  return added;
}
// Плевен: „Р Е Ш Е Н И Е № N / от ДД месец ГГГГ година / ЗА … / На основание … / Р Е Ш И: / … / Мотиви … / Г Л А С У В А Л И“.
const MONTHS = { януари: 1, февруари: 2, март: 3, април: 4, май: 5, юни: 6, юли: 7, август: 8, септември: 9, октомври: 10, ноември: 11, декември: 12 };
function parsePleven(text, url) {
  const parts = text.split(/Р\s+Е\s+Ш\s+Е\s+Н\s+И\s+Е\s+№\s*(\d+)/);
  const pm = text.match(/П\s*Р\s*О\s*Т\s*О\s*К\s*О\s*Л\s*\n?\s*№\s*(\d+)/);
  const out = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const chunk = parts[i + 1];
    const dm = chunk.match(/^\s*от\s+(\d{1,2})\s+([а-я]+)\s+(\d{4})/i);
    if (!dm || !MONTHS[dm[2].toLowerCase()]) continue;
    const date = `${dm[3]}-${String(MONTHS[dm[2].toLowerCase()]).padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
    const afterDate = chunk.slice(dm[0].length).replace(/^\s*година/, "");
    const [head, rest = ""] = afterDate.split(/Р\s*Е\s*Ш\s*И\s*:/);
    const title = flat(head.split(/\n\s*На основание/)[0].replace(/О\s*Б\s*Щ\s*И\s*Н\s*С\s*К\s*И[\s\S]*$/, "")).replace(/^ЗА\s+/i, "").replace(/^./, (c) => c.toUpperCase());
    if (!title || !rest) continue;
    const body = ws(rest.split(/\n\s*(?:Мотиви\s*:|Г\s*Л\s*А\s*С\s*У\s*В\s*А\s*Л\s*И|ПО\s+[А-Я]+\s+ТОЧКА)/)[0]);
    const vote = (rest.split(/Г\s*Л\s*А\s*С\s*У\s*В\s*А\s*Л\s*И\s*:?/)[1] ?? "").slice(0, 400);
    const vm = vote.match(/За\s*[–:-]?\s*(\d+)[\s\S]{0,80}?Против\s*[–:-]?\s*(\d+)[\s\S]{0,80}?Въздърж\S*\s*[–:-]?\s*(\d+)/i);
    out.push({ number: parts[i], date, url, title: title.slice(0, 400), session: pm ? pm[1] : "", rapporteur: null,
      tally: vm ? { for: +vm[1], against: +vm[2], abstain: +vm[3], method: /поименно/i.test(vote) ? "named" : "open" } : null,
      result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
      tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body });
  }
  return out;
}
async function protocolDocx(code, S, prev) {
  let added = 0;
  for (let p = 0; p < 8; p++) {
    if (timeUp() || blocked) break;
    const list = await get(S.protocolDocx(p));
    if (!list) break;
    const pages = [...new Set([...list.matchAll(/href="(bg\/protokoli-i-resheniya\/[a-z-]*protokol-\d+-ot-(\d{2})(\d{2})(\d{4})-g)"/g)].filter((m) => `${m[4]}-${m[3]}-${m[2]}` >= S.from).map((m) => S.base + m[1]))];
    if (!pages.length) break;
    for (const pg of pages) {
      if (timeUp() || blocked) break;
      if (prev.files[pg] > 0) continue;
      const h = await get(pg);
      const doc = h?.match(/href="(uploads\/posts\/[^"]*protokol[^"]*\.docx)"/i)?.[1];
      if (!doc) { prev.files[pg] = 0; continue; }
      const buf = await get(S.base + doc, true);
      if (!buf) continue;
      const ds = parsePleven(docxText(buf), S.base + doc);
      prev.files[pg] = ds.length; prev.decisions.push(...ds); added += ds.length;
    }
  }
  return added;
}
// Кърджали: без отделно заглавие — показваме първото изречение от решението.
function parseKardzhali(text, url) {
  const dm = text.match(/проведено на\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/), pm = text.match(/П\s*Р\s*О\s*Т\s*О\s*К\s*О\s*Л\s*\n?\s*№\s*(\d+)/);
  if (!dm) return [];
  const date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  const parts = text.split(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*\n\s*№\s*(\d+)/);
  const out = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const chunk = parts[i + 1];
    const osn = chunk.slice(Math.max(0, chunk.search(/На основание/)));
    const op = osn.split(/реши\s*:/i)[1] ?? osn.slice(osn.indexOf("\n") + 1);
    const body = ws(op.split(/\n\s*(?:ПРЕДСЕДАТЕЛ|Председател на)/)[0]);
    const first = flat(body.split("\n").find((l) => l.trim().length > 15) ?? "").replace(/^\d+\.\s*/, "").replace(/^./, (c) => c.toUpperCase());
    if (!first) continue;
    const title = first.length > 240 ? first.slice(0, 240).replace(/\s+\S*$/, "") + " …" : first;
    out.push({ number: parts[i], date, url, title, session: pm ? pm[1] : "", rapporteur: null, tally: null,
      result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
      tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body });
  }
  return out;
}
// Видин: „РЕШЕНИЕ № N / Взето с Протокол № 9/28.10.2026 год. / ОТНОСНО: … / Р Е Ш И: … / МОТИВИ: …“
function parseVidin(text, url) {
  const out = [];
  const parts = text.split(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*№\s*(\d+)/);
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const chunk = parts[i + 1];
    const pm = chunk.match(/Протокол\s*№\s*(\d+)\s*[/от ]+\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (!pm) continue;
    const yy = pm[4].length === 2 ? `20${pm[4]}` : pm[4];
    const date = `${yy}-${pm[3].padStart(2, "0")}-${pm[2].padStart(2, "0")}`;
    const rel = flat(chunk.split(/ОТНОСНО\s*:/i)[1]?.split(/\n\s*\n|На основание/)[0] ?? "");
    // „Предложение №… от <кой> – <длъжност>, относно <въпрос>“
    let title = rel, rapporteur = null;
    const om = rel.match(/^(?:Предложение|Докладна записка)[^,]*?\sот\s+(.+?)\s+[–-]\s+(.+?),?\s+относно\s+(.+)$/i);
    if (om) {
      const r = om[1].includes(",") ? om[1].slice(om[1].indexOf(",") + 1) + " " + om[2] : om[2];
      rapporteur = { name: om[1].split(",")[0].replace(/^(д-р|инж\.?|арх\.?|проф\.?)\s*/i, "").replace(/\s+/g, " ").trim(),
        role: /зам\.?\s*-?\s*кмет|заместник/i.test(r) ? (/за кмет/i.test(r) ? "заместник-кмет, за кмет" : "заместник-кмет") : /кмет/i.test(r) ? "кмет на общината" : /председател/i.test(r) ? "председател на общинския съвет" : /съветник/i.test(r) ? "общински съветник" : r.split(",")[0].toLowerCase().trim() };
      title = om[3];
    } else title = rel.replace(/^.*?относно\s+/i, "");
    title = title.replace(/^./, (c) => c.toUpperCase());
    const op = chunk.split(/Р\s*Е\s*Ш\s*И\s*:/)[1] ?? "";
    const body = ws(op.split(/\n\s*МОТИВИ\s*:|\n\s*(?:ЗА\s+)?Председател на Общински|\n\s*ОБЩИНСКИ СЪВЕТ\s*-\s*ВИДИН/)[0]);
    if (!title || !body) continue;
    const t = chunk.match(/(\d+)\s*„?\s*за\s*“?,?\s*(\d+)\s*„?\s*против\s*“?,?\s*(\d+)\s*„?\s*въздърж/i);
    out.push({ number: parts[i], date, url, title: title.slice(0, 400), session: pm[1], rapporteur,
      tally: t ? { for: +t[1], against: +t[2], abstain: +t[3], method: "open" } : null,
      result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
      tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body });
  }
  return out;
}
async function vidin(code, S, prev) {
  const page = await get(S.vidin);
  if (!page) return 0;
  let added = 0;
  for (const u of [...new Set([...page.matchAll(/href="(https:\/\/vidinobs\.com\/storage\/protocols\/[^"]+?\.(?:docx?|pdf))"/gi)].map((m) => m[1]))]) {
    if (timeUp() || blocked) break;
    if (u in prev.files) continue;
    const buf = await get(u, true);
    if (!buf) continue;
    let tx = /\.docx$/i.test(u) ? docxText(buf) : /\.doc$/i.test(u) ? docText(buf) : pdfText(buf);
    if (/\.pdf$/i.test(u) && tx.replace(/\s/g, "").length < 200) tx = ocrPdf("/tmp/c.pdf");
    const ds = parseVidin(tx, u).filter((d) => d.date >= S.from);
    prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
  }
  return added;
}
async function docList(code, S, prev) {
  const page = await get(S.docList);
  if (!page) return 0;
  let added = 0;
  for (const m of page.matchAll(S.docLink)) {
    if (timeUp() || blocked) break;
    const u = m[1];
    if (u in prev.files) continue;
    const buf = await get(encodeURI(decodeURI(u)), true);
    if (!buf) continue;
    const ds = parseKardzhali(docxText(buf), u).filter((d) => d.date >= S.from);
    prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
  }
  return added;
}
// Монтана: „Препис-извлечение … <вх. №> Докладна записка от <кой> – <длъжност>, относно <въпрос> … Решение № N … Реши: …“.
function parseMontana(text, url, number, session, date) {
  const t = flat(text.replace(/\f/g, "\n").split(/\n\s*Решение\s*\n\s*№/)[0]);
  const wm = t.match(/(?:Докладна записка|Доклад|Предложение|Проект на решение)\s+от\s+(.+?)\s*[–—-]\s*([^,]+?),\s*относно\s*:?\s*(.+)$/i);
  const title = (wm ? wm[3] : t.replace(/^.*?Монтана\s*/, "")).replace(/^./, (c) => c.toUpperCase());
  const role = wm ? wm[2].toLowerCase() : "";
  const rest = text.split(/\n\s*Реши\s*:/i)[1] ?? "";
  if (!rest) return [];
  const body = ws(rest.split(/\n\s*(?:ПРЕДСЕДАТЕЛ|Председател на|Гласували|Протоколист)/i)[0]);
  const vm = text.match(/(\d+)\s*„?\s*за\s*“?[,;]?\s*(\d+|без)\s*„?\s*против\s*“?[,;]?\s*(?:и\s*)?(\d+|без)\s*„?\s*въздърж/i);
  return [{ number, date, url, title: title.slice(0, 400), session, tally: vm ? { for: num(vm[1]), against: num(vm[2]), abstain: num(vm[3]), method: "open" } : null,
    rapporteur: wm ? { name: wm[1].replace(/^(д-р|инж\.?|арх\.?)\s*/i, "").trim(), role: /председател/.test(role) ? "председател на общинския съвет" : /^кмет на общ/.test(role) ? "кмет на общината" : /зам/.test(role) ? "заместник-кмет" : /съветни/.test(role) ? "общински съветник" : role.slice(0, 80) } : null,
    result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body }];
}
async function montana(code, S, prev) {
  const page = await get(encodeURI(S.montana));
  if (!page) return 0;
  let added = 0;
  const items = [...new Set([...page.matchAll(/href="(https:\/\/www\.montana\.bg\/os\/R(\d+)-P(\d+)-(\d{2})\.(\d{2})\.(\d{2})\.pdf)"/g)].map((m) => JSON.stringify([m[1], m[2], m[3], `20${m[6]}-${m[5]}-${m[4]}`])))].map((x) => JSON.parse(x));
  for (const [u, n, p, date] of items) {
    if (timeUp() || blocked) break;
    if (date < S.from || u in prev.files) continue;
    const buf = await get(u, true);
    if (!buf) continue;
    const ds = parseMontana(pdfText(buf), u, n, p, date);
    prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
  }
  return added;
}
// Ямбол: решенията за еднократна помощ от общинския здравен фонд назовават хора и здравословни причини — не ги показваме по име.
const PRIVATE_AID = /еднократна\s+(финансова\s+)?помощ|здравен\s+фонд/i;
function parseYambol(html, url, session) {
  const t = ws(htmlText(html));
  const dm = t.match(/ПРОВЕДЕНО\s+НА\s+(\d{1,2})\s+([А-Яа-я]+)\s+(\d{4})/i);
  const mon = dm && Object.entries(MONTHS).find(([k]) => dm[2].toLowerCase().slice(0, 3) === k.slice(0, 3));
  if (!mon) return [];
  const date = `${dm[3]}-${String(mon[1]).padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  const parts = t.split(/\n\s*ПО\s+ТОЧКА\s+/i).slice(1);
  return parts.map((part, i) => {
    const [head, ...restParts] = part.split(/ОБЩИНСКИ\s+СЪВЕТ\s*\n?\s*РЕШИ\s*:/i);
    const rest = restParts.join(" ");
    const hm = flat(head).match(/^.*?[-–]\s*(?:Предложение|Докладна записка|Доклад)?\s*(?:относно)?\s*(.+?)\s*ВНОСИТЕЛ\s*:\s*([^_]+?)\s*_*\s*$/i);
    let title = (hm ? hm[1] : flat(head).slice(0, 300)).replace(/_{3,}.*$/, "").replace(/^[А-Яа-я ]+?\s+[-–]\s+/, "").trim().replace(/^./, (c) => c.toUpperCase());
    const who = hm ? flat(hm[2]).replace(/\s+(\S)\s+(\S)$/, " $1$2") : "";
    let body = ws(rest.split(/\n\s*(?:ПРЕДСЕДАТЕЛ|Председател на ОбС)/i)[0]);
    const priv = PRIVATE_AID.test(title);
    if (priv) { title = title.replace(/\s+на\s+[А-Я][а-я]+(\s+[А-Я][а-я]+){1,2}\.?$/, "").replace(/\s*\d{2}\.\d{2}\.\d{2}г?\..*$/, "") + " (имената не се показват)"; body = ""; }
    return { number: `${session}.${i + 1}`, date, url, title: title.slice(0, 400), session: String(session), tally: null,
      rapporteur: who && !/^ПК(\s|$)|комиси/i.test(who) ? { name: who.replace(/\s*Реванск\s+и$/, " Ревански"), role: "" } : who ? { name: who, role: "постоянна комисия" } : null,
      result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
      tags: priv ? [] : TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body };
  }).filter((d) => d.date >= "2023-11-01");
}
async function yambol(code, S, prev) {
  const page = await get(S.yambol);
  if (!page) return 0;
  let added = 0;
  const items = [...page.matchAll(/href="(https:\/\/yambol\.bg\/uploads\/[0-9A-F]+)"[^>]*>\s*Решение\s+(\d+)\s*</g)];
  for (const [, u, n] of items) {
    if (timeUp() || blocked) break;
    if (u in prev.files) continue;
    const html = await get(u);
    if (!html) continue;
    const ds = parseYambol(html, u, n);
    prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
  }
  return added;
}
async function vratza(code, S, prev) {
  let added = 0;
  const have = new Set(prev.decisions.map((d) => d.url));
  for (let p = 1; p < 400; p++) {
    if (timeUp() || blocked) break;
    const list = await get(S.vratza(p));
    if (!list) break;
    const items = [];
    for (const chunk of list.split(/e-loop-item-\d+/).slice(1)) {
      const nd = chunk.match(/>\s*(\d{1,4})\s*\/\s*(\d{2})\.(\d{2})\.(\d{4})\s*</);
      const a = chunk.match(/elementor-shortcode"><a href="(https:\/\/vratza\.bg\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (nd && a) items.push([null, a[1], nd[1], nd[2], nd[3], nd[4], a[2]]);
    }
    if (!items.length) break;
    let old = 0, fresh = 0;
    for (const [, u, number, dd, mm, yyyy, txt] of items) {
      const date = `${yyyy}-${mm}-${dd}`;
      if (date < S.from) { old++; continue; }
      if (have.has(u)) continue;
      const title = flat(htmlText(txt)).replace(/^Решени[еe]\s+(за|относно)\s+/i, "").replace(/^./, (c) => c.toUpperCase());
      if (!title) continue;
      prev.decisions.push({ number, date, url: u, title: title.slice(0, 400), session: "", rapporteur: null, tally: null, result: "adopted",
        tags: TAGS.filter(([, re]) => re.test(title)).map(([k]) => k).slice(0, 2) });
      have.add(u); added++; fresh++;
    }
    if (old === items.length) break;      // стигнахме до решения отпреди мандата
    if (!fresh && p > 3 && prev.complete) break; // всичко на тази страница вече е прочетено
  }
  prev.complete = true;
  return added;
}
async function nkList(code, S, prev) {
  let added = 0;
  const have = new Set(prev.decisions.map((d) => d.page));
  for (let p = 0; p < 200; p++) {
    if (timeUp() || blocked) break;
    if (prev.files[S.nkList(p)] === 12) continue; // пълна страница, вече прочетена
    const list = await get(S.nkList(p));
    if (!list) break;
    const items = [...list.matchAll(/<a href="(bg\/resheniya\/[^"]+)">\s*<h2[^>]*>\s*Решение\s*№\s*(\d+)\s*<\/h2>\s*<time datetime="(\d{4}-\d{2}-\d{2})"[^>]*>[^<]*<\/time>\s*<p>([\s\S]*?)<\/p>/g)];
    if (!items.length) break;
    for (const [, href, number, date, desc] of items) {
      const u = S.base + href;
      if (have.has(u) || date < S.from) continue;
      const title = flat(htmlText(desc)).replace(/^./, (c) => c.toUpperCase());
      prev.decisions.push({ number, date, url: u, page: u, title: title.slice(0, 400), session: "", rapporteur: null, tally: null, result: "adopted",
        tags: TAGS.filter(([, re]) => re.test(title)).map(([k]) => k).slice(0, 2) });
      have.add(u); added++;
    }
    prev.files[S.nkList(p)] = items.length;
  }
  return added;
}
function parsePazardzhik(html, url) {
  const t = htmlText(html);
  const h = t.match(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*№\s*(\d+)\s*от\s*(\d{1,2})\s+([а-я]+)\s+(\d{4})[^\n]{0,40}?Протокол\s*№\s*(\d+)/i);
  if (!h || !MONTHS[h[3].toLowerCase()]) return [];
  const date = `${h[4]}-${String(MONTHS[h[3].toLowerCase()]).padStart(2, "0")}-${h[2].padStart(2, "0")}`;
  const after = t.slice(t.indexOf(h[0]) + h[0].length);
  const om = after.match(/ОТНОСНО\s*:\s*([\s\S]*?)(?:\n|Предложението|На основание|$)/);
  const title = om ? flat(om[1]).replace(/^./, (c) => c.toUpperCase()) : "";
  if (!title) return [];
  const rest = after.split(/Р\s*Е\s*Ш\s*И\s*:?/)[1] ?? "";
  const body = ws(rest.split(/\n\s*(?:ПРЕДСЕДАТЕЛ|Председател на)/)[0]);
  const vm = after.match(/(\d+)\s*гласа?\s*„?за“?[,;]?\s*(\d+|без|няма)\s*(?:гласа?\s*)?„?против“?[,;]?\s*(?:и\s*)?(\d+|без|няма)\s*(?:гласа?\s*)?„?въздърж/i);
  const n = (w) => (/^(без|няма)$/i.test(w) ? 0 : +w);
  return [{ number: h[1], date, url, title: title.slice(0, 400), session: h[5], rapporteur: null,
    tally: vm ? { for: n(vm[1]), against: n(vm[2]), abstain: n(vm[3]), method: "open" } : null,
    result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body }];
}
async function pazardzhik(code, S, prev) {
  let added = 0;
  const cats = new Set();
  for (const st of S.pzStart) { const h = await get(st); for (const m of (h ?? "").matchAll(/href="(\/c\/\d+)[^"]*"[^>]*>\s*РЕШЕНИЯ/gi)) cats.add(S.base + m[1]); }
  cats.add(S.base + "/c/88");
  for (const c of cats) {
    for (let page = 1; page <= 80; page++) {
      if (timeUp() || blocked) return added;
      const h = await get(page === 1 ? c : `${c}?page=${page}`);
      const links = [...new Set([...(h ?? "").matchAll(/href="(\/p\/\d+\/reshenie-[^"]+)"/g)].map((m) => S.base + m[1]))];
      if (!links.length) break;
      let fresh = 0;
      for (const u of links) {
        if (u in prev.files) continue;
        fresh++;
        if (timeUp() || blocked) return added;
        const ph = await get(u);
        if (!ph) continue;
        const ds = parsePazardzhik(ph, u).filter((d) => d.date >= S.from);
        prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
      }
      if (!fresh && page > 1) break;
    }
  }
  return added;
}
async function sessionNodes(code, S, prev) {
  let added = 0;
  for (let p = 0; p < 10; p++) {
    if (timeUp() || blocked) break;
    const list = await get(S.sessionNodes(p));
    if (!list) break;
    const nodes = [...new Set([...list.matchAll(/href="(\/node\/\d+)"[^>]*>(?:(?!<\/a>)[\s\S]){0,300}?ВЗЕТИ РЕШЕНИЯ НА ЗАСЕДАНИЕ(?:(?!<\/a>)[\s\S]){0,120}?(\d{2})\.(\d{2})\.(\d{4})/g)].filter((m) => `${m[4]}-${m[3]}-${m[2]}` >= S.from).map((m) => S.base + m[1]))];
    if (!nodes.length) break;
    for (const n of nodes) {
      if (timeUp() || blocked) break;
      if (n in prev.files && prev.files[n] > 0) continue;
      const page = await get(n);
      const pdf = page?.match(/href="(\/sites\/default\/files\/[^"]+\.pdf)"/)?.[1];
      if (!pdf) { prev.files[n] = 0; continue; }
      const buf = await get(encodeURI(decodeURI(S.base + pdf)), true);
      if (!buf) continue;
      const ds = parseBurgas(pdfText(buf), S.base + pdf);
      prev.files[n] = ds.length; prev.decisions.push(...ds); added += ds.length;
    }
  }
  return added;
}
const docxText = (buf) => { writeFileSync("/tmp/c.docx", buf); try { return execFileSync("unzip", ["-p", "/tmp/c.docx", "word/document.xml"], { maxBuffer: 1 << 28 }).toString().replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, " ").replace(/<[^>]+>/g, ""); } catch { return ""; } };
async function yearFiles(code, S, prev) {
  let added = 0;
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= +S.from.slice(0, 4); y--) {
    if (timeUp() || blocked) break;
    if (y < thisYear - 1 && prev.done?.[y]) continue;
    const page = await get(S.yearFiles(y));
    if (!page) continue;
    let pages = [page];
    if (S.subLink) {
      pages = [];
      for (const sub of [...new Set([...page.matchAll(S.subLink)].map((m) => S.base + m[1]))]) {
        if (timeUp() || blocked) break;
        if (prev.files[sub] === -1 && y < thisYear) continue; // протоколът вече е прочетен изцяло
        const sp = await get(sub);
        if (sp) { pages.push(sp); prev.files[sub] = -1; }
      }
    }
    const files = [...new Set(pages.flatMap((pg) => [...pg.matchAll(/href="\/?(uploads\/[^"]+?\.(?:pdf|docx))"/gi)].map((m) => S.base + m[1])))];
    let all = true;
    for (const u of files) {
      if (u in prev.files) continue;
      if (timeUp() || blocked) { all = false; break; }
      const buf = await get(encodeURI(decodeURI(u)), true, 2);
      if (!buf) { all = false; continue; }
      const tx = /\.docx$/i.test(u) ? docxText(buf) : pdfText(buf);
      const ds = (S.parse === "vt" ? parseVT(tx, u) : parseSingle(tx, u)).filter((d) => d.date >= S.from);
      prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
    }
    if (all && y < thisYear) (prev.done ??= {})[y] = true;
  }
  return added;
}

// Номерирани решения: обхождаме номерата по години; спираме след 40 поредни липсващи над най-големия известен.
async function numbered(code, S, prev) {
  let added = 0;
  const thisYear = new Date().getFullYear();
  for (let y = +S.from.slice(0, 4); y <= thisYear; y++) {
    const have = Object.entries(prev.files).filter(([u]) => u.endsWith(`-${y}`));
    const max = Math.max(0, ...have.filter(([, v]) => v > 0).map(([u]) => +u.match(/r-(\d+)-\d{4}$/)[1]));
    if (y < thisYear && prev.done?.[y]) continue;
    let miss = 0;
    for (let n = 1; miss < 40; n++) {
      if (timeUp() || blocked) return added;
      const u = S.numbered(n, y);
      if (u in prev.files && (prev.files[u] > 0 || y < thisYear || n < max)) { miss = prev.files[u] > 0 ? 0 : miss + (n > max ? 1 : 0); continue; }
      const buf = await get(u, true, 1);
      const ok = buf && buf.slice(0, 5).toString() === "%PDF-";
      const ds = ok ? parseSofia(pdfText(buf), u) : [];
      prev.files[u] = ds.length;
      if (ds.length) { prev.decisions.push(...ds); added += ds.length; miss = 0; } else if (n > max) miss++;
    }
    if (y < thisYear) (prev.done ??= {})[y] = true;
  }
  return added;
}

// Благоевград: „ОБЩИНСКИ СЪВЕТ БЛАГОЕВГРАД … № N от ДД.ММ.ГГГГ … ПРОТОКОЛ № P … Т.k. <въпрос> Докл. - <кой> – <длъжност> …
// „За” гласуваха X …, Y „против” и Z „въздържали се“ … Р Е Ш Е Н И Е № N <текст> ……… <подпис>“.
const cnt = (w) => (/^(без|няма)$/i.test(w) ? 0 : +w);
function parseBlg(text, url) {
  const out = [];
  for (const blk of text.replace(/\f/g, "\n").split(/ОБЩИНСКИ\s+СЪВЕТ\s+БЛАГОЕВГРАД\s+ДО(?=[\s….])/).slice(1)) {
    const nm = blk.match(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*[ЕЯ]\s*№\s*(\d+)/);
    if (!nm) continue;
    let dm = blk.match(/№\s*\d+\s+от\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/), date;
    if (dm) date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
    else { dm = blk.match(/ПРОВЕДЕНО\s+НА\s+(\d{1,2})\s+([а-я]+)\s+(\d{4})/i); if (!dm || !MONTHS[dm[2].toLowerCase()]) continue; date = `${dm[3]}-${String(MONTHS[dm[2].toLowerCase()]).padStart(2, "0")}-${dm[1].padStart(2, "0")}`; }
    const head = blk.slice(0, nm.index), rest = blk.slice(nm.index + nm[0].length);
    const sm = head.match(/П\s*Р\s*О\s*Т\s*О\s*К\s*О\s*Л\s*\n?\s*№\s*(\d+)/);
    const tm = head.match(/Т\.\s*\d+[а-я]?\.\s*([\s\S]*?)(?:\n\s*Докл\.|\n\s*Присъстваха|$)/);
    let title = flat(tm ? tm[1] : ""), proposedBy = null;
    const pr = title.match(/^(?:Предложение|Докладна записка|Проект)[^,]*?\s+(?:от|на)\s+(.+?),\s*относно\s*:?\s*/i);
    if (pr) { proposedBy = /^кмета на община/i.test(pr[1]) ? "кмета на общината" : pr[1].replace(/^./, (c) => c.toLowerCase()).slice(0, 120); title = title.slice(pr[0].length); }
    title = title.replace(/^./, (c) => c.toUpperCase());
    if (!title) continue;
    const dk = head.match(/Докл\.\s*-\s*(?:Докл\.\s*-\s*)?([^–—\n]+?)\s*[–—-]\s*([^\n]+)/);
    const rapporteur = dk ? { name: flat(dk[1]).replace(/^(д-р|инж\.?|арх\.?)\s*/i, ""), role: flat(dk[2]).toLowerCase().replace(/^председател на обс.*/, "председател на общинския съвет").replace(/^кмет на община.*/, "кмет на общината").slice(0, 80) } : null;
    const h = flat(head);
    const t = h.match(/За\S?\s+гласуваха\s+(\d+)\s+общински\s+съветни\S*,?\s*(\d+|без|няма)\s*\S?против\S?\s*(?:и|,)\s*(\d+|без|няма)\s*\S?въздърж/i);
    const body = ws(rest.split(/\n\s*\.?…{3,}|\n\s*\.{6,}|\n[^\n]*Председател на Общински съвет/)[0]).replace(/\n\s*\d+\s*\n/g, "\n");
    out.push({
      number: nm[1], date, url, title: title.length > 400 ? title.slice(0, 400).replace(/\s+\S*$/, "") + " …" : title, session: sm ? sm[1] : "",
      rapporteur, proposedBy,
      tally: t ? { for: cnt(t[1]), against: cnt(t[2]), abstain: cnt(t[3]), method: /поименно/.test(h) ? "named" : "open" } : null,
      result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава|избира)|отхвърля)/i.test(body) ? "rejected" : "adopted",
      tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body,
    });
  }
  return out;
}
// Сканиран PDF без текстов слой: страниците → изображения → tesseract (български). Бавно, затова само при нужда.
const ocrPdf = (file) => { try { execFileSync("pdftoppm", ["-r", "200", "-gray", "-png", file, "/tmp/ocr"]); return execFileSync("sh", ["-c", "for f in /tmp/ocr*.png; do tesseract \"$f\" - -l bul --psm 6 2>/dev/null; rm -f \"$f\"; done"], { maxBuffer: 1 << 28 }).toString(); } catch { return ""; } };
const docText = (buf) => { writeFileSync("/tmp/c.doc", buf); try { return execFileSync("antiword", ["-w", "0", "/tmp/c.doc"], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString(); } catch { return ""; } };
async function blgDir(code, S, prev) {
  const dir = `${process.env.BLG_DIR}/${code}`;
  if (!existsSync(`${dir}/index.json`)) return 0;
  let added = 0;
  for (const e of JSON.parse(readFileSync(`${dir}/index.json`, "utf8"))) {
    if (prev.files[e.url] || !e.file || !existsSync(`${dir}/${e.file}`)) continue;
    const buf = readFileSync(`${dir}/${e.file}`);
    let text = /\.pdf$/.test(e.file) ? pdfText(buf) : /\.docx$/.test(e.file) ? docxText(buf) : docText(buf);
    if (/\.pdf$/.test(e.file) && text.replace(/\s/g, "").length < 500) text = ocrPdf(`${dir}/${e.file}`); // сканиран PDF
    const ds = parseBlg(text, e.url).filter((d) => d.date >= S.from);
    prev.files[e.url] = ds.length; prev.decisions.push(...ds); added += ds.length;
  }
  return added;
}

// Кюстендил
const knlTail = (s) => s.split(/\n\s*\*{3}|\n\s*(?:РАЗГЛАСЯВАНЕ|Край на дебатите|Гласуване по |На основание чл\.\s*22,?\s*ал\.\s*1 от ЗМСМА|Общински съвет\s*-\s*Кюстендил\s*\n\s*\d+-[а-я]+ заседание)|\n\s*(?:[А-Я][а-я]+\.?\s+)?[А-Я][а-я]+ [А-Я][а-я]+(?:-[А-Я][а-я]+)?[:.]\s/)[0];
// Диспозитивът: след „Р Е Ш И:“, а в протоколите — след последното „На основание … Общински съвет – Кюстендил“ (без „реши“).
const KNL_OP = /(?:^|\n)[ \t]*(?:[IVX]+\.|\d+\.)?[ \t]*(?:Одобрява|Приема|Дава|Утвърждава|Възлага|Избира|Определя|Разрешава|Изменя|Допълва|Отменя|Упълномощава|Не[ \t]+(?:приема|дава|одобрява)|Предоставя|Учредява|Включва|Изключва|Отпуска|Освобождава|Задължава|Променя|Открива|Закрива|Допуска|Съгласува|Обявява|Продава|Отдава|Приватизира|Финансира|Насочва|Кандидатства|Поема|Опрощава|Създава|Прекратява|Овластява|Потвърждава|Удължава)(?=[\s,])/;
const knlBody = (chunk) => {
  const r = chunk.split(/Р\s*Е\s*Ш\s*И\s*:|\n\s*Р\s*Е\s*Ш\s*И\s*\n|\sреши\s*:/i);
  let op = r.length > 1 ? r.slice(1).join(" ") : null;
  if (!op) { const i = chunk.search(KNL_OP); op = i >= 0 ? chunk.slice(i) : null; }
  if (!op) { const m = [...chunk.matchAll(/\n\s*На основание[\s\S]{0,1500}?(?:Общински(?:ят)? съвет(?:\s*[–-]\s*Кюстендил)?)[,:\s]*\n/g)].at(-1); op = m ? chunk.slice(m.index + m[0].length) : chunk; }
  return ws(knlTail("\n" + op)).replace(/(^|\n)\s*\d+\s*(?=\n|$)/g, "$1").trim();
};
const knlBy = (m) => (/Кмет(?:ът|а) на Община Кюстендил/.test(m) ? "кмета на общината" : /Председател(?:ят)? на Общински/.test(m) ? "председателя на общинския съвет" : /общински съветни/i.test(m) ? "общински съветници" : null);
function knlOne(number, date, session, title, chunk, url, tally, rejected) {
  const body = knlBody(chunk);
  const mot = flat(chunk.match(/Мотиви:\s*([\s\S]{0,600})/)?.[1] ?? "");
  if (!title) title = mot.match(/относно\s*:?\s*[„"]?([^„"“]{8,240}?)[“"]?\s*(?:[.,;]\s|$)/i)?.[1] ?? "";
  if (!title) { const f = flat(body).replace(/^(?:[IVX]+\.|\d+\.)\s*/, "").split(/(?<=[.;:])\s/)[0]; title = f.length > 240 ? f.slice(0, 240).replace(/\s+\S*$/, "") + " …" : f; }
  title = flat(title).replace(/^./, (c) => c.toUpperCase());
  if (!title) return null;
  return { number, date, url, title: title.slice(0, 400), session, rapporteur: null, proposedBy: knlBy(mot), tally,
    result: rejected || /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава)|отхвърля)/i.test(body) ? "rejected" : "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body };
}
function parseKnlFile(text, url) {
  const out = [], parts = text.replace(/\f/g, "\n").split(/\n\s*РЕШЕНИЕ\s*\n\s*№\s*(\d+)\s*\n/);
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const c = parts[i + 1], dm = c.match(/проведено на\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!dm) continue;
    const d = knlOne(parts[i], `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`, c.match(/Протокол\s*№\s*(\d+)/)?.[1] ?? "", c.match(/Относно:\s*([\s\S]*?)\n\s*Мотиви:/)?.[1] ?? "", c, url, null, false);
    if (d) out.push(d);
  }
  return out;
}
function parseKnlProtocol(text, url, date, session) {
  const out = [], parts = text.replace(/\f/g, "\n").split(/\n\s*РЕШЕНИЕ\s*\n\s*№\s*(\d+)\s*\n/);
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const before = flat(parts[i - 1].slice(-4000)), c = parts[i + 1];
    const tm = [...before.matchAll(/[„'"]за[“'"]\s*-\s*(\d+)[^\d]{0,40}?[„'"]против[“'"]\s*-\s*(\d+)[^\d]{0,40}?[„'"]въздърж[^“'"]{0,12}[“'"]\s*-\s*(\d+)/g)].at(-1);
    const tally = tm ? { for: +tm[1], against: +tm[2], abstain: +tm[3], method: /поименно/.test(before) || /\n\s*1\.\s+[А-Я][а-я]+ [А-Я][а-я]+:\s*(?:За|Против)/.test(parts[i - 1].slice(-4000)) ? "named" : "open" } : null;
    const tt = [...before.slice(-1500).matchAll(/относно\s*:?\s*[„"]([^“”"]{5,400})[“”"]/gi)].at(-1)?.[1] ?? c.match(/Относно:\s*([\s\S]*?)\n\s*Мотиви:/)?.[1] ?? "";
    const d = knlOne(parts[i], date, session, tt, c, url, tally, /не прие/.test(before.slice(-200)));
    if (d) out.push(d);
  }
  return out;
}
const dehtml = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");
async function knl(code, S, prev) {
  let added = 0;
  const art = await get("https://kyustendil.bg/index.php?option=com_content&view=article&id=354&Itemid=751&lang=bg");
  for (const m of (art ?? "").matchAll(/com_jdownloads&amp;view=download&amp;id=(\d+)&amp;catid=(\d+)/g)) {
    if (timeUp() || blocked) break;
    const u = `https://kyustendil.bg/index.php?option=com_jdownloads&task=download.send&id=${m[1]}&catid=${m[2]}&m=0&lang=bg`;
    if (prev.files[u]) continue;
    const buf = await get(u, true);
    if (!buf || buf.subarray(0, 4).toString() !== "%PDF") continue;
    const ds = parseKnlFile(pdfText(buf), u).filter((d) => d.date >= S.from);
    prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
  }
  const pl = await get("https://obs.kyustendil.bg/protokoli-obs");
  const html = dehtml(pl ?? "");
  // Карта „N-то заседание в ДД.ММ.ГГГГ“ → дата; файлът носи номера на заседанието в името.
  const jdMax = Math.max(0, ...prev.decisions.filter((d) => /jdownloads/.test(d.url)).map((d) => +d.session || 0));
  const dates = Object.fromEntries([...html.matchAll(/(\d+)-[а-я]+ заседание в (\d{2})\.(\d{2})\.(\d{4})/g)].map((m) => [m[1], `${m[4]}-${m[3]}-${m[2]}`]));
  for (const m of html.matchAll(/href="((?:\/uploads|\/?Documents)\/[^"]*?protok?c?ol[^"]*?\.pdf)"/gi)) {
    if (timeUp() || blocked) break;
    const u = new URL(m[1].replace(/^Documents/, "/Documents"), "https://obs.kyustendil.bg/").href;
    if (prev.files[u]) continue;
    const name = decodeURI(u);
    const sn = name.match(/\/(\d{1,3})_[^/]*$/)?.[1] ?? name.match(/(?:Protokol|Protocol|Prototkol|Протокол)[ _№]*(\d{1,3})(?!\d)/i)?.[1];
    if (!sn || !dates[sn] || +sn <= jdMax) continue; // заседанията до 08.2024 вече са от отделните файлове с решения
    const buf = await get(u, true);
    if (!buf || buf.subarray(0, 4).toString() !== "%PDF") continue;
    const ds = parseKnlProtocol(pdfText(buf), u, dates[sn], sn).filter((d) => d.date >= S.from);
    prev.files[u] = ds.length; prev.decisions.push(...ds); added += ds.length;
  }
  return added;
}

// Пловдив: решенията от WordPress API + броене на поименното гласуване от PDF-а към всяко решение.
const unent = (h) => h.replace(/&nbsp;/g, " ").replace(/&#8211;|&ndash;/g, "–").replace(/&#8220;|&#8222;|&#8221;|&bdquo;|&ldquo;|&rdquo;/g, "\"").replace(/&#8217;|&#8216;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
function parsePlovdiv(post) {
  const html = post.content?.rendered ?? "";
  const text = ws(unent(html.replace(/<\/(p|li|div|h\d)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")));
  const number = (unent(post.title?.rendered ?? "").match(/(\d+)/) ?? text.match(/№\s*(\d+)/))?.[1];
  const pm = text.match(/ВЗЕТО\s+С\s+ПРОТОКОЛ\s*№\s*(\d+)\s*ОТ\s*([\d\s.]+?)\s*г/i);
  if (!number || !pm) return null;
  const dg = pm[2].replace(/\s+/g, "").match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!dg) return null;
  const date = `${dg[3]}-${dg[2].padStart(2, "0")}-${dg[1].padStart(2, "0")}`;
  const after = text.slice(text.indexOf(pm[0]) + pm[0].length);
  const om = after.match(/О\s*Т\s*Н\s*О\s*С\s*Н\s*О\s*:?([\s\S]*?)(?:П\s*О\s+П\s*Р\s*Е\s*Д\s*Л\s*О\s*Ж\s*Е\s*Н\s*И\s*Е|На\s+основание)/);
  const title = om ? flat(om[1]).replace(/^[:\s]+/, "").replace(/^./, (c) => c.toUpperCase()) : "";
  const by = after.match(/ПО\s+ПРЕДЛОЖЕНИЕ\s+НА\s*:?\s*([\s\S]*?)\n\s*На\s+основание/i)?.[1];
  const rest = after.split(/Р\s*Е\s*Ш\s*И\s*:/)[1] ?? "";
  const body = ws(rest.split(/\n\s*(?:РЕЗУЛТАТИ ОТ ГЛАСУВАНЕТО|Мотиви\s*:|МОТИВИ|–––|РАЗГЛАСЯВАНЕ|ПРЕДСЕДАТЕЛ)/)[0]);
  if (!title) return null;
  const vote = html.match(/href="([^"]+\.pdf)"[^>]*>(?:<[^>]+>)*\s*РЕЗУЛТАТИ ОТ ГЛАСУВАНЕТО/i)?.[1] ?? null;
  return { number, date, url: post.link, title: title.slice(0, 400), session: pm[1], rapporteur: null, proposedBy: by ? flat(by).slice(0, 160) : null,
    tally: null, voteUrl: vote, result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава|разрешава|избира)|отхвърля)/i.test(body) ? "rejected" : "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body };
}
// Поименното гласуване: всеки ред „<три имена> [група] <За|Против|Въздържал се>“. Ако в PDF-а има няколко гласувания (по подвъпроси), взимаме последното.
function plovdivTally(t) {
  const blocks = t.split(/Поименно\s+гласуване/i).slice(1);
  const b = blocks.length ? blocks[blocks.length - 1] : t;
  let f = 0, a = 0, ab = 0;
  for (const m of b.matchAll(/^\s*[А-Я][а-я][^\n]*?\s{2,}(За|Против|Въздържал\s+се)\s*$/gm)) { if (m[1] === "За") f++; else if (m[1] === "Против") a++; else ab++; }
  return f + a + ab >= 10 ? { for: f, against: a, abstain: ab, method: "named" } : null;
}
async function plovdiv(code, S, prev) {
  let added = 0;
  for (let p = 1; p < 60; p++) {
    if (timeUp() || blocked) break;
    const raw = await get(`${S.wpApi}&page=${p}`, false, 2);
    let posts; try { posts = JSON.parse(raw ?? ""); } catch { break; }
    if (!Array.isArray(posts) || !posts.length) { prev.complete = true; break; }
    let fresh = 0;
    for (const post of posts) {
      if (timeUp() || blocked) break;
      if (post.link in prev.files) continue;
      fresh++;
      const d = parsePlovdiv(post);
      if (d && d.voteUrl) { const buf = await get(d.voteUrl.replace(/^http:/, "https:"), true, 2); if (buf) d.tally = plovdivTally(pdfText(buf)); }
      prev.files[post.link] = d ? 1 : 0;
      if (d && d.date >= S.from) { prev.decisions.push(d); added++; }
    }
    if (fresh === 0 && prev.complete) break;
  }
  return added;
}

// Общо разчитане на текста на едно решение (страница или публикация). fb: номер/дата/адрес, ако текстът не ги съдържа.
const MONTHS2 = { януари: 1, февруари: 2, март: 3, април: 4, май: 5, юни: 6, юли: 7, август: 8, септември: 9, октомври: 10, ноември: 11, декември: 12 };
function dateOf(s) {
  const d = s.replace(/\s+(?=\d)/g, (m, i) => (/\d\.\s*$/.test(s.slice(0, i)) ? "" : m)).match(/(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/);
  if (d) return `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}`;
  const w = s.match(/(\d{1,2})\s+(януари|февруари|март|април|май|юни|юли|август|септември|октомври|ноември|декември)\s+(\d{4})/i);
  return w ? `${w[3]}-${String(MONTHS2[w[2].toLowerCase()]).padStart(2, "0")}-${w[1].padStart(2, "0")}` : null;
}
function parseGeneric(text, fb) {
  const t = ws(text);
  const nm = t.match(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*:?\s*(?:№|N|No)?\s*(\d+(?:\s*[–-]\s*\d+)?)/i);
  const pt = !nm && t.match(/Решение\s+по\s+т\.\s*(\d+)[\s\S]{0,40}?Протокол\s*№\s*(\d+)/i); // „Решение по т.1 от Протокол №10/…“
  const number = fb.number || (nm ? nm[1].replace(/\s*[–-]\s*/, "-") : pt ? `${pt[2]}-${pt[1]}` : null);
  const pm = t.match(/П\s*Р\s*О\s*Т\s*О\s*К\s*О\s*Л\s*(?:№|N)\s*(\d+)[^\n]{0,80}/i);
  const date = (pm && dateOf(pm[0])) || (nm && dateOf(t.slice(t.indexOf(nm[0]), t.indexOf(nm[0]) + 160))) || fb.date;
  if (!number || !date) return null;
  const hd = nm ?? pt;
  const after = hd ? t.slice(t.indexOf(hd[0]) + hd[0].length) : t;
  const om = after.match(/(?:О\s*Т\s*Н\s*О\s*С\s*Н\s*О|ОТН\.|(?:^|\n)\s*Относно)\s*:?\s*([\s\S]{5,600}?)(?:\n\s*(?:ПО\s+ПРЕДЛОЖЕНИЕ|ПО\s+ДОКЛАД|На\s+основание|Общинск\S+\s+съвет|ОБЩИНСКИЯТ?\s+СЪВЕТ)|\s+След\s+направеното|\s+[Сс]ъс?\s+\d+\s+глас|$)/);
  const reshi = after.split(/Р\s*Е\s*Ш\s*И\s*:?/);
  const body = ws((reshi.length > 1 ? reshi.slice(1).join(" ") : after).split(/\n\s*(?:ПРЕДСЕДАТЕЛ|Председател\s+на|Мотиви\s*:|МОТИВИ|Гласували|ГЛАСУВАЛИ|Резултати от гласуването|РАЗГЛАСЯВАНЕ)/)[0]);
  // Без „Относно“: заглавие от началото на решението, без правното основание („На основание …, Общински съвет – X …“).
  const lead = flat(body).replace(/^\d+\.\s*/, "")
    .replace(/^(?:Ha|На)\s+основание[\s\S]{0,900}?(?:Р\s*Е\s*Ш\s*И\s*:?|реши\s*:|Общинск\S*\s+съвет\S*(?:\s*[–-]\s*|\s+)(?:гр(?:ад)?\.?\s*)?[А-Я][а-я]+(?:\s+[А-Я][а-я]+)?)\s*,?\s*:?\s*/, "")
    .replace(/^\s*Общинск\S*\s+съвет\S*\s*[–-]?\s*(?:[А-Я][а-я]+\s*)?,?\s*/, "").replace(/^\s*реши\s*:?\s*/i, "").replace(/^\d+\.\s*/, "");
  // Край на заглавието: първата точка/точка и запетая, която не е след съкращение (чл., ал., т., гр., ул. …).
  let title = om ? flat(om[1]) : fb.title ? flat(fb.title) : (lead.match(/^[\s\S]{10,300}?(?=\s\d+\.\d*\s|(?<!(?:^|[\s(])(?:чл|ал|т|гр|с|ул|бл|вх|ет|ап|д|г|лв|кв|м|пл|бул|р-н|ж\.к|№|ПИ|УПИ|ид|изм|доп|бр|ДВ|стр|пр|кв\.м))[.;:](?:\s|$))/)?.[0] ?? lead.slice(0, 300));
  title = title.replace(/^[:\s–-]+/, "").replace(/^./, (c) => c.toUpperCase());
  if (!title) return null;
  // Гласуването може да е преди решението („Гласували 20: „за“ – 20 …“, в края на предходния откъс) или след него.
  // Ако в края на този откъс вече започва увод към следващото решение, не го броим за това решение.
  const own = t.replace(/(?<=[\s\S]{80})\n[^\n]*(?:Присъствали|Гласували)\s+\d+\s*:[\s\S]*$/, "");
  const vt = own + "\n" + (fb.pre ?? "").split(/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е/).pop();
  const vm = vt.match(/(?:[„“"”]?за[“”"]?\s*[–:-]?\s*(\d+)[\s,;]+[„“"”]?против[“”"]?\s*[–:-]?\s*(\d+)[\s,;]+[„“"”]?въздърж\S*(?:\s+се)?[“”"]?\s*[–:-]?\s*(\d+))|(?:с\s+(\d+)\s+глас\S*\s*[„“"”]?за[“”"]?,?\s*(\d+|без)\s*(?:глас\S*\s*)?[„“"”]?против[“”"]?\s*и\s*(\d+|без))/i);
  const nn = (x) => (/без/i.test(x) ? 0 : +x);
  const vk = !vm && vt.match(/(\d+|без)\s+глас\S*\s*„?\s*ЗА\s*[”“"]?\s*,?\s*(\d+|без)\s+глас\S*\s*„?\s*ПРОТИВ\s*[”“"]?\s*,?\s*и?\s*(\d+|без)\s+глас\S*\s*„?\s*ВЪЗДЪРЖ/i);
  const tally = vm ? (vm[1] ? { for: +vm[1], against: +vm[2], abstain: +vm[3] } : { for: +vm[4], against: nn(vm[5]), abstain: nn(vm[6]) }) : vk ? { for: nn(vk[1]), against: nn(vk[2]), abstain: nn(vk[3]) } : null;
  if (tally) tally.method = /поименно/i.test(vt) ? "named" : "open";
  const by = t.match(/(?:ПО\s+ПРЕДЛОЖЕНИЕ\s+НА|ВНОСИТЕЛ|Вносител)\s*:?\s*([^\n]{3,140})/)?.[1];
  return { number, date, url: fb.url, title: title.slice(0, 400), session: pm ? pm[1] : "", rapporteur: null, proposedBy: by ? flat(by) : null, tally,
    result: /^\s*(1\.\s*)?(не\s+(приема|одобрява|дава|разрешава|избира)|отхвърля)/i.test(body) ? "rejected" : "adopted",
    tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
    text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body };
}
const htmlText2 = (h) => unent(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").replace(/<\/(p|li|div|h\d|tr|td)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "));
// WordPress: категорията се намира по име; публикациите се четат по 50 от най-новите към по-старите.
async function wpGeneric(code, S, prev) {
  let added = 0;
  if (!S.cat) {
    let cats; try { cats = JSON.parse((await get(`${S.wp}/wp-json/wp/v2/categories?per_page=100&search=${encodeURIComponent("решени")}`, false, 2)) ?? ""); } catch { cats = []; }
    S.cat = (Array.isArray(cats) ? cats : []).filter((c) => S.wpCat.test(unent(c.name))).sort((a, b) => b.count - a.count)[0]?.id;
    if (!S.cat) { console.log(`${S.name}: няма категория с решения`); return 0; }
  }
  for (let p = 1; p < 80; p++) {
    if (timeUp() || blocked) break;
    let posts; try { posts = JSON.parse((await get(`${S.wp}/wp-json/wp/v2/posts?categories=${S.cat}&per_page=50&orderby=date&order=desc&after=${S.from}T00:00:00&page=${p}`, false, 2)) ?? ""); } catch { break; }
    if (!Array.isArray(posts) || !posts.length) { prev.complete = true; break; }
    let fresh = 0;
    for (const post of posts) {
      if (post.link in prev.files) continue;
      fresh++;
      const ttl = unent(post.title?.rendered ?? "");
      const html = post.content?.rendered ?? "", txt = htmlText2(html);
      let ds = [];
      if (/Р\s*Е\s*Ш\s*И|РЕШЕНИЕ\s*№[\s\S]{40,}/.test(txt) && txt.length > 400) {
        const d = parseGeneric(txt, { number: /решение/i.test(ttl) ? ttl.match(/(\d+)/)?.[1] : null, date: dateOf(ttl) ?? post.date.slice(0, 10), url: post.link });
        if (d) ds = [d];
      } else {
        // Публикацията е само връзки към файлове: четем PDF-ите (едно решение или целия протокол).
        let files = [...html.matchAll(/href="([^"]+\.(?:pdf|docx?))"/gi)].map((m) => new URL(unent(m[1]), S.wp).href);
        if (!files.length) { // прикачени файлове извън текста (приставки като „WP Attachments“)
          try { files = JSON.parse((await get(`${S.wp}/wp-json/wp/v2/media?parent=${post.id}&per_page=50`, false, 2)) ?? "[]").map((x) => x.source_url).filter((u) => /\.(pdf|docx?)$/i.test(u ?? "")); } catch {}
        }
        for (const u of [...new Set(files)].slice(0, 40)) {
          if (timeUp()) break;
          const buf = await get(u, true, 2);
          if (!buf) continue;
          const tx = /\.docx$/i.test(u) ? docxText(buf) : /\.doc$/i.test(u) ? docText(buf) : pdfText(buf);
          const sp = splitDecisions(tx, u, dateOf(ttl) ?? post.date.slice(0, 10));
          // Един файл = едно решение с номер в заглавието на публикацията (напр. „Решение № 1203/29.10.2026г.“)
          if (!sp.length && /решение/i.test(ttl)) { const d = parseGeneric(tx, { number: ttl.match(/(\d+)/)?.[1], date: dateOf(ttl) ?? post.date.slice(0, 10), url: u }); if (d) sp.push(d); }
          ds.push(...sp);
        }
      }
      if (timeUp()) break; // не отбелязваме като прочетена публикация, чиито файлове не стигнахме да прочетем
      prev.files[post.link] = ds.length;
      for (const d of ds) if (d.date >= S.from) { prev.decisions.push(d); added++; }
    }
    if (fresh === 0 && prev.complete) break;
  }
  return added;
}
// Файл с едно или много решения (протокол): разделяме по „Р Е Ш Е Н И Е №“; датата е от протокола, ако решението не я съдържа.
function splitDecisions(text, url, fallbackDate) {
  const t = text.replace(/\f/g, "\n");
  const head = dateOf((t.match(/П\s*Р\s*О\s*Т\s*О\s*К\s*О\s*Л[\s\S]{0,200}/i) ?? [""])[0]) ?? fallbackDate;
  const parts = t.split(/(?=Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е\s*:?\s*(?:№|N)?\s*\d)|(?=Решение\s+по\s+т\.\s*\d)/);
  const out = [], seen = new Set();
  for (let i = 0; i < parts.length; i++) {
    const ch = parts[i];
    if (!/^(Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е|Решение\s+по\s+т\.)/.test(ch)) continue;
    // Заглавието често е точката от дневния ред точно преди решението („ПО ПЪРВА ТОЧКА ОТ ДНЕВНИЯ РЕД / …“).
    const ag = i > 0 ? [...parts[i - 1].matchAll(/ТОЧКА\s+ОТ\s+ДНЕВНИЯ\s+РЕД\s*:?\s*\n([\s\S]{5,700}?)\n\s*\n/g)].pop()?.[1] : null;
    const d = parseGeneric(ch, { number: null, date: head, url, title: ag, pre: i > 0 ? parts[i - 1].slice(-700) : "" });
    if (d && !seen.has(d.number)) { seen.add(d.number); out.push(d); }
  }
  return out;
}
// Страници с файлове (и/или с текста на решенията направо в страницата).
// Протокол, в който всяка точка завършва с „РЕШИ № N“ и гласуването е след текста (Царево).
function splitReshi(tx, url) {
  const t = tx.replace(/\r/g, "");
  const date = dateOf(t.slice(0, 1500));
  const session = t.slice(0, 600).match(/П\s*Р\s*О\s*Т\s*О\s*К\s*О\s*Л\s*№\s*(\d+)/)?.[1] ?? "";
  if (!date) return [];
  const out = [];
  for (const ch of t.split(/\n\s*ПО\s+ТОЧКА\s+\d+\s*\.?/i).slice(1)) {
    const nm = ch.match(/РЕШИ\s*:?\s*№\s*(\d+)/);
    if (!nm) continue;
    const title = flat(ch.match(/относно\s*:?\s*[„"“]([\s\S]{5,600}?)[“”"]\s*(?:\/|\n)/i)?.[1] ?? ch.slice(0, 300)).replace(/^Докладна записка от .{3,120}?относно:?\s*/i, "");
    const after = ch.slice(nm.index + nm[0].length);
    const end = after.search(/Гласували\s*[„"“]?за/i);
    const body = flat(end > 0 ? after.slice(0, end) : after.slice(0, 1500)).replace(/\s*\d+\.\s*[А-Я][а-я]+\s+[А-Я][а-я]+\s+[А-Я][а-я]+\s*[-–]\s*[„"“].*$/, "");
    const vm = after.match(/Гласували\s*[„"“]?за[“”"]?\s*[-–]?\s*(\d+)\s*,\s*[„"“]?против[“”"]?\s*[-–]?\s*(\d+)\s*,\s*[„"“]?въздържали\s+се[“”"]?\s*[-–]?\s*(\d+)/i);
    const by = ch.match(/Докладна записка от\s+(.{3,120}?)\s*,?\s*относно/i)?.[1];
    out.push({ number: nm[1], date, url, title: title.slice(0, 400), session, rapporteur: null, proposedBy: by ? flat(by) : null,
      tally: vm ? { for: +vm[1], against: +vm[2], abstain: +vm[3], method: /[-–]\s*[„"“]за[“”"]/.test(after.slice(0, end > 0 ? end : 3000)) ? "named" : "open" } : null,
      result: /^\s*(\S+\.\s*)?(не\s+(приема|одобрява|дава|разрешава|избира)|отхвърля)/i.test(body) ? "rejected" : "adopted",
      tags: TAGS.filter(([, re]) => re.test(title + " " + body.slice(0, 300))).map(([k]) => k).slice(0, 2),
      text: body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, "") + " …" : body });
  }
  return out;
}
async function filesGeneric(code, S, prev) {
  let added = 0;
  const seenPages = new Set(), queue = [...S.pages()];
  const take = (ds) => { for (const d of ds) if (d.date >= S.from) { prev.decisions.push(d); added++; } };
  while (queue.length) {
    if (timeUp() || blocked) break;
    const pu = queue.shift();
    if (seenPages.has(pu)) continue;
    seenPages.add(pu);
    const isSub = !S.pages().includes(pu);
    if (isSub && pu in prev.files && !S.recheckSubs) continue;
    const html = S.render ? await render(pu) : await get(pu, false, 2);
    if (!html) continue;
    if (S.sub) for (const m of html.matchAll(S.sub)) queue.push(new URL(unent(m[1]), S.base).href);
    const main = S.whole ? html : html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html;
    if (S.inline && isSub) { const tx = htmlText2(main); take(splitDecisions(tx, pu, dateOf(tx.slice(0, 600)))); prev.files[pu] = 1; }
    if (S.pagePdf && isSub) { const buf = await get(`${pu}?pdf=1`, true, 2); if (buf) { const ds = splitDecisions(pdfText(buf), pu, null); take(ds); prev.files[pu] = ds.length; } }
    const files = [...main.matchAll(/href="([^"]+(?:\.(?:pdf|docx?)(?:[?#][^"]*)?|download-file\.php[^"]*))"[^>]*>([\s\S]{0,200}?)<\/a>/gi)]
      .filter((m) => !S.fileRe || S.fileRe.test(m[1] + " " + m[2])).map((m) => ({ u: new URL(unent(m[1]).replace(/#.*$/, ""), S.base).href, t: htmlText2(m[2]) }));
    if (process.env.DEBUG) console.log("DBG page", pu, html.length, "files", files.length);
    for (const f of files) {
      if (timeUp() || blocked) break;
      if (f.u in prev.files) continue;
      const buf = await get(f.u, true, 2);
      if (!buf) continue;
      const kind = /\.docx(\?|$)/i.test(f.u) ? "docx" : /\.doc(\?|$)/i.test(f.u) ? "doc" : /\.pdf(\?|$)/i.test(f.u) ? "pdf" : fileKind(buf);
      let tx = kind === "docx" ? docxText(buf) : kind === "doc" ? docText(buf) : pdfText(buf);
      // Сканиран PDF (почти без текст): разпознаване на текста от изображенията.
      if (kind === "pdf" && tx.replace(/\s/g, "").length < 200 * Math.max(1, (tx.match(/\f/g) ?? []).length) / 4) { writeFileSync("/tmp/s.pdf", buf); tx = ocrPdf("/tmp/s.pdf") || tx; }
      const ds = S.reshi ? splitReshi(tx, f.u) : splitDecisions(tx, f.u, dateOf(f.t));
      if (process.env.DEBUG) { const k = Math.floor(tx.length * 0.45); console.log("DBG file", kind, ds.length, k, JSON.stringify(tx.slice(k, k + 1800).replace(/ {3,}/g, "  "))); }
      // Един файл = едно решение, а номерът е само във връзката („Решение 331“).
      if (!ds.length) { const n = f.t.match(/Решение\s*№?\s*(\d+)/i)?.[1]; const d = n && parseGeneric(tx, { number: n, date: dateOf(f.t) ?? dateOf(tx.slice(0, 1500)), url: f.u }); if (d) ds.push(d); }
      prev.files[f.u] = ds.length;
      take(ds);
    }
  }
  prev.complete = !timeUp();
  return added;
}
// Списък със страници на решения (по една страница на решение).
async function listGeneric(code, S, prev) {
  let added = 0;
  // S.index: страница със заседанията → всяко заседание е отделен списък с решения.
  const idx = S.index ? await get(S.index, false, 2) : null;
  const lists = idx ? [...new Set([...idx.matchAll(S.indexRe)].map((m) => new URL(unent(m[1]), S.base).href))] : null;
  for (let p = 0; p < (lists ? lists.length : 200); p++) {
    if (timeUp() || blocked) break;
    const lu = lists ? lists[p] : S.list(p);
    const list = S.render ? await render(lu) : await get(lu, false, 2);
    if (!list) break;
    const links = [...new Set([...list.matchAll(S.item)].map((m) => new URL(unent(m[1]), S.base).href))];
    if (!links.length) { if (lists) continue; prev.complete = true; break; }
    let fresh = 0, old = 0;
    for (const u of links) {
      if (timeUp() || blocked) break;
      if (u in prev.files) continue;
      fresh++;
      let page = await get(u);
      if (S.render && (!page || !/Р\s*Е\s*Ш\s*Е\s*Н\s*И\s*Е/i.test(htmlText2(page)))) page = await render(u);
      if (!page) continue;
      const main = (S.mainRe && page.match(S.mainRe)?.[0]) || page.match(/<main[\s\S]*?<\/main>/i)?.[0] || page;
      const mt = htmlText2(main);
      const d = parseGeneric(mt, { number: u.match(/reshenie-(\d+)/)?.[1], date: dateOf(u.replace(/.*-ot-(\d{2})(\d{2})(\d{4}).*/, "$1.$2.$3")), url: u });
      if (d && S.urlDate) { const ud = dateOf(u.replace(/.*-ot-(\d{2})(\d{2})(\d{4}).*/, "$1.$2.$3")); if (ud) d.date = ud; }
      if (d && S.titleRe) { const tm = mt.match(S.titleRe); if (tm) { d.title = tm[1].replace(/\s+/g, " ").trim(); if (tm[2]) d.proposedBy = tm[2].replace(/\s+/g, " ").trim(); } }
      prev.files[u] = d ? 1 : 0;
      if (d) { if (d.date >= S.from) { prev.decisions.push(d); added++; } else old++; }
    }
    if (old > 0) { prev.complete = true; break; }
    if (fresh === 0 && prev.complete && !lists) break;
  }
  if (lists && !timeUp()) prev.complete = true;
  return added;
}

const VERSION = 2; // смяна на разчитането → всички файлове се четат наново
mkdirSync("data/council", { recursive: true });
for (const [code, S] of Object.entries(SITES)) {
  if (process.env.ONLY && process.env.ONLY !== code) continue;
  const f = `data/council/${code}.json`;
  let prev = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  if (!prev || prev.version !== VERSION) prev = { files: {}, decisions: [] };
  if (S.blgDir && !process.env.BLG_DIR) continue; // чете се само от council-mac.yml
  if (S.pages || S.wp || S.list || S.wpApi || S.vidin || S.knl || S.blgDir || S.numbered || S.wpList || S.sessionPdfs || S.listPages || S.yearFiles || S.sessionNodes || S.sessionList || S.protocolDocx || S.docList || S.montana || S.nkList || S.pzStart || S.yambol || S.vratza) {
    const added = S.pages ? await filesGeneric(code, S, prev) : S.wp ? await wpGeneric(code, S, prev) : S.list ? await listGeneric(code, S, prev) : S.wpApi ? await plovdiv(code, S, prev) : S.vidin ? await vidin(code, S, prev) : S.knl ? await knl(code, S, prev) : S.blgDir ? await blgDir(code, S, prev) : S.vratza ? await vratza(code, S, prev) : S.yambol ? await yambol(code, S, prev) : S.pzStart ? await pazardzhik(code, S, prev) : S.nkList ? await nkList(code, S, prev) : S.montana ? await montana(code, S, prev) : S.docList ? await docList(code, S, prev) : S.protocolDocx ? await protocolDocx(code, S, prev) : S.sessionList ? await sessionList(code, S, prev) : S.sessionNodes ? await sessionNodes(code, S, prev) : S.yearFiles ? await yearFiles(code, S, prev) : S.numbered ? await numbered(code, S, prev) : S.wpList ? await wordpress(code, S, prev) : S.sessionPdfs ? await sessionPdfs(code, S, prev) : await protocolPages(code, S, prev);
    const seen = new Map();
    if (S.yearFiles) prev.decisions = prev.decisions.filter((d) => d.title);
    for (const d of prev.decisions) { d.title = d.title.replace(/^ОС_\d+\/[\d.]+\s*[–-]\s*/, "").replace(/^(?:Доклад|Докладна записка|Проект на решение|Предложение)\s+от\s+.{3,160}?,\s*относно\s*:?\s*/i, "").replace(/^./, (c) => c.toUpperCase()).replace(/^[А-ЯA-Z]\s+За\s+(.)/, (_, c) => c.toUpperCase()); seen.set(`${d.date.slice(0, 4)}-${d.number}`, d); }
    const decisions = [...seen.values()].sort((a, b) => b.date.localeCompare(a.date) || +b.number - +a.number);
    if (!decisions.length && !existsSync(f)) continue; // нищо прочетено (напр. свърши времето) — не пишем празен файл
    writeFileSync(f, JSON.stringify({ version: VERSION, code, name: S.name, source: S.pages ? S.pages()[0] : S.wp ? S.wp : S.list ? S.list(0) : S.wpApi ? "https://www.plovdiv.bg/общински-съвет/нормативна-база/решения/" : S.vidin ? "https://vidinobs.com/resheniq" : S.knl ? "https://obs.kyustendil.bg/reshenia-obs" : S.blgDir ? "https://blagoevgrad.bg/header-menu/resheniia-na-obshtinski-suvet" : S.numbered ? "https://council.sofia.bg" : S.yearFiles ? S.yearFiles(new Date().getFullYear()) : S.sessionNodes ? S.sessionNodes(0) : S.sessionList ? S.sessionList : S.protocolDocx ? S.protocolDocx(0) : S.docList ? S.docList : S.montana ? S.montana : S.nkList ? S.nkList(0) : S.pzStart ? S.pzStart[0] : S.yambol ? S.yambol : S.vratza ? S.vratza(1) : new URL(S.wpList?.(1) ?? S.sessionPdfs ?? S.listPages(0)).origin, updated: new Date().toISOString().slice(0, 10), files: prev.files, done: prev.done ?? {}, complete: prev.complete ?? false, decisions }));
    console.log(`${S.name}: ${added} нови решения, общо ${decisions.length}`);
    continue;
  }
  if (timeUp()) continue;
  const idx = await get(S.index);
  if (!idx) { console.log(`${S.name}: сайтът не отговаря, пазим старите данни`); continue; }
  // Старите години вече са прочетени: обхождаме само текущата и предходната.
  const known = Object.keys(prev.files).length > 0;
  const thisYear = new Date().getFullYear();
  const years = [...idx.matchAll(S.yearLink)].map((m) => ({ url: m[1], year: +m[2] })).filter((y) => y.year >= +S.from.slice(0, 4) && (!known || y.year >= thisYear - 1));
  const files = [];
  for (const y of years) {
    const page = await get(y.url);
    if (!page) continue;
    for (const m of page.matchAll(/href="(https:\/\/botevgrad\.bg\/data\/[a-z]+\/files\/\d+\.pdf)[^"]*"[^>]*>\s*<\/a>|href="(https:\/\/botevgrad\.bg\/data\/[a-z]+\/files\/\d+\.pdf)/g)) {
      const u = m[1] ?? m[2];
      if (!files.includes(u)) files.push(u);
    }
  }
  let added = 0;
  for (const u of files) {
    if (prev.files[u]) continue;
    const buf = await get(u, true);
    if (!buf) continue;
    writeFileSync("/tmp/c.pdf", buf);
    let text = "";
    try { text = execFileSync("pdftotext", ["-layout", "/tmp/c.pdf", "-"], { maxBuffer: 1 << 28 }).toString(); } catch { continue; }
    const ds = parse(text, u).filter((d) => d.date >= S.from);
    prev.files[u] = ds.length;
    prev.decisions.push(...ds);
    added += ds.length;
  }
  const seen = new Map();
  for (const d of prev.decisions) seen.set(`${d.date.slice(0, 4)}-${d.number}`, d);
  const decisions = [...seen.values()].sort((a, b) => b.date.localeCompare(a.date) || +b.number - +a.number);
  writeFileSync(f, JSON.stringify({ version: VERSION, code, name: S.name, source: S.index, updated: new Date().toISOString().slice(0, 10), files: prev.files, decisions }));
  console.log(`${S.name}: ${files.length} файла, ${added} нови решения, общо ${decisions.length}; с гласуване ${decisions.filter((d) => d.tally).length}`);
}
if (browser) await browser.browser()?.close().catch(() => {});
