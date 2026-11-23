import { connection } from "next/server";
import Link from "next/link";
import { localData, personHref } from "@/lib/local";
import { firmUrl, fmtDate, fmtEur, muniAnnexes, muniContracts, type Contract } from "@/lib/procurement";
import { CATEGORY, categoryOf, peopleRange, councilFor, deadlineOf, officialByName, peopleOfMuni } from "@/lib/projects";
import type { LocalData } from "@/lib/local";

const SINCE = "2023-11-06"; // началото на мандата 2023–2027

function ProjectCard({ c, pm, L, annexBy }: { c: Contract; pm: Awaited<ReturnType<typeof peopleOfMuni>>; L: LocalData | null; annexBy: Map<string, { n: number; plus: number }> }) {
            const p = pm[String(c.tender_id)] ?? null, ax = annexBy.get(`${c.buyer_eik}|${c.contract_number}`), dl = deadlineOf(c), cm = councilFor(c, L?.resolutions ?? null)[0];
            return (
              <li key={c.id} className="ring-1 ring-rule rounded-sm p-4 bg-white">
                <p className="text-sm text-muted">{fmtDate(c.contract_date)} · {c.buyer_name}{c.offers_count === 1 ? <span className="text-red"> · една оферта</span> : c.offers_count ? ` · ${c.offers_count} оферти` : ""}{ax ? <span className={ax.plus > 0 ? "text-red" : ""}> · {ax.n} анекс{ax.n > 1 ? "а" : ""}{ax.plus > 0 ? ` (+${fmtEur(ax.plus)})` : ""}</span> : ""}</p>
                <p className="text-[15px] font-semibold leading-snug"><Link href={`/porachki/dogovor/${encodeURIComponent(c.id)}`}>{c.tender_name.replace(/^[„"]|[“"]$/g, "").slice(0, 220)}</Link></p>
                <p className="text-[15px]"><span className="num font-semibold">{fmtEur(c.contract_value_eur)}</span> → {c.supplier_eiks.map((e, i) => <span key={e}>{i ? ", " : ""}<Link href={firmUrl(e)}>{c.supplier_names[i] ?? e}</Link>{p?.suppliers[e]?.rep ? <span className="text-sm text-muted"> ({p.suppliers[e].rep})</span> : null}</span>)}{dl ? <span className="text-sm text-muted"> · срок до {fmtDate(dl)}</span> : null}</p>
                {(p?.contacts.length || cm) && <p className="text-sm text-muted mt-1">{p?.contacts.length ? <>Води поръчката: {p.contacts.map((n, i) => { const o = officialByName(n, L?.officials); return <span key={n}>{i ? ", " : ""}{o ? <Link href={personHref(o.slug)}>{o.name}</Link> : n}{o ? ` (${o.roleRaw.toLowerCase()})` : ""}</span>; })}. </> : null}{cm ? <>Свързано решение на съвета: № {cm.r.number} от {fmtDate(cm.r.date)}.</> : null}</p>}
              </li>
            );
          }

export async function MuniProjects({ code, full = false }: { code: string; full?: boolean }) {
  await connection(); // при отваряне, не при сглобяване: иначе сборката тегли хиляди заявки към базата
  const [cs, an] = await Promise.all([muniContracts(code, SINCE), muniAnnexes(code, SINCE)]);
  if (!cs.length) return <p className="text-[15px] bg-surface rounded-sm p-4">Няма договори в базата за тази община от началото на мандата.</p>;
  const [L, pm, range] = await Promise.all([localData(code), peopleOfMuni(code), peopleRange()]);
  const mayor = L?.officials.find((o) => o.role === "mayor");
  const annexBy = new Map<string, { n: number; plus: number }>();
  for (const a of an) { const k = `${a.buyer_eik}|${a.contract_number}`; const x = annexBy.get(k) ?? { n: 0, plus: 0 }; x.n++; x.plus += Math.max(0, a.value_difference_eur ?? 0); annexBy.set(k, x); }
  const groups = new Map<string, Contract[]>();
  for (const c of cs) { const g = categoryOf(c.tender_name); groups.set(g, [...(groups.get(g) ?? []), c]); }
  const order = [...CATEGORY.map(([k]) => k), "Други"].filter((k) => groups.has(k));
  const total = cs.reduce((s, c) => s + (c.contract_value_eur ?? 0), 0);
  const single = cs.filter((c) => c.offers_count === 1).length;
  const top = new Map<string, { name: string; n: number; v: number }>();
  for (const c of cs) c.supplier_eiks.forEach((e, i) => { const x = top.get(e) ?? { name: c.supplier_names[i] ?? e, n: 0, v: 0 }; x.n++; x.v += (c.contract_value_eur ?? 0) / c.supplier_eiks.length; top.set(e, x); });
  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-8">
        {[["Договори от 11.2023", cs.length.toLocaleString("bg-BG"), "на общината, училищата, градините и дружествата ѝ"], ["Обща стойност", fmtEur(total), "по договорите, без анексите"],
          ["С една оферта", `${Math.round((single / cs.length) * 100)}%`, `${single} договора без реална конкуренция`], ["Оскъпени с анекси", fmtEur([...annexBy.values()].reduce((s, x) => s + x.plus, 0)), `${annexBy.size} договора с анекси`]]
          .map(([l, v, n]) => <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[1.6rem] sm:text-[2rem] leading-none mt-1 break-words">{v}</p><p className="text-xs text-muted">{n}</p></div>)}
      </section>
      <section className="mb-10 grid gap-6 lg:grid-cols-2">
        <div className="text-[15px]">
          <h3 className="font-semibold text-lg mb-2">Кой взима решенията</h3>
          <ul className="space-y-1">
            {mayor && <li><b>Възлага и подписва:</b> кметът <Link href={personHref(mayor.slug)}>{mayor.name}</Link> или заместник с негова заповед: {L!.officials.filter((o) => o.role === "deputy_mayor").map((d, i) => <span key={d.slug}>{i ? ", " : ""}<Link href={personHref(d.slug)}>{d.name}</Link></span>)}.</li>}
            <li><b>Одобрява парите:</b> общинският съвет с бюджета и капиталовата програма. <Link href={`/mesta/${code.slice(0, 3).toLowerCase()}/${code.toLowerCase()}#resheniya`}>Решенията и гласуванията</Link>.</li>
            <li><b>Водят процедурите:</b> {(() => { const cnt = new Map<string, number>(); for (const c of cs) for (const n of pm[String(c.tender_id)]?.contacts ?? []) { const o = officialByName(n, L?.officials); const k = o?.name ?? n.replace(/\s+/g, " "); cnt.set(k, (cnt.get(k) ?? 0) + 1); } const top3 = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4); return top3.length ? top3.map(([n, k], i) => { const o = officialByName(n, L?.officials); return <span key={n}>{i ? ", " : ""}{o ? <Link href={personHref(o.slug)}>{n}</Link> : n} ({k})</span>; }) : "лицата за контакт във всяка поръчка (по-долу)"; })()}.</li>
            <li><b>Изпълнява:</b> фирмата и нейният представител. <b>Приема:</b> комисия на възложителя и строителният надзор.</li>
          </ul>
        </div>
        <div className="text-[15px]">
          <h3 className="font-semibold text-lg mb-2">Кой взима най-много</h3>
          <ul className="space-y-1">{[...top.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 8).map(([e, x]) => (
            <li key={e} className="flex justify-between gap-3"><Link href={firmUrl(e)}>{x.name}</Link><span className="num whitespace-nowrap">{fmtEur(x.v)} <span className="text-sm text-muted">· {x.n} дог.</span></span></li>
          ))}</ul>
        </div>
      </section>
      <nav className="flex flex-wrap gap-2 mb-8 text-[15px]">{order.map((g) => <a key={g} href={`#p-${encodeURIComponent(g)}`} className="px-3 py-1.5 rounded-full bg-surface no-underline text-ink hover:ring-1 hover:ring-green">{g} ({groups.get(g)!.length})</a>)}</nav>
      {order.map((g) => (
        <section key={g} id={`p-${encodeURIComponent(g)}`} className="mb-10 scroll-mt-28">
          <h3 className="font-semibold text-xl mb-3">{g} <span className="text-muted text-base font-normal">({groups.get(g)!.length})</span></h3>
          <ul className="space-y-3">{groups.get(g)!.slice(0, 8).map((c) => <ProjectCard key={c.id} c={c} pm={pm} L={L} annexBy={annexBy} />)}</ul>{groups.get(g)!.length > 8 && (full
            ? <ul className="space-y-3 mt-3">{groups.get(g)!.slice(8).map((c) => <ProjectCard key={c.id} c={c} pm={pm} L={L} annexBy={annexBy} />)}</ul>
            : <p className="mt-3"><Link href={`/mesta/${code.slice(0, 3).toLowerCase()}/${code.toLowerCase()}/proekti#p-${encodeURIComponent(g)}`} className="font-semibold">Още {groups.get(g)!.length - 8} в „{g}“</Link></p>)}
        </section>
      ))}
      <p className="text-xs text-muted">Договорите и анексите са от ЦАИС ЕОП. Лицата за контакт и представителите на фирмите са от обявленията по OCDS{range.first ? ` (обходени от ${fmtDate(range.first)} до ${fmtDate(range.last)})` : ""}. Кой е подписал договора и приемането, се вижда в страницата на всеки договор, заедно с готово заявление по ЗДОИ за документите, които не се публикуват.</p>
    </>
  );
}

