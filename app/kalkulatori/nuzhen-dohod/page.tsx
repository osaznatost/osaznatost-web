import { Page, Title } from "@/components/ui";
import { Income } from "./Income";

export const metadata = { title: "Нужен доход" };

export default function Page_() {
  return (
    <Page>
      <Title kicker="Калкулатор" lead="Каква заплата ви трябва, за да живеете така, както искате, и колко да отделяте за пенсията.">
        Нужен доход
      </Title>
      <Income />
    </Page>
  );
}
