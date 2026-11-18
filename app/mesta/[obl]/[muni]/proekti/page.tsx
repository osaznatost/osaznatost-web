import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page, SectionTitle, Title } from "@/components/ui";
import { localData, personHref } from "@/lib/local";
import { firmUrl, fmtDate, fmtEur, muniAnnexes, muniContracts, type Contract } from "@/lib/procurement";
import { CATEGORY, PEOPLE_RANGE, categoryOf, councilFor, deadlineOf, peopleFor } from "@/lib/projects";
import { findOblastBySlug, muniSlug, oblastList } from "@/lib/regions";

export function generateStaticParams() {
  return oblastList().flatMap((o) => o.municipalities.map((m) => ({ obl: o.slug, muni: muniSlug(m.code) })));
}
export const metadata = { title: "Проекти на общината" };
const SINCE = "2023-11-06"; // началото на мандата 2023–2027

async function List({ code }: { code: string }) {
  const [cs, an] = await Promise.all([muniContracts(code, SINCE), muniAnnexes(code, SINCE)]);
  if (!cs.length) return <p className="text-[15px] bg-surface rounded-sm p-4">Няма договори в базата за тази община от началото на мандата.</p>;
  const L = localData(code);
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
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[["Договори от 11.2023", cs.length.toLocaleString("bg-BG"), "на общината, училищата, градините и дружествата ѝ"], ["Обща стойност", fmtEur(total), "по договорите, без анексите"],
          ["С една оферта", `${Math.round((single / cs.length) * 100)}%`, `${single} договора без реална конкуренция`], ["Оскъпени с анекси", fmtEur([...annexBy.values()].reduce((s, x) => s + x.plus, 0)), `${annexBy.size} договора с анекси`]]
          .map(([l, v, n]) => <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[2rem] mt-1">{v}</p><p className="text-xs text-muted">{n}</p></div>)}
      </section>
      <section className="mb-10 grid gap-6 lg:grid-cols-2">
        <div className="text-[15px]">
          <SectionTitle>Кой взима решенията</SectionTitle>
          <ul className="space-y-1">
            {mayor && <li><b>Възлага и подписва:</b> кметът <Link href={personHref(mayor.slug)}>{mayor.name}</Link> или заместник с негова заповед: {L!.officials.filter((o) => o.role === "deputy_mayor").map((d, i) => <span key={d.slug}>{i ? ", " : ""}<Link href={personHref(d.slug)}>{d.name}</Link></span>)}.</li>}
            <li><b>Одобрява парите:</b> общинският съвет с бюджета и капиталовата програма. <Link href={`/mesta/${code.slice(0, 3).toLowerCase()}/${code.toLowerCase()}/vlast#resheniya`}>Решенията и гласуванията</Link>.</li>
            <li><b>Води процедурите:</b> служителите, посочени като лица за контакт във всяка поръчка (по-долу).</li>
            <li><b>Изпълнява:</b> фирмата и нейният представител. <b>Приема:</b> комисия на възложителя и строителният надзор.</li>
          </ul>
        </div>
        <div className="text-[15px]">
          <SectionTitle>Кой взима най-много</SectionTitle>
          <ul className="space-y-1">{[...top.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 8).map(([e, x]) => (
            <li key={e} className="flex justify-between gap-3"><Link href={firmUrl(e)}>{x.name}</Link><span className="num whitespace-nowrap">{fmtEur(x.v)} <span className="text-sm text-muted">· {x.n} дог.</span></span></li>
          ))}</ul>
        </div>
      </section>
      <nav className="flex flex-wrap gap-2 mb-8 text-[15px]">{order.map((g) => <a key={g} href={`#${encodeURIComponent(g)}`} className="px-3 py-1.5 rounded-full bg-surface no-underline text-ink hover:ring-1 hover:ring-green">{g} ({groups.get(g)!.length})</a>)}</nav>
      {order.map((g) => (
        <section key={g} id={encodeURIComponent(g)} className="mb-12 scroll-mt-24">
          <SectionTitle>{g}</SectionTitle>
          <ul className="space-y-3">{groups.get(g)!.slice(0, 150).map((c) => {
            const p = peopleFor(c.tender_id), ax = annexBy.get(`${c.buyer_eik}|${c.contract_number}`), dl = deadlineOf(c), cm = councilFor(c, L?.resolutions ?? null)[0];
            return (
              <li key={c.id} className="ring-1 ring-rule rounded-sm p-4 bg-white">
                <p className="text-sm text-muted">{fmtDate(c.contract_date)} · {c.buyer_name}{c.offers_count === 1 ? <span className="text-red"> · една оферта</span> : c.offers_count ? ` · ${c.offers_count} оферти` : ""}{ax ? <span className={ax.plus > 0 ? "text-red" : ""}> · {ax.n} анекс{ax.n > 1 ? "а" : ""}{ax.plus > 0 ? ` (+${fmtEur(ax.plus)})` : ""}</span> : ""}</p>
                <p className="text-[15px] font-semibold leading-snug"><Link href={`/porachki/dogovor/${encodeURIComponent(c.id)}`}>{c.tender_name.replace(/^[„"]|[“"]$/g, "").slice(0, 220)}</Link></p>
                <p className="text-[15px]"><span className="num font-semibold">{fmtEur(c.contract_value_eur)}</span> → {c.supplier_eiks.map((e, i) => <span key={e}>{i ? ", " : ""}<Link href={firmUrl(e)}>{c.supplier_names[i] ?? e}</Link>{p?.suppliers[e]?.rep ? <span className="text-sm text-muted"> ({p.suppliers[e].rep})</span> : null}</span>)}{dl ? <span className="text-sm text-muted"> · срок до {fmtDate(dl)}</span> : null}</p>
                {(p?.contacts.length || cm) && <p className="text-sm text-muted mt-1">{p?.contacts.length ? <>Води поръчката: {p.contacts.join(", ")}. </> : null}{cm ? <>Свързано решение на съвета: № {cm.r.number} от {fmtDate(cm.r.date)}.</> : null}</p>}
              </li>
            );
          })}</ul>
        </section>
      ))}
      <p className="text-xs text-muted">Договорите и анексите са от ЦАИС ЕОП. Лицата за контакт и представителите на фирмите са от обявленията по OCDS{PEOPLE_RANGE.first ? ` (обходени от ${fmtDate(PEOPLE_RANGE.first)} до ${fmtDate(PEOPLE_RANGE.last)})` : ""}. Кой е подписал договора и приемането, се вижда в страницата на всеки договор, заедно с готово заявление по ЗДОИ за документите, които не се публикуват.</p>
    </>
  );
}

export default async function Proekti({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  const o = findOblastBySlug(obl);
  const m = o?.municipalities.find((x) => muniSlug(x.code) === muni);
  if (!o || !m) notFound();
  return (
    <Page>
      <Title back={{ href: `/mesta/${o.slug}/${muni}`, label: `Община ${m.name}` }} kicker="Проекти и поръчки от началото на мандата"
        lead="Всеки ремонт, строеж, доставка и услуга, платени от общината и нейните училища, градини и дружества: кой е решил, кой е възложил, кой изпълнява, за колко пари и до кога, какво е променено с анекси и кой приема работата.">
        Проектите в {m.name}
      </Title>
      <Suspense fallback={<p className="text-muted">Зареждане на договорите…</p>}><List code={m.code} /></Suspense>
    </Page>
  );
}
