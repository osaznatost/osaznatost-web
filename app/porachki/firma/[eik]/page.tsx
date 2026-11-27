import { notFound } from "next/navigation";
import { peopleLinks } from "@/lib/people";
import { Suspense } from "react";
import { AnnexList, ContractList, LinksBox } from "@/components/proc";
import { Page, SectionTitle, Title } from "@/components/ui";
import { buyerUrl, fmtDate, fmtEur, supplierAnnexes, supplierContracts, supplierStats } from "@/lib/procurement";
import Link from "next/link";
import { Network, type NetNode } from "@/components/Network";
import { firmUrl, politicalLinks } from "@/lib/procurement";
import { sanctionsFor } from "@/lib/sanctions";
import { FUNDS, mpHref } from "@/lib/funds";
import { contractContext, contractFlags, linkStrength, riskScore } from "@/lib/redFlags";
import { Anchor, SectionNav } from "@/components/SectionNav";
import { TrBox } from "@/components/TrBox";
import { FirmHistory, FirmOfficials, officialHref, officialLinks, viaText } from "@/components/PersonLinks";
import { PaidToFirm } from "@/components/PaidBox";
import { declLinksForEik } from "@/lib/declLinks";
import { DeclLinks } from "@/components/DeclLinks";
import { contractUrl } from "@/lib/procurement";
import { trFor } from "@/lib/tr";

export const metadata = { title: "Фирма" };

async function Content({ params }: { params: Promise<{ eik: string }> }) {
  const { localPage } = await peopleLinks();
  const { eik } = await params;
  if (!/^\d{9,13}$/.test(eik)) notFound();
  const [s, contracts, annexes, offs] = await Promise.all([supplierStats(eik), supplierContracts(eik), supplierAnnexes(eik), officialLinks(eik)]);
  if (!s && !contracts.length) {
    const t = await trFor(eik);
    if (!t) notFound();
    return (
      <>
        <Title small back={{ href: "/porachki", label: "Поръчки" }} kicker={`Фирма · ЕИК ${eik}`}
          lead="Няма обществени поръчки, спечелени от тази фирма. Данните по-долу са от официалния Търговски регистър.">
          {t.name || eik}
        </Title>
        <Anchor id="registar" title="Собственици и управители"><TrBox eik={eik} /></Anchor>
        <div className="space-y-8"><FirmOfficials eik={eik} /><FirmHistory eik={eik} /></div>
      </>
    );
  }
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
  for (const [i, r] of offs.slice(0, 8).entries()) net.push({ id: `o${i}`, label: r.n, sub: `${r.r.toLowerCase()} · ${r.via ? `през ${r.via.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase())}` : "пряко"}`, href: officialHref(r), group: "politician" });
  // Същата сметка като на страницата на договора: връзки по Търговския регистър и контекст (зависимост, дял, общи хора).
  // Контекстът е по-тежък, затова се смята за първите 20 договора по предварителна оценка.
  const political = await linkStrength([eik]);
  const pre = await Promise.all(contracts.map(async (c) => {
    const ax = annexes.filter((a) => a.buyer_eik === c.buyer_eik && a.contract_number === c.contract_number);
    const f = await contractFlags(c, ax, political);
    return { c, ax, f, score: riskScore(f) };
  }));
  const top = new Set([...pre].sort((a, b) => b.score - a.score).slice(0, 20));
  const scored = await Promise.all(pre.map(async (x) => {
    if (!top.has(x)) return { c: x.c, f: x.f, score: x.score };
    const f = await contractFlags(x.c, x.ax, political, await contractContext(x.c));
    return { c: x.c, f, score: riskScore(f) };
  }));
  const high = scored.filter((x) => x.score >= 45);
  const eu = FUNDS.mpConnected.filter((x) => x.eik === eik);
  const serial = FUNDS.integrity.serial.find((x) => x.eik === eik);
  const years = new Map<string, number>();
  for (const c of contracts) if (c.contract_date) years.set(c.contract_date.slice(0, 4), (years.get(c.contract_date.slice(0, 4)) ?? 0) + (c.contract_value_eur ?? 0));
  const annexSum = annexes.reduce((x, a) => x + Math.max(0, a.value_difference_eur ?? 0), 0);

  return (
    <>
      <Title small back={{ href: "/porachki", label: "Поръчки" }} kicker={`Изпълнител · ЕИК ${eik}`}
        lead={s ? `Печелила е ${s.contracts} договора от ${fmtDate(s.first_date)} до ${fmtDate(s.last_date)}.` : undefined}>
        {name}
      </Title>
      {((pl.length > 0 && political > 0) || high.length > 0 || offs.length > 0) && (
        <div className="ring-2 ring-red rounded-sm p-4 mb-6 bg-white max-w-4xl text-[15px] space-y-2">
          <a href={pl.length && political ? "#vrazki" : offs.length ? "#svarzani-lica" : "#risk"} className="block no-underline text-ink">
            <b>{[pl.length > 0 && political > 0 && `${political === 2 ? "Свързана с" : "Възможна връзка (по имена) с"} ${pl.length} ${pl.length === 1 ? "политик или длъжностно лице" : "политици или длъжностни лица"}`, offs.length > 0 && `${offs.length} ${offs.length === 1 ? "връзка" : "връзки"} с длъжностни лица по Търговския регистър`, high.length > 0 && `${high.length} договора с висок риск`].filter(Boolean).join(" · ")}.</b> Подробно по-долу.
          </a>
          {offs.length > 0 && <ul className="text-sm space-y-0.5">{offs.slice(0, 3).map((r, i) => <li key={i}><Link href={officialHref(r)}>{r.n}</Link>, {r.r.toLowerCase()}: {viaText(r)}</li>)}</ul>}
        </div>
      )}
      <SectionNav items={[["obobshtenie", "Обобщение"], ["registar", "Собственици и управители"], ["vrazki", "Връзки"], ["risk", `Риск (${high.length})`], ["plateno", "Платено"], ...(eu.length || serial ? [["evro", "Евросредства"] as [string, string]] : []), ["dogovori", `Договори (${contracts.length})`], ["aneksi", `Анекси (${annexes.length})`]]} />
      <div id="obobshtenie" className="scroll-mt-32 lg:scroll-mt-20" />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-10">
        {[
          ["Договори", String(s?.contracts ?? contracts.length)],
          ["Обща стойност", fmtEur(s?.total_eur ?? (contracts.reduce((x, c) => x + (c.contract_value_eur ?? 0), 0) || null))],
          ["Възложители", String(s?.buyers ?? byBuyer.size)],
          ["С една оферта", String(s?.single_offer ?? 0)],
        ].map(([l, v]) => (
          <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[1.75rem] sm:text-[2.4rem] leading-none mt-1 break-words">{v}</p></div>
        ))}
      </section>
      <Anchor id="registar" title="Собственици и управители"><TrBox eik={eik} /></Anchor>
      <div id="svarzani-lica" className="mb-10 space-y-8 scroll-mt-32"><FirmOfficials eik={eik} /><FirmHistory eik={eik} /></div>

      {net.length > 1 && (
        <section className="mb-10">
          <SectionTitle>Мрежа от връзки</SectionTitle><span id="vrazki" className="block -mt-24 pt-24" />
          <p className="text-[15px] text-muted -mt-3 mb-3 max-w-3xl">С кои възложители работи фирмата, с кои фирми участва в обединения и кои политици или длъжностни лица са свързани с нея (Търговски регистър и декларации). Кликни върху възел за подробности.</p>
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><Network center={name} nodes={net} /></div>
        </section>
      )}
      <section className="grid gap-4 lg:grid-cols-2 mb-10">
        <div className="ring-1 ring-rule rounded-sm p-5 min-w-0"><h3 className="font-semibold mb-2">Връзки с политици</h3><LinksBox eik={eik} />{declLinksForEik(eik).length > 0 && <div className="mt-4"><h4 className="font-semibold mb-1 text-[15px]">Декларирана от лица на публична длъжност</h4><DeclLinks items={declLinksForEik(eik)} mode="company" /></div>}</div>
        <div className="ring-1 ring-rule rounded-sm p-5 min-w-0">
          <h3 className="font-semibold mb-2">При кои възложители печели най-много</h3>
          <ul className="text-[15px] space-y-1">
            {buyers.map(([e, b]) => <li key={e} className="flex justify-between gap-3"><Link href={buyerUrl(e)} className="truncate min-w-0">{b.name}</Link><span className="num whitespace-nowrap">{b.n} · {fmtEur(b.sum)}</span></li>)}
          </ul>
        </div>
      </section>
      <Anchor id="risk" title="Рискови договори" lead={<>Договорите на фирмата с най-много червени флагове. Сигнал е повод за въпрос, не доказателство. <Link href="/porachki/metodologiya">Как се смята</Link>.</>}>
        {high.length ? (
          <ul className="divide-y divide-rule border-y border-rule text-[15px]">{[...scored].sort((a, b) => b.score - a.score || (b.c.contract_value_eur ?? 0) - (a.c.contract_value_eur ?? 0)).slice(0, 15).map(({ c, f, score }) => (
            <li key={c.id} className="py-2 grid grid-cols-[2.6rem_1fr_auto] gap-3">
              <span className={`text-xs font-semibold px-1.5 py-1 rounded-full text-center h-fit ${score >= 45 ? "bg-red text-white" : "bg-surface"}`}>{score}</span>
              <span><Link href={contractUrl(c.id)}>{c.tender_name.slice(0, 160)}</Link><span className="block text-sm text-muted">{fmtDate(c.contract_date)} · {c.buyer_name} · {f.map((x) => x.label.toLowerCase()).join(", ")}</span></span>
              <span className="num">{fmtEur(c.contract_value_eur)}</span>
            </li>
          ))}</ul>
        ) : <p className="text-[15px]">Няма договори с висок риск.</p>}
        {years.size > 1 && <p className="text-sm text-muted mt-3">По години: {[...years.entries()].sort().map(([y, v]) => `${y}: ${fmtEur(v)}`).join(" · ")}.</p>}
      </Anchor>

      <Anchor id="plateno" title="Колко е платено реално" lead="Договорите казват колко е обещано. Тук е колко държавните институции са превели на фирмата.">
        <PaidToFirm name={name} />
      </Anchor>

      {(eu.length > 0 || serial) && (
        <Anchor id="evro" title="Евросредства">
          {serial && <p className="text-[15px] mb-2">Бенефициент по <b>{serial.programmes}</b> европейски програми за общо <b>{fmtEur(serial.total)}</b>{serial.top.length ? `: ${serial.top.map((t) => `${t.name} (${fmtEur(t.eur)})`).join("; ")}` : ""}.</p>}
          {eu.map((x) => <p key={x.mpId + x.eik} className="text-[15px]">Свързана с <Link href={mpHref(x.mpId, x.mp)}>{x.mp}</Link>: {x.contracts} договора по европейски програми, договорени {fmtEur(x.contracted)}, изплатени {fmtEur(x.paid)}.</p>)}
          <p className="text-xs text-muted mt-2">Източник: ИСУН, обработено от „Наясно“.</p>
        </Anchor>
      )}

      <section id="aneksi" className="mb-10 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Анекси{annexSum > 0 && <span className="text-xl text-muted font-normal"> (+{fmtEur(annexSum)})</span>}</SectionTitle>
        <AnnexList items={annexes.slice(0, 20)} />
      </section>
      <section id="dogovori" className="scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle right={<a href={`/rss/firma/${eik}`}>Абонамент (RSS)</a>}>Договори</SectionTitle>
        <ContractList items={contracts} hideSupplier />
      </section>
    </>
  );
}

export default function Firma({ params }: { params: Promise<{ eik: string }> }) {
  return <Page><Suspense fallback={<p className="text-muted">Зареждане…</p>}><Content params={params} /></Suspense></Page>;
}
