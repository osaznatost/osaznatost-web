import { partyByGroup, type PartyMeta } from "@/lib/partyMeta";

/** Цветна марка за разпознаване на партията (не е официалното лого). */
export function PartyBadge({ p, size = 40 }: { p: PartyMeta | string; size?: number }) {
  const m = typeof p === "string" ? partyByGroup(p) : p;
  if (!m) return null;
  return (
    <span aria-hidden className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{ width: size, height: size, background: m.color, fontSize: size * (m.initials.length > 2 ? 0.3 : 0.38) }}>
      {m.initials}
    </span>
  );
}
