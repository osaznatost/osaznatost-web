import Link from "next/link";
import raw from "@/content/promises.json";
import { Page, SectionTitle, Title } from "@/components/ui";
import { formatDate } from "@/lib/parliament";

type Status = "kept" | "in_progress" | "at_risk" | "not_met" | "broken" | "not_assessed" | "done" | "partly" | "failed";
type Promise_ = {
  text: string; area: string; said: { who: string; when: string; url: string }; status: Status;
  evidence: string; links: { title: string; url: string }[];
};
type Gov = { party: string; name: string; term: "current" | "past"; period: string; role: string; programme: { title: string; url: string }[]; promises: Promise_[] };
const data = raw as { updated: string; parties: Gov[] };

const STATUS: Record<Status, { label: string; color: string; text: string }> = {
  kept: { label: "Спазено досега", color: "#2f9e6a", text: "#fff" },
  in_progress: { label: "В процес", color: "#e2b33b", text: "#16201b" },
  at_risk: { label: "Под въпрос", color: "#e08a2e", text: "#16201b" },
  not_met: { label: "Засега не е изпълнено", color: "#d2353f", text: "#fff" },
  broken: { label: "Нарушено", color: "#7a1e26", text: "#fff" },
  not_assessed: { label: "Още не е проверено", color: "#cfd8d2", text: "#16201b" },
  done: { label: "Изпълнено", color: "#2f9e6a", text: "#fff" },
  partly: { label: "Частично изпълнено", color: "#e2b33b", text: "#16201b" },
  failed: { label: "Не е изпълнено", color: "#d2353f", text: "#fff" },
};
const ORDER: Status[] = ["done", "kept", "partly", "in_progress", "at_risk", "not_met", "failed", "broken", "not_assessed"];
const GOOD: Status[] = ["done", "kept"];
const BAD: Status[] = ["not_met", "failed", "broken"];

export const metadata = { title: "Обещано и изпълнено" };

export default function Obeshtaniya() {
  return (
    <Page>
      <Title lead="Какво обещават партиите и какво правят, след като получат власт. Всяко обещание има източник, а всяка оценка има доказателство.">
        Обещано и изпълнено
      </Title>

      <section className="mb-12">
        <SectionTitle>Правителствата едно до друго</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead><tr className="text-left text-sm text-muted"><th className="py-2 pr-3">Правителство</th><th className="py-2 pr-3 hidden sm:table-cell">Период</th><th className="py-2 pr-3 num">Обещания</th><th className="py-2 pr-3 num">Изпълнени</th><th className="py-2 num">Не</th></tr></thead>
            <tbody>
              {data.parties.map((p) => (
                <tr key={p.party} className="border-t border-rule">
                  <td className="py-2 pr-3"><a href={`#${p.party}`}>{p.name}</a></td>
                  <td className="py-2 pr-3 text-sm hidden sm:table-cell">{p.period}</td>
                  <td className="py-2 pr-3 num">{p.promises.length}</td>
                  <td className="py-2 pr-3 num">{p.promises.filter((x) => GOOD.includes(x.status)).length}</td>
                  <td className="py-2 num">{p.promises.filter((x) => BAD.includes(x.status)).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted mt-2">Броят проследени обещания е малък и различен за всяко правителство, затова не изчисляваме процент „честност“. Добавяме обещания с всяка проверка.</p>
      </section>

      {data.parties.map((p, idx) => {
        const counts = ORDER.map((s) => ({ s, n: p.promises.filter((x) => x.status === s).length })).filter((x) => x.n);
        return (
          <section key={p.party} id={p.party} className="mb-14 scroll-mt-24">
            {(idx === 0 || data.parties[idx - 1].term !== p.term) && (
              <p className="text-sm font-semibold text-red mb-2">{p.term === "current" ? "Сега на власт" : "Предишни правителства"}</p>
            )}
            <SectionTitle>{p.name}</SectionTitle>
            <p className="text-sm -mt-3 mb-2">{p.period}</p>
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
          <li><b>Под въпрос</b>: обещанието се спазва досега, но има официално предложение, което би го нарушило.</li>
          <li><b>Засега не е изпълнено</b>: официалните данни показват обратното на обещаното за текущия период.</li>
          <li><b>Нарушено</b>: управляващите са приели решение, което прави обещанието неизпълнимо.</li>
          <li>За приключилите мандати: <b>Изпълнено</b>, <b>Частично изпълнено</b> или <b>Не е изпълнено</b>, по резултата в края на мандата.</li>
          <li>Сравняваме правителствата по един и същ начин: обещание с източник, резултат с официални данни. Следват правителството „Петков“ и опозиционните партии: как гласуват спрямо това, което са заявили.</li>
        </ul>
      </section>
    </Page>
  );
}
