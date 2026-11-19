import { mentionsOf } from "@/lib/news";

const fmt = (d: string) => d.split("-").reverse().join(".");

/** Споменавания на депутата в медиите. Показват се само при уникално име (без съименници). */
export async function MpMentions({ name }: { name: string }) {
  const items = await mentionsOf(name);
  if (!items.length) return <p className="text-[15px] text-muted">Няма скорошни споменавания в медиите от списъка.</p>;
  return (
    <ul className="divide-y divide-rule border-y border-rule text-[15px] max-w-4xl">
      {items.map((n) => (
        <li key={n.url} className="py-2 grid sm:grid-cols-[6.5rem_1fr] gap-x-3">
          <span className="text-sm text-muted num">{fmt(n.date)}</span>
          <span><a href={n.url} target="_blank" rel="noreferrer">{n.title}</a>{n.outlet && <span className="text-sm text-muted"> · {n.outlet}</span>}</span>
        </li>
      ))}
    </ul>
  );
}
