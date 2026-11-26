import Link from "next/link";
import { localIndex } from "@/lib/local";
import { muniSlug, oblastSlug } from "@/lib/regions";

// Решенията на общинските съвети: колко са, с какъв резултат и дали е поименно — за община, област или цялата страна.
type M = Awaited<ReturnType<typeof localIndex>>["munis"][string] & { code: string };
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");
const n = (x: number) => x.toLocaleString("bg-BG");

function Tiles({ rows }: { rows: M[] }) {
  const s = (k: "resolutions" | "tallied" | "named" | "contested") => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        ["Решения", n(s("resolutions")), rows.length > 1 ? `в ${rows.length} общини` : `${rows[0]?.first?.slice(0, 4) ?? ""} – ${rows[0]?.last?.slice(0, 4) ?? ""}`],
        ["С резултат от гласуването", pct(s("tallied"), s("resolutions")), `${n(s("tallied"))} решения`],
        ["Поименно гласуване", s("named") ? n(s("named")) : "–", s("named") ? "решения, за които знаем кой как е гласувал" : "общината не го публикува"],
        ["С гласове „против“", n(s("contested")), s("tallied") ? `${pct(s("contested"), s("tallied"))} от гласуваните` : ""],
      ].map(([l, v, t]) => <div key={l} className="bg-white rounded-sm p-4 ring-1 ring-rule"><p className="text-sm text-muted">{l}</p><p className="display num text-[2rem] mt-1">{v}</p><p className="text-xs text-muted">{t}</p></div>)}
    </div>
  );
}

/** Голямо каре за страницата „Властта“ и началото на „Места“. */
export async function CouncilBanner() {
  const IX = await localIndex();
  const rows = Object.entries(IX.munis).filter(([, m]) => m.resolutions > 0).map(([code, m]) => ({ code, ...m }));
  return (
    <section className="bg-surface rounded-sm p-5 md:p-6 mb-12 ring-2 ring-green">
      <p className="text-sm text-muted">Местна власт</p>
      <h2 className="display text-[1.8rem] leading-tight mb-2"><Link href="/vlast/obshtinski-savet" className="no-underline">Общинските съвети: какво решават и кой как гласува</Link></h2>
      <p className="text-[15px] max-w-3xl mb-4">Решенията на общинските съвети от началото на мандата, прочетени автоматично от сайтовете им. Където е публикувано, виждате и как е гласувал всеки съветник.</p>
      <Tiles rows={rows} />
      <p className="mt-4"><Link href="/vlast/obshtinski-savet" className="inline-block bg-green text-white no-underline rounded-sm px-4 py-2 font-semibold">Всички общини →</Link></p>
    </section>
  );
}

/** Каре за община или област. */
export async function CouncilCoverage({ codes, title }: { codes: string[]; title: string }) {
  const IX = await localIndex();
  const rows = codes.map((code) => ({ code, ...(IX.munis[code] ?? { name: code, officials: 0, stakes: 0, resolutions: 0 }) }));
  const have = rows.filter((r) => r.resolutions > 0);
  const one = codes.length === 1;
  return (
    <div className="bg-surface rounded-sm p-5 ring-1 ring-rule">
      <h3 className="font-semibold text-lg mb-3">{title}</h3>
      {!have.length ? (
        <p className="text-[15px]">Още нямаме решенията на {one ? "този общински съвет" : "общинските съвети в областта"}. Където сайтът не ги публикува, ги искаме по Закона за достъп до обществена информация. <Link href="/vlast/obshtinski-savet">Кои общини имаме</Link></p>
      ) : (
        <>
          <Tiles rows={have} />
          {!one && (
            <ul className="mt-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-[15px]">{rows.sort((a, b) => b.resolutions - a.resolutions).map((r) => (
              <li key={r.code}>{r.resolutions ? <Link href={`/mesta/${oblastSlug(r.code)}/${muniSlug(r.code)}/resheniya`}>{r.name?.replace(/^Община\s+/i, "")}</Link> : <span className="text-muted">{r.name?.replace(/^Община\s+/i, "")}</span>} <span className="text-sm text-muted num">{r.resolutions ? `${n(r.resolutions)} решения${r.named ? ", поименно" : r.tallied ? ", с резултат" : ""}` : "още няма"}</span></li>
            ))}</ul>
          )}
          <p className="mt-4 text-[15px]">
            {one && <><Link href={`/mesta/${oblastSlug(codes[0])}/${muniSlug(codes[0])}/resheniya`} className="font-semibold">Всички решения по месеци</Link> · </>}
            {one && have[0].named ? <><Link href="#savetnici">Как гласува всеки съветник</Link> · </> : null}
            <Link href="/vlast/obshtinski-savet">Сравнение с другите общини</Link>
          </p>
        </>
      )}
    </div>
  );
}
