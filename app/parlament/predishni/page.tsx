import Link from "next/link";
import { Page, Title } from "@/components/ui";
import { PREV_LIST, PREV_NS, PREV_SOURCE } from "@/lib/parliamentPrev";

export const metadata = { title: "Предишните народни събрания", description: "Гласуванията на 49-ото, 50-ото и 51-вото Народно събрание по групи." };
const fmt = (d: string) => d.split("-").reverse().join(".");

export default function Predishni() {
  return (
    <Page>
      <Title back={{ href: "/parlament", label: "Парламент" }} kicker="Архив"
        lead="Как са гласували групите в предишните три парламента: законопроектите на първо четене, решенията и изборите. Подробните текстове на второ четене и процедурите не са включени.">
        Предишните народни събрания
      </Title>
      <ul className="grid gap-4 sm:grid-cols-3 mb-8">
        {PREV_LIST.map((n) => {
          const x = PREV_NS[n];
          const groups = new Set(x.mps.map((m) => m.party));
          return (
            <li key={n} className="ring-1 ring-rule rounded-sm p-5 bg-white">
              <p className="text-sm text-muted">{fmt(x.from)} – {fmt(x.to)}</p>
              <h2 className="display text-[1.8rem] leading-none mt-1">{n}-о Народно събрание</h2>
              <p className="text-[15px] mt-3"><b className="num">{x.total.toLocaleString("bg-BG")}</b> поименни гласувания, от тях <b className="num">{x.votes.length.toLocaleString("bg-BG")}</b> същински решения. {x.mps.length} депутати в {groups.size} групи.</p>
              <p className="mt-3"><Link href={`/parlament/predishni/${n}`} className="font-semibold">Гласуванията по групи</Link></p>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">Източник: {PREV_SOURCE}. Групата на депутата е последната известна в съответния парламент.</p>
    </Page>
  );
}
