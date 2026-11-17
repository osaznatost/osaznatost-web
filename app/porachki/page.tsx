import Link from "next/link";
import { muniSlug, oblastSlug } from "@/lib/regions";
import { Suspense } from "react";
import { MultiLine } from "@/components/Charts";
import { PlaceFilterBar } from "@/components/PlaceFilterBar";
import { AnnexList, ContractList, NOT_READY } from "@/components/proc";
import { Page, SectionTitle, Title } from "@/components/ui";
import { FIN_SOURCE, OBLASTS, findMunicipality, findOblast, findSettlement, muniFinance, quarterLabel } from "@/lib/places";
import {
  PROC_READY, type PlaceFilter, type PlaceStat, biggestAnnexes, biggestContracts, firmUrl, fmtDate, fmtEur, importState, latestContracts,
  placeMunicipalities, placeMunicipality, placeOblast, placeOblasts, placeSettlement, placeSettlements, placeSuppliers, politicalLinks,
  searchContracts, singleOfferBig,
} from "@/lib/procurement";

export const metadata = { title: "Обществени поръчки" };

type SP = { q?: string; nivo?: string; oblast?: string; obshtina?: string; mesto?: string };
const minus = (d: string, days: number) => new Date(Date.parse(d) - days * 864e5).toISOString().slice(0, 10);
const pctOf = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

function placeLink(f: PlaceFilter) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return `/porachki${p.size ? `?${p}` : ""}`;
}

function Kpis({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([l, v, n]) => (
        <div key={l} className="bg-surface rounded-sm p-4">
          <p className="text-sm text-muted">{l}</p>
          <p className="display num text-[2.3rem] mt-1 leading-none">{v}</p>
          {n && <p className="text-sm mt-1">{n}</p>}
        </div>
      ))}
    </div>
  );
}

function BreakdownTable({ rows, label, link }: { rows: PlaceStat[]; label: (r: PlaceStat) => string; link: (r: PlaceStat) => string }) {
  if (!rows.length) return <p className="text-muted text-[15px]">Няма данни.</p>;
  const max = Math.max(...rows.map((r) => r.total_eur ?? 0));
  return (
    <ul className="divide-y divide-rule border-y border-rule text-[15px]">
      {rows.map((r) => (
        <li key={label(r)} className="py-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 items-center">
          <Link href={link(r)} className="truncate font-semibold">{label(r)}</Link>
          <span className="num whitespace-nowrap text-right">{fmtEur(r.total_eur)}</span>
          <div className="col-span-2 mt-1 flex items-center gap-3">
            <div className="h-1.5 bg-surface rounded-full flex-1 overflow-hidden"><div className="h-full bg-green" style={{ width: `${((r.total_eur ?? 0) / (max || 1)) * 100}%` }} /></div>
            <span className="text-xs text-muted whitespace-nowrap">{r.contracts} дог. · една оферта: <span className={r.single_offer / r.contracts > 0.3 ? "text-red font-semibold" : ""}>{pctOf(r.single_offer, r.contracts)}</span></span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MuniFinanceBlock({ code }: { code: string }) {
  const f = muniFinance(code);
  if (!f) return null;
  const y = f.history.at(-1);
  const own = y?.revenue && y.expenditure && f.ownShare ? f.ownShare : null;
  const hist = f.history.flatMap((h) => [
    { series: "Разходи", x: h.year, value: (h.expenditure ?? 0) / 1e6 },
    { series: "Собствени приходи", x: h.year, value: (h.revenue ?? 0) / 1e6 },
    { series: "Дълг", x: h.year, value: (h.debt ?? 0) / 1e6 },
  ]);
  return (
    <section className="mb-12">
      <SectionTitle>Парите на общината</SectionTitle>
      <Kpis items={[
        [`Разходи, ${y?.year}`, fmtEur(y?.expenditure), "всички плащания на общината"],
        [`Собствени приходи, ${y?.year}`, fmtEur(y?.revenue), "местни данъци, такси, наеми, продажби"],
        ["Дълг", fmtEur(f.debt), `${quarterLabel(f.period)}${f.debtPerCapita ? ` · ${Math.round(f.debtPerCapita)} € на жител` : ""}`],
        ["Просрочени задължения", fmtEur(f.arrears), f.arrears ? "неплатени сметки след срока" : "няма просрочени"],
      ]} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px] mt-4">
        <div className="ring-1 ring-rule rounded-sm p-4">
          <p className="font-semibold mb-2">Разходи, собствени приходи и дълг по години, млн. €</p>
          <MultiLine data={hist} unit=" млн." height={260} zero />
        </div>
        <div className="ring-1 ring-rule rounded-sm p-4 text-[15px] space-y-3">
          <p className="font-semibold">Откъде идват парите</p>
          {own != null && (
            <>
              <div className="flex h-4 rounded-full overflow-hidden">
                <div className="bg-green" style={{ width: `${own}%` }} title="Собствени приходи" />
                <div className="bg-[#b08436] flex-1" title="Пари от държавата и ЕС" />
              </div>
              <p><b>{Math.round(own)}%</b> са собствени приходи на общината, останалите <b>{100 - Math.round(own)}%</b> идват от държавата (субсидии и трансфери) и от европейски програми.</p>
            </>
          )}
          {f.collection != null && <p>Събираемост на данъка върху имотите и превозните средства: <b>{Math.round(f.collection)}%</b>.</p>}
          {f.wageShare != null && <p>За заплати и осигуровки отиват <b>{Math.round(f.wageShare)}%</b> от разходите.</p>}
          {f.recovery && <p className="text-red font-semibold">Общината е в процедура за финансово оздравяване.</p>}
          <p className="text-xs text-muted">{FIN_SOURCE}.</p>
        </div>
      </div>
    </section>
  );
}

async function Search({ q }: { q: string }) {
  const items = await searchContracts(q);
  return (
    <section className="mb-12">
      <SectionTitle>Резултати за „{q}“</SectionTitle>
      <ContractList items={items} />
    </section>
  );
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f: PlaceFilter = { nivo: sp.nivo, oblast: sp.oblast, obshtina: sp.obshtina, mesto: sp.mesto };
  const ob = findOblast(f.oblast);
  const mu = findMunicipality(f.obshtina);
  const se = findSettlement(f.mesto);
  const last = await importState();
  if (!PROC_READY || !last) return NOT_READY;
  const since = minus(last, 90);
  const placeName = se ? `${se.isVillage ? "с." : "гр."} ${se.name}` : mu ? `Община ${mu.name}` : ob ? `Област ${ob.name}` : "Цялата страна";

  const [stat, breakdown, suppliers, annexes, single, big, latest] = await Promise.all([
    se ? placeSettlement(se.ekatte) : mu ? placeMunicipality(mu.code) : ob ? placeOblast(ob.name) : Promise.resolve(undefined),
    mu ? placeSettlements(mu.code) : ob ? placeMunicipalities(ob.name) : placeOblasts(),
    mu ? placeSuppliers(mu.code) : Promise.resolve([]),
    biggestAnnexes(since, f), singleOfferBig(since, f), biggestContracts(since, f), latestContracts(f),
  ]);

  return (
    <>
      <div className="bg-surface rounded-sm p-4 mb-8">
        <PlaceFilterBar
          base="/porachki"
          current={f}
          oblasts={OBLASTS.map((o) => ({ value: o.name, label: o.name }))}
          municipalities={(ob?.municipalities ?? []).map((m) => ({ value: m.code, label: m.name }))}
          settlements={(mu ? findOblast(mu.oblast)?.municipalities.find((m) => m.code === mu.code)?.settlements ?? [] : []).map((s) => ({ value: s[0], label: `${s[2] ? "с." : "гр."} ${s[1]}` }))}
        />
        <p className="text-xs text-muted mt-3">
          Мястото е седалището на възложителя. Държавните институции са в София, дори когато строят другаде. За тях избери „Ниво: Държавни институции“.
        </p>
      </div>

      <p className="text-sm text-muted mb-2">
        {ob && <><Link href={placeLink({ nivo: f.nivo })}>България</Link> › </>}
        {mu && ob && <><Link href={placeLink({ nivo: f.nivo, oblast: ob.name })}>Област {ob.name}</Link> › </>}
        {se && mu && <><Link href={placeLink({ nivo: f.nivo, oblast: mu.oblast, obshtina: mu.code })}>Община {mu.name}</Link> › </>}
        Данните са до {fmtDate(last)}, обновяват се на всеки 3 часа.
      </p>
      <h2 className="display text-[2.8rem] leading-none mb-5">{placeName}</h2>

      {stat && (
        <section className="mb-12">
          <Kpis items={[
            ["Договори в базата", stat.contracts.toLocaleString("bg-BG")],
            ["Обща стойност", fmtEur(stat.total_eur)],
            ["С една оферта", pctOf(stat.single_offer, stat.contracts), `${stat.single_offer} договора без конкуренция`],
            ["Възложители", stat.buyers != null ? String(stat.buyers) : "—", "общини, училища, болници и др."],
          ]} />
        </section>
      )}

      {mu && !se && <p className="mb-6 -mt-6"><Link href={`/mesta/${oblastSlug(mu.code)}/${muniSlug(mu.code)}/vlast`} className="font-semibold">Кой управлява общината и има ли дялове във фирмите изпълнители →</Link></p>}
      {mu && !se && <MuniFinanceBlock code={mu.code} />}

      <section className="mb-12">
        <SectionTitle>{mu ? "По населени места" : ob ? "По общини" : "По области"}</SectionTitle>
        <BreakdownTable
          rows={breakdown}
          label={(r) => (mu ? `${r.is_village ? "с." : "гр."} ${r.settlement}` : ob ? `Община ${r.municipality}` : `${r.oblast}`)}
          link={(r) => (mu ? placeLink({ ...f, mesto: r.ekatte }) : ob ? placeLink({ ...f, obshtina: r.municipality_code }) : placeLink({ nivo: f.nivo, oblast: r.oblast }))}
        />
      </section>

      {suppliers.length > 0 && (
        <section className="mb-12">
          <SectionTitle>Кой печели най-много в общината</SectionTitle>
          <ul className="divide-y divide-rule border-y border-rule text-[15px]">
            {suppliers.map((s) => (
              <li key={s.eik} className="py-2 grid grid-cols-[1fr_auto] gap-3">
                <span className="truncate"><Link href={firmUrl(s.eik)}>{s.name}</Link>{politicalLinks(s.eik).length > 0 && <span className="text-red font-bold" title="Връзка с политик по Търговския регистър"> ●</span>}</span>
                <span className="num whitespace-nowrap">{s.contracts} дог. · {fmtEur(s.total_eur)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-2">● Връзка с депутат или длъжностно лице по Търговския регистър.</p>
        </section>
      )}

      <section className="mb-14">
        <SectionTitle>Най-голямо оскъпяване с анекси, последните 90 дни</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Анексът променя договора след подписването му. Голямото оскъпяване не е непременно нарушение, но заслужава въпрос: защо цената не е била ясна при търга?</p>
        <AnnexList items={annexes} />
      </section>
      <section className="mb-14">
        <SectionTitle>Големи договори само с една оферта</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Когато участва само един кандидат, няма с кого да се сравни цената. Причината може да е тясна специализация, кратък срок или условия, написани за конкретна фирма.</p>
        <ContractList items={single} />
      </section>
      <section className="mb-14"><SectionTitle>Най-големите договори, последните 90 дни</SectionTitle><ContractList items={big} /></section>
      <section className="mb-14"><SectionTitle>Последно публикувани договори</SectionTitle><ContractList items={latest} /></section>
    </>
  );
}

async function SearchSlot({ searchParams }: { searchParams: Promise<SP> }) {
  const q = ((await searchParams).q ?? "").trim();
  return q ? <Search q={q} /> : null;
}

export default function Porachki({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <Page>
      <Title lead="Кой какво възлага, кой печели, за колко и как се променя цената след подписа. По области, общини и населени места, с източник за всеки договор.">
        Обществени поръчки
      </Title>
      <form action="/porachki" className="flex gap-2 mb-6 max-w-2xl">
        <input name="q" placeholder="Търси поръчка, възложител или ЕИК на фирма" className="flex-1 rounded-sm ring-1 ring-rule px-3 py-2.5 text-[16px] focus:ring-2 focus:ring-green outline-none" />
        <button className="bg-red text-white px-5 rounded-sm font-semibold">Търси</button>
      </form>
      <Suspense fallback={null}><SearchSlot searchParams={searchParams} /></Suspense>
      <Suspense fallback={<p className="text-muted">Зареждане…</p>}><Content searchParams={searchParams} /></Suspense>
      <section className="max-w-3xl text-[15px] mt-6">
        <SectionTitle>Как да четем тези данни</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Прогнозна стойност</b> е колкото възложителят е очаквал да плати. <b>Договорена</b> е сумата в подписания договор. Реално платената сума може да се различава.</li>
          <li><b>Сигналите</b> (една оферта, голям анекс, връзка с политик) са причина за въпрос, а не доказателство за нарушение.</li>
          <li>Източници: отворените данни на ЦАИС ЕОП (Агенция по обществени поръчки), отчетите на общините в Министерството на финансите и Търговският регистър (обработени от „Наясно“). Местата са по регистъра ЕКАТТЕ.</li>
        </ul>
      </section>
    </Page>
  );
}
