import { Page, Title } from "@/components/ui";
import { data } from "@/lib/data";
import { Hours } from "./Hours";

export const metadata = { title: "Колко време работя за това" };

export default async function Page_() {
  const L = await data<{ date: string; basket: number[]; cats: Record<string, { name: string; med: number }> }>("prices/latest.json");
  const items = L ? L.basket.map(String).filter((id) => L.cats[id]).map((id) => ({ name: L.cats[id].name.replace(/\s*\(.*\)$/, ""), price: L.cats[id].med })) : [];
  return (
    <Page>
      <Title back={{ href: "/kalkulatori", label: "Калкулатори" }} kicker="Калкулатор" lead="Цената в часове работа: колко време трябва да работите за хляб, сирене, гориво или телефон.">
        Колко време работя за това
      </Title>
      <Hours items={items} date={L?.date ?? ""} />
    </Page>
  );
}
