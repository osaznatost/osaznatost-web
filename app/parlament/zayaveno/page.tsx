import Link from "next/link";
import { Page, Title } from "@/components/ui";
import D from "@/content/declared.json";
import { getVote, partyBreakdown, partyName, partyPosition } from "@/lib/parliament";

export const metadata = { title: "Заявено и гласувано", description: "Какво казват парламентарните групи преди гласуване и как гласуват след това." };
const LABEL = { y: "за", n: "против", a: "въздържал се", split: "разделени", absent: "не гласува" } as const;
const fmt = (d: string) => d.split("-").reverse().join(".");

export default function Zayaveno() {
  const rows = D.cases.map((c) => {
    const v = getVote(c.vote);
    const br = v ? partyBreakdown(v) : {};
    return { c, v, items: c.positions.map((p) => {
      const cnt = br[p.group];
      const pos = cnt ? partyPosition(cnt) : "absent";
      const match = pos === p.expect ? "yes" : (pos === "split" || (p.expect === "n" && pos === "a") || (p.expect === "y" && pos === "a")) ? "part" : "no";
      return { p, cnt, pos, match };
    }) };
  });
  const tally = new Map<string, { yes: number; part: number; no: number }>();
  for (const r of rows) for (const x of r.items) { const t = tally.get(x.p.group) ?? { yes: 0, part: 0, no: 0 }; t[x.match as "yes" | "part" | "no"]++; tally.set(x.p.group, t); }
  return (
    <Page>
      <Title back={{ href: "/parlament", label: "Парламент" }} kicker="Последователност"
        lead={<>{D.about} „Частично“ значи въздържал се вместо заявеното или разделена група.</>}>
        Заявено и гласувано
      </Title>
      <section className="mb-10 max-w-3xl">
        <h2 className="text-lg font-bold mb-2">Обобщение по групи</h2>
        <table className="w-full text-[15px] num border-collapse">
          <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="py-1 pr-3 font-normal">Група</th><th className="py-1 px-2 font-normal">Съвпада</th><th className="py-1 px-2 font-normal">Частично</th><th className="py-1 font-normal">Не съвпада</th></tr></thead>
          <tbody>{[...tally.entries()].map(([g, t]) => <tr key={g} className="border-b border-rule"><td className="py-1 pr-3">{partyName(g)}</td><td className="py-1 px-2 text-green">{t.yes}</td><td className="py-1 px-2">{t.part}</td><td className="py-1 text-red">{t.no}</td></tr>)}</tbody>
        </table>
      </section>
      {rows.map(({ c, v, items }) => (
        <section key={c.id} className="mb-10">
          <h2 className="text-xl font-bold">{c.title}</h2>
          <p className="text-sm text-muted mb-3">{fmt(c.date)} · {v ? <Link href={`/parlament/glasuvane/${v.id}`}>поименното гласуване</Link> : "гласуването не е в данните"}</p>
          <ul className="divide-y divide-rule border-y border-rule text-[15px]">
            {items.map(({ p, cnt, pos, match }) => (
              <li key={p.group} className="py-2 grid sm:grid-cols-[11rem_1fr_11rem] gap-x-4 gap-y-1">
                <b>{partyName(p.group)}</b>
                <span>{p.declared} <span className="text-sm text-muted">({p.sources.map((s, i) => <span key={s.url}>{i ? ", " : ""}<a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></span>)})</span></span>
                <span>Гласува: <b>{LABEL[pos]}</b>{cnt ? <span className="text-sm text-muted num"> ({cnt.y}/{cnt.n}/{cnt.a})</span> : null}<br />
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${match === "yes" ? "bg-green-soft text-green" : match === "part" ? "bg-surface" : "bg-red text-white"}`}>{match === "yes" ? "съвпада" : match === "part" ? "частично" : "не съвпада"}</span></span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-muted max-w-3xl">Числата в скобите са „за / против / въздържал се“ в групата. Списъкът ще се допълва с всяко важно гласуване, по което групите са заявили позиция публично. <Link href="/metodologiya#ednakvo">Еднакъв подход към всички</Link>.</p>
    </Page>
  );
}
