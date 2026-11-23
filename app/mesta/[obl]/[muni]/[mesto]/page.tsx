import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlaceProcurement } from "@/components/PlaceProcurement";
import { ContractList } from "@/components/proc";
import { Anchor, SectionNav } from "@/components/SectionNav";
import { Page, Title } from "@/components/ui";
import { localData, personHref } from "@/lib/local";
import { findSettlement } from "@/lib/places";
import { fmtDate, fmtEur, muniContracts } from "@/lib/procurement";
import { findOblastBySlug, muniSlug, oblastList, placeHref } from "@/lib/regions";

// Предварително само градовете; селата се правят при първо отваряне.
export function generateStaticParams() {
  return oblastList().flatMap((o) => o.municipalities.flatMap((m) => m.settlements.filter((s) => !s[2]).map((s) => ({ obl: o.slug, muni: muniSlug(m.code), mesto: s[0] }))));
}
export async function generateMetadata({ params }: { params: Promise<{ mesto: string }> }) {
  const s = findSettlement((await params).mesto);
  return { title: s ? `${s.isVillage ? "с." : "гр."} ${s.name}` : "Населено място" };
}

const low = (x: string) => x.toLowerCase();
const mentions = (text: string, name: string) => new RegExp(`(^|[^а-я])(с\\.|гр\\.|село|град)?\\s*${low(name)}([^а-я]|$)`).test(low(text));

async function Projects({ code, name }: { code: string; name: string }) {
  await connection(); // при отваряне, не при сглобяване: иначе сборката тегли хиляди заявки към базата
  const cs = (await muniContracts(code, "2020-01-01")).filter((c) => mentions(c.tender_name, name));
  if (!cs.length) return <p className="text-[15px]">Няма договори на общината, в чийто предмет се споменава {name}.</p>;
  const total = cs.reduce((a, c) => a + (c.contract_value_eur ?? 0), 0);
  return (<>
    <p className="text-[15px] mb-4"><b>{cs.length}</b> договора за <b>{fmtEur(total)}</b>, в чийто предмет е посочено {name}. Отворете договор, за да видите целия път: решение, възлагане, изпълнител, анекси, приемане.</p>
    <ContractList items={cs.slice(0, 60)} />
  </>);
}

async function Body({ params }: { params: Promise<{ obl: string; muni: string; mesto: string }> }) {
  const { obl, mesto } = await params;
  const o = findOblastBySlug(obl);
  const s = findSettlement(mesto);
  if (!o || !s) notFound();
  const L = await localData(s.code);
  const label = `${s.isVillage ? "с." : "гр."} ${s.name}`;
  const res = (L?.resolutions ?? []).filter((r) => mentions(`${r.title} ${r.text ?? ""}`, s.name));
  const kmet = (L?.resolutions ?? []).map((r) => r.rapporteur).find((r) => r && new RegExp(`кметство\\s+(с\\.|гр\\.)?\\s*${low(s.name)}`).test(r.role));
  const mayor = L?.officials.find((x) => x.role === "mayor");
  return (
    <Page>
      <Title back={{ href: placeHref.muni(s.code), label: `Община ${s.municipality}` }} kicker={`Община ${s.municipality}, област ${s.oblast}`}
        lead={<>Всичко, което данните казват за {label}: кой управлява, какво решава общинският съвет за мястото, кои проекти и поръчки го засягат. За хората, бюджета и изборите виж <Link href={placeHref.muni(s.code)}>общината</Link>.</>}>
        {label}
      </Title>
      <SectionNav items={[["vlast", "Кой управлява"], ["resheniya", `Решения на съвета (${res.length})`], ["proekti", "Проекти"], ["porachki", "Поръчки"]]} />

      <Anchor id="vlast" title="Кой управлява">
        <ul className="text-[15px] space-y-1">
          {kmet && <li>Кмет на кметството: <b>{kmet.slug ? <Link href={personHref(kmet.slug)}>{kmet.name}</Link> : kmet.name}</b> (по решенията на общинския съвет).</li>}
          {mayor && <li>Кмет на общината: <Link href={personHref(mayor.slug)}>{mayor.name}</Link>.</li>}
          <li><Link href={placeHref.muni(s.code, "vlast")}>Заместник-кметове, съветници, декларации и конфликт на интереси</Link></li>
        </ul>
      </Anchor>

      <Anchor id="resheniya" title="Решения на общинския съвет" lead={`Решения, в които се споменава ${s.name}.`}>
        {res.length ? (
          <ul className="space-y-2 text-[15px]">{res.slice(0, 60).map((r) => (
            <li key={r.id} className="ring-1 ring-rule rounded-sm p-3 bg-white">
              <p className="text-sm text-muted">{fmtDate(r.date)} · решение № {r.number}{r.result === "rejected" ? " · отхвърлено" : ""}</p>
              <p>{r.title}</p>
              {r.rapporteur && <p className="text-sm text-muted">Внася: {r.rapporteur.slug ? <Link href={personHref(r.rapporteur.slug)}>{r.rapporteur.name}</Link> : r.rapporteur.name}, {r.rapporteur.role}</p>}
              {r.tally && <p className="text-sm num">За {r.tally.for} · против {r.tally.against} · въздържали се {r.tally.abstain}{r.url && <> · <a href={r.url} target="_blank" rel="noreferrer">PDF</a></>}</p>}
            </li>
          ))}</ul>
        ) : <p className="text-[15px]">{L?.resolutions?.some((r) => r.text) ? `Няма решения, в които да се споменава ${s.name}.` : "За тази община още не четем решенията на съвета."}</p>}
      </Anchor>

      <Anchor id="proekti" title="Проекти за мястото" lead="Договорите на общината и нейните звена, в чийто предмет е посочено това място.">
        <Suspense fallback={<p className="text-muted">Зареждане…</p>}><Projects code={s.code} name={s.name} /></Suspense>
      </Anchor>

      <Anchor id="porachki" title="Поръчки на възложители оттук" lead="Договорите на училищата, градините, кметството и другите възложители със седалище в това населено място.">
        <Suspense fallback={<p className="text-muted">Зареждане…</p>}><PlaceProcurement f={{ oblast: s.oblast, obshtina: s.code, mesto: s.ekatte }} showBreakdown={false} /></Suspense>
      </Anchor>
    </Page>
  );
}

export default function Mesto({ params }: { params: Promise<{ obl: string; muni: string; mesto: string }> }) {
  return <Suspense fallback={<Page><p className="text-muted">Зареждане…</p></Page>}><Body params={params} /></Suspense>;
}
