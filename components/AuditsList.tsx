import type { Audit } from "@/lib/audits";
import { auditTitle } from "@/lib/audits";

/** Списък с одитни доклади на Сметната палата: година, тип и връзка към PDF-а. */
export function AuditsList({ items, limit = 8 }: { items: Audit[]; limit?: number }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-3 max-w-4xl">
      {items.slice(0, limit).map((a) => (
        <li key={a.id} className="text-[15px] leading-snug">
          <a href={a.url} target="_blank" rel="noreferrer">{auditTitle(a.title)}</a>
          <span className="block text-sm text-muted">{a.year} · {a.type || a.kind}{a.cat && a.cat !== "Общини" ? ` · ${a.cat}` : ""} · PDF</span>
        </li>
      ))}
      {items.length > limit && <li className="text-sm text-muted">и още {items.length - limit} доклада в сайта на Сметната палата</li>}
    </ul>
  );
}
