// Концесиите: в страницата на общината и на фирмата.
import Link from "next/link";
import { type Concession, concUrl, shortName, termText } from "@/lib/concessions";
import { firmUrl } from "@/lib/procurement";

export function ConcessionList({ items, showFirm = true, showConceder = false, limit = 10 }: { items: Concession[]; showFirm?: boolean; showConceder?: boolean; limit?: number }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-3 max-w-4xl">
      {items.slice(0, limit).map((c) => (
        <li key={c.id} className="text-[15px] leading-snug">
          <a href={concUrl(c)} target="_blank" rel="noreferrer">{shortName(c.name)}</a>
          <span className="block text-sm text-muted">
            {c.subject.replace(/^Концесия за /, "")}
            {showFirm && c.firms.length ? <> · {c.firms.map((f, i) => <span key={i}>{i ? ", " : ""}{f.eik ? <Link href={firmUrl(f.eik)}>{f.name}</Link> : f.name}</span>)}</> : null}
            {showConceder ? ` · ${c.conceder}` : ""}
            {c.term ? ` · за ${termText(c.term)}` : ""}{c.value ? ` · стойност ${c.value}` : ""} · партида {c.reg}
          </span>
        </li>
      ))}
      {items.length > limit && <li className="text-sm text-muted">и още {items.length - limit} в Националния концесионен регистър</li>}
    </ul>
  );
}
