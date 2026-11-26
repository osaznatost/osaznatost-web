import { MuniTaxes } from "@/components/MuniTaxes";
import { MuniElections } from "@/components/MuniElections";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MultiLine } from "@/components/Charts";
import { Page, SectionTitle, Title } from "@/components/ui";
import { quarterLabel } from "@/lib/places";
import { findOblastBySlug, muniElection, muniFinance, muniFunds, muniSlug, oblastList, placeHref } from "@/lib/regions";
import { FIN_SOURCE } from "@/lib/places";
import { fmt } from "@/lib/stats";
import { SettlementMap } from "@/components/SettlementMap";
import { AGE, EDU, placeData, placeObl, share } from "@/lib/place";
import { Suspense } from "react";
import { Anchor, SectionNav } from "@/components/SectionNav";
import { AuditsList } from "@/components/AuditsList";
import { auditsOfMuni } from "@/lib/audits";
import { MuniPower } from "@/components/MuniPower";
import { CouncilCoverage } from "@/components/CouncilCoverage";
import { MuniLinks } from "@/components/PersonLinks";
import { Changes } from "@/components/Changes";
import { MuniProjects } from "@/components/MuniProjects";
import { PlaceProcurement } from "@/components/PlaceProcurement";

export function generateStaticParams() {
  return oblastList().flatMap((o) => o.municipalities.map((m) => ({ obl: o.slug, muni: muniSlug(m.code) })));
}
export async function generateMetadata({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  const m = findOblastBySlug(obl)?.municipalities.find((x) => muniSlug(x.code) === muni);
  return { title: m ? `Община ${m.name}` : "Община" };
}
const mn = (v?: number | null) => (v == null ? "–" : `${fmt(v / 1e6, 2)} млн. €`);

export default async function MuniPage({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  const o = findOblastBySlug(obl);
  const m = o?.municipalities.find((x) => muniSlug(x.code) === muni);
  if (!o || !m) notFound();
  const f = muniFunds(m.code), fin = muniFinance(m.code), el = muniElection(m.code);
  const towns = m.settlements.filter((s) => s[2] === 0), villages = m.settlements.length - towns.length;
  const hist = fin?.history ?? [];
  const finData = [
    ...hist.filter((h) => h.revenue != null).map((h) => ({ series: "Собствени приходи", x: h.year, value: Math.round(h.revenue! / 1e5) / 10 })),
    ...hist.filter((h) => h.expenditure != null).map((h) => ({ series: "Разходи", x: h.year, value: Math.round(h.expenditure! / 1e5) / 10 })),
    ...hist.filter((h) => h.debt != null).map((h) => ({ series: "Дълг", x: h.year, value: Math.round(h.debt! / 1e5) / 10 })),
  ];
  const [P, PO, audits] = await Promise.all([placeData(m.code), placeObl(), auditsOfMuni(m.code)]);
  const C = P?.census, OC = PO.oblasts[m.code.slice(0, 3)], BG = PO.country;
  const names = Object.fromEntries(m.settlements.map(([ek, name, t]) => [ek, { name, town: t === 0 }]));
  const pc = (part: number | undefined, total: number) => (part == null ? "–" : `${fmt(share(part, total), 1)}%`);

  return (
    <Page>
      <Title back={{ href: `/mesta/${o.slug}`, label: `Област ${o.name}` }} kicker="Община" lead={`${towns.length ? `Градове: ${towns.map((t) => t[1]).join(", ")}. ` : ""}${villages} села.${f?.pop ? ` ${f.pop.toLocaleString("bg-BG")} жители.` : ""}`}>{m.name}</Title>

      <SectionNav items={[["pari", "Пари"], ["savet", "Общински съвет"], ["danaci", "Местни данъци"], ["hora", "Хората"], ["naseleni", "Населени места"], ["vlast", "Местна власт"], ["proekti", "Проекти"], ...(audits.length ? [["oditi", "Одити"] as [string, string]] : []), ["porachki", "Поръчки"], ["izbori", "Избори"], ["mestni-izbori", "Местни избори"]]} />
      <div id="pari" className="scroll-mt-32 lg:scroll-mt-20" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Собствени приходи на общината</p><p className="display text-[2.2rem]">{mn(fin?.revenue)}</p><p className="text-xs text-muted">{fin ? quarterLabel(fin.period) : ""}</p></div>
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Дълг на общината</p><p className="display text-[2.2rem]">{mn(fin?.debt)}</p><p className="text-xs text-muted">{fin?.arrears ? `просрочени задължения: ${mn(fin.arrears)}` : "без просрочени задължения"}</p></div>
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Евросредства (договорени)</p><p className="display text-[2.2rem]">{mn(f?.total)}</p><p className="text-xs text-muted">{f ? `${f.contracts} договора, изплатени ${mn(f.paid)}` : ""}</p></div>
        <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Евросредства на човек</p><p className="display text-[2.2rem]">{f ? `${Math.round(f.perCapita).toLocaleString("bg-BG")} €` : "–"}</p></div>
      </div>


      <section id="savet" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
        <CouncilCoverage codes={[m.code]} title={`Общински съвет – ${m.name}: решения и гласувания`} />
      </section>

      <MuniTaxes code={m.code} />

      {C && (
        <section id="hora" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
          <SectionTitle>Хората</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Преброяване 2021 г. (НСИ). Сравнение с областта и страната.</p>
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="font-semibold mb-2">Възраст</h3>
              <table className="w-full text-[15px] num"><thead><tr className="text-sm text-muted text-left"><th></th><th className="text-right">{m.name}</th><th className="text-right">Област</th><th className="text-right">България</th></tr></thead>
                <tbody>{AGE.map(([k, l]) => (
                  <tr key={k} className="border-t border-rule"><td className="py-1">{l} г.</td><td className="text-right font-semibold">{pc(C.age[k], C.population)}</td><td className="text-right text-muted">{OC ? pc(OC.age[k], OC.population) : "–"}</td><td className="text-right text-muted">{pc(BG.age[k], BG.population)}</td></tr>
                ))}</tbody></table>
              <p className="text-sm mt-2">Над 65 години на всяко дете до 14: <b>{fmt(C.age.age65plus / C.age.age0_14, 2)}</b> (страната: {fmt(BG.age.age65plus / BG.age.age0_14, 2)}).</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Образование (над 7 г.)</h3>
              {(() => { const t = EDU.reduce((a, [k]) => a + (C.education[k] ?? 0), 0), tb = EDU.reduce((a, [k]) => a + (BG.education[k] ?? 0), 0), to = OC ? EDU.reduce((a, [k]) => a + (OC.education[k] ?? 0), 0) : 0; return (
                <table className="w-full text-[15px] num"><thead><tr className="text-sm text-muted text-left"><th></th><th className="text-right">{m.name}</th><th className="text-right">Област</th><th className="text-right">България</th></tr></thead>
                  <tbody>{EDU.map(([k, l]) => (
                    <tr key={k} className="border-t border-rule"><td className="py-1">{l}</td><td className="text-right font-semibold">{pc(C.education[k], t)}</td><td className="text-right text-muted">{OC ? pc(OC.education[k], to) : "–"}</td><td className="text-right text-muted">{pc(BG.education[k], tb)}</td></tr>
                  ))}</tbody></table>); })()}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Работа</h3>
              <table className="w-full text-[15px] num"><thead><tr className="text-sm text-muted text-left"><th></th><th className="text-right">{m.name}</th><th className="text-right">Област</th></tr></thead>
                <tbody>{([["activityRate", "Икономически активни"], ["employmentRate", "Заети"], ["unemploymentRate", "Безработни (от активните)"]] as const).map(([k, l]) => (
                  <tr key={k} className="border-t border-rule"><td className="py-1">{l}</td><td className="text-right font-semibold">{fmt(C.employment[k], 1)}%</td><td className="text-right text-muted">{OC ? `${fmt(OC.employment[k], 1)}%` : "–"}</td></tr>
                ))}</tbody></table>
              <p className="text-sm mt-2">Мъже {fmt(share(C.gender.male, C.population), 1)}%, жени {fmt(share(C.gender.female, C.population), 1)}%.</p>
            </div>
          </div>
          {C.ethnic && (
            <details className="mt-4 text-[15px]"><summary className="cursor-pointer font-semibold text-green">Етническа група и вероизповедание (по самоопределяне)</summary>
              <p className="mt-2">{Object.entries({ bulgarian: "българска", turkish: "турска", roma: "ромска", other: "друга" }).map(([k, l]) => `${l}: ${pc(C.ethnic![k], C.population)}`).join(" · ")} · не са отговорили или не е известно: {pc((C.ethnic.dontWantAnswer ?? 0) + (C.ethnic.unknown ?? 0) + (C.ethnic.cantDetermine ?? 0), C.population)}</p>
              {C.religion && <p className="mt-1">{Object.entries({ christian: "християнско", muslim: "мюсюлманско", noReligion: "без вероизповедание" }).map(([k, l]) => `${l}: ${pc(C.religion![k], C.population)}`).join(" · ")}</p>}
              <p className="text-sm text-muted mt-1">Отговорът е доброволен. Показваме официалните данни без тълкуване.</p>
            </details>
          )}
        </section>
      )}

      {P?.map && (
        <section id="naseleni" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
          <SectionTitle>Населените места</SectionTitle>
          <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><SettlementMap geo={P.map} names={names} /></div>
          <p className="text-sm text-muted mt-2">Землищата на {m.settlements.length} населени места. В тъмно са градовете.</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[15px] mt-3">{[...m.settlements].sort((a, b) => a[2] - b[2] || a[1].localeCompare(b[1], "bg")).map(([ek, n, v]) => <li key={ek}><Link href={placeHref.settlement(m.code, ek)}>{v ? "с." : "гр."} {n}</Link></li>)}</ul>
        </section>
      )}

      {P?.transfers && P.transfers.length > 1 && (() => {
        const T = P.transfers, last = T[T.length - 1], prev = T[T.length - 2], first = T[0];
        const perCap = C ? last.total / C.population : null;
        const series = [["delegated", "Делегирани дейности (училища, детски градини, социални)"], ["equalization", "Изравнителна субсидия"], ["capital", "За ремонти и строителство"], ["total", "Общо"]] as const;
        return (
          <section className="mb-12">
            <SectionTitle>Пари от държавата</SectionTitle>
            <p className="text-[15px] -mt-2 mb-4 max-w-3xl">По закона за бюджета за {last.year} г. общината получава <b>{mn(last.total)}</b>{perCap ? <> ({Math.round(perCap).toLocaleString("bg-BG")} € на жител)</> : null}, {last.total >= prev.total ? "с" : "със"} {fmt(Math.abs((last.total - prev.total) / prev.total) * 100, 1)}% {last.total >= prev.total ? "повече" : "по-малко"} от {prev.year} г. и {fmt(last.total / first.total, 1)} пъти повече от {first.year} г. Най-голямата част са <b>делегираните дейности</b>: заплати в училищата, детските градини и социалните услуги. Те се плащат по единни стандарти и общината не може да ги пренасочва.</p>
            <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><MultiLine data={series.flatMap(([k, l]) => T.map((t) => ({ series: l, x: t.year, value: Math.round(t[k] / 1e4) / 100 })))} yLabel="млн. €" height={300} /></div>
            <p className="text-xs text-muted mt-2">Закон за държавния бюджет, трансфери за общините (обща субсидия за делегирани дейности, изравнителна субсидия, капиталови разходи, зимно поддържане), обработени от „Наясно“.</p>
          </section>
        );
      })()}

      {P?.ipop && P.ipop.projects.length > 0 && (
        <section className="mb-12">
          <SectionTitle>Държавни инвестиции в общината</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Инвестиционна програма за общински проекти ({P.ipop.year}): пари от държавния бюджет през Регионалното министерство (МРРБ), с участие на общината. Договорени {mn(P.ipop.rollup.agreementEur)}, изплатени {mn(P.ipop.rollup.paidEur)} ({fmt(P.ipop.rollup.paidPct, 0)}%). Знакът „под 5% изплатени“ е за проекти с договор над 100 000 €, по които почти още няма плащане. Това е повод за въпрос, не доказателство, че проектът е спрян: често работата просто още не е започнала или не е отчетена.</p>
          <ul className="divide-y divide-rule border-y border-rule text-[15px]">{[...P.ipop.projects].sort((a, b) => b.agreement - a.agreement).map((p) => (
            <li key={p.id} className="py-2 grid sm:grid-cols-[1fr_9rem_9rem] gap-x-4">
              <span><Link href={`/mesta/${o.slug}/${muniSlug(m.code)}/investicii/${encodeURIComponent(p.id)}`}>{p.description}</Link>{p.stalled && <span title="Договорени над 100 000 €, изплатени под 5%. Не значи, че проектът е официално спрян." className="text-xs font-semibold text-ink bg-surface ring-1 ring-rule rounded-full px-2 py-0.5 ml-2">под 5% изплатени</span>}<span className="block text-xs text-muted">{p.id}{p.paid > 0 ? ` · платени от държавата ${mn(p.state)}, от общината ${mn(p.muni)}` : ""}</span></span>
              {p.agreement > 0 ? <>
                <span className="num text-right">{mn(p.agreement)}<span className="block text-xs text-muted">договорени</span></span>
                <span className="num text-right">{fmt(p.pct, 0)}%<span className="block text-xs text-muted">{p.pct === 0 ? "още без плащане" : "изплатени"}</span></span>
              </> : <span className="sm:col-span-2 text-right text-sm text-muted">одобрен в програмата, още без споразумение и без плащания</span>}
            </li>
          ))}</ul>
          <p className="text-xs text-muted mt-2">Източник: МРРБ, Инвестиционна програма за общински проекти, обработени от „Наясно“. Изпълнителите на тези ремонти са в <a href="#porachki">поръчките на общината</a>.</p>
        </section>
      )}

      <Anchor id="vlast" title="Местна власт" lead="Кой управлява общината, какво е декларирал, дали има дялове във фирми, които печелят поръчки, и как гласува общинският съвет.">
        <MuniPower code={m.code} />
        <MuniLinks code={m.code} />
      </Anchor>

      <Anchor id="promeni" title="Какво се промени" lead="Последните 180 дни: анекси, които вдигат цената, подизпълнители и решения на съвета за наем, продажба, концесия и право на строеж върху общинско имущество. Червената точка значи свързана фирма.">
        <Suspense fallback={<p className="text-muted">Зареждане…</p>}><Changes code={m.code} days={180} /></Suspense>
      </Anchor>

      <Anchor id="proekti" title="Проекти" lead="Всеки ремонт, строеж, доставка и услуга от началото на мандата: кой е решил, кой е възложил, кой изпълнява, за колко и до кога, анексите и кой приема работата.">
        <Suspense fallback={<p className="text-muted">Зареждане на проектите…</p>}><MuniProjects code={m.code} /></Suspense>
      </Anchor>

      {audits.length > 0 && (
        <section id="oditi" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
          <SectionTitle>Проверки на Сметната палата</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Одитните доклади, в които е проверявана общината. В тях са констатациите и препоръките; при съмнение за престъпление Сметната палата сезира прокуратурата.</p>
          <AuditsList items={audits} />
        </section>
      )}

      {fin && (
        <section className="mb-12">
          <SectionTitle>Бюджетът на общината</SectionTitle>
          <ul className="list-disc pl-5 text-[15px] space-y-1 mb-4 max-w-3xl">
            {fin.ownShare != null && fin.revenue != null && <li>Собствените приходи (местни данъци, такси, наеми) са <b>{fmt(fin.ownShare, 0)}%</b> от всички приходи, които са около {mn(fin.revenue / (fin.ownShare / 100))} за {quarterLabel(fin.period)}. Останалото идва от държавата и ЕС.</li>}
            {fin.wageShare != null && <li>Заплатите са {fmt(fin.wageShare, 0)}% от разходите.</li>}
            {fin.recovery && <li><b>Общината е в процедура за финансово оздравяване.</b></li>}
          </ul>
          {finData.length > 0 && <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><p className="font-semibold mb-2">По години, млн. €</p><MultiLine data={finData} yLabel="млн. €" height={280} /></div>}
          <p className="text-xs text-muted mt-2">{FIN_SOURCE}.</p>
        </section>
      )}

      {el && (
        <section id="izbori" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
          <SectionTitle>Как гласува на 19 април 2026 г.</SectionTitle>
          <p className="text-[15px] text-muted -mt-3 mb-4">Избирателна активност: {el.turnout ? `${fmt(el.turnout, 1)}%` : "–"} ({el.voted.toLocaleString("bg-BG")} от {el.reg.toLocaleString("bg-BG")}).</p>
          <ul className="space-y-2 max-w-3xl">{el.lists.map((l) => (
            <li key={l.ballot} className="text-[15px]"><div className="flex justify-between"><Link href={`/parlament/partiya/${l.slug}`}>{l.name}</Link><span className="num">{fmt(l.pct, 1)}% · {l.votes.toLocaleString("bg-BG")}</span></div>
              <div className="h-2 rounded-full bg-surface mt-1"><div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: l.color }} /></div></li>
          ))}</ul>
          <p className="text-xs text-muted mt-2">Показани са листите, влезли в парламента. Процентите са от гласовете за партии.</p>
        </section>
      )}

      <MuniElections code={m.code} />

      <Anchor id="porachki" title="Обществени поръчки">
        <Suspense fallback={<p className="text-muted">Зареждане на поръчките…</p>}><PlaceProcurement f={{ oblast: o.name, obshtina: m.code }} /></Suspense>
      </Anchor>
    </Page>
  );
}
