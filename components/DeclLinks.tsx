import Link from "next/link";
import type { DeclLink } from "@/lib/declLinks";

const eur = (n: number) => `${Math.round(n).toLocaleString("bg-BG")} €`;

/** Списък „лице – декларирана фирма – поръчки“. mode: person (показва фирмата) или company (показва лицето). */
export function DeclLinks({ items, mode }: { items: DeclLink[]; mode: "person" | "company" }) {
  if (!items.length) return null;
  return (
    <ul className="text-[15px] space-y-2">
      {items.map((l) => (
        <li key={`${l.name}|${l.eik}`}>
          {mode === "person"
            ? <><Link href={`/porachki/firma/${l.eik}`}>{l.co}</Link> <span className="text-muted">({l.kind}, декларация за {l.year} г.)</span></>
            : <><b>{l.name}</b> <span className="text-muted">— {l.pos}, {l.inst}; {l.kind}, декларация за {l.year} г.</span></>}
          {" · "}{l.contracts ? `${l.contracts} договора за ${eur(l.eur)}` : "подизпълнител"}
          {l.own && <> · <b>от собствената институция: {l.own.n} за {eur(l.own.eur)}</b></>}
          {" · "}<a href={l.decl} target="_blank" rel="noreferrer">декларацията</a>
        </li>
      ))}
      <li className="text-sm text-muted">Повод за въпрос, не доказателство. <Link href="/vlast/deklaracii#kak">Как свързваме</Link>.</li>
    </ul>
  );
}
