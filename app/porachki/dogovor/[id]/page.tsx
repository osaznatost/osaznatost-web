import Link from "next/link";
import SignalNote from "@/components/SignalNote";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MoneyFlow, type FlowLink, type FlowNode } from "@/components/MoneyFlow";
import { AnnexList, LinksBox, SignalList } from "@/components/proc";
import { ProjectPath } from "@/components/ProjectPath";
import { Page, SectionTitle, Title } from "@/components/ui";
import { tenderSignal } from "@/lib/tenderSignal";
import { contractFlags, linkStrength, riskLabel, riskScore } from "@/lib/redFlags";
import { annexesByRef, buyerUrl, contractAnnexes, firmUrl, fmtDate, fmtEur, getContract, signals, supplierStats } from "@/lib/procurement";
import { Term } from "@/components/Term";

export const metadata = { title: "Договор" };

const amount = (s: string | null) => {
  const n = Number(String(s ?? "").split(";")[0].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ring-1 ring-rule rounded-sm p-5 bg-white">
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const c = await getContract(id);
  if (!c) {
    const m = id.match(/^n~(\d+)~(.+)$/);
    const only = m ? await annexesByRef(m[1], m[2]) : [];
    if (!only.length) notFound();
    return <AnnexOnly annexes={only} />;
  }
  const annexes = await contractAnnexes(c);
  const stats = await Promise.all(c.supplier_eiks.map((e) => supplierStats(e)));
  const sig = signals(c, annexes);
  const ts = (await tenderSignal(c.tender_id)) as [number | null, string[], number, string | null] | null;
  const flags = await contractFlags(c, annexes, await linkStrength(c.supplier_eiks));
  const risk = riskScore(flags), rl = riskLabel(risk);
  const value = c.contract_value_eur ?? 0;
  const added = annexes.reduce((s, a) => s + (a.value_difference_eur ?? 0), 0);
  const current = value + Math.max(0, added);

  // Паричният поток: източник → възложител → изпълнител → подизпълнител / непубликувано
  const src: FlowNode = c.is_eu_funded
    ? { id: "src", label: c.eu_program ? `ЕС: ${c.eu_program}` : "Европейски средства", kind: "source" }
    : { id: "src", label: "Бюджет на възложителя (без ЕС)", kind: "source", note: "В обявлението не е отбелязано финансиране от европейски програми. Парите са от собствения бюджет на възложителя или от държавни трансфери." };
  const supplierLabel = c.supplier_names.join(", ") || "Изпълнител";
  const sub = amount(c.subcontracting_amount);
  const nodes: FlowNode[] = [src, { id: "buyer", label: c.buyer_name, kind: "buyer" }, { id: "sup", label: supplierLabel, kind: "supplier" }];
  const links: FlowLink[] = value <= 0 ? [] : [{ source: "src", target: "buyer", value: current }, { source: "buyer", target: "sup", value: value }];
  if (value > 0 && added > 0) {
    nodes.push({ id: "annex", label: "Добавено с анекси", kind: "annex" });
    links[0].value = value;
    links.push({ source: "src", target: "annex", value: added }, { source: "annex", target: "sup", value: added });
  }
  if (value > 0 && sub && sub < current) {
    nodes.push({ id: "sub", label: c.subcontractor_names ? `Подизпълнител: ${c.subcontractor_names}` : "Подизпълнители", kind: "sub" });
    links.push({ source: "sup", target: "sub", value: sub });
  }
  nodes.push({ id: "unk", label: "Материали, труд, печалба: не е публикувано", kind: "unknown" });
  if (value > 0) links.push({ source: "sup", target: "unk", value: current - (sub && sub < current ? sub : 0) });

  return (
    <>
      <Title small back={{ href: "/porachki", label: "Поръчки" }} kicker={`${c.contract_type} · договор от ${fmtDate(c.contract_date)}`}
        lead={<><Link href={buyerUrl(c.buyer_eik)}>{c.buyer_name}</Link> → {c.supplier_eiks.map((e, i) => <span key={e}>{i > 0 && ", "}<Link href={firmUrl(e)}>{c.supplier_names[i] ?? e}</Link></span>)}</>}>
        {c.tender_name}
      </Title>

      <section className="ring-1 ring-rule rounded-sm p-5 bg-white mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${rl.cls}`}>Риск: {rl.t}</span>
          <span className="num font-semibold">{risk} / 100</span>
          <span className="text-sm text-muted">индекс от червени флагове по образеца на OLAF и Европейската комисия</span>
        </div>
        {flags.length > 0 ? (
          <ul className="mt-3 grid gap-2 md:grid-cols-2 text-[15px]">{flags.map((x) => <li key={x.id} className="border-l-4 border-red pl-3"><b>{x.label}</b> <span className="text-sm text-muted">+{x.weight}</span><br />{x.why}</li>)}</ul>
        ) : <p className="text-[15px] mt-2">Не открихме червени флагове в данните за този договор.</p>}
        <p className="text-xs text-muted mt-3">Флагът е повод за въпрос, не доказателство за нарушение. Някои рискове (например фирма, създадена малко преди търга, или съвпадащи адреси на участниците) още не се проверяват, защото данните не са публични в машинно четим вид.</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-10">
        {[
          ["Прогнозна стойност", fmtEur(c.estimated_value_eur), "колкото възложителят е очаквал"],
          ["Договорена стойност", fmtEur(c.contract_value_eur), c.contract_currency === "BGN" ? `договорен в лева: ${c.contract_value?.toLocaleString("bg-BG")} лв.` : c.lot ? `обособена позиция ${c.lot}` : ""],
          ["Анекси", added ? `${added > 0 ? "+" : ""}${fmtEur(added)}` : "няма", annexes.length ? `${annexes.length} анекса` : ""],
          ["Оферти", c.offers_count != null ? String(c.offers_count) : "—", c.disqualified_offers_count ? `${c.disqualified_offers_count} отстранени` : "участвали в процедурата"],
        ].map(([l, v, n]) => (
          <div key={l} className="bg-surface rounded-sm p-4">
            <p className="text-sm text-muted">{l}</p>
            <p className={`display num text-[1.75rem] sm:text-[2.4rem] leading-none mt-1 break-words ${l === "Оферти" && c.offers_count === 1 ? "text-red" : ""}`}>{v}</p>
            {n && <p className="text-sm">{n}</p>}
          </div>
        ))}
      </section>

      <section className="mb-10">
        <SectionTitle>Сигнали</SectionTitle>
        <div className="max-w-3xl"><SignalList items={sig} /></div>
        <p className="text-xs text-muted mt-2 max-w-3xl">Сигналите са автоматични и показват кога поръчката заслужава по-внимателен поглед. Те не са обвинение в нарушение.</p>
        <SignalNote className="mt-1" />
      </section>

      <section className="mb-10">
        <SectionTitle>Къде отиват парите</SectionTitle>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><MoneyFlow nodes={nodes} links={links} /></div>
        <p className="text-sm text-muted mt-2 max-w-3xl">
          Сивата шрафирана част е разбивката, която не е публична: колко отива за материали, труд и печалба. Тя е в количествено-стойностната сметка към офертата и в платежните документи. Можеш да я поискаш от възложителя (вижте „Поискай документите“ по-долу).
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 mb-10">
        <Box title="Изпълнител и история">
          {c.supplier_eiks.map((e, i) => {
            const s = stats[i];
            return (
              <div key={e} className="mb-3">
                <p className="font-semibold"><Link href={firmUrl(e)}>{c.supplier_names[i] ?? e}</Link> <span className="text-sm text-muted font-normal">ЕИК {e}</span></p>
                {s && <p className="text-[15px]">В базата: <b>{s.contracts}</b> договора за <b>{fmtEur(s.total_eur)}</b> при <b>{s.buyers}</b> възложители, от тях {s.single_offer} с една оферта.</p>}
              </div>
            );
          })}
          {c.awarded_to_group && <p className="text-sm">Договорът е възложен на обединение.</p>}
          <p className="text-sm text-muted mt-2">Имената на загубилите участници не са в отворените данни, а само в протоколите на комисията. Добавяме ги постепенно.</p>
        </Box>
        <Box title="Връзки с политици">
          {c.supplier_eiks.map((e) => <LinksBox key={e} eik={e} />)}
          <p className="text-xs text-muted mt-3">Източник: Търговски регистър и декларации, обработени от „Наясно“. Връзката показва роля във фирмата, а не нарушение.</p>
        </Box>
        <Box title="Процедура">
          <dl className="text-[15px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted">Вид</dt><dd>{c.procedure_type ?? "—"}</dd>
            <dt className="text-muted">Основание</dt><dd>{c.legal_basis ?? "—"}</dd>
            <dt className="text-muted">Критерий</dt><dd>{c.award_method ?? "—"}</dd>
            <dt className="text-muted">Предмет (CPV)</dt><dd>{c.cpv_desc} ({c.cpv})</dd>
            <dt className="text-muted">Срок</dt><dd>{c.contract_period_days ? `${c.contract_period_days} дни` : "—"}</dd>
            <dt className="text-muted">УНП</dt><dd>{c.unp}</dd>
            {ts?.[0] != null && <><dt className="text-muted">Срок за оферти</dt><dd>{ts[0]} дни от обявяването{ts[2] ? " (по европейските правила)" : ""}</dd></>}
            {ts && ts[1].length > 0 && <><dt className="text-muted">Промени в условията</dt><dd>{ts[1].length} ({[...ts[1]].sort().map((d) => d.split("-").reverse().join(".")).join(", ")})</dd></>}
            <dt className="text-muted">Финансиране</dt><dd>{c.is_eu_funded ? `Европейски средства${c.eu_program ? `: ${c.eu_program}` : ""}` : "Национални средства"}</dd>
            {c.direct_award_justification && <><dt className="text-muted">Без процедура</dt><dd>{c.direct_award_justification}</dd></>}
          </dl>
          {c.ted_link && <p className="text-sm mt-2"><a href={c.ted_link} target="_blank" rel="noreferrer">Обявлението в официалния вестник на ЕС (TED)</a></p>}
        </Box>
        <Box title="Подизпълнители">
          {c.has_subcontractors
            ? <p className="text-[15px]">{c.subcontractor_names ?? "Посочени, без име"}{c.subcontracting_percent && ` · ${c.subcontracting_percent}%`}{sub && ` · ${fmtEur(sub)}`}</p>
            : <p className="text-[15px]">В договора не са посочени подизпълнители.</p>}
        </Box>
      </section>

      <section className="mb-10">
        <SectionTitle><Term k="aneks">Анекси</Term>: какво е променено</SectionTitle>
        <AnnexList items={annexes} />
        {annexes.filter((a) => a.change_description).map((a) => (
          <details key={a.id} className="mt-3 text-[15px]">
            <summary className="cursor-pointer font-semibold">Текстът на анекса от {fmtDate(a.published_at)} („било / става“)</summary>
            <p className="mt-2 whitespace-pre-line text-muted">{a.change_description}</p>
          </details>
        ))}
      </section>

      <Suspense fallback={<p className="text-muted mb-10">Проследяване на проекта…</p>}><ProjectPath c={c} annexes={annexes} /></Suspense>

      <p className="text-xs text-muted">Източник: отворени данни на ЦАИС ЕОП (Агенция по обществени поръчки), договор № {c.contract_number}, публикуван на {fmtDate(c.published_at)}.</p>
    </>
  );
}

/** Договорът е сключен преди началото на базата (1.01.2025): показваме каквото има в анексите. */
function AnnexOnly({ annexes }: { annexes: Awaited<ReturnType<typeof annexesByRef>> }) {
  const a = annexes[annexes.length - 1];
  const first = annexes[0];
  return (
    <>
      <Title small back={{ href: "/porachki", label: "Поръчки" }} kicker={`Договор № ${a.contract_number}${a.contract_date ? ` от ${fmtDate(a.contract_date)}` : ""}`}
        lead={<><Link href={buyerUrl(a.buyer_eik)}>{a.buyer_name}</Link> → {a.supplier_eiks.map((e, i) => <span key={e}>{i > 0 && ", "}<Link href={firmUrl(e)}>{a.supplier_names[i] ?? e}</Link></span>)}</>}>
        {a.tender_name}
      </Title>
      <section className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          ["Стойност преди анексите", fmtEur(first.last_value_eur)],
          ["Стойност сега", fmtEur(a.current_value_eur)],
          ["Промяна", first.last_value_eur && a.current_value_eur ? `${a.current_value_eur >= first.last_value_eur ? "+" : ""}${Math.round((a.current_value_eur / first.last_value_eur - 1) * 100)}%` : "—"],
        ].map(([l, v]) => <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[1.75rem] sm:text-[2.4rem] leading-none mt-1 break-words">{v}</p></div>)}
      </section>
      <div className="bg-surface p-4 rounded-sm max-w-3xl mb-8 text-[15px]">
        Договорът е сключен преди 1 януари 2025 г. и обявлението за него още не е в нашата база (внасяме историята постепенно). Затова тук няма брой оферти и процедура, а само анексите.
      </div>
      <section className="mb-10">
        <SectionTitle><Term k="aneks">Анекси</Term>: какво е променено</SectionTitle>
        <AnnexList items={annexes} />
        {annexes.filter((x) => x.change_description).map((x) => (
          <details key={x.id} className="mt-3 text-[15px]" open={annexes.length === 1}>
            <summary className="cursor-pointer font-semibold">Текстът на анекса от {fmtDate(x.published_at)} („било / става“)</summary>
            <p className="mt-2 whitespace-pre-line text-muted">{x.change_description}</p>
          </details>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2 mb-10">
        <div className="ring-1 ring-rule rounded-sm p-5"><h3 className="font-semibold mb-2">Връзки с политици</h3>{a.supplier_eiks.map((e) => <LinksBox key={e} eik={e} />)}</div>
      </section>
    </>
  );
}

export default function Dogovor({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Page>
      <Suspense fallback={<p className="text-muted">Зареждане…</p>}>
        <Content params={params} />
      </Suspense>
    </Page>
  );
}
