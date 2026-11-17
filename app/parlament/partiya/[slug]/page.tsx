import Link from "next/link";
import { notFound } from "next/navigation";
import { BarRank } from "@/components/Charts";
import { PartyBadge } from "@/components/PartyBadge";
import { Page, SectionTitle, Title } from "@/components/ui";
import { VoteMap } from "@/components/VoteMap";
import { MPS, partyStats } from "@/lib/parliament";
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
  const shared = p.sharedList ? PARTY_META.find((x) => x.group === p.sharedList) : undefined;

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

      {shared && (
        <p className="bg-[#fbecc4] rounded-sm px-4 py-3 mb-10 max-w-3xl text-[15px]">
          На изборите {p.name} и <Link href={`/parlament/partiya/${shared.slug}`}>{shared.name}</Link> бяха в обща листа „{p.list}“. Резултатите, картата и социологията по-долу са за общата листа, защото гласовете не се делят между двете партии.
        </p>
      )}

      <section className="mb-14">
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

      <section className="mb-14">
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

      <section className="mb-14">
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

      <section className="mb-6">
        <SectionTitle>Депутатите ({mps.length})</SectionTitle>
        <p className="flex flex-wrap gap-x-4 gap-y-1.5 text-[15px]">{mps.map((m) => <Link key={m.id} href={`/parlament/deputat/${m.id}`}>{m.name}</Link>)}</p>
      </section>
      <p className="text-xs text-muted">Изборни резултати: <a href={ELECTIONS.source.url} target="_blank" rel="noreferrer">{ELECTIONS.source.title}</a>.</p>
    </Page>
  );
}
