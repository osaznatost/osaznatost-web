import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MultiLine } from "@/components/Charts";
import { Page, SectionTitle, Title } from "@/components/ui";
import MPH from "@/data/mp-history.json";
import { localPeople, normFirm, personBySlug, personHref, type Official } from "@/lib/local";
import { firmUrl, fmtEur, placeSuppliersAll } from "@/lib/procurement";
import { muniSlug, oblastSlug } from "@/lib/regions";
import { casesFor, sanctionsFor } from "@/lib/sanctions";
import { MPS } from "@/lib/parliament";
import { tendersByContact } from "@/lib/projects";
import { PersonFirms } from "@/components/TrBox";
import { declLinksFor } from "@/lib/declLinks";
import { DeclLinks } from "@/components/DeclLinks";
import { firmsOfPerson, peopleOf, trMany } from "@/lib/tr";
import VERIFIED from "@/content/person-firms.json";

type Verified = { verified: string; by: string; eiks: string[] };
const verifiedFor = (code: string, slug: string) => (VERIFIED.people as Record<string, Verified>)[`${code}/${slug}`] ?? null;

// Предварително само кметовете; останалите ~6000 профила се правят при първо отваряне и се кешират.
export async function generateStaticParams() {
  return Object.entries(await localPeople()).filter(([, p]) => p[2] === "Кмет").map(([slug]) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await personBySlug((await params).slug);
  return { title: p ? `${p.o.name}, ${p.o.roleRaw.toLowerCase()}` : "Профил" };
}

const eur = (v?: number | null) => (v == null ? "–" : `${Math.round(v).toLocaleString("bg-BG")} €`);
const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();

async function StakeCheck({ code, o }: { code: string; o: Official }) {
  await connection();
  const stakes = o.decl?.stakes ?? [];
  const trFirms = await firmsOfPerson(o.name);
  const v = verifiedFor(code, o.slug);
  if (!stakes.length && trFirms.length) return (
    <div className="text-[15px] max-w-3xl space-y-2">
      <p className="bg-surface rounded-sm px-4 py-3">
        В последната декларация не са посочени дялове или управление на фирми, а в Търговския регистър {v ? "лицето е вписано" : "човек със същите три имена е вписан"} в <b>{trFirms.length}</b> {trFirms.length === 1 ? "фирма" : "фирми"} (вижте „Фирми по Търговския регистър“ по-долу).
        {v ? ` Самоличността е проверена от ${v.by} на ${v.verified.split("-").reverse().join(".")}.` : " Съвпадението е по име; възможно е да е друг човек."}
      </p>
      <p className="text-sm text-muted">Несъответствието е повод за въпрос, не доказателство за нарушение: някои участия (напр. прекратени преди периода на декларацията) не се декларират. Проверката на декларациите е на Комисията за противодействие на корупцията.</p>
    </div>
  );
  if (!stakes.length) return (
    <div className="text-[15px] max-w-3xl space-y-2">
      <p>В последната декларация не са посочени дялове или управление на фирми.</p>
      <p className="text-sm text-muted">
        Това е казаното в декларацията. Търговския регистър проверяваме само за фирмите, които имат договори по обществени поръчки,
        защото Агенцията по вписванията не предлага безплатно търсене по име на човек. Ако лицето участва във фирми без обществени поръчки,
        то няма да се види тук. Справка по име може да се направи в <a href="https://portal.registryagency.bg/CR/" target="_blank" rel="noreferrer">Търговския регистър</a>,
        а несъответствие между декларацията и регистъра може да се подаде като сигнал до Комисията за противодействие на корупцията, която проверява декларациите.
      </p>
    </div>
  );
  const sup = await placeSuppliersAll(code);
  const trs = await trMany(sup.map((x) => x.eik));
  return (
    <ul className="space-y-2 text-[15px]">{stakes.map((st, i) => {
      const n = normFirm(st.company);
      const hit = sup.find((x) => normFirm(x.name) === n || (n.length >= 6 && (normFirm(x.name).startsWith(n + " ") || n.startsWith(normFirm(x.name) + " "))));
      return (
        <li key={i} className={`ring-1 rounded-sm p-3 bg-white ${hit ? "ring-2 ring-red" : "ring-rule"}`}>
          <b>{st.company}</b>{st.share ? `, ${st.share}${/%/.test(st.share) ? "" : " дяла"}` : ""}{st.holder && norm(st.holder) !== norm(o.name) ? ` (на ${st.holder})` : ""}{st.office ? <span className="text-sm text-muted"> · седалище: {st.office}</span> : null}
          {hit ? (() => {
            const tr = trs.get(hit.eik.slice(0, 9)) ?? null, names = peopleOf(tr).map((p) => norm(p.name));
            const confirmed = names.includes(norm(o.name)) || (st.holder ? names.includes(norm(st.holder)) : false);
            return <p className="mt-1">{tr ? (confirmed ? "Потвърдено по Търговския регистър: " : "Фирма с почти същото име (в Търговския регистър деклараторът не фигурира в нея, възможно е да е друга фирма): ") : "Фирма с почти същото име: "}<Link href={firmUrl(hit.eik)}>{hit.name}</Link> има {hit.contracts} договора с възложители от общината за {fmtEur(hit.total_eur)}.{tr ? "" : " Проверете в Търговския регистър дали е същата фирма."}</p>;
          })()
            : <p className="text-sm text-muted mt-1">Не печели поръчки от възложители в общината (по име).</p>}
        </li>
      );
    })}</ul>
  );
}

export default function Lice({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<Page><p className="text-muted">Зареждане на профила…</p></Page>}><Body params={params} /></Suspense>;
}

async function Body({ params }: { params: Promise<{ slug: string }> }) {
  const p = await personBySlug((await params).slug);
  if (!p) notFound();
  const { o, L } = p;
  const code = L.code, obl = oblastSlug(code), muniHref = `/mesta/${obl}/${muniSlug(code)}`;
  const H = [...(o.history ?? (o.decl ? [o.decl] : []))].sort((a, b) => a.year - b.year);
  const mp = (MPH as { byName: Record<string, { ns: string[]; electedWith: string | null; group: string | null }> }).byName[norm(o.name)];
  const mpNow = MPS.find((m) => norm(m.name) === norm(o.name));
  const sanc = sanctionsFor(o.name), cases = casesFor(o.name);
  const colleagues = L.officials.filter((x) => x.slug !== o.slug && ["mayor", "deputy_mayor", "council_chair", "chief_architect"].includes(x.role));
  const d = o.decl;
  const proposed = (L.resolutions ?? []).filter((r) => r.rapporteur?.slug === o.slug);
  const [runs, ownFirms] = await Promise.all([tendersByContact(L.code, o.name), firmsOfPerson(o.name)]);
  return (
    <Page>
      <Title back={{ href: `${muniHref}#vlast`, label: `Местна власт: ${L.name ?? ""}` }} kicker={`${o.roleRaw} · ${L.name ?? ""}`}
        lead={<>{o.party ? <>Избран{o.role === "councillor" || o.role === "council_chair" ? " от листата на" : ", кандидат от"} <b>{o.party}</b>{o.prefVotes ? <> с {o.prefVotes} преференции</> : null} на местните избори през 2023 г. </> : null}Данните са от имуществените декларации в регистъра на Сметната палата и от изборите.</>}>
        {o.name}
      </Title>

      {(sanc || cases.length > 0) && (
        <section className="ring-2 ring-red rounded-sm p-4 bg-white mb-8 max-w-3xl text-[15px]">
          {sanc && <p><b>Санкции за корупция:</b> {sanc.allegation} <Link href="/proverki/sankcii">Подробно</Link></p>}
          {cases.map((c) => <p key={c.what}><b>{c.levelLabel}:</b> {c.what} {c.outcome}</p>)}
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-10">
        {[
          ["Доход за " + (d?.fiscalYear ?? "–"), eur(d?.income), d?.incomeSpouse ? `съпруг/а: ${eur(d.incomeSpouse)}` : "облагаем доход по декларация"],
          ["Имоти и МПС", d ? `${d.realEstate} · ${d.vehicles}` : "–", "брой имоти · брой превозни средства"],
          ["Пари в банки", eur(d?.bankEur), d?.receivableEur ? `дадени заеми: ${eur(d.receivableEur)}` : ""],
          ["Задължения", eur(d?.debtEur), "кредити и заеми"],
        ].map(([l, v, n]) => <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[2rem] mt-1">{v}</p><p className="text-xs text-muted">{n}</p></div>)}
      </section>

      {H.length > 1 && (
        <section className="mb-10">
          <SectionTitle>Доходи и имущество през годините</SectionTitle>
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white mb-4"><MultiLine data={[...H.map((h) => ({ series: "Доход", x: h.fiscalYear ?? h.year - 1, value: Math.round(h.income) })), ...H.map((h) => ({ series: "Пари в банки", x: h.fiscalYear ?? h.year - 1, value: Math.round(h.bankEur) })), ...H.map((h) => ({ series: "Задължения", x: h.fiscalYear ?? h.year - 1, value: Math.round(h.debtEur) }))]} unit=" €" height={260} /></div>
        </section>
      )}

      <section className="mb-10">
        <SectionTitle>Декларациите</SectionTitle>
        <div className="overflow-x-auto"><table className="w-full text-[15px] num">
          <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Подадена</th><th className="px-2">Длъжност</th><th className="text-right px-2">Доход</th><th className="text-right px-2">Съпруг/а</th><th className="text-right px-2">Имоти</th><th className="text-right px-2">В банки</th><th className="text-right px-2">Задължения</th><th className="px-2">Дялове</th></tr></thead>
          <tbody>{[...H].reverse().map((h) => (
            <tr key={h.url + h.year} className="border-b border-rule align-top">
              <td className="py-1.5 pr-3"><a href={h.url} target="_blank" rel="noreferrer">{h.year}</a></td>
              <td className="px-2 text-sm">{h.position}</td>
              <td className="text-right px-2">{eur(h.income)}</td><td className="text-right px-2">{eur(h.incomeSpouse)}</td>
              <td className="text-right px-2">{h.realEstate}</td><td className="text-right px-2">{eur(h.bankEur)}</td><td className="text-right px-2">{eur(h.debtEur)}</td>
              <td className="px-2 text-sm">{h.stakes.map((s) => s.company).join(", ") || "–"}</td>
            </tr>
          ))}</tbody></table></div>
        {d?.incomeBy && d.incomeBy.length > 0 && <p className="text-sm text-muted mt-2">Доходи по вид ({d.fiscalYear}): {d.incomeBy.map((i) => `${i.what}: ${eur(i.d)}${i.s ? ` (съпруг/а ${eur(i.s)})` : ""}`).join("; ")}.</p>}
      </section>

      <section className="mb-10">
        <SectionTitle>Дялове във фирми и поръчките на общината</SectionTitle>
        <Suspense fallback={<p className="text-muted">Проверка…</p>}><StakeCheck code={code} o={o} /></Suspense>
        {declLinksFor(o.name).length > 0 && <div className="mt-6"><h3 className="font-semibold mb-2">По декларациите за интереси: фирми с обществени поръчки в цялата страна</h3><DeclLinks items={declLinksFor(o.name)} mode="person" /></div>}
      </section>

      {proposed.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Внесени предложения в общинския съвет ({proposed.length})</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-3 max-w-3xl">Решения, приети по доклад на {o.name.split(" ")[0]}{proposed.some((r) => r.tally && r.tally.against > 0) ? `; ${proposed.filter((r) => r.tally && r.tally.against > 0).length} от тях са минали с гласове „против“` : ""}.</p>
          <ul className="space-y-1.5 text-[15px]">{[...proposed.filter((r) => r.tally && r.tally.against > 0), ...proposed.filter((r) => !(r.tally && r.tally.against > 0))].slice(0, 25).map((r) => (
            <li key={r.id}><span className="text-sm text-muted num">{r.date.split("-").reverse().join(".")} · № {r.number}</span> {r.title}{r.tally && <span className="text-sm num text-muted"> ({r.tally.for} за, <span className={r.tally.against ? "text-red" : ""}>{r.tally.against} против</span>, {r.tally.abstain} въздържали се)</span>}{r.url && <> · <a href={r.url} target="_blank" rel="noreferrer" className="text-sm">PDF</a></>}</li>
          ))}</ul>
          {proposed.length > 25 && <p className="text-sm mt-2"><Link href={`${muniHref}#resheniya`}>Всички решения на съвета</Link></p>}
        </section>
      )}

      {runs.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Води обществени поръчки ({runs.length})</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-3 max-w-3xl">Поръчки, в които е посочен(а) като лице за контакт на възложителя в обявленията в ЦАИС ЕОП. <Link href={`${muniHref}#proekti`}>Всички проекти на общината</Link>.</p>
          <ul className="space-y-1.5 text-[15px]">{runs.slice(0, 30).map((t) => <li key={t.id}>{t.title.replace(/^[„"]|[“"]$/g, "")}{t.suppliers.length ? <span className="text-sm text-muted"> → {t.suppliers.join(", ")}</span> : null}</li>)}</ul>
        </section>
      )}

      {ownFirms.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Фирми по Търговския регистър</SectionTitle>
          {verifiedFor(code, o.slug) ? <p className="text-sm text-muted -mt-3 mb-3 max-w-3xl">Връзката е проверена (не е само съвпадение по име). Данните за всяка фирма са от официалния Търговски регистър.</p>
            : <p className="text-sm text-muted -mt-3 mb-3 max-w-3xl">Съвпадение по трите имена в Търговския регистър; без ЕГН не може да се потвърди, че е същият човек.</p>}
          <PersonFirms name={o.name} verified={!!verifiedFor(code, o.slug)} />
        </section>
      )}

      {(mp || mpNow) && (
        <section className="mb-10 max-w-3xl">
          <SectionTitle>В Народното събрание</SectionTitle>
          <p className="text-[15px]">Човек със същото име е бил народен представител{mp ? <> в {mp.ns.join(", ")}-о Народно събрание{mp.electedWith ? `, избран от ${mp.electedWith}` : ""}</> : null}.{mpNow && <> <Link href={`/parlament/deputat/${mpNow.id}`}>Профил в сегашния парламент</Link>.</>}</p>
          <p className="text-xs text-muted">Съвпадението е по трите имена. Възможно е да са различни хора.</p>
        </section>
      )}

      <section className="mb-10">
        <SectionTitle>Ръководството на общината</SectionTitle>
        <ul className="flex flex-wrap gap-2 text-[15px]">{colleagues.map((c) => <li key={c.slug}><Link href={personHref(c.slug)} className="block px-3 py-1.5 rounded-full bg-surface no-underline text-ink hover:ring-1 hover:ring-green">{c.name} <span className="text-sm text-muted">· {c.roleRaw.toLowerCase()}</span></Link></li>)}</ul>
        <p className="text-[15px] mt-3"><Link href={`${muniHref}#vlast`}>Всички съветници, гласувания и конфликт на интереси</Link> · <Link href={muniHref}>Профил на общината</Link></p>
      </section>
      <p className="text-xs text-muted">Източници: регистър на декларациите (Сметна палата), избори 2023 (ЦИК), ЦАИС ЕОП, обработени от „Наясно“. Ако нещо липсва или е грешно, данните се обновяват всеки ден.</p>
    </Page>
  );
}
