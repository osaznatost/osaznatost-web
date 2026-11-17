import { notFound } from "next/navigation";
import Link from "next/link";
import { ClaimCard } from "@/components/ClaimCard";
import { Page, SectionTitle, Title } from "@/components/ui";
import { CLAIMS, dossier } from "@/lib/checks";
import { formatDate } from "@/lib/parliament";

export const metadata = { title: "Проверка: дългът" };

export default function Proverka() {
  const d = dossier("dalg-2026");
  if (!d) notFound();
  const claims = CLAIMS.filter((c) => c.dossier === d.slug);
  const people = [...new Set(claims.map((c) => c.who))];
  return (
    <Page narrow>
      <Title back={{ href: "/proverki", label: "Всички проверки" }} kicker={`Проверка · ${formatDate(d.date)}`} lead={d.lead}>{d.title}</Title>
      <section className="mb-10">
        <SectionTitle>Накратко</SectionTitle>
        <ul className="list-disc pl-5 space-y-2 text-[16px]">{d.summary.map((s) => <li key={s}>{s}</li>)}</ul>
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
