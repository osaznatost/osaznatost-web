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
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-surface -mt-8 sm:-mt-12 mb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {back && <p className="text-sm mb-4"><Link href={back.href}>← {back.label}</Link></p>}
        {kicker && <p className="text-[15px] text-green font-semibold mb-2">{kicker}</p>}
        <h1 className={`${small ? "text-2xl sm:text-[2rem] leading-snug font-bold tracking-tight" : "display text-5xl sm:text-7xl"} max-w-4xl`}>{children}</h1>
        {lead && <div className="mt-3 text-lg text-muted max-w-3xl">{lead}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <h2 className="display text-[2rem] sm:text-[2.4rem]">{children}</h2>
      {right && <div className="text-[15px] pb-1">{right}</div>}
    </div>
  );
}

export function KeyNumber({
  label, value, note, source, href,
}: { label: string; value: string; note?: string; source?: { title: string; url: string }; href?: string }) {
  return (
    <div className="bg-surface rounded-lg p-5 flex flex-col">
      <p className="text-[15px] text-muted">{label}</p>
      <p className="display num text-[3.4rem] mt-2 text-ink">{value}</p>
      {note && <p className="text-[15px] mt-2">{note}</p>}
      <div className="mt-auto pt-3 flex flex-wrap justify-between gap-2 text-sm">
        {source && <span className="text-muted">Източник: <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></span>}
        {href && <Link href={href} className="font-semibold">Виж повече</Link>}
      </div>
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
