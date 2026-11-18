import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { PolDot } from "@/components/proc";
import { AnnexList, ContractList } from "@/components/proc";
import { Page, SectionTitle, Title } from "@/components/ui";
import { placeHref } from "@/lib/regions";
import { sharedPeople } from "@/lib/tr";
import { PaidByBuyer } from "@/components/PaidBox";
import { buyerAnnexes, buyerContracts, buyerPlace, contractRef, firmUrl, fmtEur } from "@/lib/procurement";
import { contractFlags, strongestLink, riskLabel, riskScore } from "@/lib/redFlags";
import { byCategory, hhi, possibleSplits, repeatedWork, THRESHOLDS } from "@/lib/buyerAnalysis";

export const metadata = { title: "Възложител" };

async function Content({ params }: { params: Promise<{ eik: string }> }) {
  const { eik } = await params;
  if (!/^\d{9,13}$/.test(eik)) notFound();
  const [contracts, annexes, place] = await Promise.all([buyerContracts(eik, 500), buyerAnnexes(eik), buyerPlace(eik)]);
  if (!contracts.length && !annexes.length) notFound();
  const name = contracts[0]?.buyer_name ?? annexes[0]?.buyer_name;
  const total = contracts.reduce((s, c) => s + (c.contract_value_eur ?? 0), 0);
  const single = contracts.filter((c) => c.offers_count === 1).length;
  const bySup = new Map<string, { name: string; n: number; sum: number }>();
  for (const c of contracts) c.supplier_eiks.forEach((e, i) => {
    const x = bySup.get(e) ?? { name: c.supplier_names[i] ?? e, n: 0, sum: 0 };
    x.n++; x.sum += (c.contract_value_eur ?? 0) / c.supplier_eiks.length;
    bySup.set(e, x);
  });
  const top = [...bySup.entries()].sort((a, b) => b[1].sum - a[1].sum).slice(0, 15);
  const share = top[0] && total ? top[0][1].sum / total : 0;
  const repeats = repeatedWork(contracts).slice(0, 12);
  const risky = contracts.map((c) => { const fl = contractFlags(c, annexes.filter((a) => a.contract_number === c.contract_number), strongestLink(c.supplier_eiks)); return { c, fl, score: riskScore(fl) }; })
    .filter((x) => x.score >= 20).sort((a, b) => b.score - a.score || (b.c.contract_value_eur ?? 0) - (a.c.contract_value_eur ?? 0));
  const riskShare = contracts.length ? Math.round((risky.length / contracts.length) * 100) : 0;
  const splits = possibleSplits(contracts).slice(0, 10);
  const cats = byCategory(contracts);
  const conc = hhi(contracts);
  const top3 = top.slice(0, 3).reduce((a, [, x]) => a + x.sum, 0);
  const d = (x: string | null) => (x ? new Date(x).toLocaleDateString("bg-BG") : "—");

  return (
    <>
      <Title small back={{ href: "/porachki", label: "Поръчки" }} kicker={`Възложител · ЕИК ${eik}`}
        lead={<>{contracts[0]?.buyer_type}{place?.municipality_code && <> · {place.ekatte ? <Link href={placeHref.settlement(place.municipality_code, place.ekatte)}>{place.settlement}</Link> : null}{place.ekatte ? ", " : ""}<Link href={placeHref.muni(place.municipality_code)}>община {place.municipality}</Link></>}{place?.level && ` · ${place.level}`}</>}>{name}</Title>
      {/^община\s/i.test(name) && place?.municipality_code && <Link href={placeHref.muni(place.municipality_code)} className="block ring-1 ring-rule rounded-sm p-4 mb-8 bg-white no-underline text-ink hover:ring-2 hover:ring-green max-w-4xl"><b>Всичко за {name.toLowerCase().replace(/^община/, "общината")} на едно място →</b> <span className="text-muted">хората, парите, кой управлява, проектите и решенията на съвета.</span></Link>}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {[
          ["Договори в базата", String(contracts.length)],
          ["Обща стойност", fmtEur(total)],
          ["С една оферта", `${single} (${contracts.length ? Math.round((single / contracts.length) * 100) : 0}%)`],
          ["Най-голям изпълнител", share ? `${Math.round(share * 100)}%` : "—"],
        ].map(([l, v]) => (
          <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[2.4rem] mt-1">{v}</p></div>
        ))}
      </section>
      <section className="mb-10">
        <SectionTitle>На кого плаща най-много</SectionTitle>
        <ul className="divide-y divide-rule border-y border-rule text-[15px]">
          {top.map(([e, x]) => (
            <li key={e} className="py-2 flex justify-between gap-3">
              <span className="truncate"><Link href={firmUrl(e)}>{x.name}</Link><PolDot eik={e} /></span>
              <span className="num whitespace-nowrap">{x.n} · {fmtEur(x.sum)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted mt-2">● Фирмата има връзка с политик или длъжностно лице по Търговския регистър.</p>
      </section>
      <section className="mb-10">
        <SectionTitle>Най-рисковите договори</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Индекс от червени флагове (една оферта, без открит конкурс, оскъпяване с анекси, цена точно под прага, връзка с политик и др.). {risky.length} от {contracts.length} договора ({riskShare}%) имат среден или висок риск.</p>
        {risky.length ? (
          <ul className="divide-y divide-rule border-y border-rule text-[15px]">{risky.slice(0, 15).map(({ c, fl, score }) => (
            <li key={c.id} className="py-2 grid sm:grid-cols-[5.5rem_1fr_auto] gap-x-3 items-start">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full text-center ${riskLabel(score).cls}`}>{score}</span>
              <span><Link href={`/porachki/dogovor/${encodeURIComponent(contractRef(c.buyer_eik, c.contract_number))}`}>{c.tender_name}</Link><span className="block text-sm text-muted">{c.supplier_names.join(", ")} · {fl.map((x) => x.label.toLowerCase()).join(", ")}</span></span>
              <span className="num">{fmtEur(c.contract_value_eur)}</span>
            </li>
          ))}</ul>
        ) : <p className="text-[15px]">Няма договори със среден или висок риск.</p>}
      </section>

      <section className="mb-10">
        <SectionTitle>За какво отиват парите</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">По ключови думи в предмета на поръчката. Един договор може да попадне в повече от една категория.</p>
        <ul className="space-y-2 max-w-3xl">{cats.rows.map((r) => (
          <li key={r.id} className="text-[15px]"><div className="flex justify-between"><span>{r.label}</span><span className="num">{fmtEur(r.sum)} · {r.n} дог. · {Math.round(r.share * 100)}%</span></div>
            <div className="h-2 rounded-full bg-surface mt-1"><div className="h-full rounded-full bg-green" style={{ width: `${Math.min(100, r.share * 100)}%` }} /></div></li>
        ))}</ul>
      </section>

      <section className="mb-10">
        <SectionTitle>Колко е концентрирано</SectionTitle>
        <p className="text-[15px] max-w-3xl">Трите най-големи изпълнители получават <b>{total ? Math.round((top3 / total) * 100) : 0}%</b> от парите. Индексът на концентрация е <b>{conc.toLocaleString("bg-BG")}</b> от 10 000{conc > 2500 ? ": силно концентрирано, няколко фирми вземат почти всичко" : conc > 1500 ? ": умерено концентрирано" : ": парите са разпределени между много фирми"}. Висока концентрация не е доказателство за нарушение, но е знак, че конкуренцията е слаба.</p>
      </section>

      <section className="mb-10">
        <SectionTitle>Повтарящи се поръчки</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Поръчки с много сходен предмет в рамките на две години, например ремонт на една и съща улица или площад. Понякога е нормално (етапи, годишна поддръжка), но повторен ремонт на едно място за кратко време е повод да се поиска обяснение.</p>
        {repeats.length ? (
          <ul className="space-y-3">{repeats.map((r) => (
            <li key={r.key} className="ring-1 ring-rule rounded-sm p-4 bg-white">
              <p className="font-semibold">{r.contracts.length} поръчки за {r.months} месеца · {fmtEur(r.total)}</p>
              <p className="text-sm text-muted mb-2">Изпълнители: {r.suppliers.join(", ")}</p>
              <ul className="text-[15px] space-y-1">{r.contracts.map((c) => (
                <li key={c.id} className="grid sm:grid-cols-[6.5rem_1fr_auto] gap-x-3"><span className="text-sm text-muted num">{d(c.contract_date)}</span><Link href={`/porachki/dogovor/${encodeURIComponent(contractRef(c.buyer_eik, c.contract_number))}`}>{c.tender_name}</Link><span className="num">{fmtEur(c.contract_value_eur)}</span></li>
              ))}</ul>
            </li>
          ))}</ul>
        ) : <p className="text-[15px]">Не открихме поръчки с почти еднакъв предмет в рамките на две години.</p>}
      </section>

      <section className="mb-10">
        <SectionTitle>Възможно разделяне под праговете</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Няколко договора с една и съща фирма в рамките на 90 дни, всеки под прага за открита процедура ({fmtEur(THRESHOLDS.works)} за строителство, {fmtEur(THRESHOLDS.other)} за доставки и услуги), а заедно над него. Законът забранява изкуственото разделяне, за да се избегне конкуренция.</p>
        {splits.length ? (
          <ul className="space-y-3">{splits.map((x) => (
            <li key={`${x.eik}-${x.kind}`} className="ring-1 ring-rule rounded-sm p-4 bg-white">
              <p className="font-semibold"><Link href={firmUrl(x.eik)}>{x.supplier}</Link>: {x.contracts.length} договора за {x.kind}, общо {fmtEur(x.total)}</p>
              <ul className="text-[15px] mt-1">{x.contracts.map((c) => <li key={c.id} className="grid sm:grid-cols-[6.5rem_1fr_auto] gap-x-3"><span className="text-sm text-muted num">{d(c.contract_date)}</span><Link href={`/porachki/dogovor/${encodeURIComponent(contractRef(c.buyer_eik, c.contract_number))}`}>{c.tender_name}</Link><span className="num">{fmtEur(c.contract_value_eur)}</span></li>)}</ul>
            </li>
          ))}</ul>
        ) : <p className="text-[15px]">Не открихме такива групи договори.</p>}
        <p className="text-xs text-muted mt-3">Ограничение: в регистъра на обществените поръчки (ЦАИС ЕОП) влизат само поръчките, обявени там. Малките покупки под 30 000 лв. за доставки и услуги и под 50 000 лв. за строителство се правят без обявление и не се виждат. Те личат само в отчета за разходите на общината. Ремонтите по годишни рамкови договори също не винаги се появяват като отделни поръчки.</p>
      </section>

      {(() => {
        const sh = sharedPeople(contracts.flatMap((c) => c.supplier_eiks));
        const names = new Map(contracts.flatMap((c) => c.supplier_eiks.map((e, i) => [e.slice(0, 9), c.supplier_names[i] ?? e] as [string, string])));
        return sh.length > 0 && (
          <section className="mb-10">
            <SectionTitle>Изпълнители с общи собственици или управители</SectionTitle>
            <p className="text-[15px] text-muted -mt-3 mb-3 max-w-3xl">Различни фирми, които печелят поръчки от този възложител, но имат общ управител, съдружник или собственик (по Търговския регистър, по три имена). Така може да се създава видимост на конкуренция там, където няма. Проверете дали са се явявали една срещу друга.</p>
            <ul className="space-y-2 text-[15px]">{sh.slice(0, 30).map((x) => (
              <li key={x.name} className="ring-1 ring-[#e08a2e] rounded-sm p-3 bg-white"><b>{x.name}</b>: {x.firms.map((e, i) => <span key={e}>{i ? ", " : ""}<Link href={firmUrl(e)}>{names.get(e) ?? e}</Link></span>)}</li>
            ))}</ul>
          </section>
        );
      })()}
      <PaidByBuyer name={name} />
      <section className="mb-10"><SectionTitle>Анекси</SectionTitle><AnnexList items={annexes.slice(0, 20)} /></section>
      <section><SectionTitle>Договори</SectionTitle><ContractList items={contracts.slice(0, 100)} hideBuyer /></section>
    </>
  );
}

export default function Vazlozhitel({ params }: { params: Promise<{ eik: string }> }) {
  return <Page><Suspense fallback={<p className="text-muted">Зареждане…</p>}><Content params={params} /></Suspense></Page>;
}
