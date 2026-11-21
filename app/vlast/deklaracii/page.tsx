import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Anchor, SectionNav } from "@/components/SectionNav";
import { Page, Title } from "@/components/ui";

export const metadata = { title: "Декларирани фирми и обществени поръчки" };

type Buyer = { eik: string; name: string; n: number; eur: number };
type L = {
  year: string; name: string; pos: string; inst: string; cat: string; date: string | null; decl: string;
  kind: string; co: string; extra: string | null; eik: string; confirmed?: boolean | null; contracts: number; eur: number; first: string | null; last: string | null;
  buyers: Buyer[]; own: { n: number; eur: number } | null;
  sub: { n: number; mains: { name: string; n: number }[]; buyers: { name: string; n: number }[] } | null;
};
type T = { year: string; name: string; pos: string; inst: string; cat: string; eik: string; co: string; roles: string[]; contracts: number; eur: number; own: { n: number; eur: number } };
type Data = { updated: string; people: number; links: L[]; ambiguous: number; publicRoles?: number; trOnly?: T[] };

const dir = path.join(process.cwd(), "data", "declarations");
const read = (): Data | null => (existsSync(path.join(dir, "links.json")) ? (JSON.parse(readFileSync(path.join(dir, "links.json"), "utf8")) as Data) : null);
const eur = (v: number) => `${Math.round(v).toLocaleString("bg-BG")} €`;
const dmy = (d: string) => d.split("-").reverse().join(".");

function Row({ l }: { l: L }) {
  return (
    <li className="py-3 border-b border-rule">
      <div className="flex flex-wrap justify-between gap-2">
        <span><b>{l.name}</b> <span className="text-muted text-sm">{l.pos}, {l.inst}</span></span>
        <span className="num font-semibold">{l.contracts ? eur(l.eur) : "само подизпълнител"}</span>
      </div>
      <p className="text-[15px] mt-1">
        Декларирано: <i>{l.kind}</i> в <Link href={`/porachki/firma/${l.eik}`}>{l.co}</Link>{l.extra ? ` (${l.extra})` : ""}.{" "}
        {l.contracts > 0 && <>Фирмата има {l.contracts.toLocaleString("bg-BG")} договора{l.first && l.last ? ` (${l.first.slice(0, 4)}–${l.last.slice(0, 4)})` : ""}.</>}
        {l.own && <> <b className="text-red">От институцията, в която лицето заема длъжност: {l.own.n} договора за {eur(l.own.eur)}.</b></>}
      </p>
      {l.buyers.length > 0 && <p className="text-sm text-muted mt-1">Основни възложители: {l.buyers.slice(0, 3).map((b) => `${b.name} (${b.n})`).join("; ")}</p>}
      {l.sub && <p className="text-sm text-muted mt-1">Като подизпълнител: {l.sub.n} договора, най-често на {l.sub.mains.map((m) => m.name).join(", ")}.</p>}
      <p className="text-xs mt-1"><a href={l.decl} target="_blank" rel="noreferrer">Декларацията ({l.year})</a>{" · "}{l.confirmed ? "лицето е в тази фирма и по Търговския регистър" : l.confirmed === false ? "по Търговския регистър лицето не е сред управителите и собствениците (възможно е дяловете да са на член на семейството или да са прехвърлени)" : "съвпадение по име на фирмата"}</p>
    </li>
  );
}

export default function Deklaracii() {
  const D = read();
  const L = D?.links ?? [];
  const people = new Set(L.map((l) => l.name)).size;
  const own = L.filter((l) => l.own).sort((a, b) => (b.own!.eur - a.own!.eur));
  const byCat = Object.entries(L.reduce<Record<string, Set<string>>>((m, l) => ((m[l.cat] ??= new Set()).add(l.name), m), {})).map(([c, s]) => [c, s.size] as const).sort((a, b) => b[1] - a[1]);

  return (
    <Page>
      <Title back={{ href: "/vlast", label: "Властта" }} lead="Лицата на публични длъжности всяка година декларират в кои фирми имат дялове или участват в управлението. Тук свързваме тези декларации с обществените поръчки по едно и също правило за всички.">
        Декларирани фирми и обществени поръчки
      </Title>
      <SectionNav items={[["nakratko", "Накратко"], ["sobstvena", "Поръчки от собствената институция"], ["vsichki", "Всички връзки"], ["kak", "Как свързваме"]]} />

      {!D ? (
        <p className="text-muted">Декларациите се четат от регистъра. Страницата ще се попълни автоматично, когато свърши първото четене.</p>
      ) : (
        <>
          <Anchor id="nakratko" title="Накратко">
            <div className="grid gap-3 sm:grid-cols-3 mb-5">
              <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Лица с декларирана фирма, печелила поръчки</p><p className="display text-[2.4rem] leading-none mt-1">{people.toLocaleString("bg-BG")}</p><p className="text-xs text-muted mt-1">от {D.people.toLocaleString("bg-BG")} декларации с дружества</p></div>
              <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Поръчки от собствената институция</p><p className="display text-[2.4rem] leading-none mt-1">{own.length.toLocaleString("bg-BG")}</p><p className="text-xs text-muted mt-1">връзки лице – фирма</p></div>
              <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Обновено</p><p className="display text-[2.4rem] leading-none mt-1">{dmy(D.updated)}</p><p className="text-xs text-muted mt-1">всяка седмица</p></div>
            </div>
            {byCat.length > 0 && <p className="text-[15px] max-w-3xl">По вид длъжност: {byCat.slice(0, 8).map(([c, n]) => `${c} (${n})`).join(", ")}.</p>}
            <p className="text-sm text-muted mt-3 max-w-3xl">Всяка връзка е <b>повод за въпрос, не доказателство</b>. Законът не забранява на лице на публична длъжност да има фирма; забранява да участва в решения, от които тя печели (конфликт на интереси). Проверките са на Комисията за противодействие на корупцията.</p>
          </Anchor>

          <Anchor id="sobstvena" title="Поръчки от собствената институция" lead="Фирмата, декларирана от лицето, има договори с институцията, в която то заема длъжност. Това е най-силният сигнал, но не доказва, че лицето е участвало в решението.">
            {own.length === 0 ? <p className="text-muted">Няма такива връзки по нашето правило.</p> : <ul className="max-w-4xl">{own.map((l) => <Row key={`${l.name}|${l.eik}`} l={l} />)}</ul>}
          </Anchor>

          <Anchor id="tr" title="Само по Търговския регистър" lead="Лицето е управител, съдружник или собственик на фирма според Търговския регистър, фирмата има договори със същата институция, в която то заема длъжност, но фирмата не фигурира в декларацията му. Съвпадението е по трите имена (без ЕГН), затова е възможен съименник; възможно е и връзката да е прекратена преди периода на декларацията.">
            {!(D.trOnly?.length) ? <p className="text-muted">Няма такива случаи по нашето правило{D.trOnly ? "" : " (проверката ще се появи при следващото обновяване)"}.</p> : (
              <ul className="max-w-4xl">{D.trOnly.map((t) => (
                <li key={`${t.name}|${t.eik}`} className="py-3 border-b border-rule">
                  <div className="flex flex-wrap justify-between gap-2"><span><b>{t.name}</b> <span className="text-muted text-sm">{t.pos}, {t.inst}</span></span><span className="num font-semibold">{eur(t.own.eur)}</span></div>
                  <p className="text-[15px] mt-1">По Търговския регистър: {t.roles.join(", ")} на <Link href={`/porachki/firma/${t.eik}`}>{t.co}</Link>. От институцията на лицето: {t.own.n} договора за {eur(t.own.eur)}. В декларацията за {t.year} г. фирмата не е посочена.</p>
                </li>))}</ul>
            )}
            <p className="text-sm text-muted mt-3 max-w-3xl">Нашият Търговски регистър засега покрива само част от фирмите с поръчки, затова този списък не е пълен.</p>
          </Anchor>

          <Anchor id="vsichki" title={`Всички връзки (${L.length})`} lead="Подредени по общата стойност на договорите на фирмата.">
            <ul className="max-w-4xl">{L.slice(0, 100).map((l) => <Row key={`${l.name}|${l.eik}`} l={l} />)}</ul>
            {L.length > 100 && (
              <details className="mt-3 max-w-4xl"><summary className="cursor-pointer font-semibold text-green py-2">Още {L.length - 100}</summary>
                <ul>{L.slice(100).map((l) => <Row key={`${l.name}|${l.eik}`} l={l} />)}</ul></details>
            )}
          </Anchor>
        </>
      )}

      <Anchor id="kak" title="Как свързваме">
        <ul className="list-disc pl-5 max-w-3xl text-[15px] space-y-1.5">
          <li><b>Източник:</b> публичният регистър на декларациите за имущество и интереси (<a href="https://register.cacbg.bg/" target="_blank" rel="noreferrer">register.cacbg.bg</a>), воден до 1.11.2026 г. от Сметната палата, а от 2.11.2026 г. от Комисията за противодействие на корупцията. Четем декларациите за всички години от 2020 г. насам.</li>
          <li><b>Какво взимаме:</b> от декларацията за интереси — раздели 15–20 (участие в дружества, управление и едноличен търговец, сега и 12 месеца преди длъжността); от ежегодната имуществена декларация — раздел 10 (дялове в ООД и командитни дружества). Ако дяловете са на съпруг или дете, пишем само „член на семейството“, без име. Не взимаме ЕГН, адреси, имоти, сметки и доходи.</li>
          <li><b>Правило за съвпадение:</b> името на дружеството в декларацията съвпада с името на изпълнител или подизпълнител на обществена поръчка, след като махнем кавичките, правната форма (ЕООД, ООД, АД и др.) и препинателните знаци. Имена под 5 букви не свързваме. Име от една дума свързваме само ако Търговският регистър потвърждава, че лицето е в тази фирма.</li>
          <li><b>Неясни имена не показваме:</b> ако едно име отговаря на повече от една фирма (различни ЕИК){D ? ` — такива са ${D.ambiguous.toLocaleString("bg-BG")} случая` : ""}, не можем да кажем коя е, и връзката не се показва. Едноличните търговци също не свързваме, защото в декларацията няма ЕИК.</li>
          <li><b>Собствена институция:</b> името на възложителя съвпада с институцията, посочена в регистъра за длъжността на лицето (за общинските длъжности — с общината).</li>
          <li><b>Управление на държавни и общински дружества</b> (членство в съвет на директорите, надзорен съвет и т.н.) обикновено е по служба, затова не го показваме като връзка{D?.publicRoles ? ` (${D.publicRoles} такива случая)` : ""}. Дяловете на лицата в такива дружества се показват.</li>
          <li><b>„Само по Търговския регистър“</b> не показваме за държавни и общински дружества: там членството в съвета обикновено идва по служба.</li>
          <li><b>Грешка?</b> Ако видиш неправилно свързване, пиши ни: ще го проверим и поправим, и ще го отбележим в <Link href="/metodologiya">поправките</Link>.</li>
        </ul>
      </Anchor>
    </Page>
  );
}
