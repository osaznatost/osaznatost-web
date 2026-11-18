import type { Metadata } from "next";
import { Page, Title } from "@/components/ui";
import { GLOSSARY } from "@/lib/glossary";

export const metadata: Metadata = { title: "Речник" };

export default function Rechnik() {
  const groups = [...new Set(Object.values(GLOSSARY).map((g) => g.group))];
  return (
    <Page narrow>
      <Title lead="Думите, които срещате в сайта, обяснени накратко. В текста те са подчертани с точки: натиснете ги за обяснение.">Речник</Title>
      {groups.map((gr) => (
        <section key={gr} className="mb-10">
          <h2 className="display text-[2rem] leading-none mb-3">{gr}</h2>
          <dl className="divide-y divide-rule border-y border-rule">
            {Object.entries(GLOSSARY).filter(([, g]) => g.group === gr).map(([k, g]) => (
              <div key={k} id={k} className="py-3 scroll-mt-24 target:bg-surface">
                <dt className="font-semibold">{g.term}</dt>
                <dd className="text-[15px] text-muted mt-0.5">{g.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </Page>
  );
}
