import Link from "next/link";
import { Page, SectionTitle, Title } from "@/components/ui";
import { FUNDS, REL, mn, mpHref } from "@/lib/funds";

export const metadata = { title: "Евросредства и политици" };

export default function Politika() {
  const byMp = new Map<string, { id: number; name: string; items: typeof FUNDS.mpConnected }>();
  for (const e of FUNDS.mpConnected) {
    const k = String(e.mpId);
    (byMp.get(k) ?? byMp.set(k, { id: e.mpId, name: e.mp, items: [] }).get(k)!).items.push(e);
  }
  // Държавните фирми и общинските ВиК са служебна връзка; частните фирми с дял или собственост са личен интерес.
  const personal = (e: (typeof FUNDS.mpConnected)[number]) => e.type !== "Държавна администрация" && e.rel.some((r) => ["stake", "sole_owner", "partner", "actual_owner", "owner"].includes(r.kind));
  const mps = [...byMp.values()].map((m) => ({ ...m, total: m.items.reduce((s, x) => s + x.contracted, 0), personal: m.items.some(personal) }))
    .sort((a, b) => Number(b.personal) - Number(a.personal) || b.total - a.total);
  const C = FUNDS.confirmed;
  return (
    <Page>
      <Title back={{ href: "/ikonomika/evrosredstva", label: "Европейски средства" }}
        lead="Кои депутати (настоящи и бивши) са свързани с фирми и организации, получили европейски пари, каква е връзката, и кои случаи са описани от разследващи журналисти. Връзката е повод за въпрос, а не доказателство за нарушение.">
        Евросредства и политици
      </Title>

      <section className="grid gap-4 sm:grid-cols-3 mb-12">
        {[
          ["Депутати с връзка", String(byMp.size), "настоящи и бивши, по Търговския регистър и декларациите"],
          ["Бенефициенти", String(new Set(FUNDS.mpConnected.map((x) => x.eik)).size), "фирми, общински дружества, организации"],
          ["С лично участие", String(mps.filter((m) => m.personal).length), "депутатът има дял или е собственик на частна фирма"],
        ].map(([l, v, n]) => <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[2.4rem] mt-1">{v}</p><p className="text-xs text-muted">{n}</p></div>)}
      </section>

      <section id="sluchai" className="mb-14 scroll-mt-24">
        <SectionTitle>Случаи, разкрити от журналисти</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-2 max-w-3xl">Мярка „{C.measure.name}“ ({C.measure.fund}): два кръга, общо около 1,15 млрд. лв. за батерии за съхранение на ток. Мярката е под внимание, защото много от одобрените фирми водят до политици, бивши министри и известни бизнесмени. Официалният списък на одобрените е на <a href={C.measure.officialList} target="_blank" rel="noreferrer">сайта на Министерството на енергетиката</a>.</p>
        <p className="text-[15px] text-muted mb-4 max-w-3xl">Всеки случай е проверен срещу регистъра ИСУН: сумата, описана в медията, съвпада със сумата в регистъра. Това потвърждава, че фирмата е получила договор. Дали има нарушение, решават контролните органи и съдът.</p>
        <ul className="grid gap-4 lg:grid-cols-2">
          {C.cases.map((c) => (
            <li key={c.id} className="ring-1 ring-rule rounded-sm p-5 bg-white">
              <p className="text-sm text-muted">{c.programme}{c.round ? ` · ${c.round}` : ""}</p>
              <p className="font-semibold text-lg mt-1">{c.beneficiaries.map((b, i) => <span key={b.eik}>{i > 0 && ", "}<Link href={`/porachki/firma/${b.eik}`}>{b.name}</Link></span>)}</p>
              <p className="text-[15px] mt-1"><b>Кой стои зад нея:</b> {c.person}</p>
              <p className="text-[15px] mt-2">{c.claim.summary}</p>
              <p className="text-[15px] mt-2 num">Договорени: <b>{mn(c.beneficiaries.reduce((s, b) => s + b.contractedEur, 0))}</b> · изплатени: {mn(c.beneficiaries.reduce((s, b) => s + b.paidEur, 0))}</p>
              <p className="text-sm mt-2 bg-surface rounded-sm px-3 py-2"><b>Проверка в регистъра:</b> {c.verification}</p>
              <p className="text-sm mt-2">Източници: {c.sources.map((s, i) => <span key={s.url}>{i > 0 && "; "}<a href={s.url} target="_blank" rel="noreferrer">{s.outlet}: {s.title}</a></span>)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-14">
        <SectionTitle>Всички депутати с връзка</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Първо са тези с лично участие в частни фирми (дял, собственост, съдружие). След тях са служебните роли: управител на държавна фирма, член на борд на общинско дружество, на читалище или на сдружение. Служебните роли по правило не носят личен интерес.</p>
        <ul className="space-y-3">
          {mps.map((m) => (
            <li key={m.id} className={`ring-1 rounded-sm p-4 bg-white ${m.personal ? "ring-red" : "ring-rule"}`}>
              <p className="font-semibold"><Link href={mpHref(m.id, m.name)}>{m.name}</Link> {m.personal && <span className="text-xs font-semibold text-white bg-red rounded-full px-2 py-0.5 ml-1">лично участие</span>} <span className="text-sm text-muted font-normal">· {mn(m.total)} договорени</span></p>
              <ul className="text-[15px] mt-1 space-y-0.5">{m.items.map((x) => (
                <li key={x.eik}><Link href={`/porachki/firma/${x.eik}`}>{x.name}</Link> <span className="text-muted">— {[...new Set(x.rel.map((r) => `${REL[r.kind] ?? r.kind}${r.current ? "" : " (в миналото)"}`))].join(", ")} · {x.contracts} договора, {mn(x.contracted)}, изплатени {mn(x.paid)}</span></li>
              ))}</ul>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-muted">Източници: регистър ИСУН, Търговски регистър, имуществени декларации и подбрани журналистически разследвания, обработени от <a href={FUNDS.source.repo} target="_blank" rel="noreferrer">„Наясно“</a> към {FUNDS.updated}.</p>
    </Page>
  );
}
