import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VOTE_COLOR } from "@/components/parliament";
import { ClaimCard } from "@/components/ClaimCard";
import { PartyBadge } from "@/components/PartyBadge";
import { KeyNumber, Page, num, pct, SectionTitle, Title } from "@/components/ui";
import { casesFor, sanctionsFor } from "@/lib/sanctions";
import { Suspense } from "react";
import { Anchor, SectionNav } from "@/components/SectionNav";
import { billsOfMp, billLawPage } from "@/lib/bills";
import { VERDICT, autoChecksFor } from "@/lib/autoChecks";
import { FUNDS } from "@/lib/funds";
import { firmsOfMp, localPage } from "@/lib/people";
import { PersonFirms } from "@/components/TrBox";
import { firmsOfPerson } from "@/lib/tr";
import { firmUrl, fmtEur, supplierStats } from "@/lib/procurement";
import { DS_CHECK, MS_TYPE, NS_YEARS, claimsFor, dsFor, historyFor, prefsFor, profileFor } from "@/lib/mpProfile";
import { ELECTIONS, partyByGroup } from "@/lib/partyMeta";
import { MPS, PARLIAMENT_SOURCE, VOTES, VOTE_LABEL, type VoteCode, formatDate, getMp, mpStats, mpVote, partyName } from "@/lib/parliament";

export function generateStaticParams() {
  return MPS.map((m) => ({ id: String(m.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = getMp(Number((await params).id));
  return { title: m ? m.name : "Депутат" };
}


const REL_BG: Record<string, string> = { director: "управител", representative: "представител", owner: "собственик", partner: "съдружник", board: "член на съвет", sole_owner: "едноличен собственик", stake: "дял", manager: "управител", actual_owner: "действителен собственик" };
async function MpMoney({ id, name }: { id: number; name: string }) {
  await connection(); // при отваряне, не при сглобяване: иначе сборката тегли хиляди заявки към базата
  const firms = firmsOfMp(id);
  const eu = FUNDS.mpConnected.filter((x) => x.mpId === id);
  const eiks = [...new Set([...firms.map((f) => f.eik), ...eu.map((x) => x.eik)])];
  const stats = await Promise.all(eiks.map((e) => supplierStats(e)));
  const local = localPage(name);
  if (!eiks.length) return <p className="text-[15px]">Не открихме фирми, свързани с него в Търговския регистър.{local ? <> Има и <Link href={local}>профил в местната власт</Link>.</> : null}</p>;
  const totalProc = stats.reduce((a, s) => a + (s?.total_eur ?? 0), 0), totalEu = eu.reduce((a, x) => a + x.contracted, 0);
  return (
    <>
      <p className="text-[15px] mb-4"><b>{eiks.length}</b> фирми и организации. Обществени поръчки: <b>{fmtEur(totalProc)}</b>. Европейски средства (договорени): <b>{fmtEur(totalEu)}</b>.{local ? <> Има и <Link href={local}>профил в местната власт</Link>.</> : null}</p>
      <div className="overflow-x-auto"><table className="w-full text-[15px]">
        <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Фирма</th><th className="px-2">Връзка</th><th className="px-2 text-right">Поръчки</th><th className="px-2 text-right">Евросредства</th></tr></thead>
        <tbody>{eiks.map((e, i) => {
          const f = firms.find((x) => x.eik === e), u = eu.find((x) => x.eik === e), st = stats[i];
          return (
            <tr key={e} className="border-b border-rule align-top">
              <td className="py-1.5 pr-3"><Link href={firmUrl(e)}>{st?.name ?? u?.name ?? `ЕИК ${e}`}</Link>{u?.type ? <span className="block text-xs text-muted">{u.type}</span> : null}</td>
              <td className="px-2 text-sm">{f?.roles.join(", ") || u?.rel.map((r) => `${REL_BG[r.kind] ?? r.kind}${r.current ? "" : " (в миналото)"}`).join(", ") || "–"}</td>
              <td className="px-2 text-right num">{st ? `${fmtEur(st.total_eur)} · ${st.contracts}` : "–"}</td>
              <td className="px-2 text-right num">{u ? fmtEur(u.contracted) : "–"}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
      <p className="text-xs text-muted mt-2">Връзката не означава нарушение. Държавни и общински дружества, в които е бил в управлението по служба, също се показват.</p>
    </>
  );
}

export default async function Deputat({ params }: { params: Promise<{ id: string }> }) {
  const mp = getMp(Number((await params).id));
  if (!mp) notFound();
  const s = mpStats(mp.id);
  const recent = VOTES.filter((v) => mpVote(v, mp.id) !== "-").slice(0, 30);
  const prof = profileFor(mp.name);
  const hist = historyFor(mp.name);
  const prefs = prefsFor(mp.id);
  const born = prof?.born ?? hist?.born ?? null;
  const ds = dsFor(mp.name, born);
  const claims = claimsFor(mp.name);
  const sanc = sanctionsFor(mp.name);
  const cases = casesFor(mp.name);
  const fl = (n: string) => { const p = n.split(/\s+/); return `${p[0]} ${p.at(-1)}`; };
  const ambiguous = MPS.filter((m) => fl(m.name) === fl(mp.name)).length > 1;
  const mb = billsOfMp(mp.name, mp.pid, ambiguous);
  const current = (prof?.ms ?? []).filter((m) => String(m.to).startsWith("9999") && [3, 4, 6, 9].includes(m.t));
  const listName = (n: number) => ELECTIONS.parties.find((p) => p.num === n)?.name ?? "";
  const meta = partyByGroup(mp.party);
  const age = born ? Math.floor((Date.parse("2026-11-17") - Date.parse(born)) / 3.15576e10) : undefined;

  return (
    <Page>
      <Title back={{ href: "/parlament", label: "Парламент" }} kicker="Народен представител" lead={<>Парламентарна група: {meta ? <Link href={`/parlament/partiya/${meta.slug}`}>{partyName(mp.party)}</Link> : partyName(mp.party)}{mp.pid ? <> · <a href={`https://www.parliament.bg/bg/MP/${mp.pid}`} target="_blank" rel="noreferrer">официален профил и снимка</a></> : null}</>}>
        <span className="inline-flex items-center gap-4"><PartyBadge p={mp.party} size={56} />{mp.name}</span>
      </Title>
      {(sanc || cases.length > 0) && (
        <a href="#korupciya" className={`block rounded-sm p-4 mb-6 bg-white no-underline text-ink max-w-4xl ${sanc || cases.some((c) => !["dropped", "acquitted"].includes(c.level)) ? "ring-2 ring-red" : "ring-1 ring-rule"}`}>
          <b>{[sanc && "Санкциониран за корупция", ...[...new Set(cases.map((c) => c.levelLabel))].map((l) => `${l} (${cases.filter((c) => c.levelLabel === l).length})`)].filter(Boolean).join(" · ")}.</b> Подробно по-долу, с източниците.
        </a>
      )}
      <SectionNav items={[["bio", "Биография"], ...((sanc || cases.length) ? [["korupciya", "Разследвания и съд"] as [string, string]] : []), ["pari", "Фирми и пари"], ...(mb.sponsored.length || mb.conflict.length ? [["zakonoproekti", `Законопроекти (${mb.sponsored.length})`] as [string, string]] : []), ["glasuvaniya", "Гласувания"], ["ds", "Държавна сигурност"], ["proverki", "Проверени твърдения"]]} />

      <div id="bio" className="grid gap-6 lg:grid-cols-2 mb-12 scroll-mt-32 lg:scroll-mt-20">
        <section className="ring-1 ring-rule rounded-sm p-5 bg-white">
          <h2 className="font-semibold text-lg mb-3">Биография</h2>
          <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5 text-[15px]">
            {born && <><dt className="text-muted">Роден/а</dt><dd>{formatDate(born)}{age ? ` (${age} г.)` : ""}{prof?.bornIn ? `, ${prof.bornIn}` : ""}</dd></>}
            {prof?.spec && <><dt className="text-muted">Образование</dt><dd>{prof.spec}</dd></>}
            {prof?.prof?.length ? <><dt className="text-muted">Професия</dt><dd>{prof.prof.join(", ")}</dd></> : null}
            {prof?.langs?.length ? <><dt className="text-muted">Езици</dt><dd>{prof.langs.join(", ")}</dd></> : null}
            {prof?.mir && <><dt className="text-muted">Избирателен район</dt><dd>{prof.mir}</dd></>}
            {prof?.list && <><dt className="text-muted">Избран/а с</dt><dd>{prof.list}</dd></>}
          </dl>
          {prof?.cv && <p className="text-[15px] mt-3">{prof.cv}</p>}
          {!prof && <p className="text-sm text-muted">Няма текущ профил в parliament.bg: депутатът вероятно вече не е в парламента.</p>}
        </section>
        <section className="ring-1 ring-rule rounded-sm p-5 bg-white">
          <h2 className="font-semibold text-lg mb-3">Парламентарна история</h2>
          {hist?.ns?.length ? (
            <>
              <p className="text-[15px] mb-2">Депутат в <b>{hist.ns.length}</b> {hist.ns.length === 1 ? "парламент" : "парламента"}:</p>
              <p className="flex flex-wrap gap-1.5 mb-3">{hist.ns.map((n) => <span key={n} className="text-xs rounded-full px-2.5 py-1 bg-surface">{n}-о НС · {NS_YEARS[n] ?? ""}</span>)}</p>
            </>
          ) : <p className="text-[15px] mb-3">Първи мандат.</p>}
          {current.length > 0 && (<>
            <p className="font-semibold text-sm mb-1">Сега</p>
            <ul className="text-[15px] space-y-1">{current.map((m) => <li key={m.c}><span className="text-muted">{MS_TYPE[m.t] ?? ""}:</span> {m.c}{m.pos && m.pos !== "член" ? <b> — {m.pos}</b> : ""}</li>)}</ul>
          </>)}
          <p className="text-xs text-muted mt-3">Предишната партийна принадлежност по парламенти още не е в отворените данни като таблица. Показваме в кои парламенти е бил депутатът; партийната история допълваме ръчно с източник.</p>
        </section>
      </div>

      {prefs.length > 0 && (
        <section className="mb-12">
          <SectionTitle>Преференции на изборите на 19 април 2026 г.</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {prefs.map((p) => (
              <div key={`${p.mir}-${p.party}`} className="ring-1 ring-rule rounded-sm p-4 bg-white">
                <p className="text-sm text-muted">{p.mirName} · №{p.pos} в листата на {listName(p.party)}</p>
                <p className="display text-[2.4rem] leading-none mt-1">{p.prefs.toLocaleString("bg-BG")}</p>
                <p className="text-sm text-muted">преференции{p.pct != null ? `, ${pct(p.pct / 100, 1)} от гласовете за листата в района` : ""}</p>
                {p.top.length > 0 && (<>
                  <p className="font-semibold text-sm mt-3 mb-1">Откъде идват</p>
                  <ul className="text-[15px]">{p.top.map((t) => <li key={t.code} className="flex justify-between border-b border-rule py-0.5"><span>{t.name}</span><span className="num">{t.votes.toLocaleString("bg-BG")}</span></li>)}</ul>
                </>)}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">Източник: ЦИК, преференции по секции. Кандидатът влиза с преференции, ако събере поне 7% от гласовете за листата в района.</p>
        </section>
      )}

      <div id="korupciya" className="scroll-mt-32 lg:scroll-mt-20" />
      {cases.length > 0 && (
        <section className="mb-12">
          <SectionTitle>Разследвания, обвинения и присъди</SectionTitle>
          {cases.map((c) => (
            <div key={c.what} className={`rounded-sm p-4 bg-white max-w-3xl text-[15px] mb-3 ${["dropped", "acquitted"].includes(c.level) ? "ring-1 ring-rule" : "ring-2 ring-[#e08a2e]"}`}>
              <p className="font-semibold">{c.levelLabel}: {c.what}</p>
              <p className="mt-1">{c.outcome}</p>
              <p className="text-sm mt-1">{c.sources.map((s, i) => <span key={s.url}>{i > 0 && "; "}<a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></span>)} · <Link href="/proverki/sankcii#dela">всички случаи</Link></p>
            </div>
          ))}
        </section>
      )}

      {sanc && (
        <section className="mb-12">
          <SectionTitle>Санкции за корупция</SectionTitle>
          <div className="ring-2 ring-red rounded-sm p-4 bg-white max-w-3xl text-[15px]">
            <p className="font-semibold">Санкциониран за значима корупция: {sanc.measures.map((m) => ({ GLOMAG: "„Магнитски“ (САЩ)", "7031c": "забрана за влизане в САЩ", UKGAC: "Великобритания" })[m.regime] + ` (${m.date.slice(0, 4)}, ${m.status})`).join("; ")}.</p>
            <p className="mt-1">{sanc.allegation}</p>
            <p className="text-sm text-muted mt-2">Санкцията е мярка на чужда държава, не присъда на български съд. <Link href="/proverki/sankcii">Всички санкционирани и източниците</Link>.</p>
          </div>
        </section>
      )}

      <Anchor id="pari" title="Фирми, поръчки и евросредства" lead="Фирмите, в които е съдружник, собственик, управител или представител (по Търговския регистър, обработен от „Наясно“), и колко пари са получили от обществени поръчки и европейски програми.">
        <Suspense fallback={<p className="text-muted">Проверка на фирмите…</p>}><MpMoney id={mp.id} name={mp.name} /></Suspense>
        {firmsOfPerson(mp.name).length > 0 && <div className="mt-6"><h3 className="font-semibold mb-2">Управител, съдружник или собственик (Търговски регистър)</h3><PersonFirms name={mp.name} /></div>}
      </Anchor>

      {(mb.sponsored.length > 0 || mb.conflict.length > 0) && (
        <Anchor id="zakonoproekti" title="Внесени законопроекти" lead="Законопроектите в този парламент, сред чиито вносители е депутатът (по данни от parliament.bg). Съвпадението е по име и фамилия.">
          {mb.conflict.length > 0 && (
            <div className="border-l-4 border-red bg-[#fdeff1] rounded-sm p-4 mb-4 max-w-4xl">
              <p className="font-semibold">Обявен конфликт на интереси</p>
              <ul className="text-[15px] mt-1 space-y-1">{mb.conflict.map((b) => { const l = billLawPage(b); return <li key={b.id}>{l ? <Link href={`/parlament/zakon/${l.slug}`}>{b.title.replace(/^Законопроект /, "")}</Link> : <a href={b.url} target="_blank" rel="noreferrer">{b.title.replace(/^Законопроект /, "")}</a>}: „{b.notes!.conflict[0].slice(0, 220)}“</li>; })}</ul>
            </div>
          )}
          <ul className="divide-y divide-rule border-y border-rule max-w-5xl">
            {mb.sponsored.slice(0, 40).map((b) => { const l = billLawPage(b); return (
              <li key={b.id} className="py-2 grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-4">
                <span>{l ? <Link href={`/parlament/zakon/${l.slug}`}>{b.title}</Link> : <a href={b.url} target="_blank" rel="noreferrer">{b.title}</a>}<span className="block text-sm text-muted">№ {b.sign} · {b.sponsors.length > 1 ? `с още ${b.sponsors.length - 1} вносители` : "единствен вносител"}</span></span>
                <span className={`text-sm whitespace-nowrap ${b.dv ? "text-green font-semibold" : b.withdrawn ? "text-muted" : "text-muted"}`}>{b.dv ? `приет, ${b.dv}` : b.withdrawn ? "оттеглен" : `внесен ${b.date.split("-").reverse().join(".")}`}</span>
              </li>
            ); })}
          </ul>
        </Anchor>
      )}

      <section id="ds" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
        <SectionTitle>Държавна сигурност</SectionTitle>
        {ds.status === "declared" ? (
          <div className="ring-2 ring-[#e2b33b] rounded-sm p-4 bg-[#fffaf0] max-w-3xl">
            <p className="font-semibold">Обявена принадлежност: {ds.role}</p>
            <p className="text-[15px] mt-1">{ds.decision}</p>
            <p className="text-[15px] mt-1">{ds.context}</p>
            <p className="text-sm text-muted mt-2">{ds.match}</p>
            <p className="text-sm mt-2 flex flex-wrap gap-x-4">{ds.sources.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer">{x.title}</a>)}</p>
          </div>
        ) : (
          <p className="text-[15px] max-w-3xl">{ds.status === "exempt" ? "Роден/а след 1973 г.: по закон не подлежи на проверка." : `Няма обявена принадлежност. ${DS_CHECK.what}`} <span className="text-sm">{DS_CHECK.sources.map((x, i) => <span key={x.url}>{i > 0 && ", "}<a href={x.url} target="_blank" rel="noreferrer">{x.title}</a></span>)}</span></p>
        )}
      </section>

      {prof && (prof.bills > 0 || prof.control > 0) && (
        <section className="mb-12">
          <SectionTitle>Работа като вносител и контрол</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="ring-1 ring-rule rounded-sm p-4 bg-white">
              <p className="font-semibold mb-2">Внесени законопроекти: {prof.bills}</p>
              <ul className="text-[15px] space-y-1">{prof.billsList.slice(0, 10).map((b) => <li key={b.id}><span className="text-sm text-muted num">{b.date}</span> <a href={`https://www.parliament.bg/bg/bills/ID/${b.id}`} target="_blank" rel="noreferrer">{b.title || b.sign}</a></li>)}</ul>
            </div>
            <div className="ring-1 ring-rule rounded-sm p-4 bg-white">
              <p className="font-semibold mb-2">Въпроси и питания към правителството: {prof.control}</p>
              <ul className="text-[15px] space-y-1">{prof.controlList.slice(0, 10).map((c, i) => <li key={i}><span className="text-sm text-muted num">{c.date}</span> {c.about}</li>)}</ul>
            </div>
          </div>
        </section>
      )}

      <section className="mb-12">
        <SectionTitle>Проверени твърдения</SectionTitle><span id="proverki" />
        {claims.length ? <div className="grid gap-3">{claims.map((c) => <ClaimCard key={c.id} c={c} />)}</div>
          : <p className="text-[15px] max-w-3xl">Още нямаме проверени твърдения на този депутат. Проверяваме конкретни публични твърдения с числа, по равно за всички (<Link href="/proverki">как работим</Link>). Рейтинг на истинност показваме само когато проверките са достатъчно, за да не подвеждат.</p>}
        {(() => {
          // съименниците не се смесват: показваме автоматичната сверка само при уникално име и фамилия
          const ac = ambiguous ? [] : autoChecksFor(mp.name);
          if (!ac.length) return null;
          const n = (v: "match" | "close" | "off") => ac.filter((c) => c.verdict === v).length;
          return (
            <div className="mt-6 max-w-4xl">
              <p className="font-semibold">Числата в изказванията му (автоматична сверка)</p>
              <p className="text-[15px] text-muted">{ac.length} изказвания с число, сравнени с официалните данни: {n("match")} съвпадат, {n("close")} са близо, {n("off")} се разминават. <Link href="/proverki/chisla">Как работи</Link></p>
              <ul className="mt-2 space-y-2 text-[15px]">{ac.slice(0, 5).map((c) => <li key={c.id}><span className={`text-xs font-semibold rounded-full px-2 py-0.5 mr-2 ${VERDICT[c.verdict].cls}`}>{VERDICT[c.verdict].label}</span>„{c.text.slice(0, 220)}“ — официално {c.official.toLocaleString("bg-BG")}{c.unit === "%" ? "%" : " €"} ({c.period}). <a href={c.url} target="_blank" rel="noreferrer">стенограма</a></li>)}</ul>
            </div>
          );
        })()}
        <p className="text-sm text-muted mt-3">Доверие и одобрение: социологическите агенции публикуват доверие само към лидерите, не към всеки депутат. Където има данни, ще ги добавим с източник.</p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 mb-12 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
        <KeyNumber label="Присъствие" value={s.eligible ? pct(s.present / s.eligible, 0) : "—"} note={`гласувал в ${num(s.present, 0)} от ${num(s.eligible, 0)} гласувания`} />
        <KeyNumber label="Срещу собствената група" value={num(s.against, 0)} note={s.present ? `${pct(s.against / s.present, 1)} от гласуванията, в които е участвал` : ""} />
        <KeyNumber label="Период" value={s.eligible ? `${num(s.eligible, 0)}` : "—"} note="гласувания, докато е депутат" />
      </div>

      {s.dissents.length > 0 && (
        <section className="mb-12">
          <SectionTitle>Когато е гласувал различно от групата си</SectionTitle>
          <p className="text-sm text-muted mb-3">Това не е нито добро, нито лошо само по себе си. Показва къде депутатът е имал различна позиция.</p>
          <ul>
            {s.dissents.slice(0, 50).map(({ vote, own, party }) => (
              <li key={vote.id} className="border-b border-rule py-2 grid gap-1 sm:grid-cols-[7rem_1fr_auto] sm:gap-4">
                <span className="text-sm text-muted num">{new Date(vote.date).toLocaleDateString("bg-BG")}</span>
                <Link href={`/parlament/glasuvane/${vote.id}`} className="text-ink no-underline hover:underline">{vote.title}</Link>
                <span className="text-sm whitespace-nowrap">той/тя: <b>{VOTE_LABEL[own]}</b> · групата: {VOTE_LABEL[party as VoteCode]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>Последни гласувания</SectionTitle><span id="glasuvaniya" className="block -mt-24 pt-24" />
        <ul>
          {recent.map((v) => {
            const c = mpVote(v, mp.id);
            return (
              <li key={v.id} className="border-b border-rule py-2 grid gap-1 sm:grid-cols-[7rem_1fr_9rem] sm:gap-4">
                <span className="text-sm text-muted num">{new Date(v.date).toLocaleDateString("bg-BG")}</span>
                <Link href={`/parlament/glasuvane/${v.id}`} className="text-ink no-underline hover:underline">{v.title}</Link>
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: VOTE_COLOR[c] }} />{VOTE_LABEL[c]}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs text-muted mt-10">
        Данни: <a href={PARLIAMENT_SOURCE.url} target="_blank" rel="noreferrer">{PARLIAMENT_SOURCE.title}</a>. Групата е последната известна за депутата в периода до {formatDate(VOTES[0].date)}
      </p>
    </Page>
  );
}
