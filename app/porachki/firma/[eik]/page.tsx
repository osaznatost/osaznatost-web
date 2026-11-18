import { notFound } from "next/navigation";
import { localPage } from "@/lib/people";
import { Suspense } from "react";
import { AnnexList, ContractList, LinksBox } from "@/components/proc";
import { Page, SectionTitle, Title } from "@/components/ui";
import { buyerUrl, fmtDate, fmtEur, supplierAnnexes, supplierContracts, supplierStats } from "@/lib/procurement";
import Link from "next/link";
import { Network, type NetNode } from "@/components/Network";
import { firmUrl, politicalLinks } from "@/lib/procurement";
import { sanctionsFor } from "@/lib/sanctions";
import { mpHref } from "@/lib/funds";

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
    b.n++; b.sum += c.contract_value_eur ?? 0;
    byBuyer.set(c.buyer_eik, b);
  }
  const buyers = [...byBuyer.entries()].sort((a, b) => b[1].sum - a[1].sum).slice(0, 12);
  // Мрежа: възложители, съдружници в обединения, политици, санкционирани.
  const partners = new Map<string, { name: string; n: number; sum: number }>();
  for (const c of contracts) c.supplier_eiks.forEach((e, i) => { if (e !== eik) { const p = partners.get(e) ?? { name: c.supplier_names[i] ?? e, n: 0, sum: 0 }; p.n++; p.sum += c.contract_value_eur ?? 0; partners.set(e, p); } });
  const pl = politicalLinks(eik);
  const net: NetNode[] = [
    ...buyers.slice(0, 10).map(([e, b]) => ({ id: `b${e}`, label: b.name, sub: `${b.n} дог. · ${fmtEur(b.sum)}`, href: buyerUrl(e), group: "buyer" as const, weight: b.sum })),
    ...[...partners.entries()].sort((a, b) => b[1].sum - a[1].sum).slice(0, 6).map(([e, p]) => ({ id: `p${e}`, label: p.name, sub: `заедно в ${p.n} дог.`, href: firmUrl(e), group: "partner" as const, weight: p.sum })),
    ...pl.map((l, i) => ({ id: `l${i}`, label: l.who, sub: [l.kind === "mp" ? `депутат${l.party ? `, ${l.party}` : ""}` : l.position, l.roles.join(", ")].filter(Boolean).join(" · "), href: l.kind === "mp" && l.mpId ? mpHref(l.mpId, l.who) : localPage(l.who) ?? undefined, group: (sanctionsFor(l.who) ? "sanction" : "politician") as NetNode["group"] })),
  ];
  const annexSum = annexes.reduce((x, a) => x + Math.max(0, a.value_difference_eur ?? 0), 0);

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
      {net.length > 1 && (
        <section className="mb-10">
          <SectionTitle>Мрежа от връзки</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-3 max-w-3xl">С кои възложители работи фирмата, с кои фирми участва в обединения и кои политици или длъжностни лица са свързани с нея (Търговски регистър и декларации). Кликни върху възел за подробности.</p>
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><Network center={name} nodes={net} /></div>
        </section>
      )}
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
