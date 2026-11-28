import { HOUR, memo } from "@/lib/memo";
import { kvCached } from "@/lib/kvcache";
import { data } from "@/lib/data";
import links from "@/data/political-links.json";
import { politicalStrength } from "@/lib/politicalFlag.mjs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const PROC_READY = Boolean(URL_ && KEY);

export type Contract = {
  id: string; notice_id: number; published_at: string; unp: string; tender_id: number; tender_name: string;
  procedure_type: string | null; legal_basis: string | null; award_method: string | null; cpv: string; cpv_desc: string;
  contract_type: string; estimated_value: number | null; currency: string; buyer_eik: string; buyer_name: string; buyer_type: string;
  lot: string; contract_number: string; contract_date: string | null; contract_value: number | null; contract_currency: string;
  supplier_eiks: string[]; supplier_names: string[]; supplier_nuts: string[]; awarded_to_group: boolean | null;
  has_subcontractors: boolean | null; subcontractor_names: string | null; subcontractor_eiks: string | null;
  subcontracting_percent: string | null; subcontracting_amount: string | null; is_eu_funded: boolean | null; eu_program: string | null;
  is_framework: boolean | null; direct_award_justification: string | null; offers_count: number | null; sme_offers_count: number | null;
  disqualified_offers_count: number | null; contract_period_days: number | null; ted_link: string | null;
  contract_value_eur: number | null; estimated_value_eur: number | null;
};
export type Annex = {
  id: string; notice_id: number; published_at: string; tender_id: number; tender_name: string; buyer_eik: string; buyer_name: string;
  contract_number: string; contract_date: string | null; last_value: number | null; current_value: number | null; value_difference: number | null;
  currency: string; supplier_eiks: string[]; supplier_names: string[]; change_description: string | null;
  last_value_eur: number | null; current_value_eur: number | null; value_difference_eur: number | null;
};
export type SupplierStats = { eik: string; name: string; contracts: number; total_eur: number | null; buyers: number; single_offer: number; first_date: string; last_date: string };

/** Заявка към Supabase (само четене). Кешира се за час. */
function q<T>(path: string): Promise<T[]> {
  if (!URL_ || !KEY) return Promise.resolve([]);
  return memo(`sb:${path}`, HOUR, () => kvCached<T[] | null>(`sb:${path}`, 3 * 3600, async () => {
    const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY } });
    return res.ok ? res.json() : null;
  }, (v) => v !== null).then((v) => v ?? []));
}

const enc = encodeURIComponent;
export const contractUrl = (id: string) => `/porachki/dogovor/${enc(id)}`;
export const firmUrl = (eik: string) => `/porachki/firma/${eik}`;
export const buyerUrl = (eik: string) => `/porachki/vazlozhitel/${eik}`;

/** Адрес на договор по възложител и номер (анексите нямат идентификатора на обявлението за договора). */
export const contractRef = (buyer: string, number: string) => `n~${buyer}~${number}`;
export const getContract = async (id: string) => {
  const m = id.match(/^n~(\d+)~(.+)$/);
  if (m) return (await q<Contract>(`proc_contracts?buyer_eik=eq.${m[1]}&contract_number=eq.${enc(m[2])}&order=published_at.desc&limit=1`))[0];
  return (await q<Contract>(`proc_contracts?id=eq.${enc(id)}&limit=1`))[0];
};
export const annexesByRef = (buyer: string, number: string) =>
  q<Annex>(`proc_annexes?contract_number=eq.${enc(number)}&buyer_eik=eq.${buyer}&order=published_at.asc`);
export const contractAnnexes = (c: Contract) =>
  q<Annex>(`proc_annexes?contract_number=eq.${enc(c.contract_number)}&buyer_eik=eq.${enc(c.buyer_eik)}&order=published_at.asc`);
export const supplierContracts = (eik: string, limit = 200) =>
  q<Contract>(`proc_contracts?supplier_eiks=cs.{${eik}}&order=contract_date.desc.nullslast&limit=${limit}`);
export const supplierAnnexes = (eik: string) => q<Annex>(`proc_annexes?supplier_eiks=cs.{${eik}}&order=published_at.desc&limit=100`);
/** Брой договори и обща сума на фирмата в цялата страна — от готовите файлове (бързо), иначе от базата. */
export async function supplierTotal(eik: string): Promise<{ contracts: number; total_eur: number } | null> {
  const sh = await data<Record<string, [number, number]>>(`proc/supplier-totals/${eik.slice(0, 2).padEnd(2, "_")}.json`);
  const x = sh?.[eik];
  if (x) return { contracts: x[0], total_eur: x[1] };
  if (sh) return null;
  const s = await supplierStats(eik).catch(() => null);
  return s ? { contracts: s.contracts, total_eur: s.total_eur ?? 0 } : null;
}
export const supplierStats = async (eik: string) => (await q<SupplierStats>(`proc_supplier_stats?eik=eq.${eik}`))[0];
export const buyerContracts = (eik: string, limit = 200) =>
  q<Contract>(`proc_contracts?buyer_eik=eq.${eik}&order=contract_date.desc.nullslast&limit=${limit}`);
export const buyerAnnexes = (eik: string) => q<Annex>(`proc_annexes?buyer_eik=eq.${eik}&order=published_at.desc&limit=100`);

/** Филтър по място и ниво на властта. */
export type PlaceFilter = { oblast?: string; obshtina?: string; mesto?: string; nivo?: string };
const geoQ = (f: PlaceFilter) =>
  [f.oblast && `oblast=eq.${enc(f.oblast)}`, f.obshtina && `municipality_code=eq.${f.obshtina}`, f.mesto && `ekatte=eq.${f.mesto}`, f.nivo && `level=eq.${enc(f.nivo)}`]
    .filter(Boolean).map((x) => `&${x}`).join("");
const hasGeo = (f: PlaceFilter) => Boolean(f.oblast || f.obshtina || f.mesto || f.nivo);
const ct = (f: PlaceFilter) => (hasGeo(f) ? "proc_contracts_geo" : "proc_contracts");
const at = (f: PlaceFilter) => (hasGeo(f) ? "proc_annexes_geo" : "proc_annexes");

// по contract_date (има индекс); по published_at няма и заявката изтича за цялата страна
export const latestContracts = (f: PlaceFilter = {}) => q<Contract>(`${ct(f)}?contract_date=not.is.null&order=contract_date.desc&limit=30${geoQ(f)}`);
export const biggestContracts = (since: string, f: PlaceFilter = {}) =>
  q<Contract>(`${ct(f)}?contract_date=gte.${since}&contract_value_eur=gt.0&order=contract_value_eur.desc.nullslast&limit=20${geoQ(f)}`);
type PlaceRisk = { since: string; single: Contract[]; lite: Pick<Contract, "contract_date" | "contract_value_eur" | "supplier_eiks" | "supplier_names">[] };
/** Готовият файл за една община (scripts/build-place-suppliers.mjs), ако покрива искания период. */
async function placeRisk(f: PlaceFilter, since: string) {
  if (!f.obshtina || f.mesto || f.nivo) return null;
  const r = await data<PlaceRisk>(`proc/place-risk/${f.obshtina}.json`);
  return r && r.since <= since ? r : null;
}
export const singleOfferBig = async (since: string, f: PlaceFilter = {}) =>
  (await placeRisk(f, since))?.single.filter((c) => (c.contract_date ?? "") >= since) ?? q<Contract>(`${ct(f)}?contract_date=gte.${since}&offers_count=eq.1&contract_value_eur=gt.0&order=contract_value_eur.desc.nullslast&limit=20${geoQ(f)}`);
/** Договори от дадена дата, в които са посочени подизпълнители. */
export const subcontracted = (since: string, f: PlaceFilter = {}) =>
  q<Contract>(`${ct(f)}?contract_date=gte.${since}&has_subcontractors=is.true&order=contract_date.desc&limit=40${geoQ(f)}`);
export const biggestAnnexes = (since: string, f: PlaceFilter = {}) =>
  q<Annex>(`${at(f)}?published_at=gte.${since}&value_difference_eur=gt.0&order=value_difference_eur.desc.nullslast&limit=20${geoQ(f)}`);

export type PlaceStat = { oblast?: string; municipality?: string; municipality_code?: string; ekatte?: string; settlement?: string; is_village?: boolean; contracts: number; total_eur: number | null; single_offer: number; buyers?: number };
export const placeOblasts = () => q<PlaceStat>(`proc_place_oblast?order=total_eur.desc.nullslast`);
export const placeOblast = async (oblast: string) => (await q<PlaceStat>(`proc_place_oblast?oblast=eq.${enc(oblast)}`))[0];
export const placeMunicipalities = (oblast: string) => q<PlaceStat>(`proc_place_municipality?oblast=eq.${enc(oblast)}&order=total_eur.desc.nullslast`);
export const placeMunicipality = async (code: string) => (await q<PlaceStat>(`proc_place_municipality?municipality_code=eq.${code}`))[0];
export const placeSettlements = (code: string) => q<PlaceStat>(`proc_place_settlement?municipality_code=eq.${code}&order=total_eur.desc.nullslast`);
export const placeSettlement = async (ekatte: string) => (await q<PlaceStat>(`proc_place_settlement?ekatte=eq.${ekatte}`))[0];
export const placeSuppliers = (code: string) =>
  q<{ eik: string; name: string; contracts: number; total_eur: number | null }>(`proc_place_suppliers?municipality_code=eq.${code}&order=total_eur.desc.nullslast&limit=15`);
export const buyerPlace = async (eik: string) =>
  (await q<{ level: string; settlement: string | null; municipality: string | null; municipality_code: string | null; oblast: string | null; ekatte: string | null }>(`proc_buyers?eik=eq.${eik}&select=level,settlement,municipality,municipality_code,oblast,ekatte`))[0];
export const topSuppliers = () => q<SupplierStats>(`proc_supplier_stats?order=total_eur.desc.nullslast&limit=25`);
export const importState = async () => (await q<{ last_day: string }>(`proc_import_state?feed=eq.eop`))[0]?.last_day;
export const searchContracts = (term: string) => {
  const t = enc(`*${term.replace(/[*,()]/g, " ").trim()}*`);
  const eik = /^\d{9,13}$/.test(term.trim()) ? term.trim() : null;
  return eik
    ? q<Contract>(`proc_contracts?or=(buyer_eik.eq.${eik},supplier_eiks.cs.{${eik}})&order=contract_date.desc.nullslast&limit=50`)
    : q<Contract>(`proc_contracts?or=(tender_name.ilike.${t},buyer_name.ilike.${t})&order=contract_date.desc.nullslast&limit=50`);
};

export type Link = { who: string; kind: "mp" | "official"; party?: string | null; position?: string; roles: string[]; mpId?: number };
export const politicalLinks = (eik: string): Link[] => ((links as { byEik: Record<string, Link[]> }).byEik[eik] ?? []);

/** Сигнали за внимание. Не са обвинение: показват кога поръчката заслужава по-внимателен поглед. */
export function signals(c: Contract, annexes: Annex[] = []) {
  const out: { level: "high" | "mid"; text: string }[] = [];
  if (c.offers_count === 1) out.push({ level: "high", text: "Само една оферта: нямало е реална конкуренция." });
  if (c.offers_count === 1 && c.estimated_value_eur && c.contract_value_eur && c.contract_value_eur >= c.estimated_value_eur * 0.95)
    out.push({ level: "mid", text: `Договорената цена е ${Math.round((c.contract_value_eur / c.estimated_value_eur) * 1000) / 10}% от прогнозната: при една оферта почти няма отстъпка.` });
  if (c.disqualified_offers_count && c.disqualified_offers_count > 0)
    out.push({ level: "mid", text: `Отстранени оферти: ${c.disqualified_offers_count} от ${c.offers_count ?? "?"}.` });
  if (c.direct_award_justification) out.push({ level: "mid", text: "Възложена без открита процедура (пряко договаряне)." });
  const added = annexes.reduce((s, a) => s + (a.value_difference_eur ?? 0), 0);
  if (c.contract_value_eur && added > 0) {
    const r = added / c.contract_value_eur;
    out.push({ level: r > 0.25 ? "high" : "mid", text: `Анексите добавят ${Math.round(r * 100)}% към първоначалната стойност.` });
  }
  if (c.estimated_value_eur && c.contract_value_eur && c.contract_value_eur > c.estimated_value_eur * 1.02)
    out.push({ level: "mid", text: "Договорената стойност е над прогнозната." });
  for (const e of c.supplier_eiks) {
    const st = politicalStrength(politicalLinks(e));
    if (st === 2) out.push({ level: "high", text: "Изпълнителят е свързан с депутат или е посочен в декларация на длъжностно лице." });
    else if (st === 1) out.push({ level: "mid", text: "Собственик на изпълнителя има същите три имена като длъжностно лице. Може да е съименник." });
  }
  return out;
}

export const fmtEur = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" }) : "—";
/** Всички изпълнители на възложители от общината (за проверка на конфликт на интереси). */
// Първо от готовия файл (сборът се прави веднъж на ден, scripts/build-place-suppliers.mjs); изгледът в базата е бавен за големите общини.
type PlaceSupplier = { eik: string; name: string; contracts: number; total_eur: number | null };
export const placeSuppliersAll = async (code: string): Promise<PlaceSupplier[]> =>
  (await data<PlaceSupplier[]>(`proc/place-suppliers/${code}.json`))?.slice(0, 2000) ??
  q<PlaceSupplier>(`proc_place_suppliers?municipality_code=eq.${code}&order=total_eur.desc.nullslast&limit=2000`);
/** Всички договори и анекси на възложителите в една община от дадена дата (за „Проекти“). */
export const muniContracts = (code: string, since: string) =>
  q<Contract>(`proc_contracts_geo?municipality_code=eq.${code}&contract_date=gte.${since}&order=contract_date.desc&limit=2000`);
/** Само полетата за проверката „нова фирма“ (договори от 30 000 €): много по-малко данни за големите общини. */
export const muniContractsLite = async (code: string, since: string) =>
  (await placeRisk({ obshtina: code }, since))?.lite.filter((c) => (c.contract_date ?? "") >= since) ?? q<Pick<Contract, "contract_date" | "contract_value_eur" | "supplier_eiks" | "supplier_names">>(`proc_contracts_geo?select=contract_date,contract_value_eur,supplier_eiks,supplier_names&municipality_code=eq.${code}&contract_date=gte.${since}&contract_value_eur=gte.30000&order=contract_date.desc&limit=2000`);
export const muniAnnexes = (code: string, since: string) =>
  q<Annex>(`proc_annexes_geo?municipality_code=eq.${code}&published_at=gte.${since}&order=published_at.desc&limit=2000`);
/** Произволна заявка за четене (за търсенето). */
export const rawQuery = <T,>(path: string) => q<T>(path);
