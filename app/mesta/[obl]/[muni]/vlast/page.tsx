import { permanentRedirect } from "next/navigation";
import { muniSlug, oblastList } from "@/lib/regions";

export function generateStaticParams() {
  return oblastList().flatMap((o) => o.municipalities.map((m) => ({ obl: o.slug, muni: muniSlug(m.code) })));
}

// Всичко за общината е на една страница; старият адрес води до секцията „vlast“.
export default async function Redirect({ params }: { params: Promise<{ obl: string; muni: string }> }) {
  const { obl, muni } = await params;
  permanentRedirect(`/mesta/${obl}/${muni}#vlast`);
}
