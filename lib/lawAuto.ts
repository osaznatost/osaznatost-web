// Автоматично извлечени цитати от документите на парламента (data/laws-auto.json, от scripts/build-law-auto.mjs).
import { data } from "@/lib/data";

export type AutoLaw = {
  id: number; sign: string; title: string; url: string;
  change: string[]; positions: string[]; critics: string[]; support: string[];
  hall: { who: string; group: string | null; text: string; date: string; stage: string; url: string }[];
  opinions: string[];
  /** „Накратко“: дословно от мотивите на вносителя (цел и основни промени), без перифразиране. */
  brief?: string[]; money?: string | null; eu?: string | null;
};
export async function autoFor(billId: number): Promise<AutoLaw | null> {
  return (await data<Record<string, AutoLaw>>("laws-auto.json"))?.[String(billId)] ?? null;
}
