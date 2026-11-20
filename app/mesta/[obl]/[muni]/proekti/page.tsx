import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MuniProjects } from "@/components/MuniProjects";
import { Page, Title } from "@/components/ui";
import { findOblastBySlug, muniSlug, oblastList } from "@/lib/regions";

export function generateStaticParams() {
  return oblastList().flatMap((o) => o.municipalities.map((m) => ({ obl: o.slug, muni: muniSlug(m.code) })));
}
export async function generateMetadata({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  const m = findOblastBySlug(obl)?.municipalities.find((x) => muniSlug(x.code) === muni);
  return { title: m ? `Проекти – община ${m.name}` : "Проекти на общината" };
}

// Всички проекти на общината от началото на мандата; на страницата на общината са първите по 8 във всяка група.
export default async function Proekti({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  const o = findOblastBySlug(obl);
  const m = o?.municipalities.find((x) => muniSlug(x.code) === muni);
  if (!o || !m) notFound();
  return (
    <Page>
      <Title back={{ href: `/mesta/${o.slug}/${muniSlug(m.code)}#proekti`, label: `Община ${m.name}` }} kicker="Проекти"
        lead="Всеки ремонт, строеж, доставка и услуга от началото на мандата: кой е решил, кой е възложил, кой изпълнява, за колко и докъде е стигнал.">
        Всички проекти на общината
      </Title>
      <Suspense fallback={<p className="text-muted">Зареждане на проектите…</p>}><MuniProjects code={m.code} full /></Suspense>
    </Page>
  );
}
