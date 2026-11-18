import { findMunicipality } from "@/lib/places";
import { rawQuery, type Contract } from "@/lib/procurement";
import { contractsFeed } from "@/lib/rss";
import { placeHref } from "@/lib/regions";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase().replace(/\.XML$/, "");
  const m = findMunicipality(code);
  if (!m) return new Response("Няма такава община", { status: 404 });
  const items = await rawQuery<Contract>(`proc_contracts_geo?municipality_code=eq.${code}&order=published_at.desc&limit=60`);
  return contractsFeed(new URL(req.url).origin, `Поръчки: община ${m.name}`, placeHref.muni(code, "porachki"), items);
}
