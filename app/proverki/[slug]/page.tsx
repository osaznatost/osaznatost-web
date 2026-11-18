import { notFound } from "next/navigation";
import Link from "next/link";
import { ClaimCard } from "@/components/ClaimCard";
import { Page, SectionTitle, Title } from "@/components/ui";
import { CLAIMS, DOSSIERS, dossier } from "@/lib/checks";
import { formatDate } from "@/lib/parliament";

export function generateStaticParams() { return DOSSIERS.filter((d) => d.slug !== "dalg-2026").map((d) => ({ slug: d.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { return { title: `Проверка: ${dossier((await params).slug)?.title ?? ""}` }; }

export default async function Proverka({ params }: { params: Promise<{ slug: string }> }) {
  const d = dossier((await params).slug);
  if (!d) notFound();
  const claims = CLAIMS.filter((c) => c.dossier === d.slug);
  const people = [...new Set(claims.map((c) => c.who))];
  return (
    <Page narrow>
      <Title back={{ href: "/proverki", label: "Всички проверки" }} kicker={`Проверка · ${formatDate(d.date)}`} lead={d.lead}>{d.title}</Title>
      <section className="mb-10">
        <SectionTitle>Накратко</SectionTitle>
        <ul className="list-disc pl-5 space-y-2 text-[16px]">{d.summary.map((s) => <li key={s}>{s}</li>)}</ul>
        {d.facts && (
          <div className="overflow-x-auto mt-5"><table className="w-full text-[15px] num">
            <tbody>{d.facts.map(([k, v, src]) => <tr key={k} className="border-b border-rule"><td className="py-1.5 pr-3">{k}</td><td className="px-2 text-right font-semibold">{v}</td><td className="px-2 text-sm">{src ? <a href={src} target="_blank" rel="noreferrer">източник</a> : null}</td></tr>)}</tbody>
          </table></div>)}
        {d.stat && <p className="text-[15px] mt-3">Данните във времето: <Link href={`/statistiki/${d.stat}`}>показателят в статистиките</Link>.</p>}
      </section>
      {people.map((p) => (
        <section key={p} className="mb-10">
          <SectionTitle>{p}</SectionTitle>
          <div className="grid gap-3">{claims.filter((c) => c.who === p).map((c) => <ClaimCard key={c.id} c={c} showContext={false} />)}</div>
        </section>
      ))}
    </Page>
  );
}
