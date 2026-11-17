import Link from "next/link";
import { Page, Title } from "@/components/ui";

export const metadata = { title: "Проверки" };

export default function Proverki() {
  return (
    <Page narrow>
      <Title lead="Разделяме публичните твърдения на отделни части и сравняваме всяка с официалните данни. Без значение кой ги е казал.">
        Проверки
      </Title>
      <ul>
        <li className="border-b border-rule py-5">
          <p className="text-sm text-muted">17 ноември 2026 · Дълг</p>
          <Link href="/proverki/dalg-2026" className="text-xl font-semibold">Дългът: два поста, противоположни изводи</Link>
        </li>
      </ul>
    </Page>
  );
}
