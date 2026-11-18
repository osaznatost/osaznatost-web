import { rawQuery, type Contract } from "@/lib/procurement";
import { contractsFeed } from "@/lib/rss";

export async function GET(req: Request, { params }: { params: Promise<{ eik: string }> }) {
  const eik = (await params).eik.replace(/\.xml$/, "");
  if (!/^\d{9,13}$/.test(eik)) return new Response("Невалиден ЕИК", { status: 400 });
  const items = await rawQuery<Contract>(`proc_contracts?supplier_eiks=cs.{${eik}}&order=published_at.desc&limit=60`);
  return contractsFeed(new URL(req.url).origin, `Поръчки на фирма ${items[0]?.supplier_names[items[0].supplier_eiks.indexOf(eik)] ?? eik}`, `/porachki/firma/${eik}`, items);
}
