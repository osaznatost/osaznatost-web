import Link from "next/link";
import { ChoroMap } from "@/components/ChoroMap";
import { MoneyFlow, type FlowNode } from "@/components/MoneyFlow";
import { Page, SectionTitle, Title } from "@/components/ui";
import funds from "@/data/funds.json";
import { formatDate } from "@/lib/parliament";
import { ELECTIONS } from "@/lib/partyMeta";
import { fmt } from "@/lib/stats";

export const metadata = { title: "Европейски средства" };

const F = funds as unknown as {
  updated: string; source: { title: string; url: string; repo: string };
  totals: { beneficiaries: number; contractCount: number; contractedEur: number; paidEur: number };
  byOrgType: { key: string; n: number; contracts: number; contracted: number; paid: number }[];
  top: { eik: string; name: string; type: string; contracts: number; contracted: number; paid: number; mpTied: boolean }[];
  byPeriod: Record<string, { contractedEur: number; paidEur: number; absorptionPct: number; contractCount: number }>;
  byProgramme: { code: string; name: string; period: string; fund: string; contracted: number; paid: number; pct: number; contracts: number }[];
  sankey: { nodes: { id: string; kind: string; label: string; total: number }[]; links: { source: string; target: string; value: number }[] };
  munis: Record<string, { contracts: number; total: number; paid: number; perCapita: number; pop: number }>;
  political: { totals: { flaggedEiks: number; mpOnly: number; officialOnly: number; both: number; contractedEur: number; paidEur: number };
    top: { eik: string; name: string; type: string; contracted: number; paid: number; mps: { id: number; name: string; rel: string[]; current: boolean }[]; officials: { name: string; institution: string }[] }[] };
};
const bn = (v: number) => `${fmt(v / 1e9, 2)} млрд. €`;
const mn = (v: number) => `${fmt(v / 1e6, 1)} млн. €`;
const PERIOD: Record<string, string> = { "2014-20": "Програмен период 2014–2020", "2021-27": "Програмен период 2021–2027", RRP: "План за възстановяване (ПВУ)" };
const REL: Record<string, string> = { director: "управител", representative: "представител", owner: "собственик", partner: "съдружник", board: "член на съвет", procurator: "прокурист" };

export default function Evrosredstva() {
  const t = F.totals;
  const periods = Object.entries(F.byPeriod).filter(([, v]) => v.contractedEur > 0);
  const FUND: Record<string, string> = { "fund:RRP": "План за възстановяване (ПВУ)", "fund:ERDF": "Европейски фонд за регионално развитие", "fund:CF": "Кохезионен фонд", "fund:EAFRD": "Земеделски фонд за селските райони", "fund:ESF": "Европейски социален фонд", "fund:EMFF": "Фонд за морско дело и рибарство", "fund:Other": "Други фондове" };
  const nodes: FlowNode[] = F.sankey.nodes.map((n) => ({ id: n.id, label: FUND[n.id] ?? n.label, kind: n.kind === "fund" ? "source" : "buyer" }));
  const muniName = (c: string) => (c === "SOF00" ? "София (столица)" : (ELECTIONS.munis as Record<string, { name: string }>)[c]?.name ?? c);
  const mapValues: Record<string, { name: string; value: number; note: string }> = Object.fromEntries(Object.entries(F.munis).map(([c, m]) => [c, { name: muniName(c), value: Math.round(m.perCapita), note: `${mn(m.total)} по ${m.contracts} договора` }]));
  // На картата София е по райони, а евросредствата са за цялата столична община.
  if (mapValues.SOF00) for (const c of Object.keys(ELECTIONS.munis)) if (/^S2[345]/.test(c)) mapValues[c] = { ...mapValues.SOF00, note: `${mapValues.SOF00.note} (цялата столична община)` };
  const munisSorted = Object.entries(F.munis).map(([c, m]) => ({ c, name: muniName(c), ...m }));
  const topPc = [...munisSorted].sort((a, b) => b.perCapita - a.perCapita).slice(0, 10);
  const lowPc = [...munisSorted].filter((m) => m.pop > 0).sort((a, b) => a.perCapita - b.perCapita).slice(0, 10);

  return (
    <Page>
      <Title back={{ href: "/ikonomika", label: "Икономика" }} lead="Всички договори с европейски пари от регистъра ИСУН: от кои фондове, по кои програми, за кого и в коя община. Колко е договорено и колко е реално изплатено.">
        Европейски средства
      </Title>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        {[
          { l: "Договорени", v: bn(t.contractedEur), s: `${t.contractCount.toLocaleString("bg-BG")} договора` },
          { l: "Изплатени", v: bn(t.paidEur), s: `${fmt((t.paidEur / t.contractedEur) * 100, 0)}% от договореното` },
          { l: "Бенефициенти", v: t.beneficiaries.toLocaleString("bg-BG"), s: "фирми, общини, ведомства, НПО" },
          { l: "На държавата и общините", v: `${fmt((F.byOrgType.find((x) => x.key === "Държавна администрация")!.contracted / t.contractedEur) * 100, 0)}%`, s: "от договорените пари" },
        ].map((k) => (
          <div key={k.l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{k.l}</p><p className="display text-[2.4rem] leading-none mt-1">{k.v}</p><p className="text-xs text-muted mt-1">{k.s}</p></div>
        ))}
      </div>

      <section className="mb-14">
        <SectionTitle>Усвояване: договорено срещу изплатено</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {periods.map(([k, v]) => (
            <div key={k} className="ring-1 ring-rule rounded-sm p-4 bg-white">
              <p className="font-semibold">{PERIOD[k] ?? k}</p>
              <p className="display text-[2.6rem] leading-none mt-2">{fmt(v.absorptionPct, 0)}%</p>
              <div className="h-2.5 rounded-full bg-surface mt-2 overflow-hidden"><div className="h-full bg-green" style={{ width: `${v.absorptionPct}%` }} /></div>
              <p className="text-sm text-muted mt-2">{bn(v.paidEur)} изплатени от {bn(v.contractedEur)} договорени</p>
            </div>
          ))}
        </div>
        <p className="text-[15px] mt-4 max-w-3xl">Най-голямото перо е Планът за възстановяване. Срокът за изпълнение на инвестициите по него е 31 август 2026 г. (<a href="https://www.bta.bg/bg/videos/37417" target="_blank" rel="noreferrer">БТА</a>), а по регистъра е изплатена под една трета. Неизплатеното не е непременно загубено: плащанията към бенефициентите често се отразяват със закъснение. Но това е мястото, където рискът от загубени пари е най-голям.</p>
      </section>

      <section className="mb-14">
        <SectionTitle>Откъде идват и по кои програми</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Фондовете на ЕС вляво, програмите вдясно, по договорената сума. Показани са най-големите програми.</p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><MoneyFlow nodes={nodes} links={F.sankey.links} /></div>
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold text-green">Всички програми ({F.byProgramme.length})</summary>
          <div className="overflow-x-auto ring-1 ring-rule rounded-sm bg-white mt-3">
            <table className="w-full text-[15px]">
              <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="p-3">Програма</th><th className="p-3">Период</th><th className="p-3 num">Договорени</th><th className="p-3 num">Изплатени</th><th className="p-3 num">Усвоени</th></tr></thead>
              <tbody>{F.byProgramme.map((p) => (
                <tr key={p.code} className="border-t border-rule"><td className="p-3">{p.name}</td><td className="p-3 text-sm">{p.period}</td><td className="p-3 num">{mn(p.contracted)}</td><td className="p-3 num">{mn(p.paid)}</td>
                  <td className={`p-3 num ${p.pct < 30 ? "text-red" : ""}`}>{fmt(p.pct, 0)}%</td></tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="mb-14">
        <SectionTitle>Къде отиват: по общини</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Договорени средства на човек от населението. Проекти, които обхващат няколко общини, са разделени поравно между тях. Националните проекти (пътища, железници) не са включени.</p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><ChoroMap values={mapValues} color="#1F4D3A" legend="Договорени евросредства на човек, €" unit=" €" /></div>
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <div><p className="font-semibold mb-2">Най-много на човек</p><ol className="text-[15px]">{topPc.map((m) => <li key={m.c} className="flex justify-between border-b border-rule py-1"><span>{m.name}</span><span className="num">{Math.round(m.perCapita).toLocaleString("bg-BG")} € · {mn(m.total)}</span></li>)}</ol></div>
          <div><p className="font-semibold mb-2">Най-малко на човек</p><ol className="text-[15px]">{lowPc.map((m) => <li key={m.c} className="flex justify-between border-b border-rule py-1"><span>{m.name}</span><span className="num">{Math.round(m.perCapita).toLocaleString("bg-BG")} € · {mn(m.total)}</span></li>)}</ol></div>
        </div>
      </section>

      <section className="mb-14">
        <SectionTitle>Кой получава</SectionTitle>
        <div className="overflow-x-auto ring-1 ring-rule rounded-sm bg-white mb-6">
          <table className="w-full text-[15px]">
            <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="p-3">Вид бенефициент</th><th className="p-3 num">Брой</th><th className="p-3 num">Договорени</th><th className="p-3 num">Изплатени</th></tr></thead>
            <tbody>{F.byOrgType.filter((x) => x.contracted > 1e6).map((x) => <tr key={x.key} className="border-t border-rule"><td className="p-3">{x.key}</td><td className="p-3 num">{x.n.toLocaleString("bg-BG")}</td><td className="p-3 num">{bn(x.contracted)}</td><td className="p-3 num">{bn(x.paid)}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="font-semibold mb-2">Най-големите бенефициенти</p>
        <div className="overflow-x-auto ring-1 ring-rule rounded-sm bg-white">
          <table className="w-full text-[15px]">
            <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="p-3">Бенефициент</th><th className="p-3 num">Договори</th><th className="p-3 num">Договорени</th><th className="p-3 num">Изплатени</th><th className="p-3 num hidden sm:table-cell">Дял изплатен</th></tr></thead>
            <tbody>{F.top.slice(0, 25).map((x) => (
              <tr key={x.eik} className="border-t border-rule">
                <td className="p-3"><Link href={`/porachki/firma/${x.eik}`}>{x.name}</Link>{x.mpTied && <span className="text-xs ml-2 bg-[#fbecc4] rounded-full px-2 py-0.5">връзка с депутат</span>}</td>
                <td className="p-3 num">{x.contracts}</td><td className="p-3 num">{mn(x.contracted)}</td><td className="p-3 num">{mn(x.paid)}</td>
                <td className={`p-3 num hidden sm:table-cell ${x.paid / x.contracted < 0.2 ? "text-red" : ""}`}>{fmt((x.paid / x.contracted) * 100, 0)}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="mb-14">
        <SectionTitle>Връзки с политици и длъжностни лица</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">{F.political.totals.flaggedEiks} бенефициенти имат по Търговския регистър или имуществените декларации връзка с депутат или длъжностно лице: управител, представител, собственик. При държавните фирми това често е служебна роля, а не личен интерес. Връзката е повод за въпрос, не обвинение.</p>
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Договорени при такива бенефициенти</p><p className="display text-[2rem]">{bn(F.political.totals.contractedEur)}</p></div>
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Свързани с депутат</p><p className="display text-[2rem]">{F.political.totals.mpOnly + F.political.totals.both}</p></div>
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Свързани с длъжностно лице</p><p className="display text-[2rem]">{F.political.totals.officialOnly + F.political.totals.both}</p></div>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {F.political.top.filter((x) => x.mps.length).slice(0, 16).map((x) => (
            <li key={x.eik} className="ring-1 ring-rule rounded-sm p-4 bg-white">
              <Link href={`/porachki/firma/${x.eik}`} className="font-semibold">{x.name}</Link>
              <p className="text-sm text-muted">{x.type} · договорени {mn(x.contracted)}, изплатени {mn(x.paid)}</p>
              <ul className="text-[15px] mt-2 space-y-0.5">{x.mps.map((m) => <li key={m.id}><Link href={`/parlament/deputat/${m.id}`}>{m.name}</Link> <span className="text-muted">— {m.rel.map((r) => REL[r] ?? r).join(", ")}{m.current ? "" : " (в миналото)"}</span></li>)}</ul>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted">Източник: <a href={F.source.url} target="_blank" rel="noreferrer">{F.source.title}</a>, към {formatDate(F.updated)}. Обработка: <a href={F.source.repo} target="_blank" rel="noreferrer">„Наясно“</a>.</p>
    </Page>
  );
}
