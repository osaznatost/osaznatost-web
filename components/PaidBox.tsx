// „Колко е платено“: плащанията от СЕБРА към фирма или от институция.
import Link from "next/link";
import { paidTo, payersLike, paymentsIndex } from "@/lib/payments";

const eur = (v: number) => `${Math.round(v).toLocaleString("bg-BG")} €`;
const d = (s: string | null) => (s ? s.split("-").reverse().join(".") : "");
async function Note() {
  const I = await paymentsIndex();
  return <p className="text-xs text-muted mt-2">Източник: СЕБРА, тримесечни списъци на плащанията над 5000 лв. на бюджетните организации ({I.quarters[0]?.slice(0, 4)}–{I.quarters.at(-1)?.slice(0, 4)}), data.egov.bg, CC0. Получателят е само с име, затова свързването е по име. Повечето общини плащат извън СЕБРА; при тях се виждат само някои плащания (напр. капиталови).</p>;
}

export async function PaidToFirm({ name }: { name: string }) {
  const [r, I] = await Promise.all([paidTo(name), paymentsIndex()]);
  if (!r) return <><p className="text-[15px]">Няма плащания към фирма с това име в СЕБРА (или са под {eur(I.minEur)} общо).</p><Note /></>;
  return (
    <>
      <p className="text-[15px] mb-3">Държавни институции са платили <b>{eur(r.total)}</b> с {r.n.toLocaleString("bg-BG")} плащания на получател с това име. <span className="text-muted">Съвпадение по име, не по ЕИК.</span></p>
      {r.amb && <p className="text-[15px] mb-3 border-l-4 border-[#e08a2e] pl-3">Внимание: в СЕБРА името се среща в няколко варианта, възможно е да са различни фирми или една фирма, сменила правната си форма: {r.amb.map(([n, v]) => `${n} (${eur(v)})`).join("; ")}.</p>}
      <div className="overflow-x-auto"><table className="w-full text-[15px]">
        <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-1.5 pr-3">Кой плаща</th><th className="px-2 text-right">Сума</th><th className="px-2 text-right">Плащания</th><th className="px-2">Период</th></tr></thead>
        <tbody>{r.payers.map((p) => <tr key={p[0]} className="border-b border-rule"><td className="py-1.5 pr-3">{p[0]}</td><td className="px-2 text-right num">{eur(p[1])}</td><td className="px-2 text-right num">{p[2]}</td><td className="px-2 text-sm text-muted">{d(p[3])} – {d(p[4])}</td></tr>)}</tbody>
      </table></div>
      {r.top.length > 0 && <details className="mt-3 text-[15px]"><summary className="cursor-pointer text-green font-semibold">Най-големите плащания</summary><ul className="mt-2 space-y-1">{r.top.map((t, i) => <li key={i}><span className="num font-semibold">{eur(t[0])}</span> · {d(t[1])} · {t[2]}{t[3] ? <span className="text-sm text-muted"> · {t[3]}</span> : null}</li>)}</ul></details>}
      <Note />
    </>
  );
}

export async function PaidByBuyer({ name }: { name: string }) {
  const ps = await payersLike(name);
  if (!ps.length) return null;
  const by = new Map<string, { name: string; sum: number }>();
  for (const p of ps) for (const [n, k, v] of p.top) { const x = by.get(k) ?? { name: n, sum: 0 }; x.sum += v; by.set(k, x); }
  const rows = [...by.entries()].sort((a, b) => b[1].sum - a[1].sum).slice(0, 15);
  return (
    <section className="mb-10">
      <h2 className="display text-[2rem] mb-2">На кого реално плаща (СЕБРА)</h2>
      <p className="text-[15px] text-muted mb-3">Плащанията към фирми и организации ({ps.map((p) => p.name).slice(0, 3).join("; ")}{ps.length > 3 ? "…" : ""}), без физическите лица.</p>
      <ul className="divide-y divide-rule border-y border-rule text-[15px]">{rows.map(([k, x]) => <li key={k} className="py-1.5 flex justify-between gap-3"><Link href={`/tarsene?q=${encodeURIComponent(`„${x.name}“`)}`}>{x.name}</Link><span className="num">{eur(x.sum)}</span></li>)}</ul>
      <Note />
    </section>
  );
}
