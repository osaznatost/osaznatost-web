import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type Census = {
  population: number; age: Record<string, number>; gender: { male: number; female: number }; education: Record<string, number>;
  employment: { activityRate: number; employmentRate: number; unemploymentRate: number };
  ethnic?: Record<string, number>; religion?: Record<string, number>; motherTongue?: Record<string, number>;
};
export type PlaceData = {
  code: string; census: Census | null;
  map: { type: "FeatureCollection"; features: { type: "Feature"; properties: { ekatte: string }; geometry: unknown }[] } | null;
  transfers?: { year: number; delegated: number; equalization: number; capital: number; winter: number; other: number; total: number }[];
  taxes: Record<string, { values: Record<string, number>; latestYear: number; latestValue: number; nationalRank: number }> | null;
  ipop: null | { year: number; rollup: { projectCount: number; agreementEur: number; paidEur: number; mrrbPaidEur: number; bbrPaidEur: number; paidPct: number; stalledCount: number };
    projects: { id: string; description: string; agreement: number; paid: number; state: number; muni: number; pct: number; stalled: boolean }[] };
};
const dir = path.join(process.cwd(), "data", "place");
export function placeData(code: string): PlaceData | null {
  const f = path.join(dir, `${code}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}
export const PLACE_OBL = JSON.parse(readFileSync(path.join(dir, "oblasts.json"), "utf8")) as {
  updated: string; country: Pick<Census, "population" | "age" | "gender" | "education">; oblasts: Record<string, Census>;
};
export const AGE: [string, string][] = [["age0_14", "0–14"], ["age15_29", "15–29"], ["age30_44", "30–44"], ["age45_64", "45–64"], ["age65plus", "65+"]];
export const EDU: [string, string][] = [["tertiary", "Висше"], ["upperSecondary", "Средно"], ["lowerSecondary", "Основно"], ["primaryOrLower", "Начално или по-ниско"]];
export const TAX: Record<string, { label: string; unit: string }> = {
  property_tax_legal: { label: "Данък сгради на фирми", unit: "‰ от данъчната оценка" },
  transfer_tax: { label: "Данък при покупка на имот", unit: "% от цената" },
  vehicle_tax_74_110kw: { label: "Данък за кола 74–110 kW", unit: "€ на kW" },
  patent_tax_retail: { label: "Патент за магазин", unit: "€ на кв. м" },
  patent_tax_taxi: { label: "Патент за такси", unit: "€ на година" },
};
export const share = (part: number, total: number) => (total ? (part / total) * 100 : 0);
