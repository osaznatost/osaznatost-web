import Link from "next/link";
import raw from "@/content/promises.json";
import { Page, SectionTitle, Title } from "@/components/ui";
import { formatDate } from "@/lib/parliament";

type Status = "kept" | "in_progress" | "not_met" | "broken" | "not_assessed";
type Promise_ = {
  text: string; area: string; said: { who: string; when: string; url: string }; status: Status;
  evidence: string; links: { title: string; url: string }[];
};
const data = raw as { updated: string; parties: { party: string; name: string; role: string; programme: { title: string; url: string }[]; promises: Promise_[] }[] };

const STATUS: Record<Status, { label: string; color: string; text: string }> = {
  kept: { label: "Спазено досега", color: "#2f9e6a", text: "#fff" },
  in_progress: { label: "В процес", color: "#e2b33b", text: "#16201b" },
  not_met: { label: "Засега не е изпълнено", color: "#d2353f", text: "#fff" },
  broken: { label: "Нарушено", color: "#7a1e26", text: "#fff" },
  not_assessed: { label: "Още не е проверено", color: "#cfd8d2", text: "#16201b" },
};
const ORDER: Status[] = ["kept", "in_progress", "not_met", "broken", "not_assessed"];

export const metadata = { title: "Обещано и изпълнено" };

export default function Obeshtaniya() {
  return (
    <Page>
      <Title lead="Какво обещават партиите и какво правят, след като получат власт. Всяко обещание има източник, а всяка оценка има доказателство.">
        Обещано и изпълнено
      </Title>

      {data.parties.map((p) => {
        const counts = ORDER.map((s) => ({ s, n: p.promises.filter((x) => x.status === s).length })).filter((x) => x.n);
        return (
          <section key={p.party} className="mb-14">
            <SectionTitle>{p.name}</SectionTitle>
            <p className="text-[15px] text-muted max-w-3xl -mt-2 mb-5">{p.role}</p>

            <div className="bg-surface rounded-xl p-5 mb-6">
              <div className="flex h-4 rounded-full overflow-hidden">
                {counts.map(({ s, n }) => <div key={s} style={{ width: `${(n / p.promises.length) * 100}%`, background: STATUS[s].color }} />)}
              </div>
              <p className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
                {counts.map(({ s, n }) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: STATUS[s].color }} />{STATUS[s].label}: <b className="num">{n}</b>
                  </span>
                ))}
              </p>
              <p className="text-sm text-muted mt-3">
                Проследяваме {p.promises.length} обещания, избрани заради това, че могат да се измерят. Това не са всички обещания на партията и съотношението не е оценка за цялото управление.
              </p>
            </div>

            <ul className="grid gap-4 lg:grid-cols-2">
              {p.promises.map((x) => (
                <li key={x.text} className="rounded-xl ring-1 ring-rule bg-white p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-muted">{x.area}</p>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: STATUS[x.status].color, color: STATUS[x.status].text }}>{STATUS[x.status].label}</span>
                  </div>
                  <p className="display text-[1.7rem] mt-2">{x.text}</p>
                  <p className="text-sm text-muted mt-1">Обещал: <a href={x.said.url} target="_blank" rel="noreferrer">{x.said.who}, {x.said.when}</a></p>
                  <p className="text-[15px] mt-3">{x.evidence}</p>
                  {x.links.length > 0 && (
                    <p className="text-sm mt-auto pt-3 flex flex-wrap gap-x-4 gap-y-1">
                      {x.links.map((l) => l.url.startsWith("/")
                        ? <Link key={l.url} href={l.url}>{l.title}</Link>
                        : <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.title}</a>)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted mt-4">
              Програми: {p.programme.map((s, i) => <span key={s.url}>{i > 0 && "; "}<a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></span>)}. Проверено: {formatDate(data.updated)}.
            </p>
          </section>
        );
      })}

      <section className="max-w-3xl text-[15px]">
        <SectionTitle>Как оценяваме</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Спазено досега</b>: няма действие срещу обещанието и има поне един документ, който го потвърждава.</li>
          <li><b>В процес</b>: има внесен или приет акт, но резултатът още не е постигнат.</li>
          <li><b>Засега не е изпълнено</b>: официалните данни показват обратното на обещаното за текущия период.</li>
          <li><b>Нарушено</b>: управляващите са приели решение, което прави обещанието неизпълнимо.</li>
          <li>Започваме с управляващата партия, защото тя има властта да изпълни обещанията си. Следват опозиционните партии: как гласуват спрямо това, което са заявили.</li>
        </ul>
      </section>
    </Page>
  );
}
