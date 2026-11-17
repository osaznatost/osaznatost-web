import Link from "next/link";
import { notFound } from "next/navigation";
import { VOTE_COLOR } from "@/components/parliament";
import { ClaimCard } from "@/components/ClaimCard";
import { PartyBadge } from "@/components/PartyBadge";
import { KeyNumber, Page, num, pct, SectionTitle, Title } from "@/components/ui";
import { casesFor, sanctionsFor } from "@/lib/sanctions";
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
  const current = (prof?.ms ?? []).filter((m) => String(m.to).startsWith("9999") && [3, 4, 6, 9].includes(m.t));
  const listName = (n: number) => ELECTIONS.parties.find((p) => p.num === n)?.name ?? "";
  const meta = partyByGroup(mp.party);
  const age = born ? Math.floor((Date.parse("2026-11-17") - Date.parse(born)) / 3.15576e10) : undefined;

  return (
    <Page>
      <Title back={{ href: "/parlament", label: "Парламент" }} kicker="Народен представител" lead={<>Парламентарна група: {meta ? <Link href={`/parlament/partiya/${meta.slug}`}>{partyName(mp.party)}</Link> : partyName(mp.party)}{mp.pid ? <> · <a href={`https://www.parliament.bg/bg/MP/${mp.pid}`} target="_blank" rel="noreferrer">официален профил и снимка</a></> : null}</>}>
        <span className="inline-flex items-center gap-4"><PartyBadge p={mp.party} size={56} />{mp.name}</span>
      </Title>

      <div className="grid gap-6 lg:grid-cols-2 mb-12">
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

      {cases.length > 0 && (
        <section className="mb-12">
          <SectionTitle>Обвинения и присъди</SectionTitle>
          {cases.map((c) => (
            <div key={c.what} className="ring-2 ring-[#e08a2e] rounded-sm p-4 bg-white max-w-3xl text-[15px] mb-3">
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

      <section className="mb-12">
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
        <SectionTitle>Проверени твърдения</SectionTitle>
        {claims.length ? <div className="grid gap-3">{claims.map((c) => <ClaimCard key={c.id} c={c} />)}</div>
          : <p className="text-[15px] max-w-3xl">Още нямаме проверени твърдения на този депутат. Проверяваме конкретни публични твърдения с числа, по равно за всички (<Link href="/proverki">как работим</Link>). Рейтинг на истинност показваме само когато проверките са достатъчно, за да не подвеждат.</p>}
        <p className="text-sm text-muted mt-3">Доверие и одобрение: социологическите агенции публикуват доверие само към лидерите, не към всеки депутат. Където има данни, ще ги добавим с източник.</p>
      </section>

      <div className="grid gap-5 sm:grid-cols-3 mb-12">
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
        <SectionTitle>Последни гласувания</SectionTitle>
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
