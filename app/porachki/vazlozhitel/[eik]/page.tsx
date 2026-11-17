import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { AnnexList, ContractList } from "@/components/proc";
import { Page, SectionTitle, Title } from "@/components/ui";
import { buyerAnnexes, buyerContracts, firmUrl, fmtEur, politicalLinks } from "@/lib/procurement";

export const metadata = { title: "Възложител" };

async function Content({ params }: { params: Promise<{ eik: string }> }) {
  const { eik } = await params;
  if (!/^\d{9,13}$/.test(eik)) notFound();
  const [contracts, annexes] = await Promise.all([buyerContracts(eik, 500), buyerAnnexes(eik)]);
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

  return (
    <>
      <Title small back={{ href: "/porachki", label: "Поръчки" }} kicker={`Възложител · ЕИК ${eik}`} lead={contracts[0]?.buyer_type}>{name}</Title>
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
              <span className="truncate"><Link href={firmUrl(e)}>{x.name}</Link>{politicalLinks(e).length > 0 && <span className="text-red font-bold" title="Връзка с политик по Търговския регистър"> ●</span>}</span>
              <span className="num whitespace-nowrap">{x.n} · {fmtEur(x.sum)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted mt-2">● Фирмата има връзка с политик или длъжностно лице по Търговския регистър.</p>
      </section>
      <section className="mb-10"><SectionTitle>Анекси</SectionTitle><AnnexList items={annexes.slice(0, 20)} /></section>
      <section><SectionTitle>Договори</SectionTitle><ContractList items={contracts.slice(0, 100)} hideBuyer /></section>
    </>
  );
}

export default function Vazlozhitel({ params }: { params: Promise<{ eik: string }> }) {
  return <Page><Suspense fallback={<p className="text-muted">Зареждане…</p>}><Content params={params} /></Suspense></Page>;
}
