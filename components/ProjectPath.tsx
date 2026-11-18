// „Пътят на проекта“ в страницата на договор: кой решава, кой възлага, кой изпълнява, кой надзирава и приема.
import Link from "next/link";
import { localData, personHref } from "@/lib/local";
import { buyerContracts, buyerPlace, firmUrl, fmtDate, fmtEur, type Annex, type Contract } from "@/lib/procurement";
import { councilFor, deadlineOf, officialByName, peopleFor, supervisionFor } from "@/lib/projects";
import { muniSlug, oblastSlug } from "@/lib/regions";

const MANDATE = "2023-11-06";

function Step({ n, title, children, missing }: { n: number; title: string; children: React.ReactNode; missing?: boolean }) {
  return (
    <li className="grid grid-cols-[2.2rem_1fr] gap-3">
      <span className={`h-8 w-8 rounded-full grid place-items-center text-sm font-semibold ${missing ? "bg-surface text-muted ring-1 ring-rule" : "bg-green text-white"}`}>{n}</span>
      <div className="pb-5 border-b border-rule">
        <p className="font-semibold">{title}</p>
        <div className="text-[15px] mt-1 space-y-1">{children}</div>
      </div>
    </li>
  );
}

export async function ProjectPath({ c, annexes }: { c: Contract; annexes: Annex[] }) {
  const [place, siblings] = await Promise.all([buyerPlace(c.buyer_eik), buyerContracts(c.buyer_eik, 500)]);
  const code = place?.municipality_code ?? null;
  const L = code ? localData(code) : null;
  const isMuni = /^община\s/i.test(c.buyer_name);
  const mine = c.contract_date && c.contract_date >= MANDATE;
  const mayor = L?.officials.find((o) => o.role === "mayor");
  const deputies = L?.officials.filter((o) => o.role === "deputy_mayor") ?? [];
  const council = councilFor(c, L?.resolutions ?? null);
  const people = peopleFor(code, c.tender_id);
  const sup = supervisionFor(c, siblings);
  const deadline = deadlineOf(c);
  const extended = annexes.filter((a) => /срок|удълж/i.test(a.change_description ?? ""));
  const vlast = code ? `/mesta/${oblastSlug(code)}/${muniSlug(code)}#vlast` : null;
  const P = (o: { slug: string; name: string }) => <Link href={personHref(o.slug)}>{o.name}</Link>;

  return (
    <section className="mb-10 max-w-4xl">
      <h2 className="display text-[2rem] mb-1">Пътят на проекта: кой решава, кой подписва, кой приема</h2>
      <p className="text-[15px] text-muted mb-5">Сиво кръгче = стъпка, за която документите не се публикуват в отворените данни. За нея по-долу има готово заявление по ЗДОИ.</p>
      <ol>
        <Step n={1} title="Решение и пари" missing={!council.length}>
          {council.length ? council.map(({ r }) => (
            <p key={r.id}>Решение № {r.number} от {fmtDate(r.date)} на общинския съвет: {r.title}.
              {r.rapporteur && <> Внася: {r.rapporteur.slug ? <Link href={personHref(r.rapporteur.slug)}>{r.rapporteur.name}</Link> : r.rapporteur.name}, {r.rapporteur.role}.</>}
              {r.tally && <> Гласуване: {r.tally.for} за, {r.tally.against} против, {r.tally.abstain} въздържали се{r.tally.method === "named" ? " (поименно)" : ""}.</>}
              {r.url && <> <a href={r.url} target="_blank" rel="noreferrer">PDF</a></>}</p>
          )) : <p className="text-muted">Не открихме решение на общинския съвет, което да назовава същия обект{L?.resolutions?.some((r) => r.text) ? "" : " (за тази община още не четем решенията на съвета)"}. Повечето ремонти влизат в съвета само като ред в годишния бюджет и капиталовата програма.</p>}
          {council.length > 0 && <p className="text-xs text-muted">Връзката е по съвпадение на имената на обекта, улиците и селата. Проверете решението.</p>}
          <p>Финансиране: {c.is_eu_funded ? `европейска програма${c.eu_program ? ` „${c.eu_program}“` : ""}` : "бюджетът на възложителя (капиталовата програма, приета от съвета)"}.</p>
        </Step>

        <Step n={2} title="Обявяване и избор на изпълнител">
          <p><b>Възложител:</b> {c.buyer_name}. Процедура: {c.procedure_type ?? "–"}{c.award_method ? `, критерий „${c.award_method.toLowerCase()}“` : ""}. Прогнозна стойност: {fmtEur(c.estimated_value_eur)}.</p>
          <p><b>Оферти:</b> {c.offers_count ?? people?.bids ?? "–"}{c.offers_count === 1 ? " (само една)" : ""}{c.disqualified_offers_count ? `, отстранени ${c.disqualified_offers_count}` : ""}.</p>
          {people?.contacts.length ? <p><b>Води процедурата (лице за контакт на възложителя):</b> {people.contacts.map((n, i) => { const o = officialByName(n, L?.officials); return <span key={n}>{i ? ", " : ""}{o ? <><Link href={personHref(o.slug)}>{o.name}</Link> ({o.roleRaw.toLowerCase()})</> : n}</span>; })}.</p> : null}
          <p className="text-sm text-muted">Комисията, която оценява офертите, и решението за избор (кой го е подписал) са в преписката на поръчката в ЦАИС ЕОП, не в отворените данни.</p>
        </Step>

        <Step n={3} title="Договорът">
          <p><b>Сключен:</b> {fmtDate(c.contract_date)}, № {c.contract_number}, за <b>{fmtEur(c.contract_value_eur)}</b>{c.contract_period_days ? `, срок ${c.contract_period_days} дни` : ""}{deadline ? ` (до ${fmtDate(deadline)})` : ""}.</p>
          <p><b>Подписва за възложителя:</b> {isMuni ? (mine && mayor
            ? <>кметът {P(mayor)} или заместник-кмет с негова заповед{deputies.length ? <> ({deputies.map((d, i) => <span key={d.slug}>{i ? ", " : ""}{P(d)}</span>)})</> : null}. Кой точно е подписал, се вижда само в самия договор.</>
            : "кметът на общината или упълномощен от него заместник. Договорът е от предишния мандат.")
            : `ръководителят на ${c.buyer_name} или упълномощено от него лице.`}</p>
          <p><b>Изпълнител:</b> {c.supplier_eiks.map((e, i) => {
            const s = people?.suppliers[e];
            return <span key={e}>{i ? "; " : ""}<Link href={firmUrl(e)}>{c.supplier_names[i] ?? s?.name ?? e}</Link>{s?.rep ? `, представляван от ${s.rep}` : ""}{s?.town ? ` (${s.town})` : ""}</span>;
          })}{c.has_subcontractors ? `. Подизпълнители: ${c.subcontractor_names ?? "има"}${c.subcontracting_percent ? ` (${c.subcontracting_percent}%)` : ""}` : ""}.</p>
        </Step>

        <Step n={4} title="Изпълнение и промени" missing={false}>
          {annexes.length ? (
            <>
              <p>{annexes.length} анекс{annexes.length > 1 ? "а" : ""}{extended.length ? `, от тях ${extended.length} за срока` : ""}. Стойността {annexes.reduce((s, a) => s + (a.value_difference_eur ?? 0), 0) > 0 ? <b className="text-red">се увеличава с {fmtEur(annexes.reduce((s, a) => s + (a.value_difference_eur ?? 0), 0))}</b> : "не се увеличава"}.</p>
              {(people?.amend.length ? people.amend : annexes.map((a) => ({ date: a.published_at?.slice(0, 10) ?? null, text: a.change_description ?? "" }))).filter((a) => a.text).slice(0, 4).map((a, i) => <p key={i} className="text-sm"><span className="text-muted">{a.date ? fmtDate(a.date) : ""}</span> {a.text}</p>)}
            </>
          ) : <p>Няма публикувани анекси: договорът се изпълнява при първоначалните цена и срок{deadline ? ` (до ${fmtDate(deadline)})` : ""}.</p>}
        </Step>

        <Step n={5} title="Надзор" missing={!sup.length}>
          {sup.length ? sup.map((x) => (
            <p key={x.id}><b>{x.supplier_names.join(", ")}</b>: <Link href={`/porachki/dogovor/${encodeURIComponent(x.id)}`}>{x.tender_name.slice(0, 160)}</Link> ({fmtEur(x.contract_value_eur)}, {fmtDate(x.contract_date)}). Строителният надзор подписва актовете за установяване на изпълнените работи.</p>
          )) : <p className="text-muted">Не открихме отделен договор за строителен надзор по този обект при същия възложител. За по-малки ремонти надзор не е задължителен; тогава приема комисия на възложителя.</p>}
        </Step>

        <Step n={6} title="Приемане: кой подписва, че работата е готова и е изпълнена правилно" missing>
          <p>Актовете за приемане (за строителство: акт обр. 19 за изпълнените количества и протокол обр. 15 при завършване; за услуги и доставки: приемо-предавателен протокол), имената на подписалите ги и плащанията не се публикуват в отворените данни.</p>
          <p>Обикновено подписват: за възложителя — назначена от {isMuni ? "кмета" : "ръководителя"} комисия или служител (често от отдела по строителство или инвестиции); за изпълнителя — неговият представител; при строеж — и строителният надзор.</p>
          {vlast && <p><Link href={vlast}>Кой управлява общината и как гласува съветът</Link></p>}
        </Step>
      </ol>

      <details className="mt-2 bg-surface rounded-sm p-4">
        <summary className="cursor-pointer font-semibold">Поискайте липсващите документи (заявление по ЗДОИ)</summary>
        <p className="text-sm mt-2 mb-2">Копирайте текста и го изпратете до {c.buyer_name}. Отговорът се дължи до 14 дни. Ако го получите, можем да го добавим тук.</p>
        <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded-sm ring-1 ring-rule">{`До ${c.buyer_name}

ЗАЯВЛЕНИЕ за достъп до обществена информация (чл. 24 от ЗДОИ)

Моля да ми бъде предоставена следната информация за договор № ${c.contract_number} от ${c.contract_date ?? "…"} г. по поръчка с УНП ${c.unp} „${c.tender_name}“, изпълнител ${c.supplier_names.join(", ")}:
1. Копие на договора, включително имената и длъжностите на лицата, които са го подписали от името на възложителя.
2. Заповедта за назначаване на комисията за оценка на офертите и решението за избор на изпълнител.
3. Количествено-стойностната сметка (ценовото предложение) на изпълнителя.
4. Актовете и протоколите за приемане на изпълнението (вкл. акт обр. 19 и протокол обр. 15, ако е строителство), с имената и длъжностите на лицата, които са ги подписали.
5. Размерът и датите на извършените плащания по договора и дали е освободена гаранцията за изпълнение.
6. Сключените анекси и мотивите за тях.

Предпочитам информацията да ми бъде предоставена по електронен път на адрес: …

Дата: …            Подпис: …`}</pre>
      </details>
      <p className="text-xs text-muted mt-2">Източници: ЦАИС ЕОП (договор, анекси, обявления по OCDS), решения на общинския съвет, регистър на декларациите. Лицата за контакт и представителите на фирмите са от обявленията.</p>
    </section>
  );
}
