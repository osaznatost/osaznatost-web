import Link from "next/link";
import { Page, Title } from "@/components/ui";
import { oblastList, oblastStats } from "@/lib/regions";

export const metadata = { title: "Области и общини" };

export default function Mesta() {
  const rows = oblastList().map((o) => ({ o, s: oblastStats(o.prefix, o.municipalities) })).sort((a, b) => a.o.name.localeCompare(b.o.name, "bg"));
  return (
    <Page>
      <Title lead="Всяка област и община на една страница: икономика, бюджет и дълг на общината, европейски средства, обществени поръчки и как е гласувала.">Области и общини</Title>
      <p className="text-[15px] mb-4"><Link href="/vlast/obshtinski-savet" className="font-semibold">Общинските съвети в страната: решения и гласувания по общини →</Link></p>
      <div className="overflow-x-auto ring-1 ring-rule rounded-sm bg-white">
        <table className="w-full text-[15px]">
          <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="p-3">Област</th><th className="p-3 num">Общини</th><th className="p-3 num">Население</th><th className="p-3 num">БВП на човек</th><th className="p-3 num">Евросредства на човек</th></tr></thead>
          <tbody>{rows.map(({ o, s }) => (
            <tr key={o.slug} className="border-t border-rule">
              <td className="p-3"><Link href={`/mesta/${o.slug}`} className="font-semibold">{o.name}</Link></td>
              <td className="p-3 num">{o.municipalities.length}</td>
              <td className="p-3 num">{s.pop ? s.pop.toLocaleString("bg-BG") : "–"}</td>
              <td className="p-3 num">{s.gdpPc ? `${Math.round(s.gdpPc.value).toLocaleString("bg-BG")} €` : "–"}</td>
              <td className="p-3 num">{s.euPc ? `${Math.round(s.euPc).toLocaleString("bg-BG")} €` : "–"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="text-xs text-muted mt-3">БВП на човек: Евростат (последна година). Евросредства: договорени по ИСУН, разделени по общини. Население: по данните, използвани от „Наясно“. За страната като цяло виж <Link href="/ikonomika/struktura">анатомията на икономиката</Link>.</p>
    </Page>
  );
}
