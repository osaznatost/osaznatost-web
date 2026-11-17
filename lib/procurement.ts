import { cacheLife, cacheTag } from "next/cache";
import links from "@/data/political-links.json";

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
async function q<T>(path: string): Promise<T[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("procurement");
  if (!URL_ || !KEY) return [];
  const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY } });
  if (!res.ok) return [];
  return res.json();
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
export const supplierStats = async (eik: string) => (await q<SupplierStats>(`proc_supplier_stats?eik=eq.${eik}`))[0];
export const buyerContracts = (eik: string, limit = 200) =>
  q<Contract>(`proc_contracts?buyer_eik=eq.${eik}&order=contract_date.desc.nullslast&limit=${limit}`);
export const buyerAnnexes = (eik: string) => q<Annex>(`proc_annexes?buyer_eik=eq.${eik}&order=published_at.desc&limit=100`);

export const latestContracts = () => q<Contract>(`proc_contracts?order=published_at.desc&limit=30`);
export const biggestContracts = (since: string) =>
  q<Contract>(`proc_contracts?contract_date=gte.${since}&contract_value_eur=gt.0&order=contract_value_eur.desc.nullslast&limit=20`);
export const singleOfferBig = (since: string) =>
  q<Contract>(`proc_contracts?contract_date=gte.${since}&offers_count=eq.1&contract_value_eur=gt.0&order=contract_value_eur.desc.nullslast&limit=20`);
export const biggestAnnexes = (since: string) =>
  q<Annex>(`proc_annexes?published_at=gte.${since}&value_difference_eur=gt.0&order=value_difference_eur.desc.nullslast&limit=20`);
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
  for (const e of c.supplier_eiks) if (politicalLinks(e).length) out.push({ level: "high", text: "Изпълнителят има връзка с политик или длъжностно лице по Търговския регистър." });
  return out;
}

export const fmtEur = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" }) : "—";
