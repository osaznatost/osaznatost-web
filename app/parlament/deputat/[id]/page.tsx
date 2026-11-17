import Link from "next/link";
import { notFound } from "next/navigation";
import { VOTE_COLOR } from "@/components/parliament";
import { KeyNumber, Page, num, pct } from "@/components/ui";
import { MPS, PARLIAMENT_SOURCE, VOTES, VOTE_LABEL, type VoteCode, formatDate, getMp, mpStats, mpVote, partyName } from "@/lib/parliament";

export function generateStaticParams() {
  return MPS.map((m) => ({ id: String(m.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = getMp(Number((await params).id));
  return { title: m ? m.name : "Депутат" };
}

export default async function Deputat({ params }: { params: Promise<{ id: string }> }) {
  const mp = getMp(Number((await params).id));
  if (!mp) notFound();
  const s = mpStats(mp.id);
  const recent = VOTES.filter((v) => mpVote(v, mp.id) !== "-").slice(0, 30);

  return (
    <Page>
      <p className="text-sm mb-3"><Link href="/parlament">← Парламент</Link></p>
      <h1 className="text-3xl sm:text-4xl font-bold">{mp.name}</h1>
      <p className="text-lg text-muted mt-1">Парламентарна група: {partyName(mp.party)}</p>

      <div className="grid gap-8 sm:grid-cols-3 my-10">
        <KeyNumber label="Присъствие" value={s.eligible ? pct(s.present / s.eligible, 0) : "—"} note={`гласувал в ${num(s.present, 0)} от ${num(s.eligible, 0)} гласувания`} />
        <KeyNumber label="Срещу собствената група" value={num(s.against, 0)} note={s.present ? `${pct(s.against / s.present, 1)} от гласуванията, в които е участвал` : ""} />
        <KeyNumber label="Период" value={s.eligible ? `${num(s.eligible, 0)}` : "—"} note="гласувания, докато е депутат" />
      </div>

      {s.dissents.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold border-b border-ink pb-2 mb-1">Когато е гласувал различно от групата си</h2>
          <p className="text-sm text-muted mb-3">Това не е нито добро, нито лошо само по себе си. Показва къде депутатът е имал различна позиция.</p>
          <ul>
            {s.dissents.slice(0, 50).map(({ vote, own, party }) => (
              <li key={vote.id} className="border-b border-rule py-2 grid gap-1 sm:grid-cols-[7rem_1fr_auto] sm:gap-4">
                <span className="text-sm text-muted num">{new Date(vote.date).toLocaleDateString("bg-BG")}</span>
                <Link href={`/parlament/glasuvane/${vote.id}`} className="text-ink no-underline hover:underline">{vote.title}</Link>
                <span className="text-sm whitespace-nowrap">той/тя: <b>{VOTE_LABEL[own]}</b> · групата: {VOTE_LABEL[party as VoteCode]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold border-b border-ink pb-2 mb-3">Последни гласувания</h2>
        <ul>
          {recent.map((v) => {
            const c = mpVote(v, mp.id);
            return (
              <li key={v.id} className="border-b border-rule py-2 grid gap-1 sm:grid-cols-[7rem_1fr_9rem] sm:gap-4">
                <span className="text-sm text-muted num">{new Date(v.date).toLocaleDateString("bg-BG")}</span>
                <Link href={`/parlament/glasuvane/${v.id}`} className="text-ink no-underline hover:underline">{v.title}</Link>
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: VOTE_COLOR[c] }} />{VOTE_LABEL[c]}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs text-muted mt-10">
        Данни: <a href={PARLIAMENT_SOURCE.url} target="_blank" rel="noreferrer">{PARLIAMENT_SOURCE.title}</a>. Групата е последната известна за депутата в периода до {formatDate(VOTES[0].date)}.
      </p>
    </Page>
  );
}
