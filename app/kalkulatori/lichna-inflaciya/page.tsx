import { Page, Title } from "@/components/ui";
import { Inflation } from "./Inflation";

export const metadata = { title: "Лична инфлация" };

export default function Page_() {
  return (
    <Page>
      <Title kicker="Калкулатор" lead="Официалната инфлация е средна стойност за всички. Вижте колко са поскъпнали точно вашите разходи.">
        Лична инфлация
      </Title>
      <Inflation />
    </Page>
  );
}
