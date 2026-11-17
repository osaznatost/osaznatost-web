import { Page, Title } from "@/components/ui";
import { Compound } from "./Compound";

export const metadata = { title: "Спестяване или инвестиране" };

export default function Page_() {
  return (
    <Page>
      <Title kicker="Калкулатор" lead="Какво става с парите ви след години, ако стоят, ако са на депозит или ако са инвестирани.">
        Спестяване или инвестиране
      </Title>
      <Compound />
    </Page>
  );
}
