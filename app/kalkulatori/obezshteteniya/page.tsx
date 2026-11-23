import { Page, Title } from "@/components/ui";
import { Benefits } from "./Benefits";

export const metadata = { title: "Майчинство и болничен" };

export default function Page_() {
  return (
    <Page>
      <Title back={{ href: "/kalkulatori", label: "Калкулатори" }} kicker="Калкулатор" lead="Колко ще получавате по майчинство и колко губите при болничен, с правилата за 2026 г.">
        Майчинство и болничен
      </Title>
      <Benefits />
    </Page>
  );
}
