import Link from "next/link";
import { Page, Title } from "@/components/ui";
import { Anchor } from "@/components/SectionNav";
import { LAWS } from "@/lib/laws";
import { VOTES } from "@/lib/parliament";
import { lawFromTitle } from "@/lib/voteExplain";

export const metadata = { title: "Твоето мнение за законите" };

export default function Mnenie() {
  // Само законите с редакторско обобщение и доводи на двете страни, които имат страница (гласувани в този парламент).
  const withPage = new Set(VOTES.map((v) => lawFromTitle(v.title)?.slug).filter(Boolean) as string[]);
  const last = (slug: string) => VOTES.filter((v) => lawFromTitle(v.title)?.slug === slug).reduce((m, v) => (v.date > m ? v.date : m), "");
  const laws = Object.entries(LAWS).filter(([slug, l]) => withPage.has(slug) && l.summary).map(([slug, l]) => ({ slug, l, d: last(slug) })).sort((a, b) => (a.d < b.d ? 1 : -1));
  return (
    <Page>
      <Title lead="Депутатите гласуват всеки закон. Тук можеш да кажеш и ти какво мислиш: „За“, „Против“ или „Не знам“. До всеки закон има обяснение с прости думи и доводите на двете страни.">Твоето мнение за законите</Title>
      <Anchor id="kak" title="Как работи">
        <ul className="list-disc pl-5 max-w-3xl text-[15px] space-y-1.5">
          <li>Един глас на човек: потвърждаваш имейла си с код веднъж. <b>Имейлът не се пази.</b> Пазим само необратим отпечатък, и той е различен за всеки закон, затова никой (и ние) не може да види кой как е гласувал.</li>
          <li>Резултатът се показва едва след като гласуваш, за да не влияе на избора. Гласа си можеш да промениш по всяко време.</li>
          <li>Това е мнението на хората, които са решили да гласуват тук, не представително проучване. До резултата стои броят гласували, а на страницата на закона точно под него е как са гласували групите в парламента.</li>
          <li>Когато законопроект е на обществено обсъждане, официалното становище се подава на <a href="https://www.strategy.bg" target="_blank" rel="noreferrer">strategy.bg</a>; там мнението се отчита от институцията.</li>
        </ul>
      </Anchor>
      <Anchor id="zakoni" title={`Закони (${laws.length})`}>
        <ul className="divide-y divide-rule border-y border-rule max-w-4xl">
          {laws.map(({ slug, l }) => (
            <li key={slug} className="py-3">
              <Link href={`/parlament/zakon/${slug}#mnenie`} className="font-semibold text-ink">{l.name}</Link>
              {l.status && <p className="text-sm text-muted">{l.status}</p>}
              <p className="text-[15px] mt-1 line-clamp-3">{l.summary}</p>
            </li>
          ))}
        </ul>
      </Anchor>
    </Page>
  );
}
