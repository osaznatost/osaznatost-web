"use client";
import { usePathname } from "next/navigation";

const REPO = "https://github.com/osaznatost/osaznatost-web/issues/new";

/** Линк „Съобщи за грешка“ с адреса на текущата страница. Отваря публичен сигнал в GitHub (без събиране на лични данни от нас). */
export function ReportError() {
  const path = usePathname() || "/";
  const title = `Грешка на ${path}`;
  const body = `Страница: https://osaznatost.pavlin140.workers.dev${path}\n\nКакво е грешно:\n\nКакво трябва да пише (и източник, ако имате):\n`;
  return <a href={`${REPO}?labels=${encodeURIComponent("грешка")}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`} target="_blank" rel="noreferrer">Съобщи за грешка</a>;
}
