import Link from "next/link";
import { type Claim, verdictCls } from "@/lib/checks";
import { formatDate } from "@/lib/parliament";

export function ClaimCard({ c, showContext = true }: { c: Claim; showContext?: boolean }) {
  return (
    <article className="ring-1 ring-rule rounded-sm bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${verdictCls(c.verdict)}`}>{c.verdict}</span>
        <span className="text-sm font-semibold">{c.who}</span>
        {c.party && <span className="text-sm text-muted">{c.party}</span>}
        <span className="text-sm text-muted ml-auto">{formatDate(c.date)}</span>
      </div>
      <p className="text-[17px] font-semibold leading-snug">„{c.claim.replace(/^[„"]|[“"]$/g, "")}“</p>
      <p className="text-[15px] mt-2">{c.why}</p>
      {(c.sources.length > 0 || (showContext && (c.law || c.dossier))) && (
        <p className="text-sm mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {c.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)}
          {showContext && c.law && <Link href={`/parlament/zakon/${c.law.slug}`}>Анализ: {c.law.name}</Link>}
          {showContext && c.dossier && <Link href={`/proverki/${c.dossier}`}>Цялата проверка</Link>}
        </p>
      )}
    </article>
  );
}
