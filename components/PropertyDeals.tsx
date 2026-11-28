// Решения на общинския съвет за общинско имущество в полза на фирма, свързана с длъжностно лице — в профила на лицето и на фирмата.
import Link from "next/link";
import { propertyDeals, type Deal } from "@/lib/propertyDeals";
import { powerLinks } from "@/lib/tr";
import { firmUrl } from "@/lib/procurement";

function Box({ deals, lead }: { deals: Deal[]; lead: React.ReactNode }) {
  return (
    <section id="imushtestvo" className="mb-10 border-2 border-red rounded-sm p-4 sm:p-5 scroll-mt-32 lg:scroll-mt-20">
      <p className="text-sm font-semibold text-red">Общинско имущество към свързана фирма</p>
      <p className="text-[15px] mt-1">{lead}</p>
      <ul className="mt-2 space-y-2 text-[15px]">{deals.map((d) => (
        <li key={`${d.code}-${d.number}`}>
          <Link href={firmUrl(d.firm.eik)} className="font-semibold">{d.firm.name}</Link>
          {" — "}{d.firm.via ? <>фирма на <b>{d.firm.via}</b>, бивш или настоящ съдружник на </> : <>фирма на </>}<Link href={`/lica/${d.firm.slug}#svarzani`}>{d.firm.who}</Link>.
          {" "}Решение № {d.number} от {d.date.split("-").reverse().join(".")}: {d.title.slice(0, 160)}{d.url ? <> · <a href={d.url} target="_blank" rel="noreferrer">текстът на решението</a></> : null}
        </li>
      ))}</ul>
      <p className="text-xs text-muted mt-2">Продажба, наем, право на строеж, концесия и др. Връзката е по Търговския регистър; фирмата е намерена по името ѝ в текста на решението. Сигнал е повод за въпрос, не доказателство.</p>
    </section>
  );
}

/** В профила на длъжностното лице: решенията в неговата община за имущество към негови или на съдружниците му фирми. */
export async function PersonDeals({ code, slug }: { code: string; slug: string }) {
  const deals = await propertyDeals(code, undefined, slug).catch(() => []);
  if (!deals.length) return null;
  return <Box deals={deals} lead={<>Общинският съвет е взел {deals.length} решени{deals.length > 1 ? "я" : "е"} за общинско имущество, в {deals.length > 1 ? "които" : "което"} се споменава фирма, свързана с това лице.</>} />;
}

/** В профила на фирмата: решенията в общините на свързаните с нея длъжностни лица. */
export async function firmDeals(eik: string) {
  const e = eik.slice(0, 9);
  const codes = [...new Set((await powerLinks(eik).catch(() => [])).map((h) => h.code).filter((c) => c && c !== "MP" && c !== "GOV"))];
  const all = (await Promise.all(codes.map((c) => propertyDeals(c).catch(() => [])))).flat().filter((d) => d.firm.eik.slice(0, 9) === e);
  return [...new Map(all.map((d) => [`${d.code}-${d.number}`, d])).values()];
}
export async function FirmDeals({ eik }: { eik: string }) {
  const deals = await firmDeals(eik).catch(() => []);
  if (!deals.length) return null;
  return <Box deals={deals} lead={<>Фирмата се споменава в {deals.length} решени{deals.length > 1 ? "я" : "е"} на общински съвет за общинско имущество, а е свързана с длъжностно лице в същата община.</>} />;
}
