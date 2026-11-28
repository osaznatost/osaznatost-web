// Значка „N сигнала“ до името на фирма в списъците; води към карето със сигналите в страницата на фирмата.
import Link from "next/link";
import { sigTitle } from "@/lib/firmSignals";
import { firmUrl } from "@/lib/procurement";

export function SigBadge({ eik, s }: { eik: string; s: { n: number; high: number; kinds: string[] } | undefined }) {
  if (!s || !s.n) return null;
  return (
    <Link href={`${firmUrl(eik)}#signali`} title={sigTitle(s.kinds)} className={`ml-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold no-underline align-middle ${s.high ? "bg-red text-white" : "bg-[#e08a2e] text-white"}`}>
      {s.n} {s.n === 1 ? "сигнал" : "сигнала"}
    </Link>
  );
}
