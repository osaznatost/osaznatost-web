import { Page, Title } from "@/components/ui";
import { Kredit } from "./Kredit";

export const metadata = { title: "Кредит" };

export default function Page_() {
  return (
    <Page>
      <Title kicker="Калкулатор" lead="Колко ще ви струва кредитът и дали банката ще ви го отпусне според правилата на БНБ.">
        Кредит
      </Title>
      <Kredit />
    </Page>
  );
}
