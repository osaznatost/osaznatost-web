import { Page, Title } from "@/components/ui";
import { Taxes } from "./Taxes";

export const metadata = { title: "Данъци по пътя" };

export default function Page_() {
  return (
    <Page>
      <Title kicker="Калкулатор" lead="От всяко евро, което струва трудът ви, колко стига до вас и колко отива в държавата: осигуровки, данък, ДДС, акциз.">
        Данъци по пътя
      </Title>
      <Taxes />
    </Page>
  );
}
