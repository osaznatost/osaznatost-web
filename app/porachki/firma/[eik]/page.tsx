import { FirmDeals, firmDeals } from "@/components/PropertyDeals";
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
import { sanction, programBg } from "@/lib/sanctionLists";
import { napDebt, napIndex } from "@/lib/napDebtors";

/** Всички сигнали за фирмата на едно място, най-горе; всеки ред води към раздела с подробностите. */
async function FirmSignals({ eik, pl, political, offs, scored, single, total }: { eik: string; pl: number; political: number; offs: Awaited<ReturnType<typeof officialLinks>>; scored: { c: { contract_date: string | null }; f: { id: string; label: string; weight: number }[]; score: number }[]; single: number; total: number }) {
  const [debt, deals, sanc] = await Promise.all([napDebt(eik).catch(() => null), firmDeals(eik).catch(() => []), sanction(eik).catch(() => null)]);
  const high = scored.filter((x) => x.score >= 45).length, mid = scored.filter((x) => x.score >= 20 && x.score < 45).length;
  const byFlag = new Map<string, { label: string; n: number }>();
  for (const x of scored) for (const f of x.f) if (f.weight > 0) { const v = byFlag.get(f.id) ?? { label: f.label, n: 0 }; v.n++; byFlag.set(f.id, v); }
  const items: { level: "high" | "mid"; href: string; text: React.ReactNode }[] = [];
  if (sanc) items.push({ level: "high", href: "#sankcii", text: <>В санкционен списък: {[...new Set(sanc.programs.map(programBg))].join("; ")}</> });
  if (offs.length) items.push({ level: "high", href: "#svarzani-lica", text: <>Свързана с {offs.length} длъжностн{offs.length > 1 ? "и лица" : "о лице"} по Търговския регистър: {offs.slice(0, 3).map((r, i) => <span key={i}>{i ? ", " : ""}<Link href={officialHref(r)}>{r.n}</Link> ({r.r.toLowerCase()})</span>)}{offs.length > 3 ? "…" : ""}</> });
  if (pl) items.push({ level: political === 2 ? "high" : "mid", href: "#vrazki", text: <>{political === 2 ? "Свързана с" : "Възможна връзка (по имена) с"} {pl} {pl === 1 ? "политик" : "политици"} (депутати или фирми от декларации)</> });
  if (debt) items.push({ level: debt.eur >= 50000 ? "high" : "mid", href: "#nap", text: <>Длъжник към държавата: {Math.round(debt.eur).toLocaleString("bg-BG")} € неплатени данъци и осигуровки (списъкът на НАП)</> });
  if (deals.length) items.push({ level: "high", href: "#imushtestvo", text: <>{deals.length} решени{deals.length > 1 ? "я" : "е"} на общински съвет за общинско имущество в полза на фирмата, докато е свързана с длъжностно лице там</> });
  if (high || mid) items.push({ level: high ? "high" : "mid", href: "#risk", text: <>{high ? `${high} договора с висок риск` : ""}{high && mid ? " и " : ""}{mid ? `${mid} със среден риск` : ""} (индекс 0–100)</> });
  if (byFlag.size) items.push({ level: "mid", href: "#risk", text: <>Флагове в договорите: {[...byFlag.values()].sort((a, b) => b.n - a.n).map((v) => `${v.label.toLowerCase()} (${v.n})`).join(", ")}</> });
  if (total >= 5 && single / total >= 0.5) items.push({ level: "mid", href: "#risk", text: <>{Math.round((single / total) * 100)}% от договорите са спечелени без конкуренция (една оферта)</> });
  if (!items.length) return null;
  const nh = items.filter((i) => i.level === "high").length;
  return (
    <section id="signali" className="ring-2 ring-red rounded-sm p-4 sm:p-5 mb-6 bg-white max-w-4xl text-[15px] scroll-mt-32 lg:scroll-mt-20">
      <p className="text-sm font-semibold text-red">Сигнали за риск · тази фирма</p>
      <p className="display text-[1.6rem] leading-tight mb-2">{items.length} сигнал{items.length > 1 ? "а" : ""}{nh ? `, ${nh} сериозн${nh > 1 ? "и" : "о"}` : ""}</p>
      <ul className="space-y-1.5">{[...items.filter((i) => i.level === "high"), ...items.filter((i) => i.level !== "high")].map((i, k) => (
        <li key={k} className={`border-l-4 pl-3 ${i.level === "high" ? "border-red" : "border-[#e08a2e]"}`}>{i.text} · <a href={i.href}>подробно</a></li>
      ))}</ul>
      <p className="text-xs text-muted mt-2">Сигнал е повод за въпрос, не доказателство за нарушение. <Link href="/porachki/metodologiya">Как ги откриваме</Link></p>
    </section>
  );
}

async function firmNameFromLinks(eik: string) {
  const { powerLinks } = await import("@/lib/tr");
  const { data } = await import("@/lib/data");
  const codes = [...new Set((await powerLinks(eik).catch(() => [])).map((h) => h.code).filter((c) => c && c !== "MP" && c !== "GOV"))];
  for (const c of codes) {
    const L = await data<Record<string, { firms: { eik: string; name: string }[]; co: { firms: { eik: string; name: string }[] }[] }>>(`tr-links/${c}.json`);
    for (const p of Object.values(L ?? {})) for (const f of [...p.firms, ...p.co.flatMap((x) => x.firms)]) if (f.eik.slice(0, 9) === eik.slice(0, 9)) return f.name;
  }
  return null;
}

/** Червено каре, ако фирмата е в публичния списък на НАП за неплатени данъци и осигуровки. */
async function SanctionBox({ eik }: { eik: string }) {
  const s = await sanction(eik).catch(() => null);
  if (!s) return null;
  const progs = [...new Set(s.programs.map(programBg))];
  return (
    <section id="sankcii" className="mb-10 border-2 border-red rounded-sm p-4 sm:p-5 scroll-mt-32 lg:scroll-mt-20">
      <p className="text-sm font-semibold text-red">В санкционен списък</p>
      <p className="text-[15px] mt-1">Фирмата е в санкционен списък: <b>{progs.join("; ")}</b>{s.since ? <> (в списъците поне от {s.since.split("-").reverse().join(".")})</> : null}. Санкциите обикновено означават замразени активи и забрана за сделки с тях в съответната държава.</p>
      <p className="text-xs text-muted mt-2">Източник: <a href={`https://www.opensanctions.org/entities/${s.id}/`} target="_blank" rel="noreferrer">OpenSanctions</a> (CC BY-NC 4.0), съвпадение по ЕИК, към {s.updated.split("-").reverse().join(".")}.</p>
    </section>
  );
}

async function NapDebtBox({ eik }: { eik: string }) {
  const [d, I] = await Promise.all([napDebt(eik).catch(() => null), napIndex().catch(() => null)]);
  if (!d) return null;
  return (
    <section id="nap" className="mb-10 border-2 border-red rounded-sm p-4 sm:p-5 scroll-mt-32 lg:scroll-mt-20">
      <p className="text-sm font-semibold text-red">Длъжник към държавата</p>
      <p className="text-[15px] mt-1">Фирмата е в публичния списък на НАП за неплатени данъци и осигуровки: <b className="num">{Math.round(d.eur).toLocaleString("bg-BG")} €</b>{d.since ? <> от {d.since.split("-").reverse().join(".")}</> : null} (ТД {d.td}). По Закона за обществените поръчки такива задължения са основание за отстраняване от поръчка (чл. 54, ал. 1, т. 3), освен ако са под 1% от оборота.</p>
      <p className="text-xs text-muted mt-2">Източник: НАП, списък по чл. 182, ал. 3, т. 2 от ДОПК{I?.asOf ? `, към ${I.asOf.split("-").reverse().join(".")}` : ""}. Сумата е необезпеченият остатък с лихвите.</p>
    </section>
  );
}

export const metadata = { title: "Фирма" };

async function Content({ params }: { params: Promise<{ eik: string }> }) {
  const { localPage } = await peopleLinks();
  const { eik } = await params;
  if (!/^\d{9,13}$/.test(eik)) notFound();
  const [s, contracts, annexes, offs] = await Promise.all([supplierStats(eik), supplierContracts(eik), supplierAnnexes(eik), officialLinks(eik)]);
  if (!s && !contracts.length) {
    const t0 = await trFor(eik);
    // Фирмата не е в нашия извлечък от регистъра, но е свързана с длъжностно лице: името е от неговия файл с връзки
    const linkName = t0 ? null : (await firmNameFromLinks(eik)) ?? (await sanction(eik).catch(() => null))?.name ?? null;
    if (!t0 && !linkName) notFound();
    const t = t0 ?? { name: linkName! };
    return (
      <>
        <Title small back={{ href: "/porachki", label: "Поръчки" }} kicker={`Фирма · ЕИК ${eik}`}
          lead="Няма обществени поръчки, спечелени от тази фирма. Данните по-долу са от официалния Търговски регистър.">
          {t.name || eik}
        </Title>
        <Suspense fallback={null}><FirmSignals eik={eik} pl={0} political={0} offs={offs} scored={[]} single={0} total={0} /></Suspense>
        <SanctionBox eik={eik} /><NapDebtBox eik={eik} />
        <Suspense fallback={null}><FirmDeals eik={eik} /></Suspense>
        <Anchor id="registar" title="Собственици и управители"><TrBox eik={eik} /></Anchor>
        <div id="svarzani-lica" className="space-y-8 scroll-mt-32"><FirmOfficials eik={eik} /><FirmHistory eik={eik} /></div>
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
  // Контекстът е по-тежък, затова се смята за първите 10 договора по предварителна оценка.
  const political = await linkStrength([eik]);
  const pre = await Promise.all(contracts.map(async (c) => {
    const ax = annexes.filter((a) => a.buyer_eik === c.buyer_eik && a.contract_number === c.contract_number);
    const f = await contractFlags(c, ax, political);
    return { c, ax, f, score: riskScore(f) };
  }));
  const top = new Set([...pre].sort((a, b) => b.score - a.score).slice(0, 10));
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
      <FirmSignals eik={eik} pl={pl.length > 0 && political > 0 ? pl.length : 0} political={political} offs={offs} scored={scored} single={s?.single_offer ?? 0} total={s?.contracts ?? contracts.length} />
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
      <SanctionBox eik={eik} /><NapDebtBox eik={eik} />
      <Suspense fallback={null}><FirmDeals eik={eik} /></Suspense>
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
