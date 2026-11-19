import Link from "next/link";
import { Page, Title } from "@/components/ui";
import feeds from "@/content/feeds.json";
import { Status } from "./Status";

export const metadata = { title: "Състояние на данните", description: "Кога за последно е обновен всеки източник на „Осъзнатост“." };

export default function Sastoyanie() {
  return (
    <Page narrow>
      <Title lead={<>Данните се обновяват автоматично по график. Тук се вижда, направо от системата за автоматизация (GitHub Actions), кога всеки източник е обновен за последно. Ако някой закъснява, получаваме известие. <Link href="/metodologiya#avtomatichno">Кое е автоматично и кое пишат хора</Link>.</>}>
        Състояние на данните
      </Title>
      <Status feeds={feeds} />
      <p className="text-sm text-muted mt-6">„Успешно“ значи, че източникът е прочетен. Ако институцията не е публикувала нищо ново, данните остават същите. Плащанията от СЕБРА засега се обновяват на ръка, докато порталът за отворени данни разреши автоматичен достъп.</p>
    </Page>
  );
}
