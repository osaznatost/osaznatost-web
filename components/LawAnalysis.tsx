import type { Argument, LawContent, Outcome } from "@/lib/laws";
import { formatDate } from "@/lib/parliament";

export function Refs({ law, src }: { law: LawContent; src: number[] }) {
  if (!src?.length) return null;
  return (
    <span className="text-xs whitespace-nowrap">
      {" "}
      {src.map((n) => {
        const s = law.sources[n - 1];
        return s ? (
          <a key={n} href={s.url} target="_blank" rel="noreferrer" title={s.title} className="ml-0.5 no-underline">[{n}]</a>
        ) : null;
      })}
    </span>
  );
}

function Args({ law, title, items, tone }: { law: LawContent; title: string; items?: Argument[]; tone: "green" | "red" }) {
  if (!items?.length) return null;
  return (
    <div className={`p-5 rounded-sm border-t-4 ${tone === "green" ? "border-green bg-surface" : "border-red bg-[#fbf1f2]"}`}>
      <h3 className="display text-[1.6rem] mb-3">{title}</h3>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.who + a.text.slice(0, 20)}>
            <p className="text-sm font-semibold">{a.who}</p>
            <p className="text-[15px]">{a.text}<Refs law={law} src={a.src} /></p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const VERDICT_STYLE: Record<string, string> = {
  "Вярно": "bg-[#2f9e6a] text-white",
  "Невярно": "bg-[#d2353f] text-white",
  "Непотвърдено": "bg-white text-ink ring-1 ring-rule",
};

export function LawAnalysis({ law, hideEffects }: { law: LawContent; hideEffects?: boolean }) {
  return (
    <>
      {(law.motives || law.critics) && (
        <div className="grid gap-4 md:grid-cols-2 mt-8">
          <Args law={law} title="Мотивите на вносителите" items={law.motives} tone="green" />
          <Args law={law} title="Какво казват критиците" items={law.critics} tone="red" />
        </div>
      )}

      {law.data?.length ? (
        <div className="mt-8">
          <h3 className="display text-[1.8rem] mb-3">Какво казват данните</h3>
          <ul className="space-y-2 list-none pl-0">
            {law.data.map((d) => (
              <li key={d.text.slice(0, 40)} className="border-l-4 border-deep pl-4 text-[15px]">{d.text}<Refs law={law} src={d.src} /></li>
            ))}
          </ul>
        </div>
      ) : null}

      {!hideEffects && <EffectsBlock law={law} />}

      {law.impact?.length ? (
        <div className="mt-8">
          <h3 className="display text-[1.8rem] mb-1">Какво печели и какво губи всяка страна</h3>
          <p className="text-sm text-muted mb-3">Едно решение помага на едни и тежи на други. Тук ги показваме една до друга.</p>
          <div className="space-y-3">
            {law.impact.map((i) => (
              <div key={i.group} className="ring-1 ring-rule rounded-sm bg-white">
                <p className="font-semibold px-4 pt-3">{i.group}<Refs law={law} src={i.src} /></p>
                <div className="grid sm:grid-cols-2 gap-px bg-rule mt-3">
                  <div className="bg-white px-4 py-3">
                    <p className="text-xs font-semibold text-[#2f7d57] mb-0.5">Печели</p>
                    <p className="text-[15px]">{i.gains}</p>
                  </div>
                  <div className="bg-white px-4 py-3">
                    <p className="text-xs font-semibold text-red mb-0.5">Губи</p>
                    <p className="text-[15px]">{i.loses}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {law.checks?.length ? (
        <div className="mt-8">
          <h3 className="display text-[1.8rem] mb-3">Проверени твърдения</h3>
          <ul className="space-y-3">
            {law.checks.map((c) => (
              <li key={c.claim} className="rounded-xl ring-1 ring-rule p-4 bg-white">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{c.claim}</p>
                  <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${VERDICT_STYLE[c.verdict] ?? "bg-[#e2b33b] text-ink"}`}>{c.verdict}</span>
                </div>
                <p className="text-[15px] text-muted mt-1">{c.why}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 text-sm">
        <p className="font-semibold mb-1">Източници</p>
        <ol className="list-decimal pl-5 space-y-0.5">
          {law.sources.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>
          ))}
        </ol>
        <p className="text-xs text-muted mt-2">{law.note} Проверено: {formatDate(law.reviewed)}.</p>
      </div>
    </>
  );
}

/** Двете страни на монетата: какво добро и какво рисковано носи изходът. */
export function OutcomeList({ o, onDark }: { o: Outcome; onDark?: boolean }) {
  const good = o.good.filter((x) => x !== "—");
  const bad = o.bad.filter((x) => x !== "—");
  return (
    <div className="space-y-2 mt-3">
      {good.length > 0 && (
        <div>
          <p className={`text-xs font-semibold ${onDark ? "text-white/80" : "text-[#2f7d57]"}`}>Добрата страна</p>
          <ul className="list-none pl-0 space-y-1">
            {good.map((g) => <li key={g} className="text-[15px] pl-4 relative before:content-['+'] before:absolute before:left-0 before:font-bold">{g}</li>)}
          </ul>
        </div>
      )}
      {bad.length > 0 && (
        <div>
          <p className={`text-xs font-semibold ${onDark ? "text-white/80" : "text-red"}`}>Рискът и цената</p>
          <ul className="list-none pl-0 space-y-1">
            {bad.map((g) => <li key={g} className="text-[15px] pl-4 relative before:content-['−'] before:absolute before:left-0 before:font-bold">{g}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function EffectsBlock({ law }: { law: LawContent }) {
  const e = law.effects;
  if (!e) return null;
  return (
    <div className="mt-8">
      <h3 className="display text-[1.8rem] mb-1">Двете страни на монетата</h3>
      <p className="text-sm text-muted mb-3">Какво следва на практика, ако законът се приеме и ако се отхвърли.<Refs law={law} src={e.src} /></p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white border-t-4 border-t-[#2f9e6a]">
          <p className="font-semibold">Ако се приеме</p>
          <OutcomeList o={e.ifPassed} />
        </div>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white border-t-4 border-t-[#d2353f]">
          <p className="font-semibold">Ако се отхвърли</p>
          <OutcomeList o={e.ifRejected} />
        </div>
      </div>
    </div>
  );
}
