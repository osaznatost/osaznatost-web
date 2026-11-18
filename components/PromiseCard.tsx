import Link from "next/link";
import { GOOD, STATUS, type Promise_ } from "@/lib/promises";

const Ext = ({ url, children }: { url: string; children: React.ReactNode }) =>
  url.startsWith("/") ? <Link href={url}>{children}</Link> : <a href={url} target="_blank" rel="noreferrer">{children}</a>;

export function PromiseCard({ x, id }: { x: Promise_; id?: string }) {
  return (
    <li id={id} className="scroll-mt-32 lg:scroll-mt-24 rounded-xl ring-1 ring-rule bg-white p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{x.area}</p>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: STATUS[x.status].color, color: STATUS[x.status].text }}>{STATUS[x.status].label}</span>
      </div>
      <p className="display text-[1.7rem] mt-2">{x.text}</p>
      <p className="text-sm text-muted mt-1">Обещал: <a href={x.said.url} target="_blank" rel="noreferrer">{x.said.who}, {x.said.when}</a></p>
      <p className="text-[15px] mt-3">{x.evidence}</p>
      {x.note && <p className="text-[15px] mt-2 font-semibold">{x.note}</p>}
      {x.timeline?.length ? (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm font-semibold text-green">Как се стигна дотук ({x.timeline.length} стъпки)</summary>
          <ol className="mt-3 border-l-2 border-rule pl-4 space-y-3">
            {x.timeline.map((t) => (
              <li key={t.date + t.what} className="relative text-[15px]">
                <span className="absolute -left-[1.4rem] top-1.5 w-2.5 h-2.5 rounded-full bg-green" />
                <span className="text-sm font-semibold">{t.date}</span>
                <p>{t.what}{t.url && <> <Ext url={t.url}>Източник</Ext></>}</p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {x.why?.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-green">{GOOD.includes(x.status) ? "Как е постигнато" : "Защо не е изпълнено или е под въпрос"}</summary>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-[15px]">{x.why.map((w) => <li key={w}>{w}</li>)}</ul>
          {x.whySrc?.length ? <p className="text-xs text-muted mt-1">Източници: {x.whySrc.map((u, i) => <span key={u}>{i > 0 && ", "}<Ext url={u}>[{i + 1}]</Ext></span>)}</p> : null}
        </details>
      ) : null}
      {x.next && <p className="text-sm mt-3 bg-surface rounded-sm px-3 py-2"><b>Следваща проверка:</b> {x.next}</p>}
      {x.links.length > 0 && (
        <p className="text-sm mt-auto pt-3 flex flex-wrap gap-x-4 gap-y-1">
          {x.links.map((l) => l.url.startsWith("/")
            ? <Link key={l.url} href={l.url}>{l.title}</Link>
            : <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.title}</a>)}
        </p>
      )}
    </li>
  );
}
