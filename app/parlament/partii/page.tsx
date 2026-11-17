import Link from "next/link";
import { Page, Title, pct, SectionTitle } from "@/components/ui";
import { PartyBadge } from "@/components/PartyBadge";
import { partyByGroup } from "@/lib/partyMeta";
import { MPS, PARLIAMENT_SOURCE, PARTIES, agreement, mpStats, partyName, partyStats } from "@/lib/parliament";

export const metadata = { title: "Парламентарни групи" };

export default function Partii() {
  const stats = PARTIES.map((p) => ({ p, ...partyStats(p) }));
  const matrix = PARTIES.map((a) => PARTIES.map((b) => (a === b ? 1 : agreement(a, b))));

  return (
    <Page>
      <Title back={{ href: "/parlament", label: "Парламент" }} lead="Как гласуват групите, колко са единни и с кого гласуват еднакво. Само по поименните гласувания, без оценки.">
        Парламентарни групи
      </Title>

      <section className="mb-12">
        <SectionTitle>Кой с кого гласува еднакво</SectionTitle>
        <p className="text-sm text-muted mb-4">Дял от гласуванията, в които мнозинството в двете групи е гласувало по един и същ начин.</p>
        <div className="overflow-x-auto">
          <table className="text-sm num border-collapse">
            <thead>
              <tr>
                <th />
                {PARTIES.map((p) => <th key={p} className="px-2 py-1 font-semibold text-left align-bottom max-w-[7rem]">{partyName(p)}</th>)}
              </tr>
            </thead>
            <tbody>
              {PARTIES.map((a, i) => (
                <tr key={a}>
                  <th className="pr-3 py-1 text-left font-semibold whitespace-nowrap">{partyName(a)}</th>
                  {matrix[i].map((x, j) => (
                    <td key={j} className="px-2 py-2 text-center border border-white" style={{ background: i === j ? "#f6f7f5" : `rgba(61,90,128,${0.08 + x * 0.6})`, color: x > 0.7 && i !== j ? "#fff" : undefined }}>
                      {i === j ? "—" : pct(x, 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {stats.map((s) => {
        const members = MPS.filter((m) => m.party === s.p)
          .map((m) => ({ m, st: mpStats(m.id) }))
          .filter((x) => x.st.eligible > 0)
          .sort((a, b) => a.st.present / a.st.eligible - b.st.present / b.st.eligible);
        return (
          <section key={s.p} id={s.p} className="mb-12 scroll-mt-6">
            <SectionTitle right={partyByGroup(s.p) ? <Link href={`/parlament/partiya/${partyByGroup(s.p)!.slug}`}>Профил: избори, карта, избиратели, субсидия</Link> : undefined}><span className="inline-flex items-center gap-3"><PartyBadge p={s.p} size={36} />{partyName(s.p)}</span></SectionTitle>
            <div className="grid gap-x-8 gap-y-2 sm:grid-cols-4 text-[15px] mb-4">
              <p><span className="text-muted block text-sm">Депутати</span><span className="num text-2xl font-bold">{s.seats}</span></p>
              <p><span className="text-muted block text-sm">Присъствие</span><span className="num text-2xl font-bold">{pct(s.attendance, 0)}</span></p>
              <p><span className="text-muted block text-sm">Единство</span><span className="num text-2xl font-bold">{pct(s.unity, 0)}</span></p>
              <p><span className="text-muted block text-sm">На страната на резултата</span><span className="num text-2xl font-bold">{pct(s.winningShare, 0)}</span></p>
            </div>
            <details>
              <summary className="cursor-pointer text-[15px]">Депутатите, подредени по присъствие (от най-ниското)</summary>
              <ul className="mt-2 columns-1 sm:columns-2 lg:columns-3 text-[15px]">
                {members.map(({ m, st }) => (
                  <li key={m.id} className="flex justify-between gap-3 py-1 border-b border-rule break-inside-avoid">
                    <Link href={`/parlament/deputat/${m.id}`} className="text-ink no-underline hover:underline">{m.name}</Link>
                    <span className="num text-muted">{pct(st.present / st.eligible, 0)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        );
      })}

      <section className="max-w-3xl text-[15px] text-muted">
        <h2 className="text-base font-bold text-ink mb-2">Как смятаме</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Присъствие</b>: подадени гласове (за, против, въздържал се) спрямо всички възможни гласове на членовете на групата.</li>
          <li><b>Единство</b>: средно какъв дял от присъстващите в групата гласуват като мнозинството в нея.</li>
          <li><b>На страната на резултата</b>: колко често позицията на групата (за или против) съвпада с това дали предложението е прието.</li>
        </ul>
        <p className="mt-3 text-xs">Данни: <a href={PARLIAMENT_SOURCE.url} target="_blank" rel="noreferrer">{PARLIAMENT_SOURCE.title}</a>.</p>
      </section>
    </Page>
  );
}
