import Link from "next/link";
import { Page, Title } from "@/components/ui";
import { localIndex } from "@/lib/local";
import { muniSlug, oblastSlug } from "@/lib/regions";

export const metadata = { title: "Общинските съвети: решения и гласувания по общини" };

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");
const d = (s?: string | null) => (s ? s.split("-").reverse().join(".") : "–");

// Покритие на решенията на общинските съветите: кои общини четем, колко решения имат резултат и поименно гласуване.
export default async function Savetnici() {
  const IX = await localIndex();
  const rows = Object.entries(IX.munis).filter(([, m]) => m.resolutions > 0).map(([code, m]) => ({ code, ...m })).sort((a, b) => b.resolutions - a.resolutions);
  const sum = (k: "resolutions" | "tallied" | "named" | "contested") => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
  return (
    <Page>
      <Title back={{ href: "/vlast", label: "Властта" }} kicker="Местна власт"
        lead={`Решенията на ${rows.length} общински съвета от началото на мандата (ноември 2023 г.), прочетени автоматично от сайтовете им или получени по ЗДОИ. Без изкуствен интелект: само правила. Обновява се няколко пъти на ден.`}>
        Общинските съвети в страната
      </Title>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-8">
        {[
          ["Решения", sum("resolutions").toLocaleString("bg-BG"), `в ${rows.length} общини`],
          ["С резултат от гласуването", sum("tallied").toLocaleString("bg-BG"), pct(sum("tallied"), sum("resolutions"))],
          ["С поименно гласуване", sum("named").toLocaleString("bg-BG"), "кой съветник как е гласувал"],
          ["С гласове „против“", sum("contested").toLocaleString("bg-BG"), pct(sum("contested"), sum("tallied")) + " от гласуваните"],
        ].map(([l, v, n]) => <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[2rem] mt-1">{v}</p><p className="text-xs text-muted">{n}</p></div>)}
      </section>
      <p className="text-[15px] text-muted mb-4 max-w-3xl">Където няма резултат от гласуването, общината не го публикува заедно с решението. Тогава го търсим в протоколите на заседанията или го искаме по Закона за достъп до обществена информация.</p>
      <div className="overflow-x-auto"><table className="w-full text-[15px] num min-w-[720px]">
        <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Община</th><th className="text-right px-2">Решения</th><th className="text-right px-2">С резултат</th><th className="text-right px-2">Поименно</th><th className="text-right px-2">Единодушни</th><th className="text-right px-2">С „против“</th><th className="px-2">Период</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.code} className="border-b border-rule">
            <td className="py-1.5 pr-3" data-label="Община"><Link href={`/mesta/${oblastSlug(r.code)}/${muniSlug(r.code)}/resheniya`}>{r.name?.replace(/^Община\s+/i, "") ?? r.code}</Link>{r.source && <> · <a href={r.source} target="_blank" rel="noreferrer" className="text-sm text-muted">източник</a></>}</td>
            <td className="text-right px-2" data-label="Решения">{r.resolutions.toLocaleString("bg-BG")}</td>
            <td className="text-right px-2" data-label="С резултат">{pct(r.tallied ?? 0, r.resolutions)}</td>
            <td className="text-right px-2" data-label="Поименно">{r.named ? pct(r.named, r.resolutions) : "–"}</td>
            <td className="text-right px-2" data-label="Единодушни">{r.tallied ? pct(r.unanimous ?? 0, r.tallied) : "–"}</td>
            <td className="text-right px-2" data-label="С „против“">{r.contested ?? 0}</td>
            <td className="px-2 text-sm" data-label="Период">{d(r.first)} – {d(r.last)}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </Page>
  );
}
