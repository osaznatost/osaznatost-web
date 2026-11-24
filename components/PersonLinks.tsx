import Link from "next/link";
import { connection } from "next/server";
import { data } from "@/lib/data";
import { firmUrl, fmtEur, placeSuppliersAll, supplierStats } from "@/lib/procurement";

type Role = { role: string; from?: string; to?: string | null; share?: string };
type Other = Role & { n: string; eik?: string };
type Firm = { eik: string; name: string; status?: number; mine: Role[]; others: Other[] };
type Through = { eik: string; name: string; role: string; from?: string; to?: string | null };
type CoFirm = { eik: string; name: string; roles?: string[] };
type Co = { n: string; via: string[]; through?: Record<string, Through>; firms: CoFirm[] };
export type PersonLinksData = { name: string; role: string; firms: Firm[]; co: Co[] };
type Sup = { eik: string; name: string; contracts: number; total_eur: number | null };

const y = (d?: string | null) => (d ? d.slice(0, 4) : "");
const period = (r: { from?: string; to?: string | null }) => (r.from ? `${y(r.from)}–${r.to ? y(r.to) : "досега"}` : r.to ? `до ${y(r.to)}` : "");
const roleText = (r: Role) => [r.role, period(r)].filter(Boolean).join(" ");
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
const firmName = (s: string) => s.replace(/["„“”]/g, "").replace(/\s+/g, " ").trim();
const short = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const mln = (v: number | null | undefined) => (v == null ? "–" : v >= 1e6 ? `${(v / 1e6).toLocaleString("bg-BG", { maximumFractionDigits: 2 })} млн. €` : fmtEur(v));

function overlap(a: { from?: string; to?: string | null }, b: { from?: string; to?: string | null }) {
  return (a.from ?? "0000") <= (b.to ?? "9999") && (b.from ?? "0000") <= (a.to ?? "9999");
}

type Step = { label: string; href?: string; kind: "person" | "firm" | "target" };
type Path = { target: Sup; steps: Step[]; edges: string[]; together: boolean };

/** Всички пътеки от лицето до изпълнители на поръчки в общината: лице → обща фирма (→ фирма-съдружник) → човек → изпълнител. */
function buildPaths(p: PersonLinksData, bySup: Map<string, Sup>): Path[] {
  const firmsById = new Map(p.firms.map((f) => [f.eik, f]));
  const me: Step = { label: titleCase(p.name), kind: "person" };
  const out: Path[] = [];
  for (const f of p.firms) {
    const s = bySup.get(f.eik);
    if (s) out.push({ target: s, steps: [me, { label: firmName(f.name), href: firmUrl(s.eik), kind: "target" }], edges: [f.mine.map(roleText).join(", ")], together: true });
  }
  for (const c of p.co) for (const t of c.firms) {
    const s = bySup.get(t.eik);
    if (!s) continue;
    for (const e of c.via) {
      const sf = firmsById.get(e);
      if (!sf) continue;
      const his = sf.others.filter((o) => o.n.toUpperCase() === c.n.toUpperCase());
      const th = his.length ? undefined : c.through?.[e];
      const mine = sf.mine.map(roleText).join(", ");
      const target: Step = { label: firmName(t.name), href: firmUrl(s.eik), kind: "target" };
      const person: Step = { label: titleCase(c.n), kind: "person" };
      if (th) {
        const ent = sf.others.find((o) => o.eik?.slice(0, 9) === th.eik);
        out.push({ target: s, steps: [me, { label: firmName(sf.name), kind: "firm" }, { label: firmName(th.name), kind: "firm" }, person, target],
          edges: [mine, ent ? `съдружник ${period(ent)}` : "съдружник", roleText(th), (t.roles ?? []).join(", ")],
          together: sf.mine.some((m) => overlap(m, th) && (!ent || overlap(m, ent))) });
      } else if (his.length) {
        out.push({ target: s, steps: [me, { label: firmName(sf.name), kind: "firm" }, person, target],
          edges: [mine, his.map(roleText).join(", "), (t.roles ?? []).join(", ")], together: his.some((h) => sf.mine.some((m) => overlap(h, m))) });
      }
    }
  }
  return out;
}

/** Схема: лице → общи фирми → хора → изпълнители. Чертае се на сървъра (SVG). */
function Graph({ paths }: { paths: Path[] }) {
  // Колони: 0 лице, 1 обща фирма (с фирмата-съдружник, ако има), 2 човек, 3 изпълнител.
  const cols: Map<string, { step: Step; i: number }>[] = [new Map(), new Map(), new Map(), new Map()];
  const links = new Map<string, { a: string; b: string; strong: boolean }>();
  for (const pa of paths) {
    const st: (Step | null)[] = pa.steps.length === 2 ? [pa.steps[0], null, null, pa.steps[1]]
      : pa.steps.length === 4 ? pa.steps
      : [pa.steps[0], { ...pa.steps[1], label: `${pa.steps[1].label} ← ${pa.steps[2].label}` }, pa.steps[3], pa.steps[4]];
    let prev: string | null = null;
    st.forEach((s, ci) => {
      if (!s) return;
      const id = `${ci}:${s.label}`;
      if (!cols[ci].has(id)) cols[ci].set(id, { step: s, i: cols[ci].size });
      if (prev) { const k = `${prev}>${id}`; const l = links.get(k); links.set(k, { a: prev, b: id, strong: (l?.strong ?? false) || pa.together }); }
      prev = id;
    });
  }
  const rows = Math.max(...cols.map((c) => c.size), 1);
  const W = 1000, rowH = 46, H = Math.max(170, rows * rowH + 50), X = [80, 350, 620, 850];
  const pos = new Map<string, { x: number; y: number }>();
  cols.forEach((c, ci) => { const off = 30 + (H - 30 - c.size * rowH) / 2; for (const [id, v] of c) pos.set(id, { x: X[ci], y: off + v.i * rowH + rowH / 2 }); });
  const color = { person: "#16201b", firm: "#b08436", target: "#c8102e" } as const;
  return (
    <div className="w-full overflow-x-auto bg-white rounded-sm ring-1 ring-rule">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[720px]" role="img" aria-label="Схема на връзките">
        {["Лицето", "Общи фирми", "Хора в тях", "Печелят обществени поръчки"].map((t, i) => <text key={t} x={i === 3 ? W - 8 : X[i]} y={18} textAnchor={i === 3 ? "end" : "middle"} fontSize={12} fill="#56605b">{t}</text>)}
        {[...links.values()].map(({ a, b, strong }) => {
          const p1 = pos.get(a)!, p2 = pos.get(b)!, mx = (p1.x + p2.x) / 2;
          return <path key={`${a}>${b}`} d={`M${p1.x},${p1.y} C${mx},${p1.y} ${mx},${p2.y} ${p2.x},${p2.y}`} fill="none" stroke={strong ? "#c8102e" : "#9aa39e"} strokeOpacity={strong ? 0.55 : 0.6} strokeWidth={strong ? 2.5 : 1.5} strokeDasharray={strong ? undefined : "5 4"} />;
        })}
        {cols.flatMap((c, ci) => [...c].map(([id, { step }]) => {
          const p = pos.get(id)!, right = ci === 3, left = ci === 0;
          const node = (
            <g>
              {step.kind === "person" ? <circle cx={p.x} cy={p.y} r={left ? 11 : 8} fill={color.person} /> : <rect x={p.x - 8} y={p.y - 8} width={16} height={16} rx={3} fill={color[step.kind]} />}
              <text x={right ? p.x + 14 : p.x} y={left ? p.y + 27 : right ? p.y + 4 : p.y - 13} textAnchor={right ? "start" : "middle"} fontSize={12.5} fontWeight={600} fill="#16201b" stroke="#fff" strokeWidth={4} paintOrder="stroke">{short(step.label, right ? 20 : 30)}</text>
              <title>{step.label}</title>
            </g>
          );
          return step.href ? <a key={id} href={step.href}>{node}</a> : <g key={id}>{node}</g>;
        }))}
      </svg>
      <p className="text-xs text-muted px-3 pb-2">Червена плътна линия: били са във фирмата по едно и също време. Сива прекъсната: по различно време. Квадрат: фирма, кръг: човек. Натисни изпълнител за договорите му.</p>
    </div>
  );
}

function Chain({ pa }: { pa: Path }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-2 text-sm">
      {pa.steps.map((s, i) => (
        <li key={i} className="flex items-center">
          {i > 0 && <span className="mx-1.5 text-muted text-xs flex flex-col items-center leading-tight max-w-[11rem] text-center"><span>{pa.edges[i - 1] || ""}</span><span aria-hidden>→</span></span>}
          <span className={`px-2 py-1 rounded-sm ${s.kind === "person" ? "bg-ink text-white" : s.kind === "firm" ? "bg-surface ring-1 ring-rule" : "bg-white ring-2 ring-red font-semibold"}`}>{s.href ? <Link href={s.href} className="text-inherit">{s.label}</Link> : s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function Timeline({ firms }: { firms: Firm[] }) {
  const now = new Date().getFullYear();
  const years = firms.flatMap((f) => f.mine.map((m) => +y(m.from))).filter((v) => v > 1980);
  const start = Math.min(now - 5, ...years), span = now - start + 1;
  const pct = (yr: number) => ((yr - start) / span) * 100;
  return (
    <ul className="space-y-2">
      {firms.map((f) => (
        <li key={f.eik} className="grid grid-cols-[minmax(0,10rem)_1fr] sm:grid-cols-[16rem_1fr] gap-3 items-center">
          <span className="text-sm truncate" title={firmName(f.name)}>{firmName(f.name)}</span>
          <span className="relative h-5 bg-surface rounded-sm">
            {f.mine.map((m, i) => {
              const a = +y(m.from) || start, b = m.to ? +y(m.to) + 1 : now + 1;
              return <span key={i} title={roleText(m)} className={`absolute rounded-sm ${m.role === "съдружник" || m.role === "едноличен собственик" ? "bg-[#b08436] top-2.5 bottom-0.5" : "bg-ink top-0.5 bottom-2.5"}`} style={{ left: `${pct(a)}%`, width: `${Math.max(1.5, pct(b) - pct(a))}%` }} />;
            })}
          </span>
        </li>
      ))}
      <li className="grid grid-cols-[minmax(0,10rem)_1fr] sm:grid-cols-[16rem_1fr] gap-3 text-xs text-muted"><span /><span className="flex justify-between"><span>{start}</span><span>{Math.round(start + span / 2)}</span><span>{now}</span></span></li>
    </ul>
  );
}

type Rev = { c: string; s: string; n: string; r: string; mine?: Role[]; via?: string; vr?: string[]; in?: string[] };

/** Изпълнителите, с които се сравнява: за общинските лица — тези в общината; за депутатите — всички фирми с поръчки в страната. */
async function suppliersFor(code: string, p: PersonLinksData): Promise<Sup[]> {
  if (code !== "MP") return (await placeSuppliersAll(code)) as Sup[];
  const rev = (await data<Record<string, Rev[]>>("tr-links/by-firm.json")) ?? {};
  const cand = [...new Set([...p.firms.map((f) => f.eik), ...p.co.flatMap((c) => c.firms.map((f) => f.eik))])].filter((e) => rev[e]).slice(0, 30);
  const st = await Promise.all(cand.map((e) => supplierStats(e).catch(() => undefined)));
  return st.filter(Boolean).map((x) => ({ eik: x!.eik, name: x!.name, contracts: x!.contracts, total_eur: x!.total_eur }));
}

/** Свързани лица по Търговския регистър, с историята: фирмите на лицето, хората с него в тях и техните фирми с поръчки в общината. */
export async function PersonLinks({ code, slug }: { code: string; slug: string }) {
  await connection(); // при отваряне, не при изграждането: заявките към базата не бива да спъват build-а
  const all = await data<Record<string, PersonLinksData>>(`tr-links/${code}.json`);
  const p = all?.[slug];
  if (!p) return <p className="text-[15px] text-muted max-w-3xl">Търговският регистър (с историята на фирмите) за това лице още се проверява. Обхождаме длъжностните лица поред, щадящо за регистъра.</p>;
  const sup = await suppliersFor(code, p);
  const where = code === "MP" ? "в страната" : "в общината";
  const bySup = new Map(sup.map((s) => [s.eik.slice(0, 9), s]));
  const paths = buildPaths(p, bySup);
  const groups = [...paths.reduce((m, pa) => m.set(pa.target.eik, [...(m.get(pa.target.eik) ?? []), pa]), new Map<string, Path[]>()).values()]
    .sort((a, b) => (b[0].target.total_eur ?? 0) - (a[0].target.total_eur ?? 0));
  const total = groups.reduce((x, g) => x + (g[0].target.total_eur ?? 0), 0);

  return (
    <div className="space-y-8 text-[15px] max-w-5xl">
      {groups.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Свързани изпълнители</p><p className="display num text-[2.2rem] leading-none mt-1">{groups.length}</p></div>
            <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Техните договори {where}</p><p className="display num text-[2.2rem] leading-none mt-1">{groups.reduce((x, g) => x + g[0].target.contracts, 0)}</p></div>
            <div className="bg-surface rounded-sm p-4 col-span-2 sm:col-span-1"><p className="text-sm text-muted">Обща стойност</p><p className="display num text-[2.2rem] leading-none mt-1">{mln(total)}</p></div>
          </div>
          <Graph paths={paths} />
          <ul className="space-y-3">
            {groups.map((g) => {
              const t = g[0].target;
              const seen = new Set<string>();
              const uniq = g.filter((pa) => { const k = pa.steps.map((s) => s.label).join(">"); if (seen.has(k)) return false; seen.add(k); return true; })
                .sort((a, b) => Number(b.together) - Number(a.together) || a.steps.length - b.steps.length);
              return (
                <li key={t.eik} className="ring-1 ring-rule rounded-sm bg-white">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3 pb-2 border-b border-rule">
                    <Link href={firmUrl(t.eik)} className="font-semibold text-[17px]">{firmName(t.name)}</Link>
                    <span className="text-sm"><b className="num">{t.contracts}</b> договора · <b className="num">{mln(t.total_eur)}</b></span>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    {uniq.slice(0, 4).map((pa, i) => (
                      <div key={i}>
                        <Chain pa={pa} />
                        {!pa.together && <p className="text-xs text-muted mt-1">Не са били във фирмата по едно и също време.</p>}
                      </div>
                    ))}
                    {uniq.length > 4 && (
                      <details><summary className="cursor-pointer text-sm">Още {uniq.length - 4} пътя до тази фирма</summary>
                        <div className="space-y-3 mt-3">{uniq.slice(4).map((pa, i) => <Chain key={i} pa={pa} />)}</div>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted">Връзките са по три имена, защото регистърът не показва ЕГН: възможно е съвпадение на имена. Бивше съдружие не е нарушение. Това е повод за въпрос, например дали лицето е декларирало конфликт на интереси, а не доказателство.</p>
        </div>
      )}

      <div>
        <p className="font-semibold mb-3">Фирми, в които е вписан човек с тези три имена, във времето ({p.firms.length})</p>
        {p.firms.length === 0 ? <p className="text-muted">Търговският регистър не намира такова име като управител, съдружник или собственик.</p> : (
          <>
            <Timeline firms={p.firms} />
            <p className="text-xs text-muted mt-2"><span className="inline-block w-3 h-2 bg-ink align-middle mr-1" />управител или член на съвет <span className="inline-block w-3 h-2 bg-[#b08436] align-middle ml-3 mr-1" />съдружник или собственик</p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm">Подробно: роли, дялове и хората във всяка фирма</summary>
              <ul className="divide-y divide-rule border-y border-rule mt-2">
                {p.firms.map((f) => {
                  const s = bySup.get(f.eik);
                  return (
                    <li key={f.eik} className="py-2.5">
                      <p>{s ? <Link href={firmUrl(s.eik)}>{firmName(f.name)}</Link> : <a href={`https://portal.registryagency.bg/CR/Reports/ActiveConditionTabResult?uic=${f.eik}`} target="_blank" rel="noreferrer">{firmName(f.name)}</a>}<span className="text-sm text-muted"> · ЕИК {f.eik}</span></p>
                      <p className="text-sm">Лицето: {f.mine.length ? f.mine.map((m) => [roleText(m), m.share].filter(Boolean).join(", ")).join("; ") : "в орган на управление"}</p>
                      {f.others.length > 0 && <p className="text-sm text-muted">С него във фирмата, някога: {f.others.slice(0, 14).map((o) => `${o.eik ? firmName(o.n) : titleCase(o.n)} (${roleText(o)})`).join(" · ")}{f.others.length > 14 ? ` и още ${f.others.length - 14}` : ""}</p>}
                    </li>
                  );
                })}
              </ul>
            </details>
          </>
        )}
        <p className="text-sm text-muted mt-2">Източник: Търговски регистър, Агенция по вписванията, търсене по име с включена история и история на вписванията за всяка фирма.</p>
      </div>
    </div>
  );
}

/** За страницата на общината: длъжностните лица, свързани (пряко или през бивш/сегашен съдружник) с изпълнители на поръчки в общината. */
export async function MuniLinks({ code }: { code: string }) {
  await connection(); // при отваряне, не при изграждането: заявките към базата не бива да спъват build-а
  const all = await data<Record<string, PersonLinksData>>(`tr-links/${code}.json`);
  if (!all) return null;
  const sup = (await placeSuppliersAll(code)) as Sup[];
  const bySup = new Map(sup.map((s) => [s.eik.slice(0, 9), s]));
  const rows = Object.entries(all).map(([slug, p]) => {
    const paths = buildPaths(p, bySup);
    const firms = [...new Map(paths.map((pa) => [pa.target.eik, pa])).values()];
    return { slug, p, firms, total: firms.reduce((s, pa) => s + (pa.target.total_eur ?? 0), 0) };
  }).filter((r) => r.firms.length).sort((a, b) => b.total - a.total);
  return (
    <section id="svarzani" className="mb-12 scroll-mt-32 lg:scroll-mt-24 max-w-4xl text-[15px]">
      <h2 className="display text-[1.9rem] sm:text-[2.4rem] leading-none mb-2">Свързани лица и изпълнители</h2>
      <p className="text-muted mb-4">По Търговския регистър, с историята на фирмите: длъжностни лица, които са или са били във фирма заедно с хора, чиито фирми печелят поръчки от възложители в общината. Проверени досега: {Object.keys(all).length} души.</p>
      {rows.length === 0 ? <p className="bg-surface rounded-sm p-4">Сред проверените досега не намираме такива връзки.</p> : (
        <ul className="grid gap-3 sm:grid-cols-2">{rows.map(({ slug, p, firms, total }) => (
          <li key={slug} className="ring-1 ring-rule rounded-sm p-4 bg-white">
            <p><Link href={`/lica/${slug}#svarzani`} className="font-semibold">{p.name}</Link></p>
            <p className="text-sm text-muted">{p.role}</p>
            <p className="mt-2"><b className="num">{firms.length}</b> свързани изпълнители · <b className="num">{mln(total)}</b></p>
            <ul className="text-sm mt-1 space-y-0.5">{firms.slice(0, 4).map((pa) => <li key={pa.target.eik}><Link href={firmUrl(pa.target.eik)}>{firmName(pa.target.name)}</Link> <span className="text-muted">· {mln(pa.target.total_eur)}{pa.steps.length > 2 ? ` · през ${pa.steps[pa.steps.length - 2].label}` : " · пряко"}</span></li>)}</ul>
          </li>
        ))}</ul>
      )}
      <p className="text-sm text-muted mt-3">Връзките са по три имена, без ЕГН: възможни са съвпадения. Бивше съдружие не е нарушение; това е повод за въпрос, не доказателство.</p>
    </section>
  );
}

/** Длъжностните лица, свързани с фирмата по Търговския регистър (пряко или през човек от друга обща фирма). */
export async function officialLinks(eik: string): Promise<Rev[]> {
  const rev = (await data<Record<string, Rev[]>>("tr-links/by-firm.json"))?.[eik.slice(0, 9)] ?? [];
  const seen = new Set<string>();
  return rev.filter((r) => { const k = `${r.s}|${r.via ?? ""}`; if (seen.has(k)) return false; seen.add(k); return true; });
}
export const officialHref = (r: { c: string; s: string }) => (r.c === "MP" ? `/parlament/deputat/${r.s.slice(3)}` : `/lica/${r.s}#svarzani`);
export const viaText = (r: Rev) => (r.via ? `през ${titleCase(r.via)}${r.in?.length ? ` (${r.in.map(firmName).join(", ")})` : ""}` : "пряко вписан(а) във фирмата");

/** За страницата на фирмата: длъжностни лица, свързани с нея пряко или през човек, който е бил с тях в друга фирма. */
export async function FirmOfficials({ eik }: { eik: string }) {
  const rev = (await data<Record<string, Rev[]>>("tr-links/by-firm.json"))?.[eik.slice(0, 9)] ?? [];
  if (!rev.length) return null;
  const href = (r: Rev) => (r.c === "MP" ? `/parlament/deputat/${r.s.slice(3)}` : `/lica/${r.s}#svarzani`);
  const seen = new Set<string>();
  const rows = rev.filter((r) => { const k = `${r.s}|${r.via ?? ""}`; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => Number(!!a.via) - Number(!!b.via));
  return (
    <div className="ring-2 ring-red rounded-sm p-4 bg-white text-[15px] space-y-2 max-w-4xl">
      <p className="font-semibold">Свързана с длъжностни лица (по Търговския регистър, с историята)</p>
      <ul className="space-y-2">{rows.slice(0, 20).map((r, i) => (
        <li key={i} className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="px-2 py-1 rounded-sm bg-white ring-2 ring-red font-semibold">тази фирма</span>
          {r.via ? <>
            <span className="text-muted text-xs">{(r.vr ?? []).join(", ")} →</span>
            <span className="px-2 py-1 rounded-sm bg-ink text-white">{titleCase(r.via)}</span>
            <span className="text-muted text-xs">заедно във {(r.in ?? []).map(firmName).join(", ")} →</span>
          </> : <span className="text-muted text-xs">{(r.mine ?? []).map(roleText).join(", ")} →</span>}
          <Link href={href(r)} className="px-2 py-1 rounded-sm bg-surface ring-1 ring-rule">{r.n}</Link>
          <span className="text-muted text-xs">{r.r.toLowerCase()}</span>
        </li>
      ))}</ul>
      {rows.length > 20 && <p className="text-sm text-muted">и още {rows.length - 20}</p>}
      <p className="text-xs text-muted">Връзките са по три имена, без ЕГН: възможни са съвпадения. Това е повод за въпрос, не доказателство.</p>
    </div>
  );
}

/** За страницата на фирмата: кой е бил управител, съдружник или собственик и кога (историята от Търговския регистър). */
export async function FirmHistory({ eik }: { eik: string }) {
  const rec = (await data<Record<string, { name: string; people: Other[] }>>(`tr-hist/${eik.slice(0, 2)}.json`))?.[eik.slice(0, 9)];
  if (!rec?.people.length) return null;
  const byName = new Map<string, { n: string; eik?: string; roles: Other[] }>();
  for (const p of rec.people) { const k = p.n.toUpperCase(); const v = byName.get(k) ?? { n: p.n, eik: p.eik, roles: [] }; v.roles.push(p); byName.set(k, v); }
  const rows = [...byName.values()].sort((a, b) => (a.roles[0].from ?? "") < (b.roles[0].from ?? "") ? -1 : 1);
  const now = new Date().getFullYear();
  const start = Math.min(now - 5, ...rec.people.map((p) => +y(p.from)).filter((v) => v > 1980)), span = now - start + 1;
  const pct = (yr: number) => ((yr - start) / span) * 100;
  return (
    <div className="max-w-4xl">
      <p className="font-semibold mb-1">Собственици и управители във времето</p>
      <p className="text-sm text-muted mb-3">Включително бившите, по историята на вписванията в Търговския регистър.</p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.n} className="grid grid-cols-[minmax(0,10rem)_1fr] sm:grid-cols-[16rem_1fr] gap-3 items-center">
            <span className="text-sm truncate" title={`${r.n}: ${r.roles.map(roleText).join("; ")}`}>{r.eik ? firmName(r.n) : titleCase(r.n)}</span>
            <span className="relative h-5 bg-surface rounded-sm">
              {r.roles.map((m, i) => {
                const a = +y(m.from) || start, b = m.to ? +y(m.to) + 1 : now + 1;
                return <span key={i} title={[roleText(m), m.share].filter(Boolean).join(", ")} className={`absolute rounded-sm ${m.role === "съдружник" || m.role === "едноличен собственик" ? "bg-[#b08436] top-2.5 bottom-0.5" : "bg-ink top-0.5 bottom-2.5"}`} style={{ left: `${pct(a)}%`, width: `${Math.max(1.5, pct(b) - pct(a))}%` }} />;
              })}
            </span>
          </li>
        ))}
        <li className="grid grid-cols-[minmax(0,10rem)_1fr] sm:grid-cols-[16rem_1fr] gap-3 text-xs text-muted"><span /><span className="flex justify-between"><span>{start}</span><span>{Math.round(start + span / 2)}</span><span>{now}</span></span></li>
      </ul>
      <p className="text-xs text-muted mt-2"><span className="inline-block w-3 h-2 bg-ink align-middle mr-1" />управител или член на съвет <span className="inline-block w-3 h-2 bg-[#b08436] align-middle ml-3 mr-1" />съдружник или собственик · Задръж върху лента за подробности.</p>
    </div>
  );
}
