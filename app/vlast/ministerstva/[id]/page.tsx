import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import SignalNote from "@/components/SignalNote";
import { Page, SectionTitle, Title } from "@/components/ui";
import { MIN, buyerEiks, ministry, shortName, type Ministry } from "@/lib/ministries";
import { buyerContracts, buyerUrl, firmUrl, fmtEur, politicalLinks, supplierContracts } from "@/lib/procurement";
import { firmsOfPerson } from "@/lib/tr";
import { PC, companiesOf, type PublicCompany } from "@/lib/publicCompanies";

export function generateStaticParams() { return MIN.ministries.map((m) => ({ id: m.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = ministry((await params).id);
  return { title: m ? m.name : "Министерство" };
}
const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" }) : "");
const ROLE: Record<string, number> = { GBHeadAdm: 0, GBPosition: 1, politicalOffice: 2, position: 3 };

/** Ръководители, чиито три имена съвпадат с управител, съдружник или собственик на фирма, която има договори с министерството или агенциите му. */
async function LeaderFirms({ m }: { m: Ministry }) {
  await connection();
  const buyers = new Set(buyerEiks(m));
  const rows: { person: string; role: string; eik: string; firm: string; roles: string[]; n: number; sum: number }[] = [];
  for (const l of m.leaders.filter((x) => x.person && x.person.split(" ").length >= 3)) {
    for (const f of firmsOfPerson(l.person!)) {
      const cs = (await supplierContracts(f.eik, 500)).filter((c) => buyers.has(c.buyer_eik));
      if (cs.length) rows.push({ person: l.person!, role: l.role, eik: f.eik, firm: f.firm?.name ?? f.eik, roles: f.roles, n: cs.length, sum: cs.reduce((a, c) => a + (c.contract_value_eur ?? 0), 0) });
    }
  }
  if (!rows.length) return <p className="text-[15px] bg-surface rounded-sm p-4">Не намерихме фирма на някой от ръководителите (по трите имена в Търговския регистър), която да има договори с министерството или с агенциите към него.</p>;
  return (<>
    <ul className="divide-y divide-rule border-y border-rule text-[15px]">{rows.map((r) => (
      <li key={r.person + r.eik} className="py-2">
        <b>{r.person}</b> ({r.role.toLowerCase()}) е {r.roles.join(", ").toLowerCase()} на <Link href={firmUrl(r.eik)}>{r.firm}</Link>: {r.n} {r.n === 1 ? "договор" : "договора"} за {fmtEur(r.sum)} с министерството или агенциите му.
      </li>))}</ul>
    <p className="text-xs text-muted mt-2">Съвпадение по трите имена, не по ЕГН: възможен е съименник. Договорът може да е сключен преди човекът да заеме поста. Проверете датите в договора.</p>
  </>);
}

/** Поръчките на министерството и агенциите: обем, конкуренция, най-големите изпълнители и техните политически връзки. */
async function Procurement({ m }: { m: Ministry }) {
  await connection();
  const eiks = buyerEiks(m);
  const all = (await Promise.all(eiks.map((e) => buyerContracts(e, 1000)))).flat().filter((c) => (c.contract_date ?? "") >= "2023-01-01");
  if (!all.length) return <p className="text-[15px] bg-surface rounded-sm p-4">Няма договори в базата за министерството и агенциите му от 2023 г. насам.</p>;
  const total = all.reduce((a, c) => a + (c.contract_value_eur ?? 0), 0);
  const single = all.filter((c) => c.offers_count === 1);
  const top = new Map<string, { name: string; n: number; v: number }>();
  for (const c of all) c.supplier_eiks.forEach((e, i) => { const x = top.get(e) ?? { name: c.supplier_names[i] ?? e, n: 0, v: 0 }; x.n++; x.v += (c.contract_value_eur ?? 0) / c.supplier_eiks.length; top.set(e, x); });
  const best = [...top.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 12);
  return (<>
    <p className="text-[15px] mb-3 max-w-3xl">От 2023 г. министерството и агенциите към него са сключили <b>{all.length.toLocaleString("bg-BG")}</b> договора за <b>{fmtEur(total)}</b>. С една оферта, тоест без реална конкуренция: <b>{Math.round((single.length / all.length) * 100)}%</b> ({fmtEur(single.reduce((a, c) => a + (c.contract_value_eur ?? 0), 0))}).</p>
    <ul className="divide-y divide-rule border-y border-rule text-[15px]">{best.map(([eik, x]) => {
      const pl = politicalLinks(eik);
      return (
        <li key={eik} className="py-2 grid sm:grid-cols-[1fr_9rem] gap-x-4">
          <span><Link href={firmUrl(eik)}>{x.name}</Link>{pl.length > 0 && <span className="block text-xs text-muted">Връзка с политик: {pl.slice(0, 2).map((p) => `${p.who}${p.party ? ` (${p.party})` : ""}`).join("; ")}</span>}</span>
          <span className="num sm:text-right">{fmtEur(x.v)}<span className="block text-xs text-muted">{x.n} {x.n === 1 ? "договор" : "договора"}</span></span>
        </li>);
    })}</ul>
    <p className="text-sm mt-2">{eiks.map((e, i) => <span key={e}>{i > 0 && " · "}<Link href={buyerUrl(e)}>{i === 0 && m.eik === e ? "Всички поръчки на министерството" : (m.agencies.find((a) => a.eik === e)?.name ?? e)}</Link></span>).slice(0, 6)}</p>
  </>);
}

/** Членове на бордовете, чиито фирми (по трите имена) имат договори със същото дружество. */
async function BoardFirms({ cs }: { cs: PublicCompany[] }) {
  await connection();
  const rows: { co: PublicCompany; person: string; eik: string; firm: string; n: number; sum: number }[] = [];
  for (const co of cs.filter((c) => c.eik)) for (const p of co.board.filter((x) => x.split(" ").length >= 3)) for (const f of firmsOfPerson(p)) {
    if (f.eik === co.eik) continue;
    const cts = (await supplierContracts(f.eik, 500)).filter((c) => c.buyer_eik === co.eik);
    if (cts.length) rows.push({ co, person: p, eik: f.eik, firm: f.firm?.name ?? f.eik, n: cts.length, sum: cts.reduce((a, c) => a + (c.contract_value_eur ?? 0), 0) });
  }
  if (!rows.length) return <p className="text-sm text-muted mt-2">Не намерихме член на борд, чиято фирма (по трите имена) да има договори със същото дружество.</p>;
  return (<div className="mt-3"><p className="font-semibold text-[15px]">Членове на бордовете с фирми, които имат договори със същото дружество:</p>
    <ul className="text-[15px] list-disc pl-5">{rows.map((r) => <li key={r.co.id + r.person + r.eik}><b>{r.person.toLowerCase().replace(/(^|\s|-)\S/g, (x) => x.toUpperCase())}</b> ({r.co.name}) — <Link href={firmUrl(r.eik)}>{r.firm}</Link>: {r.n} {r.n === 1 ? "договор" : "договора"} за {fmtEur(r.sum)}.</li>)}</ul>
    <p className="text-xs text-muted">Съвпадение по трите имена, не по ЕГН; договорът може да е отпреди назначението в борда.</p></div>);
}

export default async function Ministerstvo({ params }: { params: Promise<{ id: string }> }) {
  const m = ministry((await params).id);
  if (!m) notFound();
  const leaders = [...m.leaders].sort((a, b) => (ROLE[a.kind] ?? 9) - (ROLE[b.kind] ?? 9));
  const groups = new Map<string, typeof m.units>();
  for (const u of m.units) groups.set(u.group ?? "Други звена", [...(groups.get(u.group ?? "Други звена") ?? []), u]);
  const single = (role: string) => m.leaders.filter((l) => l.role === role).length === 1; // при няколко заместник-министри не личи кой кого е сменил
  const companies = companiesOf(m);
  const changes = Object.entries(MIN.history).filter(([k, h]) => k.startsWith(`${m.id}|`) && h.length > 1 && single(k.split("|")[1]));
  return (
    <Page>
      <Title back={{ href: "/vlast/ministerstva", label: "Министерствата" }} kicker="Министерство"
        lead={`${m.staff.toLocaleString("bg-BG")} щатни бройки по Административния регистър${m.vacant ? `, от тях ${m.vacant} незаети` : ""}. ${m.agencies.length} агенции и други структури към министерството.`}>
        {shortName(m.name)}
      </Title>

      <section className="mb-10">
        <SectionTitle>Ръководство</SectionTitle>
        <ul className="divide-y divide-rule border-y border-rule text-[15px]">{leaders.filter((l) => l.kind !== "position" || l.person).map((l, i) => (
          <li key={l.role + i} className="py-2 grid sm:grid-cols-[14rem_1fr] gap-x-4">
            <span className="text-muted">{l.role}</span>
            <span>{l.person ?? (l.kind === "politicalOffice" ? <span className="text-muted">{l.staff ?? "?"} души{l.vacant ? `, ${l.vacant} незаети` : ""}</span> : <span className="text-muted">незаета или невписана</span>)}{l.since && l.person && <span className="text-muted"> · от {d(l.since)}</span>}</span>
          </li>))}</ul>
        {changes.length > 0 && <div className="mt-3 text-sm"><p className="font-semibold">Смени, откакто следим:</p><ul>{changes.map(([k, h]) => <li key={k}>{k.split("|")[1]}: {h.map((x) => x.person).join(" → ")}</li>)}</ul></div>}
      </section>

      <section className="mb-10">
        <SectionTitle>Ръководители и фирми с договори тук</SectionTitle>
        <SignalNote className="mb-3" />
        <Suspense fallback={<p className="text-muted">Проверка в Търговския регистър и поръчките…</p>}><LeaderFirms m={m} /></Suspense>
      </section>

      <section className="mb-10">
        <SectionTitle>Обществени поръчки</SectionTitle>
        <Suspense fallback={<p className="text-muted">Зареждане на поръчките…</p>}><Procurement m={m} /></Suspense>
      </section>

      <section className="mb-10">
        <SectionTitle>Структура</SectionTitle>
        {[...groups.entries()].map(([g, us]) => (
          <div key={g} className="mb-5">
            <h3 className="font-semibold mb-1">{g} <span className="text-muted font-normal text-sm">{us.reduce((a, u) => a + (u.staff ?? 0), 0)} щатни бройки</span></h3>
            <ul className="text-[15px] divide-y divide-rule">{us.sort((a, b) => (b.staff ?? 0) - (a.staff ?? 0)).map((u) => (
              <li key={u.name} className="py-1 flex justify-between gap-3"><span>{u.name}</span><span className="num text-muted whitespace-nowrap">{u.staff ?? "–"}{u.vacant ? ` (${u.vacant} незаети)` : ""}</span></li>))}</ul>
          </div>))}
      </section>

      {companies.length > 0 && <section className="mb-10">
        <SectionTitle>Държавни дружества</SectionTitle>
        <p className="text-[15px] -mt-2 mb-3 max-w-3xl">{companies.length} дружества, в които правата на държавата упражнява министърът. Дъщерните дружества на холдингите (напр. БЕХ, ДКК) не са тук.</p>
        <ul className="text-[15px] divide-y divide-rule border-y border-rule">{companies.map((c) => (
          <li key={c.id} className="py-2">{c.eik ? <Link href={buyerUrl(c.eik)}>{c.name}</Link> : c.name}{c.board.length > 0 && <span className="block text-xs text-muted">Борд: {c.board.map((b) => b.toLowerCase().replace(/(^|\s|-)\S/g, (x) => x.toUpperCase())).join(", ")}</span>}</li>))}</ul>
        <SignalNote className="mt-2" />
        <Suspense fallback={<p className="text-muted text-sm">Проверка на бордовете…</p>}><BoardFirms cs={companies} /></Suspense>
        <p className="text-xs text-muted mt-1">Източник: <a href={PC.url}>{PC.source}</a>.</p>
      </section>}

      {m.agencies.length > 0 && <section className="mb-10">
        <SectionTitle>Към министерството</SectionTitle>
        <ul className="text-[15px] divide-y divide-rule border-y border-rule">{m.agencies.map((a) => (
          <li key={a.id} className="py-2">{a.eik ? <Link href={buyerUrl(a.eik)}>{a.name}</Link> : a.name}{a.site && <span className="text-sm text-muted"> · {a.site}</span>}</li>))}</ul>
        <p className="text-xs text-muted mt-1">Линкът води към поръчките на структурата.</p>
      </section>}

      <p className="text-xs text-muted">Източник: <a href={m.url}>Административен регистър, органиграма на {m.name}</a>, към {d(MIN.updated)}. Търговски регистър и ЦАИС ЕОП за фирмите и поръчките.</p>
    </Page>
  );
}
