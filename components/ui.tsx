import Link from "next/link";
import type { Param } from "@/lib/params";

export const eur = (n: number, digits = 2) =>
  new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
export const num = (n: number, digits = 1) =>
  new Intl.NumberFormat("bg-BG", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
export const pct = (n: number, digits = 1) => `${num(n * 100, digits)}%`;

export function Page({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return <div className={`mx-auto px-4 sm:px-6 py-8 sm:py-12 ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>{children}</div>;
}

export function Title({ kicker, children, lead, back, small = false }: { kicker?: string; children: React.ReactNode; lead?: React.ReactNode; back?: { href: string; label: string }; small?: boolean }) {
  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-surface border-b border-rule -mt-8 sm:-mt-12 mb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {back && <p className="text-sm mb-4"><Link href={back.href}>← {back.label}</Link></p>}
        {kicker && <p className="text-sm uppercase tracking-wider text-green font-semibold mb-2">{kicker}</p>}
        <h1 className={`${small ? "text-2xl sm:text-3xl leading-snug" : "text-3xl sm:text-[2.6rem] leading-tight"} font-bold tracking-tight max-w-4xl`}>{children}</h1>
        {lead && <div className="mt-3 text-lg text-muted max-w-3xl">{lead}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2 mb-5">
      <h2 className="text-xl font-bold flex items-center gap-2"><span aria-hidden className="inline-block w-2 h-2 bg-red" />{children}</h2>
      {right && <div className="text-sm">{right}</div>}
    </div>
  );
}

export function KeyNumber({
  label, value, note, source, href,
}: { label: string; value: string; note?: string; source?: { title: string; url: string }; href?: string }) {
  return (
    <div className="bg-white border border-rule border-t-[3px] border-t-green rounded-sm p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="num text-4xl font-bold tracking-tight mt-1">{value}</p>
      {note && <p className="text-sm mt-1">{note}</p>}
      {source && (
        <p className="text-xs text-muted mt-2">
          Източник: <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
        </p>
      )}
      {href && <p className="mt-2 text-sm"><Link href={href}>Виж повече →</Link></p>}
    </div>
  );
}

export function Sources({ items }: { items: { label: string; p: Param }[] }) {
  return (
    <details className="mt-6 text-sm text-muted border-t border-rule pt-3">
      <summary className="cursor-pointer text-ink">Какво сме допуснали и откъде са числата</summary>
      <ul className="mt-2 space-y-1">
        {items.map(({ label, p }) => (
          <li key={label}>
            {label}: <span className="num text-ink">{p.unit === "" ? pct(p.value, 2) : `${num(p.value, 2)} ${p.unit}`}</span>
            {p.note ? ` (${p.note})` : ""}, в сила от {new Date(p.validFrom).toLocaleDateString("bg-BG")} ·{" "}
            <a href={p.source.url} target="_blank" rel="noreferrer">{p.source.title}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  );
}

export function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-2 border-b border-rule ${strong ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className="num text-right whitespace-nowrap">{value}</span>
    </div>
  );
}

export function Disclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <p className="text-xs text-muted mt-4">
      {children ?? "Изчисленията са ориентировъчни и не са финансов или данъчен съвет."}
    </p>
  );
}

export function Label({ kind }: { kind: "fact" | "claim" | "opinion" }) {
  const map = {
    fact: { t: "Факт", c: "bg-green-soft text-green" },
    claim: { t: "Твърдение", c: "bg-surface text-ink border border-rule" },
    opinion: { t: "Оценка", c: "bg-white text-muted border border-dashed border-muted" },
  }[kind];
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-sm ${map.c}`}>{map.t}</span>;
}
