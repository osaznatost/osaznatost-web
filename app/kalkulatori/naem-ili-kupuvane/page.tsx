import { Page, Title } from "@/components/ui";
import { RentBuy } from "./RentBuy";

export const metadata = { title: "Наем или покупка на жилище" };

export default function Page_() {
  return (
    <Page>
      <Title back={{ href: "/kalkulatori", label: "Калкулатори" }} kicker="Калкулатор" lead="Кое излиза по-изгодно след години: да купите с кредит или да плащате наем и да инвестирате разликата.">
        Наем или покупка на жилище
      </Title>
      <RentBuy />
    </Page>
  );
}
