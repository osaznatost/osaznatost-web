import Link from "next/link";
import { peopleLinks } from "@/lib/people";
import { Page, SectionTitle, Title } from "@/components/ui";
import { formatDate } from "@/lib/parliament";
import { SANCTIONS } from "@/lib/sanctions";
import CASES from "@/content/cases.json";

export const metadata = { title: "Корупция: санкции, обвинения, присъди" };

const SHORT: Record<string, string> = { GLOMAG: "„Магнитски“ (САЩ)", "7031c": "Забрана за влизане в САЩ", UKGAC: "Санкции на Великобритания" };

export default async function Sankcii() {
  const { personPage } = await peopleLinks();
  const P = SANCTIONS.people;
  const active = P.filter((p) => p.measures.some((m) => !m.status.startsWith("отмен")));
  const byParty = new Map<string, number>();
  for (const p of active) byParty.set(p.party ?? "Без партия (служители, бизнес)", (byParty.get(p.party ?? "Без партия (служители, бизнес)") ?? 0) + 1);
  return (
    <Page>
      <Title back={{ href: "/proverki", label: "Проверки" }} kicker="Корупция: само официални източници"
        lead="Българи, санкционирани от САЩ и Великобритания за значима корупция. Само мерки, обявени официално от Министерството на финансите и Държавния департамент на САЩ и от британското правителство.">
        Корупция: санкции, обвинения, присъди
      </Title>
      <nav className="flex flex-wrap gap-2 mb-8 text-[15px]">
        <a href="#sankcii" className="px-3 py-1.5 rounded-full bg-surface no-underline text-ink">Санкции ({SANCTIONS.people.length})</a>
        <a href="#dela" className="px-3 py-1.5 rounded-full bg-surface no-underline text-ink">Обвинения и присъди ({CASES.cases.length})</a>
      </nav>

      <section className="bg-surface rounded-sm p-5 mb-10 max-w-4xl text-[15px] space-y-2">
        <p><b>Какво е и какво не е това.</b> {SANCTIONS.note}</p>
        <p>Различаваме пет нива и не ги смесваме: <b>сигнал</b> (някой е подал жалба), <b>разследване</b> (прокуратурата проверява), <b>обвинение</b> (повдигнато официално), <b>присъда</b> (влязла в сила) и <b>санкция</b> (мярка на друга държава). Тук са само санкциите. Обвиненията и присъдите добавяме отделно, само по документи на прокуратурата и съдилищата.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          ["Санкционирани българи", String(P.length), `${active.length} с мерки в сила`],
          ["„Магнитски“ (САЩ)", String(P.filter((p) => p.measures.some((m) => m.regime === "GLOMAG")).length), "замразени активи в САЩ"],
          ["Великобритания", String(P.filter((p) => p.measures.some((m) => m.regime === "UKGAC")).length), "активи и забрана за влизане"],
        ].map(([l, v, n]) => <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[1.75rem] sm:text-[2.4rem] leading-none mt-1 break-words">{v}</p><p className="text-xs text-muted">{n}</p></div>)}
      </section>

      <section className="mb-10 max-w-3xl">
        <SectionTitle>По партийна принадлежност</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-3">Принадлежността е към момента на санкцията или сегашната, ако е известна. Броят сам по себе си не показва коя партия е „по-корумпирана“: санкциите засягат малко хора и зависят от приоритетите на чуждите правителства.</p>
        <p className="font-semibold mt-2">Санкции</p>
        <ul className="text-[15px] space-y-1">{[...byParty.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => <li key={k} className="flex justify-between border-b border-rule py-1"><span>{k}</span><b className="num">{n}</b></li>)}</ul>
        {(() => {
          // съдебните случаи по партия и по ниво, по един и същи начин за всички
          const LV = ["conviction", "nonfinal", "trial", "charged", "dropped", "acquitted"] as const;
          const LBL = CASES.levels as Record<string, { label: string }>;
          const rows = new Map<string, Record<string, number>>();
          for (const c of CASES.cases) { const k = c.party || "без партия / неизвестна"; const r = rows.get(k) ?? {}; r[c.level] = (r[c.level] ?? 0) + 1; rows.set(k, r); }
          return (
            <div className="mt-6 overflow-x-auto">
              <p className="font-semibold">Обвинения и присъди</p>
              <table className="w-full text-[15px] num mt-1">
                <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="py-1 pr-3 font-normal">Партия</th>{LV.map((l) => <th key={l} className="py-1 pr-3 font-normal">{LBL[l]?.label}</th>)}</tr></thead>
                <tbody>{[...rows.entries()].sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0)).map(([k, r]) => (
                  <tr key={k} className="border-b border-rule"><td className="py-1 pr-3">{k}</td>{LV.map((l) => <td key={l} className="py-1 pr-3">{r[l] ?? "—"}</td>)}</tr>
                ))}</tbody>
              </table>
              <p className="text-sm text-muted mt-2">Включваме само случаи с обвинение или съдебен акт и официален източник, по едни и същи правила за всички партии. Сравнително малкият брой случаи не позволява изводи коя партия е „по-корумпирана“.</p>
            </div>
          );
        })()}
      </section>

      <section id="sankcii" className="mb-12 scroll-mt-32 lg:scroll-mt-24">
        <SectionTitle>Санкционираните</SectionTitle>
        <ul className="grid gap-4 lg:grid-cols-2">{P.map((p) => (
          <li key={p.name} className="ring-1 ring-rule rounded-sm p-5 bg-white">
            <p className="font-semibold text-lg">{personPage(p.name) ? <Link href={personPage(p.name)!}>{p.name}</Link> : p.name}</p>
            <p className="text-sm text-muted">{p.role}</p>
            <ul className="flex flex-wrap gap-2 my-3">{p.measures.map((m) => (
              <li key={m.regime}><a href={m.url} target="_blank" rel="noreferrer" className={`text-xs font-semibold px-2.5 py-1 rounded-full no-underline ${m.status.startsWith("отмен") ? "bg-surface text-muted line-through" : "bg-red text-white"}`}>{SHORT[m.regime]} · {formatDate(m.date)}</a></li>
            ))}</ul>
            <p className="text-[15px]">{p.allegation}</p>
            {p.bg && <p className="text-sm mt-2 bg-surface rounded-sm px-3 py-2"><b>В България:</b> {p.bg}{p.bgUrl && <> <a href={p.bgUrl} target="_blank" rel="noreferrer">Източник</a></>}</p>}
            <p className="text-xs text-muted mt-2">Статус: {p.measures.map((m) => `${SHORT[m.regime]}: ${m.status}`).join("; ")}</p>
          </li>
        ))}</ul>
      </section>

      <section id="dela" className="mb-12 scroll-mt-32 lg:scroll-mt-24">
        <SectionTitle>Обвинения и присъди в България</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Политици и високопоставени лица с обвинения или присъди, само по съобщения на прокуратурата и съдилищата или медии, които ги цитират. Нивото е най-важното: обвинението не е доказателство за вина.</p>
        <ul className="flex flex-wrap gap-3 mb-5 text-sm">{Object.entries(CASES.levels).map(([k, l]) => <li key={k} className="bg-surface rounded-sm px-3 py-2 max-w-xs"><b>{l.label}</b>: {l.about}</li>)}</ul>
        <ul className="grid gap-4 lg:grid-cols-2">{[...CASES.cases].sort((a, b) => ["conviction", "nonfinal", "trial", "charged", "dropped", "acquitted"].indexOf(a.level) - ["conviction", "nonfinal", "trial", "charged", "dropped", "acquitted"].indexOf(b.level)).map((c) => (
          <li key={c.person + c.what} className="ring-1 ring-rule rounded-sm p-5 bg-white">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.level === "conviction" ? "bg-red text-white" : c.level === "nonfinal" ? "bg-[#e08a2e] text-white" : c.level === "acquitted" ? "bg-[#2f9e6a] text-white" : "bg-surface"}`}>{CASES.levels[c.level as keyof typeof CASES.levels].label}</span>
            <p className="font-semibold text-lg mt-2">{personPage(c.person) ? <Link href={personPage(c.person)!}>{c.person}</Link> : c.person}</p>
            <p className="text-sm text-muted">{c.role}</p>
            <p className="text-[15px] mt-2">{c.what}</p>
            <p className="text-[15px] mt-1"><b>Докъде е стигнало:</b> {c.outcome}</p>
            <p className="text-sm mt-2">Източници: {c.sources.map((s, i) => <span key={s.url}>{i > 0 && "; "}<a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></span>)}</p>
          </li>
        ))}</ul>
        <p className="text-sm text-muted mt-3 max-w-3xl">Списъкът се допълва. Влизат случаи с повдигнато обвинение или присъда срещу настоящи и бивши депутати, министри, кметове и ръководители на държавни институции, с източник. Сигнали и медийни публикации без обвинение не влизат.</p>
      </section>

      <section className="max-w-3xl text-[15px] space-y-2 mb-8">
        <SectionTitle>Режимите</SectionTitle>
        {Object.entries(SANCTIONS.regimes).map(([k, r]) => <p key={k}><b>{r.name}.</b> {r.effect}</p>)}
        <p>Списъците се проверяват при всяко обновяване. Ако някой бъде изваден от списък, мярката остава тук, задраскана, с датата на отмяната.</p>
        <p>Свързано: <Link href="/ikonomika/evrosredstva/politika">евросредства и политици</Link>, <Link href="/proverki">проверки на твърдения</Link>.</p>
      </section>
      <p className="text-xs text-muted">Проверено: {formatDate(SANCTIONS.updated)}.</p>
    </Page>
  );
}
