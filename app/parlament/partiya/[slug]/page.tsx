import Link from "next/link";
import { VOTES as ALLV, partyBreakdown, partyPosition } from "@/lib/parliament";
import { lawFromTitle } from "@/lib/voteExplain";
import LAWS from "@/content/laws.json";
import { notFound } from "next/navigation";
import { BarRank } from "@/components/Charts";
import { PartyBadge } from "@/components/PartyBadge";
import { Page, SectionTitle, Title } from "@/components/ui";
import { VoteMap } from "@/components/VoteMap";
import { MPS, PARTIES, TOPICS, agreement, mpStats, partyName, partyStats } from "@/lib/parliament";
import { SectionNav } from "@/components/SectionNav";
import { SANCTIONS, casesFor } from "@/lib/sanctions";
import CASES from "@/content/cases.json";
import PROMISES from "@/content/promises.json";
import { partyByGroup } from "@/lib/partyMeta";
import { ELECTIONS, EXIT, PARTY_META, SUBSIDY, partyBySlug } from "@/lib/partyMeta";
import { fmt } from "@/lib/stats";

export function generateStaticParams() { return PARTY_META.map((p) => ({ slug: p.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: partyBySlug(slug)?.name ?? "Партия" };
}

const MIR: Record<string, string> = {
  BLG: "Благоевград", BGS: "Бургас", VAR: "Варна", VTR: "Велико Търново", VID: "Видин", VRC: "Враца", GAB: "Габрово", DOB: "Добрич", KRZ: "Кърджали",
  KNL: "Кюстендил", LOV: "Ловеч", MON: "Монтана", PAZ: "Пазарджик", PER: "Перник", PVN: "Плевен", PDV: "Пловдив (град)", "PDV-00": "Пловдив (област)",
  RAZ: "Разград", RSE: "Русе", SLS: "Силистра", SLV: "Сливен", SML: "Смолян", SFO: "София (област)", S23: "София 23 МИР", S24: "София 24 МИР", S25: "София 25 МИР",
  SZR: "Стара Загора", TGV: "Търговище", HKV: "Хасково", SHU: "Шумен", JAM: "Ямбол", "32": "Извън страната",
};
const n = (v: number) => v.toLocaleString("bg-BG");
const eur = (v: number) => `${fmt(v / 1e6, 2)} млн. €`;

export default async function PartyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = partyBySlug(slug);
  if (!p) notFound();
  const mps = MPS.filter((m) => m.party === p.group);
  const st = partyStats(p.group);
  const list = ELECTIONS.parties.find((x) => x.num === p.ballot)!;
  const rank = ELECTIONS.parties.findIndex((x) => x.num === p.ballot) + 1;
  const key = String(p.ballot);
  const shares = Object.fromEntries(Object.entries(ELECTIONS.munis).map(([c, m]) => [c, { name: m.name, votes: (m.v as Record<string, number>)[key] ?? 0, pct: m.total ? (((m.v as Record<string, number>)[key] ?? 0) / m.total) * 100 : 0 }]));
  const domestic = Object.entries(shares).filter(([c]) => !/^(AF|AS|EU|NA|OC|SA)$/.test(c)).map(([, s]) => s).filter((s) => s.votes > 0);
  const top = [...domestic].sort((a, b) => b.pct - a.pct).slice(0, 10);
  const bottom = [...domestic].sort((a, b) => a.pct - b.pct).slice(0, 10);
  const regions = ELECTIONS.regions.map((r) => ({ name: MIR[r.code] ?? r.code, value: Math.round((((r.v as Record<string, number>)[key] ?? 0) / r.total) * 1000) / 10 })).sort((a, b) => b.value - a.value);
  const yearly = list.votes * SUBSIDY.after;
  // Как гласува групата по законите с подробен анализ: първо гласуване и окончателно (второ) гласуване на целия закон.
  const keyLaws = Object.entries(LAWS as Record<string, { name: string; summary: string; critics?: unknown }>).map(([lslug, law]) => {
    const vs = ALLV.filter((v) => lawFromTitle(v.title)?.slug === lslug && !/процедура/i.test(v.title));
    const pick = (re: RegExp) => vs.filter((v) => re.test(v.title)).at(-1);
    const first = pick(/първо гласуване/i), final = pick(/второ гласуване|окончателно/i) ?? vs.at(-1);
    const pos = (v?: (typeof ALLV)[number]) => (v ? partyPosition(partyBreakdown(v)[p.group] ?? { y: 0, n: 0, a: 0, x: 0 }) : undefined);
    return { lslug, name: law.name, summary: law.summary, first: pos(first), final: final && final !== first ? pos(final) : undefined, n: vs.length };
  }).filter((x) => x.n);
  const POS: Record<string, [string, string]> = { y: ["За", "text-green"], n: ["Против", "text-red"], a: ["Въздържал се", "text-[#b08436]"], split: ["Разделени", "text-muted"], absent: ["Не гласува", "text-muted"] };
  const shared = p.sharedList ? PARTY_META.find((x) => x.group === p.sharedList) : undefined;
  // По теми: как гласува мнозинството в групата (за / против / въздържал се) по вид гласуване.
  const topics = Object.entries(TOPICS).map(([k, label]) => {
    const c = { y: 0, n: 0, a: 0, split: 0, absent: 0 };
    for (const v of ALLV) if (v.topic === k) c[partyPosition(partyBreakdown(v)[p.group] ?? { y: 0, n: 0, a: 0, x: 0 })]++;
    const t = c.y + c.n + c.a + c.split;
    return { k, label, ...c, t };
  }).filter((x) => x.t > 0);
  // С кого гласува: колко често позицията на групата съвпада с тази на всяка друга група.
  const allies = PARTIES.filter((g) => g !== p.group).map((g) => ({ g, name: partyName(g), v: agreement(p.group, g) })).sort((a, b) => b.v - a.v);
  // Срещу резултата: колко пъти групата е била „за“ отхвърлено или „против“ прието.
  let lost = 0, decided = 0;
  for (const v of ALLV) { const pos = partyPosition(partyBreakdown(v)[p.group] ?? { y: 0, n: 0, a: 0, x: 0 }); if (pos === "y" || pos === "n") { decided++; if ((pos === "y") !== (v.outcome !== "rejected")) lost++; } }
  // Депутатите: присъствие и гласувания срещу собствената група.
  const mpRows = mps.map((m) => { const s2 = mpStats(m.id); return { m, att: s2.eligible ? s2.present / s2.eligible : 0, against: s2.against, present: s2.present }; }).sort((a, b) => a.att - b.att);
  // Сигнали: дела и санкции на хора, свързани с партията (по съдебни и официални източници).
  const nk = (x: string) => x.toUpperCase().replace(/[\s–—-]+/g, "");
  // „ПП–ДБ“ (обща листа) се отнася и към ПП, и към ДБ; иначе съвпадение на имената без интервали и тирета.
  const mine = (party: string | null | undefined) => !!party && (nk(party) === nk(p.group) || (nk(party) === "ППДБ" && (p.group === "ПП" || p.group === "ДБ")));
  const caseList = CASES.cases.filter((c) => mine(c.party)).map((c) => ({ ...c, label: CASES.levels[c.level as keyof typeof CASES.levels].label }));
  const sanctioned = SANCTIONS.people.filter((x) => mine(x.party));
  const mpCases = mps.flatMap((m) => casesFor(m.name).map((c) => ({ m, c })));
  const govs = (PROMISES as { parties: { name: string; party?: string; promises: { status: string }[] }[] }).parties.filter((g) => g.name.includes(p.name) || (g.party ?? "").includes(p.short));

  return (
    <Page>
      <Title back={{ href: "/parlament/partii", label: "Всички групи" }} lead={p.about}>
        <span className="inline-flex items-center gap-4"><PartyBadge p={p} size={64} />{p.name}</span>
      </Title>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        {[
          { l: "Депутати сега", v: n(mps.length), s: <Link href="/parlament/partii">списък и поведение</Link> },
          { l: `Гласове на ${p.sharedList ? "общата листа" : "листата"} (19.04.2026)`, v: n(list.votes), s: `${fmt(list.pct, 2)}% · ${rank}-во място` },
          { l: "Годишна субсидия на листата", v: eur(yearly), s: `по ${fmt(SUBSIDY.after, 2)} € на глас` },
          { l: "Единство при гласуване", v: `${Math.round(st.unity * 100)}%`, s: "колко от групата гласува еднакво средно" },
        ].map((k) => (
          <div key={k.l} className="bg-surface rounded-sm p-4">
            <p className="text-sm text-muted">{k.l}</p>
            <p className="display text-[2.4rem] leading-none mt-1">{k.v}</p>
            <p className="text-xs text-muted mt-1">{k.s}</p>
          </div>
        ))}
      </div>

      <SectionNav items={[["izbirateli", "Избиратели"], ["profil", "Кой гласува за тях"], ["zakoni", "Закони"], ["temi", "По теми"], ["saiuznici", "С кого гласува"], ["signali", "Дела и санкции"], ["subsidiya", "Субсидия"], ["deputati", "Депутати"]]} />

      {shared && (
        <p className="bg-[#fbecc4] rounded-sm px-4 py-3 mb-10 max-w-3xl text-[15px]">
          На изборите {p.name} и <Link href={`/parlament/partiya/${shared.slug}`}>{shared.name}</Link> бяха в обща листа „{p.list}“. Резултатите, картата и социологията по-долу са за общата листа, защото гласовете не се делят между двете партии.
        </p>
      )}

      <section id="izbirateli" className="mb-14 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Къде са избирателите</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Делът на листата от гласовете за партии във всяка община. Посочи община, за да видиш числата.</p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><VoteMap shares={shares} color={p.color} label={p.list} /></div>
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <div><p className="font-semibold mb-2">Най-силни общини</p>
            <ol className="text-[15px] space-y-1">{top.map((s) => <li key={s.name} className="flex justify-between border-b border-rule py-1"><span>{s.name}</span><span className="num">{fmt(s.pct, 1)}% · {n(s.votes)}</span></li>)}</ol></div>
          <div><p className="font-semibold mb-2">Най-слаби общини</p>
            <ol className="text-[15px] space-y-1">{bottom.map((s) => <li key={s.name} className="flex justify-between border-b border-rule py-1"><span>{s.name}</span><span className="num">{fmt(s.pct, 1)}% · {n(s.votes)}</span></li>)}</ol></div>
        </div>
        <details className="mt-6">
          <summary className="cursor-pointer font-semibold text-green">По избирателни райони ({regions.length})</summary>
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white mt-3"><BarRank data={regions} unit="%" highlight="" /></div>
        </details>
      </section>

      <section id="profil" className="mb-14 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Кой гласува за тях</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-5 max-w-3xl">Каква част от избирателите на листата е във всяка група, сравнено с всички гласували. {EXIT.note}</p>
        <div className="grid gap-6 md:grid-cols-2">
          {EXIT.groups.map((g) => (
            <div key={g.id} className="ring-1 ring-rule rounded-sm p-4 bg-white">
              <p className="font-semibold mb-3">{g.title}</p>
              <ul className="space-y-2">
                {g.rows.map((r) => {
                  const v = r.v[p.exitKey], t = r.v["Тотал"];
                  const max = Math.max(...g.rows.flatMap((x) => [x.v[p.exitKey], x.v["Тотал"]]));
                  return (
                    <li key={r.label} className="text-sm">
                      <div className="flex justify-between"><span>{r.label}</span><span className="num"><b>{fmt(v, 1)}%</b> <span className="text-muted">/ всички {fmt(t, 1)}%</span></span></div>
                      <div className="h-2 rounded-full bg-surface mt-1 relative overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: p.color }} />
                        <div className="absolute top-0 h-full w-0.5 bg-ink" style={{ left: `${(t / max) * 100}%` }} title="всички гласували" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">Чертичката показва дела при всички гласували. Източник: <a href={EXIT.source.url} target="_blank" rel="noreferrer">{EXIT.source.title}</a>.</p>
      </section>

      {keyLaws.length > 0 && (
        <section id="zakoni" className="mb-14 scroll-mt-32 lg:scroll-mt-20">
          <SectionTitle>Как гласува по ключовите закони</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Позицията на мнозинството в групата при първо гласуване (принципно съгласие) и при последното гласуване по закона. Сравни с това, което партията заявява за себе си: {p.about}</p>
          <div className="overflow-x-auto"><table className="w-full text-[15px]">
            <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Закон</th><th className="px-2">Първо гласуване</th><th className="px-2">Последно гласуване</th></tr></thead>
            <tbody>{keyLaws.map((l) => (
              <tr key={l.lslug} className="border-b border-rule align-top">
                <td className="py-2 pr-3"><Link href={`/parlament/zakon/${l.lslug}`}>{l.name}</Link><span className="block text-sm text-muted">{l.summary.split(". ")[0]}.</span></td>
                <td className={`px-2 py-2 font-semibold ${l.first ? POS[l.first][1] : ""}`}>{l.first ? POS[l.first][0] : "–"}</td>
                <td className={`px-2 py-2 font-semibold ${l.final ? POS[l.final][1] : ""}`}>{l.final ? POS[l.final][0] : "–"}</td>
              </tr>
            ))}</tbody></table></div>
          <p className="text-xs text-muted mt-2">На страницата на всеки закон: мотивите на вносителите, критиките, данните и очакваните ефекти, за да се прецени дали гласуването съответства на заявените цели.</p>
        </section>
      )}

      <section id="temi" className="mb-14 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Как гласува по теми</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Позицията на мнозинството в групата при всички {n(ALLV.length)} поименни гласувания в {"52-рото"} Народно събрание, по вид. „Разделени“: няма ясно мнозинство в групата.</p>
        <div className="overflow-x-auto"><table className="w-full text-[15px] num">
          <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Тема</th><th className="text-right px-2">Гласувания</th><th className="text-right px-2">За</th><th className="text-right px-2">Против</th><th className="text-right px-2">Въздържал се</th><th className="text-right px-2">Разделени</th></tr></thead>
          <tbody>{topics.map((t) => <tr key={t.k} className="border-b border-rule"><td className="py-1.5 pr-3">{t.label}</td><td className="text-right px-2">{t.t}</td><td className="text-right px-2 text-green">{Math.round((t.y / t.t) * 100)}%</td><td className="text-right px-2 text-red">{Math.round((t.n / t.t) * 100)}%</td><td className="text-right px-2">{Math.round((t.a / t.t) * 100)}%</td><td className="text-right px-2 text-muted">{Math.round((t.split / t.t) * 100)}%</td></tr>)}</tbody>
        </table></div>
        <p className="text-[15px] mt-4 max-w-3xl">При ясна позиция „за“ или „против“ групата е била от губещата страна в <b>{decided ? Math.round((lost / decided) * 100) : 0}%</b> от гласуванията ({n(lost)} от {n(decided)}). Висок дял означава опозиция, нисък — управляващи или съюзници на мнозинството.</p>
      </section>

      <section id="saiuznici" className="mb-14 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>С кого гласува</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Колко често позицията на групата съвпада с позицията на всяка друга група (когато и двете имат ясна позиция). Това показва реалните съюзи в залата, независимо какво се говори.</p>
        <ul className="space-y-2 max-w-2xl">{allies.map((a) => { const pm = partyByGroup(a.g); return (
          <li key={a.g} className="text-[15px]"><div className="flex justify-between"><span>{pm ? <Link href={`/parlament/partiya/${pm.slug}`}>{a.name}</Link> : a.name}</span><span className="num font-semibold">{Math.round(a.v * 100)}%</span></div>
            <div className="h-2 rounded-full bg-surface mt-1"><div className="h-full rounded-full" style={{ width: `${a.v * 100}%`, background: pm?.color ?? "#888" }} /></div></li>); })}</ul>
      </section>

      <section id="signali" className="mb-14 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Дела и санкции</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Само случаи с официален документ или медии, които го цитират: обвинение, съдебно дело, присъда или чужди санкции. Обвиненият се смята за невинен до влизане в сила на присъда.</p>
        {caseList.length + sanctioned.length + mpCases.length === 0 ? <p className="text-[15px]">Няма записани случаи за хора от тази група. Списъкът се попълва само с източници.</p> : (
          <ul className="space-y-3 max-w-3xl text-[15px]">
            {sanctioned.map((x) => <li key={x.name} className="border-l-4 border-red pl-3"><b>{x.name}</b> — {x.role}. <span className="text-muted">Санкции: {x.measures.map((m) => SANCTIONS.regimes[m.regime]?.name ?? m.regime).join(", ")}.</span> {x.allegation}</li>)}
            {caseList.map((c, i) => <li key={i} className="border-l-4 border-[#e08a2e] pl-3"><b>{c.person}</b> — {c.role}. <span className="font-semibold">{c.label}</span>{c.date ? ` (${c.date})` : ""}: {c.what} {c.sources?.[0] && <a href={c.sources[0].url} target="_blank" rel="noreferrer">Източник</a>}</li>)}
            {mpCases.filter(({ c }) => !caseList.some((x) => x.person === c.person)).map(({ m, c }, i) => <li key={`m${i}`} className="border-l-4 border-[#e08a2e] pl-3"><Link href={`/parlament/deputat/${m.id}`}>{m.name}</Link>: <span className="font-semibold">{c.levelLabel}</span> — {c.what}</li>)}
          </ul>)}
        <p className="text-xs text-muted mt-3">Пълен списък: <Link href="/proverki/sankcii">Санкции, обвинения и присъди</Link>.</p>
      </section>
      <section id="subsidiya" className="mb-14 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Държавна субсидия</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="text-sm text-muted">По старата ставка ({fmt(SUBSIDY.before, 2)} € на глас)</p><p className="display text-[2rem]">{eur(list.votes * SUBSIDY.before)}</p><p className="text-xs text-muted">годишно, до 30 април 2026 г.</p></div>
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="text-sm text-muted">По новата ставка ({fmt(SUBSIDY.after, 2)} € на глас)</p><p className="display text-[2rem]">{eur(yearly)}</p><p className="text-xs text-muted">годишно, от 30 април 2026 г.</p></div>
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="text-sm text-muted">Разлика за хазната</p><p className="display text-[2rem]">−{eur(list.votes * (SUBSIDY.before - SUBSIDY.after))}</p><p className="text-xs text-muted">по-малко годишно за тази листа</p></div>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-[15px] max-w-3xl">
          <li>Субсидията се плаща на всяка партия или коалиция в парламента, както и на партиите извън него с поне 1% от гласовете. Изчислява се по броя гласове на последните избори и се изплаща на четири вноски годишно.</li>
          <li>Намалението до 3 € на глас е прието с {SUBSIDY.vote.yes} гласа „за“, {SUBSIDY.vote.no} „против“ и {SUBSIDY.vote.abstain} „въздържали се“. {SUBSIDY.vote.text}</li>
          {(p.sharedList || p.group === "ПБ" || p.group === "ГЕРБ - СДС") && <li>Субсидията на коалиция се превежда на партиите в нея по споразумение помежду им. Как точно е разделена, се вижда от годишните им отчети.</li>}
          <li><b>За какво се харчи:</b> всяка партия подава годишен финансов отчет в Сметната палата до 31 март на следващата година: приходи (субсидия, членски внос, дарения) и разходи (заплати, наеми, реклама, кампании). Отчетите за 2026 г. ще излязат до 31 март 2027 г. Предишните са в <a href={SUBSIDY.reports} target="_blank" rel="noreferrer">регистъра на Сметната палата</a>.</li>
        </ul>
        <p className="text-xs text-muted mt-3">Източници: {SUBSIDY.sources.map((s, i) => <span key={s.url}>{i > 0 && "; "}<a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></span>)}. Сметката е брой гласове × ставката.</p>
      </section>

      <section id="deputati" className="mb-6 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Депутатите ({mps.length})</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Присъствие на поименните гласувания и колко пъти всеки е гласувал различно от мнозинството в групата си. Подредени от най-рядко присъстващите.</p>
        <div className="overflow-x-auto"><table className="w-full text-[15px] num">
          <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Депутат</th><th className="text-right px-2">Присъствие</th><th className="text-right px-2">Срещу групата</th></tr></thead>
          <tbody>{mpRows.map(({ m, att, against }) => <tr key={m.id} className="border-b border-rule"><td className="py-1.5 pr-3"><Link href={`/parlament/deputat/${m.id}`}>{m.name}</Link></td><td className={`text-right px-2 ${att < 0.7 ? "text-red font-semibold" : ""}`}>{Math.round(att * 100)}%</td><td className="text-right px-2">{against}</td></tr>)}</tbody>
        </table></div>
        {govs.length > 0 && <p className="text-[15px] mt-4">Обещания на партията: {govs.map((g, i) => <span key={g.name}>{i > 0 && "; "}<Link href="/obeshtaniya">{g.name}</Link> ({g.promises.filter((x) => x.status === "done").length} изпълнени от {g.promises.length})</span>)}.</p>}
      </section>
      <p className="text-xs text-muted">Изборни резултати: <a href={ELECTIONS.source.url} target="_blank" rel="noreferrer">{ELECTIONS.source.title}</a>.</p>
    </Page>
  );
}
