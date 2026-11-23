// Автоматично (без изкуствен интелект) извличане на „двете страни“ за всеки законопроект от документите на парламента:
// изречения от докладите на комисиите и мотивите, разпределени по правила, и началото на изказванията в залата.
// Всичко е дословен цитат с линк към документа. Нищо не се перифразира и не се измисля.
// Пише data/laws-auto.json: { [billId]: { change[], sponsors[], critics[], support[], hall[], votes[], sources[] } }.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const DIR = "data/bills-src";
if (!existsSync(DIR)) process.exit(0);
const SIGN = /\d{2}-\d{3}-\d{2,3}-\d+/g;
const norm = (t) => String(t ?? "").replace(/-\n(?=[а-я])/g, "").replace(/\s+/g, " ").trim();
const sentences = (t) => norm(t).split(/(?<=[.!?])\s+(?=[А-ЯA-Z„])/).map((s) => s.trim()).filter((s) => s.length > 40 && s.length < 520);

// Процедурни изречения, които не казват нищо за съдържанието.
const NOISE = /(присъстваха|присъства |В изпълнение на чл|отговаря(т)? на изискванията|постъпил[аи]? (са )?становища|разгледа(ха)? (и обсъди)?|проведено на|проведе заседание|Правилника за организацията|Закона за нормативните актове|публично обсъждане|на основание чл\. 7|РЕПУБЛИКА БЪЛГАРИЯ|Д О К Л А Д|ДОКЛАД|Относно:|внесен от .{0,80} на \d)/i;
const CHANGE = /(предвижда|предлага се|предлагат се|въвежда|създава се|създават се|отпада|отменя|урежда|регламентира|разширява|ограничава|увеличава|намалява|определя|задължава|забранява|допуска|дава възможност|целта (на законопроекта )?е|цели се|има за цел|се цели|основните промени)/i;
const CRIT = /(необоснован|излиш|съмнени|тежест за|не подкрепя|не подкрепи|не подкрепиха|възраж|опасени|притеснени|резерви|критик|несъгласи|не е обоснован|не са обосновани|противоречи|недостатъчно|рискове|би довело|ще доведе до|категорични)/i;
const SUPP = /(подкрепя|подкрепи|подкрепиха|изрази(ха)? подкрепа|положително становище)(?!.{0,15}не)/i;
const SPOKE = /(посочи|изтъкна|подчерта|обясни|заяви|аргументира|мотивира|отбеляза|допълни|припомни)/i;

// Изказвания в залата: „ИМЕ ФАМИЛИЯ (Група): текст“ — без председателя, доклада и процедурите.
function speeches(text) {
  const out = [];
  const re = /(?:^|\n)\s*([А-ЯЁ][А-ЯЁ\-]+(?: [А-ЯЁ][А-ЯЁ\-]+){1,3})(?: \(([^)\n]{2,40})\))?: ([^\n]{40,})/g;
  for (const m of text.matchAll(re)) {
    const name = m[1];
    if (/^(ПРЕДСЕДАТЕЛ|ДОКЛАДЧИК|ЗАМЕСТНИК|СЕКРЕТАР|МИНИСТЪР)/.test(name) && !m[2]) {
      // министърът и заместниците говорят без група; докладчикът и председателят — пропускаме
      if (!/^(МИНИСТЪР|ЗАМЕСТНИК-МИНИСТЪР)/.test(name)) continue;
    }
    let t = m[3].trim();
    if (t.length < 60 || /^(Благодаря|Уважаем[аи]|Госпожо|Господин)[^.!]{0,80}[.!]\s*$/.test(t)) continue;
    t = t.replace(/^(Благодаря[^.!]{0,60}[.!]\s*)?((Уважаем[аи]|Госпожо|Господин|Дами)[^!.]{0,140}[!.]\s*)*/, "");
    if (t.length < 60 || /^(ще помоля|правя процедурно|процедурно предложение|моля за прегласуване|предлагам да)/i.test(t)) continue;
    const name2 = name.split(" ").filter((w) => !/^(ДОКЛАДЧИК|МИНИСТЪР|ЗАМЕСТНИК-МИНИСТЪР)$/.test(w)).map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
    out.push({ who: name2, group: m[2] ?? null, text: t.slice(0, 420).replace(/\s+\S*$/, "") + (t.length > 420 ? "…" : "") });
  }
  // по едно изказване на човек, най-много 10
  const seen = new Set();
  return out.filter((s) => !seen.has(s.who) && seen.add(s.who)).slice(0, 10);
}

// „Накратко“ без изкуствен интелект: дословно от мотивите на вносителя — целта, основните промени и парите.
const OCR_JUNK = /[а-яё][a-z]|[a-z][а-яё]|[|©®]|(.)\1{3}/i;
function brief(motives) {
  if (!motives || motives.length < 300) return null;
  let t = motives;
  const i = t.search(/М\s*О\s*Т\s*И\s*В\s*И/i); if (i >= 0) t = t.slice(i);
  // до подписите и оценката на въздействието
  const end = t.search(/\n\s*(ВНОСИТЕЛ|ПРЕДВАРИТЕЛНА ОЦЕНКА|МИНИСТЪР-ПРЕДСЕДАТЕЛ|Частична предварителна оценка)/);
  if (end > 200) t = t.slice(0, end);
  const START = /(Законопроектът|Със законопроекта|С (предлаганите|настоящия|проекта)|Предлага(т)? се|Предвижда се|Целта|Основн(ият|ата|ите)|Въвежда се|Създава се)/;
  const fix = (x) => { const m = x.search(START); return m > 0 && m < 80 ? x.slice(m) : x.replace(/^[\d.)\s•–-]+/, ""); };
  // разпознат текст: поне 80% от думите са истински (кирилица, 2+ букви, без смесени знаци)
  const clean = (x) => { const w = x.split(/\s+/); return w.filter((z) => /^[„"(]?[А-Яа-яЁё][а-яё-]+[.,;:)“"]*$|^[„"(]?[А-ЯA-Z]{2,}[)“".,;:]*$|^[(№]?\d|^[–-]$|^(ЕС|ЕО|ЕИО)\)?/.test(z)).length / w.length >= 0.8; };
  // точките от списъци („- …“) са отделни изречения
  t = t.replace(/([.;:])?\s*\n\s*[-–•]\s+/g, ".\n").replace(/([.;:])?\s+[-–]\s+(?=[А-Я])/g, ". ");
  const long = (x) => norm(x).split(/(?<=[.!?])\s+(?=[А-ЯA-Z„])/).map((z) => z.trim()).filter((z) => z.length > 40 && z.length < 1200);
  const ss = long(t.replace(/^М\s*О\s*Т\s*И\s*В\s*И[^\n]*\n(\s*(към|по|на) [^\n]*\n){0,3}/i, ""))
    .map(fix)
    .filter((x) => /^[А-Я„"(]/.test(x) && clean(x) && !OCR_JUNK.test(x) && !/^(Към|По) (проекта|законопроекта)|^Уважаем|^Молим|оценка на въздействието|Вносител|ДВ, бр\./i.test(x));
  const goal = ss.filter((x) => /(цел(та|ите)?|цели се|има за цел|насочен|предлага(т)? се|предвижда|въвежда|създава се|основн(ият|ата|ите) (проблем|цел|промени)|законопроектът)/i.test(x) && !/(финансови средства|бюджетни средства)/i.test(x));
  const cut = (x) => (x.length <= 480 ? x : x.slice(0, x.lastIndexOf(" ", 460)).replace(/[,;:]$/, "") + " […]");
  const pick = goal.slice(0, 3).map(cut);
  const money = ss.find((x) => /(финансови средства|допълнителни (бюджетни )?средства|бюджетни средства|не изисква(т)? (допълнителни )?(разходи|средства))/i.test(x) && x.length < 350) ?? null;
  const eu = ss.find((x) => /(правото на Европейския съюз|транспонира|изискванията на директива|съответствие с (директива|регламент))/i.test(x) && x.length < 350 && !goal.slice(0, 3).includes(x)) ?? null;
  return pick.length ? { brief: pick, money, eu } : null;
}

const out = {};
for (const f of readdirSync(DIR).filter((x) => /^\d+\.json$/.test(x))) {
  const b = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
  const own = (s, joint) => { const signs = s.match(SIGN) ?? []; return signs.length ? signs.includes(b.sign) : !joint; };
  const change = new Set(), crit = new Set(), supp = new Set(), spons = new Set();
  const first = b.reports.filter((r) => /първо/.test(r.stage ?? ""));
  for (const r of first.length ? first : b.reports) {
    const joint = new Set((r.text ?? "").match(SIGN) ?? []).size > 1;
    // в общ доклад — само частта за този законопроект: от изречението с номера му до следващия номер
    let inOwn = !joint;
    for (const s of sentences(r.text)) {
      const signs = s.match(SIGN) ?? [];
      if (signs.length) inOwn = signs.includes(b.sign);
      if (!inOwn && !own(s, joint)) continue;
      if (NOISE.test(s)) continue;
      if (/^(Предлага се|Предвижда се|Създава се|Създават се|Въвежда се|Отпада|Отменя се|Урежда се|С (настоящия )?законопроекта?)/.test(s) && !/(необоснован|излиш|тежест за)/.test(s)) change.add(s);
      else if (CRIT.test(s)) crit.add(s);
      else if (SPOKE.test(s) && /(вносител|представи|народния представител|министър|заместник)/i.test(s)) spons.add(s);
      else if (CHANGE.test(s)) change.add(s);
      else if (SUPP.test(s)) supp.add(s);
    }
  }
  // мотивите (ако са разпознати): изреченията с цел и промени
  for (const s of sentences(b.motives).slice(0, 120)) if (!NOISE.test(s) && /(целта|цели се|има за цел|предлага се|предвижда|необходимост|налага се)/i.test(s)) change.add(s);
  const seenWho = new Set();
  const hall = b.hall.flatMap((h) => speeches(h.text ?? "").map((s) => ({ ...s, date: h.date, stage: h.stage, url: h.url }))).filter((s) => !seenWho.has(s.who + s.text.slice(0, 40)) && seenWho.add(s.who + s.text.slice(0, 40)));
  const take = (set, n) => [...set].slice(0, n);
  const e = {
    id: b.id, sign: b.sign, title: b.title, url: b.url,
    change: take(change, 6), positions: take(spons, 4), critics: take(crit, 6), support: take(supp, 3),
    hall: hall.slice(0, 10),
    opinions: b.opinions.map((o) => o.title.replace(/^Становище (на |от )?/i, "")).slice(0, 12),
    ...(brief(b.motives) ?? {}),
  };
  if (e.change.length || e.critics.length || e.hall.length || e.brief) out[b.id] = e;
}
writeFileSync("data/laws-auto.json", JSON.stringify(out));
const v = Object.values(out);
console.log(`с „накратко“ от мотивите: ${v.filter((x) => x.brief).length}`);
console.log(`data/laws-auto.json: ${v.length} законопроекта; с „какво променя“ ${v.filter((x) => x.change.length).length}, с критики ${v.filter((x) => x.critics.length).length}, с изказвания ${v.filter((x) => x.hall.length).length}`);
