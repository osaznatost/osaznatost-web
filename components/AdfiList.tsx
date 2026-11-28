import type { AdfiReport } from "@/lib/adfi";

/** Докладите на АДФИ за общината и нейните училища, болници и фирми. */
export function AdfiList({ items, limit = 8 }: { items: AdfiReport[]; limit?: number }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-3 max-w-4xl">
      {items.slice(0, limit).map((a) => (
        <li key={a.url} className="text-[15px] leading-snug">
          <a href={a.url} target="_blank" rel="noreferrer">{a.object}</a>
          <span className="block text-sm text-muted">{a.date ? a.date.split("-").reverse().join(".") : ""} · доклад {a.no}{a.updated ? " (актуализиран след възражения)" : ""} · PDF</span>
        </li>
      ))}
      {items.length > limit && <li className="text-sm text-muted">и още {items.length - limit} доклада в сайта на АДФИ</li>}
    </ul>
  );
}
