import type { MetadataRoute } from "next";
import { MPS } from "@/lib/parliament";
import { lawIndex } from "@/lib/lawIndex";
import { muniSlug, oblastList } from "@/lib/regions";
import { PARTY_META } from "@/lib/partyMeta";
import { data as PROMISES, govSlug } from "@/lib/promises";

const BASE = "https://osaznatost-web.vercel.app";

// Главните страници + депутати, закони, партии, обещания, области и общини.
// Договорите, фирмите и отделните гласувания (над 200 000) не са тук: до тях се стига от тези страници.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const top = ["", "/vlast", "/vlast/ministerstva", "/vlast/deklaracii", "/vlast/sadebna-vlast", "/parlament", "/parlament/zakoni", "/parlament/predishni", "/parlament/zayaveno", "/parlament/predishni/51", "/parlament/predishni/50", "/parlament/predishni/49", "/kalkulatori/danaci-razhodi", "/obeshtaniya", "/proverki", "/proverki/chisla", "/proverki/dokladi", "/porachki", "/porachki/risk", "/byudzhet", "/ikonomika", "/ceni", "/ceni/nadcenki", "/mnenie", "/statistiki", "/mesta", "/kalkulatori", "/kalkulatori/pensiya", "/kalkulatori/obezshteteniya", "/kalkulatori/naem-ili-kupuvane", "/kalkulatori/chasove-trud", "/novini", "/rechnik", "/metodologiya", "/sastoyanie"];
  const u = (p: string, priority = 0.5): MetadataRoute.Sitemap[number] => ({ url: BASE + p, priority });
  return [
    ...top.map((p) => u(p, p === "" ? 1 : 0.8)),
    ...(await lawIndex()).map((l) => u(`/parlament/zakon/${l.slug}`, 0.7)),
    ...MPS.map((m) => u(`/parlament/deputat/${m.id}`, 0.6)),
    ...PARTY_META.map((p) => u(`/parlament/partiya/${p.slug}`, 0.6)),
    ...PROMISES.parties.map((g) => u(`/obeshtaniya/${govSlug(g)}`, 0.6)),
    ...oblastList().flatMap((o) => [u(`/mesta/${o.slug}`, 0.5), ...o.municipalities.map((m) => u(`/mesta/${o.slug}/${muniSlug(m.code)}`, 0.5))]),
  ];
}
