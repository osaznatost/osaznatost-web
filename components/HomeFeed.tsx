// Началната страница: най-новото, най-съмнителното и най-интересното от останалите раздели.
// Всичко е от данните в хранилището (обновяват се автоматично), без заявки при отваряне.
import Link from "next/link";
import { SectionTitle } from "@/components/ui";
import BUDGET from "@/data/budget.json";
import RISK from "@/data/risk.json";
import CHECKS from "@/content/checks.json";
import CASES from "@/content/cases.json";
import { FUNDS, bn } from "@/lib/funds";
import { LOCAL_INDEX, localData } from "@/lib/local";
import { VOTES, formatDate } from "@/lib/parliament";
import { contractRef, firmUrl, fmtEur } from "@/lib/procurement";
import { oblastSlug, muniSlug } from "@/lib/regions";
import { personPage } from "@/lib/people";
import { BAD, STATUS, data as PROMISES, govSlug } from "@/lib/promises";

const FLAG: Record<string, string> = {
  single: "една оферта", direct: "без открит конкурс", over: "над прогнозната стойност", exact: "цена почти равна на прогнозната",
  annex: "оскъпяване с анекси", disq: "отстранени конкуренти", threshold: "точно под прага", political: "фирма, свързана с политик", sub: "подизпълнител",
};
const NEW = /(параграф|чл\.|член)[^,]*[–-]\s*нов(и|а)?(?![а-я])/i;
const MONTHS = ["", "януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];

type Top = { id: string; buyer: string; buyerEik: string; number: string; suppliers: string[]; supplierEiks: string[]; title: string; date: string; value: number; flags: string[]; score: number };
type Agg = { key: string; name: string; n: number; value: number; risky: number; riskyValue: number; political: number };

const card = "ring-1 ring-rule rounded-lg p-5 bg-white";
const dmy = (d: string) => d.split("-").reverse().join(".");

export function HomeFeed() {
  const R = RISK as unknown as { updated: string; total: number; byScore: Record<string, number>; top: Top[]; suppliers: Agg[] };
  const laws = [...VOTES].filter((v) => /закон/i.test(v.title) && !/процедур/i.test(v.title)).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);
  const lastDate = VOTES.reduce((m, v) => (v.date > m ? v.date : m), "");
  const since = new Date(new Date(lastDate).getTime() - 90 * 864e5).toISOString().slice(0, 10);
  const newTexts = VOTES.filter((v) => v.date >= since && /второ гласуване/i.test(v.title) && NEW.test(v.title));
  const dossiers = [...(CHECKS as { dossiers: { slug: string; title: string; date: string; lead: string }[] }).dossiers].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  const cases = (CASES as { cases: { person: string; level: string; date: string; what: string }[]; levels: Record<string, { label: string }> });
  const recentCases = [...cases.cases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const risky = [...R.top].filter((t) => t.score >= 60).sort((a, b) => b.value - a.value).slice(0, 5);
  const polSup = [...R.suppliers].filter((s) => s.political > 0).sort((a, b) => b.riskyValue - a.riskyValue).slice(0, 5);
  const gov = PROMISES.parties.find((g) => g.term === "current");
  const govBad = gov?.promises.filter((p) => BAD.includes(p.status) || p.status === "at_risk") ?? [];
  const B = BUDGET as unknown as { year: number; execution: { throughMonth: number | null; revenue: { annualisedEur: number } | null }; revenue: { total: number } };
  const bot = localData("SFO07");
  const botRes = bot?.resolutions ?? [];
  const nPeople = Object.values(LOCAL_INDEX.munis).reduce((a, m) => a + m.officials, 0);
  const paid = FUNDS.byProgramme.reduce((a, p) => a + p.paid, 0), contracted = FUNDS.byProgramme.reduce((a, p) => a + p.contracted, 0);

  return (
    <>
      <section className="mb-16">
        <SectionTitle>Най-новото</SectionTitle>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className={card}>
            <p className="font-semibold mb-3">Последни гласувания по закони</p>
            <ul className="space-y-3 text-[15px]">{laws.map((v) => (
              <li key={v.id}>
                <span className="text-sm text-muted">{formatDate(v.date)} · <span className={v.outcome === "rejected" ? "text-red" : "text-green"}>{v.outcome === "rejected" ? "отхвърлено" : "прието"}</span> <span className="num">{v.tally.yes} за, {v.tally.no} против</span></span>
                <Link href={`/parlament/glasuvane/${v.id}`} className="block leading-snug">{v.title.length > 140 ? v.title.slice(0, 140) + "…" : v.title}</Link>
              </li>
            ))}</ul>
            <p className="text-sm mt-3"><Link href="/parlament">Всички гласувания</Link></p>
          </div>
          <div className={card}>
            <p className="font-semibold mb-3">Проверки и дела</p>
            <ul className="space-y-3 text-[15px]">
              {dossiers.map((d) => <li key={d.slug}><span className="text-sm text-muted">{dmy(d.date)} · проверка</span><Link href={`/proverki/${d.slug}`} className="block leading-snug">{d.title}</Link></li>)}
              {recentCases.map((c) => <li key={c.person + c.date}><span className="text-sm text-muted">{c.date.split("-").reverse().join(".")} · {cases.levels[c.level]?.label.toLowerCase()}</span><Link href={personPage(c.person) ?? "/proverki/sankcii#dela"} className="block leading-snug">{c.person}: {c.what}</Link></li>)}
            </ul>
            <p className="text-sm mt-3"><Link href="/proverki">Всички проверки</Link> · <Link href="/novini">Новини</Link></p>
          </div>
          <div className={card}>
            <p className="font-semibold mb-3">Ново в данните</p>
            <ul className="space-y-3 text-[15px]">
              <li><Link href="/porachki/risk">{R.total.toLocaleString("bg-BG")} обществени поръчки</Link> с оценка на риска, обновени на {dmy(R.updated)}.</li>
              {B.execution.throughMonth && <li><Link href="/byudzhet">Бюджет {B.year}</Link>: изпълнението до {MONTHS[B.execution.throughMonth]}{B.execution.revenue ? <>; приходите вървят към {bn(B.execution.revenue.annualisedEur)} за годината</> : null}.</li>}
              <li><Link href="/mesta">{nPeople.toLocaleString("bg-BG")} кметове, заместници и съветници</Link> с профил и имуществени декларации по години.</li>
              {botRes.length > 0 && <li><Link href={`/mesta/${oblastSlug("SFO07")}/${muniSlug("SFO07")}#vlast`}>Общински съвет Ботевград</Link>: {botRes.length} решения от 2023 г. насам, последно заседание {dmy(botRes[0].date)}.</li>}
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <SectionTitle right={<Link href="/porachki/risk">Цялата класация</Link>}>Най-съмнителното</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-5 max-w-3xl">Сигнали, не обвинения. Всеки ред води до източника, от който може да се провери. Съмнението идва от признаци като една оферта, липса на конкурс, оскъпяване с анекси или връзка с политик.</p>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={card}>
            <p className="font-semibold mb-3">Най-големите договори с висок риск</p>
            <ul className="space-y-3 text-[15px]">{risky.map((t) => (
              <li key={t.id} className="grid grid-cols-[2.6rem_1fr] gap-3">
                <span className="text-xs font-semibold px-1.5 py-1 rounded-full bg-red text-white text-center h-fit num">{t.score}</span>
                <span><Link href={`/porachki/dogovor/${encodeURIComponent(contractRef(t.buyerEik, t.number))}`} className="leading-snug">{t.title.replace(/^"|"$/g, "").slice(0, 120)}</Link>
                  <span className="block text-sm text-muted">{t.buyer} → {t.suppliers.join(", ")} · <b className="text-ink num">{fmtEur(t.value)}</b> · {t.flags.map((f) => FLAG[f] ?? f).join(", ")}</span></span>
              </li>
            ))}</ul>
          </div>
          <div className="grid gap-5">
            <div className={card}>
              <p className="font-semibold mb-3">Фирми, свързани с политици, с най-много рискови договори</p>
              <ul className="space-y-1.5 text-[15px]">{polSup.map((s) => (
                <li key={s.key} className="flex justify-between gap-3"><Link href={firmUrl(s.key)}>{s.name}</Link><span className="num text-sm whitespace-nowrap">{fmtEur(s.riskyValue)} <span className="text-muted">в {s.risky} договора</span></span></li>
              ))}</ul>
            </div>
            <div className={card}>
              <p className="font-semibold mb-1">Нови текстове, вкарани на второ четене</p>
              <p className="text-[15px]"><b className="num">{newTexts.length}</b> гласувания за последните 3 месеца. Така в закони влизат текстове, които не са минали първо четене и обществено обсъждане. <Link href="/parlament/signali">Кои са</Link></p>
            </div>
            {gov && govBad.length > 0 && (
              <div className={card}>
                <p className="font-semibold mb-2">Обещания на {gov.name}, които засега не се изпълняват</p>
                <ul className="space-y-1.5 text-[15px]">{govBad.slice(0, 4).map((p) => (
                  <li key={p.text}><span className="text-xs px-2 py-0.5 rounded-full mr-1.5" style={{ background: STATUS[p.status].color, color: STATUS[p.status].text }}>{STATUS[p.status].label}</span>{p.text}</li>
                ))}</ul>
                <p className="text-sm mt-2"><Link href={`/obeshtaniya/${govSlug(gov)}`}>Всички обещания</Link></p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-16">
        <SectionTitle>Най-интересното</SectionTitle>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
          ["/byudzhet", `Бюджет ${B.year}`, `Откъде идват ${bn(B.revenue.total)} приходи на централния бюджет и къде отиват, ред по ред спрямо предишните години.`],
          ["/ikonomika/evrosredstva", "Евросредства", `Договорени ${bn(contracted)}, изплатени ${Math.round((paid / contracted) * 100)}%. Кои фирми печелят най-много и кои са свързани с депутати.`],
          ["/ikonomika/pokupatelna-sila", "Покупателна сила", "Колко струват хлябът, токът и наемът у нас спрямо заплатите, в сравнение с Европа."],
          ["/mesta", "Вашата община", "Хората, парите от държавата, проектите, кой управлява и дали има конфликт на интереси."],
          ["/obeshtaniya", "Обещания на правителствата", `${PROMISES.parties.length} правителства: какво обещаха и какво стана, с източник за всяко.`],
          ["/proverki/sankcii", "Корупция", `${cases.cases.length} дела и присъди, санкции по „Магнитски“, без да смесваме обвинение с присъда.`],
        ].map(([href, t, d]) => (
          <li key={href}><Link href={href} className="group block h-full no-underline rounded-lg p-5 bg-surface hover:ring-1 hover:ring-green">
            <span className="display block text-[1.6rem] text-ink group-hover:text-green">{t}</span>
            <span className="block text-[15px] text-muted mt-1">{d}</span>
          </Link></li>
        ))}</ul>
      </section>
    </>
  );
}
