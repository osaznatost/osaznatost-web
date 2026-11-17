"use client";

import { useRouter } from "next/navigation";

type Opt = { value: string; label: string };

/** Филтър по ниво на властта, област, община и населено място. Всеки избор презарежда страницата с новия адрес. */
export function PlaceFilterBar({
  base, current, oblasts, municipalities, settlements,
}: {
  base: string;
  current: { nivo?: string; oblast?: string; obshtina?: string; mesto?: string };
  oblasts: Opt[];
  municipalities: Opt[];
  settlements: Opt[];
}) {
  const router = useRouter();
  const go = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...next })) if (v) p.set(k, v);
    router.push(`${base}${p.size ? `?${p}` : ""}`, { scroll: false });
  };
  const sel = "w-full rounded-sm ring-1 ring-rule bg-white px-3 py-2.5 text-[15px] focus:ring-2 focus:ring-green outline-none disabled:bg-surface disabled:text-muted";
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm">
        <span className="block text-muted mb-1">Ниво</span>
        <select className={sel} value={current.nivo ?? ""} onChange={(e) => go({ nivo: e.target.value || undefined })}>
          <option value="">Всички възложители</option>
          <option value="държавен">Държавни институции</option>
          <option value="областен">Областни администрации</option>
          <option value="общински">Общини и райони</option>
          <option value="друг публичен">Болници, училища, дружества</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="block text-muted mb-1">Област</span>
        <select className={sel} value={current.oblast ?? ""} onChange={(e) => go({ oblast: e.target.value || undefined, obshtina: undefined, mesto: undefined })}>
          <option value="">Цялата страна</option>
          {oblasts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="block text-muted mb-1">Община</span>
        <select className={sel} disabled={!current.oblast} value={current.obshtina ?? ""} onChange={(e) => go({ obshtina: e.target.value || undefined, mesto: undefined })}>
          <option value="">{current.oblast ? "Всички общини" : "Първо избери област"}</option>
          {municipalities.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="block text-muted mb-1">Град или село</span>
        <select className={sel} disabled={!current.obshtina} value={current.mesto ?? ""} onChange={(e) => go({ mesto: e.target.value || undefined })}>
          <option value="">{current.obshtina ? "Всички населени места" : "Първо избери община"}</option>
          {settlements.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    </div>
  );
}
