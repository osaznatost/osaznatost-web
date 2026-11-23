import Link from "next/link";
import { Page, Title } from "@/components/ui";
import { minData, minister, shortName } from "@/lib/ministries";

export const metadata = { title: "Министерствата: кой ги ръководи и колко хора работят в тях" };
const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" }) : "");

export default async function Ministerstva() {
  const MD = await minData();
  const list = [...MD.ministries].sort((a, b) => a.name.localeCompare(b.name, "bg"));
  const staff = list.reduce((a, m) => a + m.staff, 0);
  return (
    <Page>
      <Title back={{ href: "/vlast", label: "Властта" }} kicker="Власт"
        lead="Всяко министерство: кой го ръководи и от кога, как е устроено, колко души работят в него, кои агенции са към него и колко поръчки възлагат. Данните са от официалния Административен регистър и се обновяват всяка седмица.">
        Министерствата
      </Title>
      <p className="text-[15px] mb-6 max-w-3xl">{list.length} министерства с общо <b>{staff.toLocaleString("bg-BG")}</b> щатни бройки по Административния регистър, без агенциите към тях. Вътрешното министерство включва и полицията, затова е най-голямо.</p>
      <ul className="divide-y divide-rule border-y border-rule">
        {list.map((m) => {
          const h = minister(m);
          return (
            <li key={m.id} className="py-3 grid sm:grid-cols-[1fr_12rem] gap-x-4">
              <span>
                <Link href={`/vlast/ministerstva/${m.id}`} className="font-semibold">{shortName(m.name)}</Link>
                <span className="block text-sm text-muted">{h?.person ? `${h.person}${h.since ? `, от ${d(h.since)}` : ""}` : "министърът не е вписан в регистъра"}</span>
              </span>
              <span className="text-sm sm:text-right num">{m.staff.toLocaleString("bg-BG")} щатни бройки{m.vacant ? `, ${m.vacant} незаети` : ""}<span className="block text-muted">{m.agencies.length} {m.agencies.length === 1 ? "структура" : "структури"} към него</span></span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted mt-3">Източник: <a href={MD.url}>{MD.source}</a>, към {d(MD.updated)}.</p>
    </Page>
  );
}
