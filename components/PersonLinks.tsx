import Link from "next/link";
import { data } from "@/lib/data";
import { firmUrl, fmtEur, placeSuppliersAll } from "@/lib/procurement";

type Role = { role: string; from?: string; to?: string | null; share?: string };
type Other = Role & { n: string; eik?: string };
type Firm = { eik: string; name: string; status?: number; mine: Role[]; others: Other[] };
type Through = { eik: string; name: string; role: string; from?: string; to?: string | null };
type Co = { n: string; via: string[]; through?: Record<string, Through>; firms: { eik: string; name: string }[] };
export type PersonLinksData = { name: string; role: string; firms: Firm[]; co: Co[] };

const y = (d?: string | null) => (d ? d.slice(0, 4) : "");
const period = (r: Role) => (r.from ? `${y(r.from)}–${r.to ? y(r.to) : "досега"}` : r.to ? `до ${y(r.to)}` : "");
const roleText = (r: Role) => [r.role, period(r), r.share].filter(Boolean).join(", ");
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
const firmName = (s: string) => s.replace(/["„“]/g, "").trim();

// Пресичат ли се два периода (кога и двамата са били във фирмата)?
function overlap(a: Role, b: Role) {
  const a1 = a.from ?? "0000", a2 = a.to ?? "9999", b1 = b.from ?? "0000", b2 = b.to ?? "9999";
  return a1 <= b2 && b1 <= a2;
}

/** Свързани лица по Търговския регистър, с историята: фирмите на лицето, хората с него в тях и техните фирми с поръчки в общината. */
export async function PersonLinks({ code, slug }: { code: string; slug: string }) {
  const all = await data<Record<string, PersonLinksData>>(`tr-links/${code}.json`);
  const p = all?.[slug];
  if (!p) return <p className="text-[15px] text-muted max-w-3xl">Търговският регистър (с историята на фирмите) за това лице още се проверява. Обхождаме длъжностните лица поред, щадящо за регистъра.</p>;
  const sup = await placeSuppliersAll(code);
  const bySup = new Map(sup.map((s) => [s.eik.slice(0, 9), s]));
  const firmsById = new Map(p.firms.map((f) => [f.eik, f]));

  // 1) Собствените фирми на лицето, които печелят поръчки от общината.
  const own = p.firms.filter((f) => bySup.has(f.eik));
  // 2) Фирми на хора, с които лицето е било във фирма, и които печелят поръчки от общината.
  const via = p.co.flatMap((c) => c.firms.filter((f) => bySup.has(f.eik)).map((f) => ({ c, f, s: bySup.get(f.eik)! })))
    .sort((a, b) => (b.s.total_eur ?? 0) - (a.s.total_eur ?? 0));

  return (
    <div className="space-y-6 text-[15px] max-w-4xl">
      {(own.length > 0 || via.length > 0) && (
        <div className="ring-2 ring-red rounded-sm p-4 bg-white space-y-3">
          <p className="font-semibold">Връзки с фирми, които печелят поръчки от възложители в общината</p>
          {own.map((f) => { const s = bySup.get(f.eik)!; return (
            <p key={f.eik}><Link href={firmUrl(s.eik)}>{firmName(f.name)}</Link>: <b>{s.contracts}</b> договора за {fmtEur(s.total_eur)}. Лицето е или е било вписано в нея: {f.mine.map(roleText).join("; ")}.</p>
          ); })}
          {via.map(({ c, f, s }) => {
            const shared = c.via.map((e) => firmsById.get(e)).filter(Boolean) as Firm[];
            return (
              <div key={`${c.n}-${f.eik}`}>
                <p><Link href={firmUrl(s.eik)}>{firmName(f.name)}</Link>: <b>{s.contracts}</b> договора за {fmtEur(s.total_eur)} от възложители в общината.</p>
                <p className="text-muted">Вписан в нея е <b className="text-ink">{titleCase(c.n)}</b>, свързан с лицето във{" "}
                  {shared.map((sf, i) => {
                    const direct = sf.others.some((o) => o.n.toUpperCase() === c.n.toUpperCase());
                    const th = direct ? undefined : c.through?.[sf.eik];
                    if (th) {
                      const ent = sf.others.find((o) => o.eik?.slice(0, 9) === th.eik);
                      return <span key={sf.eik}>{i > 0 && ", "}„{firmName(sf.name)}“ чрез фирмата „{firmName(th.name)}“ (лицето в „{firmName(sf.name)}“: {sf.mine.map(roleText).join("; ")}; „{firmName(th.name)}“ там: {ent ? roleText(ent) : "съдружник"}; {titleCase(c.n)} в „{firmName(th.name)}“: {roleText(th)})</span>;
                    }
                    const his = sf.others.filter((o) => o.n.toUpperCase() === c.n.toUpperCase());
                    const both = his.some((h) => sf.mine.some((m) => overlap(h, m)));
                    return <span key={sf.eik}>{i > 0 && ", "}„{firmName(sf.name)}“ (лицето: {sf.mine.map(roleText).join("; ")}; {titleCase(c.n)}: {his.map(roleText).join("; ")}{both ? "" : "; не по едно и също време"})</span>;
                  })}.
                </p>
              </div>
            );
          })}
          <p className="text-sm text-muted">Връзките са по три имена, защото регистърът не показва ЕГН: възможно е съвпадение на имена. Бивше съдружие не е нарушение. Това е повод за въпрос, например дали лицето е декларирало конфликт на интереси, а не доказателство.</p>
        </div>
      )}

      <div>
        <p className="font-semibold mb-1">Фирми, в които е вписан човек с тези три имена, включително в миналото ({p.firms.length})</p>
        {p.firms.length === 0 ? <p className="text-muted">Търговският регистър не намира такова име като управител, съдружник или собственик.</p> : (
          <ul className="divide-y divide-rule border-y border-rule">
            {p.firms.map((f) => {
              const s = bySup.get(f.eik);
              const people = f.others;
              return (
                <li key={f.eik} className="py-2.5">
                  <p>{s ? <Link href={firmUrl(s.eik)}>{firmName(f.name)}</Link> : <a href={`https://portal.registryagency.bg/CR/Reports/ActiveConditionTabResult?uic=${f.eik}`} target="_blank" rel="noreferrer">{firmName(f.name)}</a>}
                    <span className="text-sm text-muted"> · ЕИК {f.eik}</span></p>
                  <p className="text-sm">Лицето: {f.mine.length ? f.mine.map(roleText).join("; ") : "в орган на управление"}</p>
                  {people.length > 0 && <p className="text-sm text-muted">С него във фирмата, някога: {people.slice(0, 12).map((o) => `${o.eik ? firmName(o.n) : titleCase(o.n)} (${roleText(o)})`).join(" · ")}{people.length > 12 ? ` и още ${people.length - 12}` : ""}</p>}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm text-muted mt-2">Източник: Търговски регистър, Агенция по вписванията, търсене по име с включена история и история на вписванията за всяка фирма.</p>
      </div>
    </div>
  );
}

/** За страницата на общината: длъжностните лица, свързани (пряко или през бивш/сегашен съдружник) с изпълнители на поръчки в общината. */
export async function MuniLinks({ code }: { code: string }) {
  const all = await data<Record<string, PersonLinksData>>(`tr-links/${code}.json`);
  if (!all) return null;
  const sup = await placeSuppliersAll(code);
  const bySup = new Map(sup.map((s) => [s.eik.slice(0, 9), s]));
  const rows = Object.entries(all).map(([slug, p]) => {
    const own = p.firms.filter((f) => bySup.has(f.eik)).map((f) => ({ f: f.eik, who: null as string | null }));
    const via = p.co.flatMap((c) => c.firms.filter((f) => bySup.has(f.eik)).map((f) => ({ f: f.eik, who: c.n })));
    const hits = [...own, ...via];
    const total = [...new Set(hits.map((h) => h.f))].reduce((s, e) => s + (bySup.get(e)?.total_eur ?? 0), 0);
    return { slug, p, hits, total };
  }).filter((r) => r.hits.length).sort((a, b) => b.total - a.total);
  const checked = Object.keys(all).length;
  return (
    <section id="svarzani" className="mb-12 scroll-mt-32 lg:scroll-mt-24 max-w-4xl text-[15px]">
      <h2 className="display text-[1.9rem] sm:text-[2.4rem] leading-none mb-2">Свързани лица и изпълнители</h2>
      <p className="text-muted mb-4">По Търговския регистър, с историята на фирмите: длъжностни лица, които са или са били във фирма заедно с хора, чиито фирми печелят поръчки от възложители в общината. Проверени досега: {checked} души.</p>
      {rows.length === 0 ? <p className="bg-surface rounded-sm p-4">Сред проверените досега не намираме такива връзки.</p> : (
        <ul className="space-y-3">{rows.map(({ slug, p, hits }) => {
          const firms = [...new Map(hits.map((h) => [h.f, h])).values()];
          return (
            <li key={slug} className="ring-1 ring-rule rounded-sm p-3 bg-white">
              <p><Link href={`/lica/${slug}#svarzani`} className="font-semibold">{p.name}</Link> <span className="text-sm text-muted">· {p.role.toLowerCase()}</span></p>
              <ul className="text-sm mt-1 space-y-0.5">{firms.map((h) => { const s = bySup.get(h.f)!; return (
                <li key={h.f}><Link href={firmUrl(s.eik)}>{s.name}</Link>: {s.contracts} договора, {fmtEur(s.total_eur)}{h.who ? <span className="text-muted"> · през {titleCase(h.who)}</span> : <span className="text-muted"> · самото лице е вписано</span>}</li>
              ); })}</ul>
            </li>
          );
        })}</ul>
      )}
      <p className="text-sm text-muted mt-3">Връзките са по три имена, без ЕГН: възможни са съвпадения. Бивше съдружие не е нарушение; това е повод за въпрос, не доказателство.</p>
    </section>
  );
}
