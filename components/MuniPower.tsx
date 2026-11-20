import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SectionTitle } from "@/components/ui";
import { LOCAL_INDEX, VOTE_BG, localData, normFirm, personHref, type Official, type Resolution } from "@/lib/local";
import { firmUrl, placeSuppliersAll } from "@/lib/procurement";

const eur = (v?: number | null) => (v == null ? "–" : `${Math.round(v).toLocaleString("bg-BG")} €`);
const LEAD = ["mayor", "deputy_mayor", "council_chair", "chief_architect"];

function DeclLine({ o }: { o: Official }) {
  const d = o.decl;
  if (!d) return <p className="text-sm text-muted">Няма намерена декларация.</p>;
  return (
    <div className="text-sm space-y-0.5">
      <p>Доход за {d.fiscalYear} г.: <b className="num">{eur(d.income)}</b>{d.incomeSpouse ? <> · съпруг/а: <span className="num">{eur(d.incomeSpouse)}</span></> : null}</p>
      <p className="text-muted">
        {[d.realEstate ? `${d.realEstate} имота` : null, d.vehicles ? `${d.vehicles} МПС` : null, d.bankEur ? `в банка ${eur(d.bankEur)}` : null, d.debtEur ? `задължения ${eur(d.debtEur)}` : null, d.receivableEur ? `дадени заеми ${eur(d.receivableEur)}` : null].filter(Boolean).join(" · ") || "без декларирани имоти, сметки или задължения"}
      </p>
      {d.stakes.length > 0 && <p><b>Дялове във фирми:</b> {d.stakes.map((s, i) => <span key={i}>{i > 0 && "; "}{s.company}{s.holder && s.holder.toUpperCase() !== o.name.toUpperCase() ? ` (на ${s.holder})` : ""}{s.share ? `, ${s.share}${/%/.test(s.share) ? "" : " дяла"}` : ""}</span>)}</p>}
      <p><a href={d.url} target="_blank" rel="noreferrer">Декларацията (Сметна палата, {d.year})</a></p>
    </div>
  );
}

async function Conflicts({ code, officials }: { code: string; officials: Official[] }) {
  await connection();
  const sup = await placeSuppliersAll(code);
  const byNorm = new Map(sup.map((s) => [normFirm(s.name), s]));
  const hits = officials.flatMap((o) => (o.decl?.stakes ?? []).map((st) => {
    const n = normFirm(st.company);
    const s = byNorm.get(n) ?? sup.find((x) => { const xn = normFirm(x.name); return n.length >= 6 && (xn.startsWith(n + " ") || n.startsWith(xn + " ")); });
    return s ? { o, st, s } : null;
  })).filter((x): x is NonNullable<typeof x> => !!x);
  const withStakes = officials.filter((o) => o.decl?.stakes.length);
  return (
    <>
      {hits.length ? (
        <ul className="space-y-3 mb-4">{hits.map(({ o, st, s }, i) => (
          <li key={i} className="ring-2 ring-red rounded-sm p-4 bg-white">
            <p className="font-semibold">{o.name} ({o.roleRaw.toLowerCase()}) има дял в „{st.company}“{st.holder && st.holder.toUpperCase() !== o.name.toUpperCase() ? ` (на ${st.holder})` : ""}</p>
            <p className="text-[15px]">Фирма с много сходно име, <Link href={firmUrl(s.eik)}>{s.name}</Link> (ЕИК {s.eik}), има {s.contracts} договора с възложители от общината за {eur(s.total_eur)}.</p>
            <p className="text-sm text-muted">Съвпадението е по име, защото декларациите не съдържат ЕИК. Проверете в Търговския регистър дали е същата фирма. Законът задължава длъжностното лице да декларира конфликт и да не участва в решенията за фирмата.</p>
          </li>
        ))}</ul>
      ) : (
        <p className="text-[15px] mb-3">Нито една от фирмите в декларациите не съвпада по име с изпълнител на обществена поръчка на възложител от общината ({sup.length} фирми).</p>
      )}
      {withStakes.length > 0 && (
        <details className="text-[15px]"><summary className="cursor-pointer font-semibold text-green">Всички декларирани дялове ({withStakes.length} души)</summary>
          <ul className="mt-2 space-y-1">{withStakes.map((o) => <li key={o.slug}><b>{o.name}</b> ({o.roleRaw.toLowerCase()}): {o.decl!.stakes.map((s) => s.company).join(", ")}</li>)}</ul>
        </details>
      )}
    </>
  );
}

function CouncilSummary({ res }: { res: Resolution[] }) {
  const by = new Map<string, { name: string; slug: string | null; role: string; n: number; contested: number }>();
  for (const r of res) {
    if (!r.rapporteur) continue;
    const k = r.rapporteur.slug ?? r.rapporteur.name;
    const x = by.get(k) ?? { name: r.rapporteur.name, slug: r.rapporteur.slug, role: r.rapporteur.role, n: 0, contested: 0 };
    x.n++; if (r.tally && r.tally.against > 0) x.contested++;
    by.set(k, x);
  }
  const voted = res.filter((r) => r.tally);
  const unanimous = voted.filter((r) => r.tally!.against === 0 && r.tally!.abstain === 0).length;
  const withAgainst = voted.filter((r) => r.tally!.against > 0).length;
  const named = voted.filter((r) => r.tally!.method === "named").length;
  const rejected = res.filter((r) => r.result === "rejected").length;
  const tags = new Map<string, number>();
  for (const r of res) for (const t of r.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
  return (
    <div className="grid gap-4 lg:grid-cols-2 mb-6">
      <div className="bg-surface rounded-sm p-4 text-[15px]">
        <p className="font-semibold mb-2">Как гласува съветът</p>
        <p>Единодушно („за“ без против и въздържали се): <b className="num">{voted.length ? Math.round((100 * unanimous) / voted.length) : 0}%</b> от {voted.length} решения с отчетено гласуване.</p>
        <p>С поне един глас „против“: <b className="num">{withAgainst}</b>. Поименно гласувани: <b className="num">{named}</b>. Отхвърлени: <b className="num">{rejected}</b>.</p>
        <p className="mt-2 text-sm text-muted">По теми: {[...tags.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${LOCAL_INDEX.tags[t]?.bg ?? t} ${n}`).join(" · ")}</p>
      </div>
      <div className="bg-surface rounded-sm p-4 text-[15px]">
        <p className="font-semibold mb-2">Кой внася предложенията</p>
        <ul className="space-y-1">{[...by.values()].sort((a, b) => b.n - a.n).slice(0, 8).map((x) => (
          <li key={x.slug ?? x.name} className="flex justify-between gap-3"><span>{x.slug ? <Link href={personHref(x.slug)}>{x.name}</Link> : x.name} <span className="text-sm text-muted">· {x.role}</span></span><span className="num">{x.n}{x.contested ? <span className="text-sm text-muted"> ({x.contested} с „против“)</span> : null}</span></li>
        ))}</ul>
      </div>
    </div>
  );
}

function councilStats(res: Resolution[]) {
  const by = new Map<string, { for: number; against: number; abstain: number; other: number; dissent: number }>();
  for (const r of res) {
    if (!r.votes.length || !r.tally) continue;
    const majority = r.tally.for >= r.tally.against ? "for" : "against";
    for (const [name, v] of r.votes) {
      const x = by.get(name) ?? { for: 0, against: 0, abstain: 0, other: 0, dissent: 0 };
      if (v === "for" || v === "against" || v === "abstain") x[v]++; else x.other++;
      if ((v === "for" || v === "against") && v !== majority) x.dissent++;
      by.set(name, x);
    }
  }
  return [...by.entries()].map(([name, x]) => ({ name, ...x, total: x.for + x.against + x.abstain + x.other })).sort((a, b) => b.dissent - a.dissent || a.name.localeCompare(b.name, "bg"));
}

export function ResolutionItem({ r }: { r: Resolution }) {
  return (

                  <li key={r.id} className="ring-1 ring-rule rounded-sm p-3 bg-white">
                    <p className="text-sm text-muted">{r.date.split("-").reverse().join(".")}{r.session ? ` · заседание ${r.session}` : ""} · решение № {r.number}{r.tags.length ? ` · ${r.tags.map((t) => LOCAL_INDEX.tags[t]?.bg ?? t).join(", ")}` : ""}{r.result === "rejected" ? " · отхвърлено" : ""}</p>
                    <p className="text-[15px]">{r.title === "(no title parsed)" ? "Заглавието не е разчетено от протокола" : r.title}</p>
                    {r.rapporteur ? <p className="text-sm text-muted">Внася: {r.rapporteur.slug ? <Link href={personHref(r.rapporteur.slug)}>{r.rapporteur.name}</Link> : r.rapporteur.name}, {r.rapporteur.role}</p> : r.proposedBy ? <p className="text-sm text-muted">Внесено от: {r.proposedBy}</p> : null}
                    {r.tally ? <p className="text-sm num mt-1">За {r.tally.for} · против <span className={r.tally.against ? "text-red font-semibold" : ""}>{r.tally.against}</span> · въздържали се {r.tally.abstain}{r.tally.method === "named" ? " · поименно" : ""}{r.url && <> · <a href={r.url} target="_blank" rel="noreferrer">{r.session ? "протокол" : "решението (PDF)"}</a></>}</p>
                      : r.url && <p className="text-sm mt-1"><a href={r.url} target="_blank" rel="noreferrer">решението (PDF)</a></p>}
                    {r.text && <details className="text-sm mt-1"><summary className="cursor-pointer text-green">Какво решиха</summary><p className="mt-1 whitespace-pre-line">{r.text}</p></details>}
                    {r.votes.some(([, v]) => v !== "for") && (
                      <details className="text-sm mt-1"><summary className="cursor-pointer text-green">Кой не гласува „за“</summary>
                        <p className="mt-1">{r.votes.filter(([, v]) => v !== "for").map(([n, v]) => `${n}: ${VOTE_BG[v] ?? v}`).join("; ")}</p>
                      </details>
                    )}
                  </li>
                
  );
}

/** Местната власт на общината: ръководство, конфликт на интереси, съветници, решения на съвета. Част от страницата на общината. */
export function MuniPower({ code }: { code: string }) {
  const L = localData(code);
  const lead = (L?.officials ?? []).filter((x) => LEAD.includes(x.role));
  const council = (L?.officials ?? []).filter((x) => x.role === "councillor" || x.role === "council_chair");
  const res = L?.resolutions ?? null;
  const stats = res ? councilStats(res) : [];
  const contested = res ? res.filter((r) => r.tally && (r.tally.against > 0 || r.tally.abstain > 2)) : [];

  return (
    <>
      {!L ? <p className="text-[15px] bg-surface rounded-sm p-4 mb-10">Още нямаме данни за ръководството на тази община.</p> : (
        <>
          <section id="rakovodstvo" className="mb-12 scroll-mt-32 lg:scroll-mt-24">
            <SectionTitle>Ръководство</SectionTitle>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{lead.map((x) => (
              <li key={x.slug} className={`ring-1 rounded-sm p-4 bg-white ${x.decl?.stakes.length ? "ring-[#e08a2e]" : "ring-rule"}`}>
                <p className="text-sm text-muted">{x.roleRaw}</p>
                <p className="font-semibold text-lg leading-snug mb-2"><Link href={personHref(x.slug)}>{x.name}</Link></p>
                <DeclLine o={x} />
              </li>
            ))}</ul>
          </section>

          <section id="konflikt" className="mb-12 scroll-mt-32 lg:scroll-mt-24">
            <SectionTitle>Конфликт на интереси: дялове във фирми срещу поръчките на общината</SectionTitle>
            <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Сравняваме фирмите, в които кметът, заместниците, главният архитект и съветниците (или съпрузите им) декларират дялове, с фирмите, спечелили поръчки от общината, училищата, болниците и общинските дружества. Не виждаме роднини извън семейството и фирми, притежавани чрез посредници.</p>
            <Suspense fallback={<p className="text-muted">Проверка…</p>}><Conflicts code={code} officials={L.officials} /></Suspense>
          </section>

          <section id="savetnici" className="mb-12 scroll-mt-32 lg:scroll-mt-24">
            <SectionTitle>Общински съветници ({council.length})</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-[15px]">
                <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Име</th><th className="py-2 pr-3">Листа</th><th className="py-2 pr-3 num text-right">Преференции</th><th className="py-2 pr-3 num text-right">Доход</th><th className="py-2">Дялове във фирми</th></tr></thead>
                <tbody>{council.map((x) => (
                  <tr key={x.slug} className="border-b border-rule align-top">
                    <td className="py-2 pr-3"><Link href={personHref(x.slug)}>{x.name}</Link>{x.role === "council_chair" && <span className="block text-xs text-muted">председател</span>}</td>
                    <td className="py-2 pr-3 text-sm">{x.party ?? "–"}</td>
                    <td className="py-2 pr-3 num text-right">{x.prefVotes ?? "–"}</td>
                    <td className="py-2 pr-3 num text-right">{x.decl ? <a href={x.decl.url} target="_blank" rel="noreferrer">{eur(x.decl.income)}</a> : "–"}</td>
                    <td className="py-2 text-sm">{x.decl?.stakes.map((s) => s.company).join(", ") || "–"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-2">Листата и преференциите са от местните избори на 29 октомври 2023 г. Доходът е облагаемият доход на лицето от годишната декларация.</p>
          </section>

          <section id="resheniya" className="mb-12 scroll-mt-32 lg:scroll-mt-24">
            <SectionTitle>Решения на общинския съвет</SectionTitle>
            {!res ? (
              <p className="text-[15px] bg-surface rounded-sm p-4 max-w-3xl">За тази община още не четем протоколите на съвета. Засега ги имаме за {Object.values(LOCAL_INDEX.munis).filter((x) => x.resolutions).length} общини. Протоколите на общината се публикуват на сайта на общинския съвет, обикновено като PDF.</p>
            ) : (
              <>
                <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">{res.length} решения{res.some((r) => r.text) ? ` от ${res.at(-1)?.date.slice(0, 4)} г. насам, прочетени директно от сайта на общинския съвет` : " от последните заседания"}. Показваме първо спорните: с гласове против или много въздържали се.</p>
                {res.some((r) => r.rapporteur) && <CouncilSummary res={res} />}
                {stats.length > 0 && (
                  <details className="mb-6" open>
                    <summary className="cursor-pointer font-semibold text-green">Как гласува всеки съветник</summary>
                    <div className="overflow-x-auto mt-2"><table className="w-full text-[15px] num">
                      <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-1.5 pr-3">Съветник</th><th className="text-right px-2">За</th><th className="text-right px-2">Против</th><th className="text-right px-2">Въздържал се</th><th className="text-right px-2">Отсъства / не гласува</th><th className="text-right px-2">Срещу мнозинството</th></tr></thead>
                      <tbody>{stats.map((s) => <tr key={s.name} className="border-b border-rule"><td className="py-1.5 pr-3">{s.name}</td><td className="text-right px-2">{s.for}</td><td className="text-right px-2">{s.against}</td><td className="text-right px-2">{s.abstain}</td><td className="text-right px-2">{s.other}</td><td className="text-right px-2 font-semibold">{s.dissent}</td></tr>)}</tbody>
                    </table></div>
                  </details>
                )}
                {(() => { const all = [...contested, ...res.filter((r) => !contested.includes(r))]; return (<><ul className="space-y-2">{all.slice(0, 15).map((r) => <ResolutionItem key={r.id} r={r} />)}</ul>{all.length > 15 && <p className="mt-3"><Link href={`/mesta/${code.slice(0, 3).toLowerCase()}/${code.toLowerCase()}/resheniya`} className="font-semibold">Всички {all.length} решения</Link></p>}</>); })()}
              </>
            )}
          </section>
          <p className="text-xs text-muted">Източници: декларации от регистъра на Сметната палата; протоколи и решения от сайта на общинския съвет; поръчки от ЦАИС ЕОП. Обработка: „Наясно“ и „Осъзнатост“, към {LOCAL_INDEX.updated}.</p>
        </>
      )}
    </>
  );
}
