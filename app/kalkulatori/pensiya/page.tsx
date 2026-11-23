import { Page, Title } from "@/components/ui";
import { Pension } from "./Pension";

export const metadata = { title: "Каква пенсия ще получа" };

export default function Page_() {
  return (
    <Page>
      <Title back={{ href: "/kalkulatori", label: "Калкулатори" }} kicker="Калкулатор" lead="Ориентировъчната пенсия от НОИ според заплатата и стажа, с правилата за 2026 г.">
        Каква пенсия ще получа
      </Title>
      <Pension />
    </Page>
  );
}
