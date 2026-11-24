"use client";
import { useEffect, useState } from "react";

type Totals = { za: number; protiv: number; ne_znam: number; total: number };
type State = { open?: boolean; verified?: boolean; voted?: number | null; totals?: Totals; error?: string };
const LABEL: [string, number, string][] = [["za", 1, "За"], ["protiv", -1, "Против"], ["ne_znam", 0, "Не знам"]];

/** Мнение на гражданите по един закон. Резултатът се вижда едва след като човек гласува. */
export function CitizenVote({ item, question }: { item: string; question: string }) {
  const [s, setS] = useState<State>({});
  const [step, setStep] = useState<"idle" | "email" | "code">("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetch(`/api/mnenie/glas?item=${encodeURIComponent(item)}`).then((r) => r.json()).then(setS).catch(() => setS({ open: false })); }, [item]);

  const post = async (url: string, body: object) => {
    setBusy(true); setMsg("");
    try { const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) setMsg(j.error ?? "Нещо се обърка."); return r.ok ? j : null; }
    catch { setMsg("Няма връзка. Опитай отново."); return null; }
    finally { setBusy(false); }
  };
  const vote = async (choice: string) => { const j = await post("/api/mnenie/glas", { item, choice }); if (j) setS({ ...s, voted: j.voted, totals: j.totals }); };
  const askCode = async () => { const j = await post("/api/mnenie/kod", { email }); if (j) { setStep("code"); setMsg(j.preview ? `Пробен режим (писмата още не са свързани): кодът ти е ${j.preview}.` : "Изпратихме ти код. Провери и папката за спам."); } };
  const confirm = async () => { if (await post("/api/mnenie/potvardi", { email, code })) { setS({ ...s, verified: true, voted: null }); setStep("idle"); setMsg("Имейлът е потвърден. Сега можеш да гласуваш."); } };

  if (s.open === undefined) return <div className="bg-surface rounded-sm p-5 text-[15px] text-muted">Зарежда се…</div>;
  return (
    <div className="bg-surface rounded-sm p-5 text-[15px] max-w-2xl">
      <p className="font-semibold text-[17px]">{question}</p>
      {!s.open ? (
        <p className="mt-2 text-muted">Гласуването още не е отворено. Скоро тук ще можеш да кажеш мнението си.</p>
      ) : s.voted !== null && s.voted !== undefined && s.totals ? (
        <Results t={s.totals} mine={s.voted} onChange={vote} busy={busy} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mt-3">
            {LABEL.map(([k, , l]) => (
              <button key={k} disabled={busy} onClick={() => (s.verified ? vote(k) : setStep("email"))} className="px-4 py-2 rounded-sm ring-1 ring-rule bg-white hover:ring-ink disabled:opacity-50">{l}</button>
            ))}
          </div>
          <p className="text-sm text-muted mt-2">Резултатът се показва, след като гласуваш, за да не влияе на избора ти.</p>
          {!s.verified && step !== "idle" && (
            <div className="mt-4 border-t border-rule pt-4">
              <p className="text-sm">За да има един глас на човек, потвърди имейла си с код. <b>Не пазим имейла</b>: пазим само необратим отпечатък, и той е различен за всеки закон, затова никой не може да види как си гласувал.</p>
              {step === "email" ? (
                <form className="flex flex-wrap gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); askCode(); }}>
                  <label className="sr-only" htmlFor={`em-${item}`}>Имейл</label>
                  <input id={`em-${item}`} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="твоят@имейл.bg" className="flex-1 min-w-[220px] px-3 py-2 ring-1 ring-rule rounded-sm bg-white" />
                  <button disabled={busy} className="px-4 py-2 rounded-sm bg-ink text-white disabled:opacity-50">Изпрати код</button>
                </form>
              ) : (
                <form className="flex flex-wrap gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); confirm(); }}>
                  <label className="sr-only" htmlFor={`cd-${item}`}>Код от писмото</label>
                  <input id={`cd-${item}`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 цифри" className="w-32 px-3 py-2 ring-1 ring-rule rounded-sm bg-white num" />
                  <button disabled={busy} className="px-4 py-2 rounded-sm bg-ink text-white disabled:opacity-50">Потвърди</button>
                  <button type="button" disabled={busy} onClick={() => setStep("email")} className="px-3 py-2 text-sm underline">друг имейл</button>
                </form>
              )}
            </div>
          )}
        </>
      )}
      {msg && <p className="text-sm mt-3" role="status">{msg}</p>}
    </div>
  );
}

function Results({ t, mine, onChange, busy }: { t: Totals; mine: number; onChange: (c: string) => void; busy: boolean }) {
  const pct = (n: number) => (t.total ? Math.round((n / t.total) * 100) : 0);
  return (
    <div className="mt-3">
      <ul className="space-y-2">
        {LABEL.map(([k, v, l]) => (
          <li key={k}>
            <div className="flex justify-between text-sm"><span>{l}{mine === v && <b> · твоят глас</b>}</span><span className="num">{pct(t[k as keyof Totals])}%</span></div>
            <div className="h-2 bg-white rounded-sm ring-1 ring-rule"><div className="h-2 bg-ink rounded-sm" style={{ width: `${pct(t[k as keyof Totals])}%` }} /></div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted mt-3">Гласували: <span className="num">{t.total.toLocaleString("bg-BG")}</span>. Това е мнението на посетителите на сайта, не социологическо проучване: гласуват само хората, които са решили да гласуват.</p>
      <p className="text-sm mt-2">Промени гласа си: {LABEL.filter(([, v]) => v !== mine).map(([k, , l]) => <button key={k} disabled={busy} onClick={() => onChange(k)} className="underline mr-3 disabled:opacity-50">{l}</button>)}</p>
    </div>
  );
}
