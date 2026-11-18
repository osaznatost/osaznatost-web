import Link from "next/link";
import { Page, Title } from "@/components/ui";
import { Term } from "@/components/Term";
import { lawIndex } from "@/lib/lawIndex";
import { formatDate } from "@/lib/parliament";

export const metadata = { title: "Всички закони" };

const DOT = { high: "bg-red", mid: "bg-[#e08a2e]", info: "bg-[#8a8f8c]" };

export default function Zakoni() {
  const laws = lawIndex();
  const explained = laws.filter((l) => l.explained).length;
  const flagged = laws.filter((l) => l.signals.some((s) => s.level === "high")).length;
  return (
    <Page>
      <Title back={{ href: "/parlament", label: "Парламент" }} kicker="Проследяване" lead={<>Всеки закон, по който е гласувано в 52-рото Народно събрание: докъде е стигнал, кой го е внесъл, има ли обяснение на двете страни и има ли сигнали за начина, по който е приет. Обяснени: {explained} от {laws.length}. Със сериозен сигнал: {flagged}.</>}>
        Всички закони
      </Title>
      <ul className="divide-y divide-rule border-y border-rule">
        {laws.map((l) => (
          <li key={l.slug} className="py-3 grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-6">
            <div className="min-w-0">
              <Link href={`/parlament/zakon/${l.slug}`} className="font-semibold text-ink">{l.name}</Link>
              <p className="text-sm text-muted mt-0.5">
                {l.stage === "second" ? <Term k="vtoro-chetene">второ четене</Term> : <Term k="parvo-chetene">само първо четене</Term>}
                {" · "}{l.votes.length} гласувания · {formatDate(l.first)}{l.last !== l.first && ` – ${formatDate(l.last)}`}
                {l.bills[0] && <> · внесен от {l.bills[0].byGov ? "Министерския съвет" : "депутати"}</>}
                {l.bills.find((b) => b.dv) && <> · {l.bills.find((b) => b.dv)!.dv}</>}
              </p>
              {l.signals.filter((s) => s.level !== "info").length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">{l.signals.filter((s) => s.level !== "info").map((s) => <li key={s.title} className="flex items-center gap-1.5"><span className={`inline-block w-2 h-2 rounded-full ${DOT[s.level]}`} />{s.title}</li>)}</ul>
              )}
            </div>
            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 h-fit w-fit whitespace-nowrap ${l.explained ? "bg-[#d7ecd9] text-[#1f5c2a]" : "bg-surface text-muted"}`}>{l.explained ? "обяснен: двете страни" : "обяснението се подготвя"}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted mt-6">Сигналите се откриват автоматично по поименните гласувания и данните за законопроектите в parliament.bg. <Link href="/parlament/signali">Какво значат</Link>.</p>
    </Page>
  );
}
