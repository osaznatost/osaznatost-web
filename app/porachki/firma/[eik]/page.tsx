import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AnnexList, ContractList, LinksBox } from "@/components/proc";
import { Page, SectionTitle, Title } from "@/components/ui";
import { buyerUrl, fmtDate, fmtEur, supplierAnnexes, supplierContracts, supplierStats } from "@/lib/procurement";
import Link from "next/link";

export const metadata = { title: "Фирма" };

async function Content({ params }: { params: Promise<{ eik: string }> }) {
  const { eik } = await params;
  if (!/^\d{9,13}$/.test(eik)) notFound();
  const [s, contracts, annexes] = await Promise.all([supplierStats(eik), supplierContracts(eik), supplierAnnexes(eik)]);
  if (!s && !contracts.length) notFound();
  const name = s?.name ?? contracts[0]?.supplier_names[contracts[0].supplier_eiks.indexOf(eik)] ?? eik;
  const byBuyer = new Map<string, { name: string; n: number; sum: number }>();
  for (const c of contracts) {
    const b = byBuyer.get(c.buyer_eik) ?? { name: c.buyer_name, n: 0, sum: 0 };
    b.n++; b.sum += c.contract_currency === "EUR" ? c.contract_value ?? 0 : 0;
    byBuyer.set(c.buyer_eik, b);
  }
  const buyers = [...byBuyer.entries()].sort((a, b) => b[1].sum - a[1].sum).slice(0, 12);
  const annexSum = annexes.reduce((x, a) => x + Math.max(0, a.value_difference ?? 0), 0);

  return (
    <>
      <Title small back={{ href: "/porachki", label: "Поръчки" }} kicker={`Изпълнител · ЕИК ${eik}`}
        lead={s ? `Печелила е ${s.contracts} договора от ${fmtDate(s.first_date)} до ${fmtDate(s.last_date)}.` : undefined}>
        {name}
      </Title>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {[
          ["Договори", String(s?.contracts ?? contracts.length)],
          ["Обща стойност", fmtEur(s?.total_eur)],
          ["Възложители", String(s?.buyers ?? byBuyer.size)],
          ["С една оферта", String(s?.single_offer ?? 0)],
        ].map(([l, v]) => (
          <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[2.4rem] mt-1">{v}</p></div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2 mb-10">
        <div className="ring-1 ring-rule rounded-sm p-5"><h3 className="font-semibold mb-2">Връзки с политици</h3><LinksBox eik={eik} /></div>
        <div className="ring-1 ring-rule rounded-sm p-5">
          <h3 className="font-semibold mb-2">При кои възложители печели най-много</h3>
          <ul className="text-[15px] space-y-1">
            {buyers.map(([e, b]) => <li key={e} className="flex justify-between gap-3"><Link href={buyerUrl(e)} className="truncate">{b.name}</Link><span className="num whitespace-nowrap">{b.n} · {fmtEur(b.sum)}</span></li>)}
          </ul>
        </div>
      </section>
      <section className="mb-10">
        <SectionTitle>Анекси{annexSum > 0 && <span className="text-xl text-muted font-normal"> (+{fmtEur(annexSum)})</span>}</SectionTitle>
        <AnnexList items={annexes.slice(0, 20)} />
      </section>
      <section>
        <SectionTitle>Договори</SectionTitle>
        <ContractList items={contracts} hideSupplier />
      </section>
    </>
  );
}

export default function Firma({ params }: { params: Promise<{ eik: string }> }) {
  return <Page><Suspense fallback={<p className="text-muted">Зареждане…</p>}><Content params={params} /></Suspense></Page>;
}
