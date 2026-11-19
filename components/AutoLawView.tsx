import type { AutoLaw } from "@/lib/lawAuto";

const formatDate = (d: string) => d?.slice(0, 10).split("-").reverse().join(".");

function Quotes({ title, items, tone, src }: { title: string; items: string[]; tone: string; src: string }) {
  if (!items.length) return null;
  return (
    <div className={`border-l-4 ${tone} pl-4`}>
      <p className="font-semibold mb-1">{title}</p>
      <ul className="space-y-1.5 text-[15px]">{items.map((s, i) => <li key={i}>„{s}“</li>)}</ul>
      <p className="text-xs text-muted mt-1">Източник: <a href={src} target="_blank" rel="noreferrer">доклад на комисията и мотиви, parliament.bg</a></p>
    </div>
  );
}

/** Дословни цитати, извлечени автоматично по правила от документите на един законопроект. Без редакция и без оценка. */
export function AutoLawView({ a, open = true }: { a: AutoLaw; open?: boolean }) {
  const body = (
    <div className="space-y-5 mt-3">
      <Quotes title="Какво предлага законопроектът" items={a.change} tone="border-green" src={a.url} />
      <Quotes title="Позиции, изказани в комисията" items={[...a.positions, ...a.support]} tone="border-[#8a8f8c]" src={a.url} />
      <Quotes title="Възражения и критики" items={a.critics} tone="border-red" src={a.url} />
      {a.hall.length > 0 && (
        <div className="border-l-4 border-[#e08a2e] pl-4">
          <p className="font-semibold mb-1">В пленарната зала</p>
          <ul className="space-y-2 text-[15px]">{a.hall.map((h, i) => (
            <li key={i}><b>{h.who}</b>{h.group && <span className="text-muted"> ({h.group})</span>}: „{h.text}“ <a href={h.url} target="_blank" rel="noreferrer" className="text-sm whitespace-nowrap">стенограма, {formatDate(h.date)}</a></li>
          ))}</ul>
        </div>
      )}
      {a.opinions.length > 0 && <p className="text-[15px]"><b>Писмени становища внесоха:</b> {a.opinions.join("; ")}. <a href={a.url} target="_blank" rel="noreferrer">Текстовете в parliament.bg</a></p>}
    </div>
  );
  return (
    <div className="ring-1 ring-rule rounded-sm bg-white p-4 sm:p-5">
      <p className="text-xs text-muted">Автоматично извлечено от документите на парламента: дословни цитати, без редакция и без оценка от нас.</p>
      <p className="font-semibold mt-1"><a href={a.url} target="_blank" rel="noreferrer" className="text-ink">{a.title}</a> <span className="text-sm text-muted num font-normal">№ {a.sign}</span></p>
      {open ? body : <details><summary className="cursor-pointer font-semibold text-green mt-2">Покажи цитатите</summary>{body}</details>}
    </div>
  );
}
