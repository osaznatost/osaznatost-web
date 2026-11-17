import Link from "next/link";
import { Page, Title } from "@/components/ui";

export const metadata = { title: "Калкулатори" };

const calcs = [
  { href: "/kalkulatori/kredit", t: "Кредит", d: "Колко ще ви струва кредитът и дали банката ще ви го отпусне. Ипотечен, за кола или потребителски." },
  { href: "/kalkulatori/lichna-inflaciya", t: "Лична инфлация", d: "Официалната инфлация е средна стойност. Вижте колко са поскъпнали точно вашите разходи." },
  { href: "/kalkulatori/slozhna-lihva", t: "Спестяване или инвестиране", d: "Какво става с парите ви след 10, 20 или 30 години, ако стоят, ако са на депозит или ако са инвестирани." },
  { href: "/kalkulatori/danaci", t: "Данъци по пътя", d: "От всяко евро, което струва трудът ви, колко стига до вас и колко отива в държавата." },
  { href: "/kalkulatori/nuzhen-dohod", t: "Нужен доход", d: "Каква заплата ви трябва, за да живеете така, както искате, там, където живеете." },
];

export default function Kalkulatori() {
  return (
    <Page>
      <Title lead="Всички изчисления са с актуалните ставки за 2026 г. Под всеки резултат е написано откъде са числата.">
        Калкулатори
      </Title>
      <ul className="max-w-3xl">
        {calcs.map((c) => (
          <li key={c.href} className="border-b border-rule py-5">
            <Link href={c.href} className="text-xl font-semibold">{c.t}</Link>
            <p className="text-muted mt-1">{c.d}</p>
          </li>
        ))}
      </ul>
    </Page>
  );
}
