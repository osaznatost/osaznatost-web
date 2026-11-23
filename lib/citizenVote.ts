// Мнение на гражданите: сървърни помощници. Не пазим имейли: само HMAC отпечатъци с тайната VOTE_PEPPER.
// Нужни променливи (въвежда ги Павлин като GitHub secrets; deploy-cloudflare ги подава): SUPABASE_SECRET_KEY, VOTE_PEPPER, RESEND_API_KEY, EMAIL_FROM.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import LAWS from "@/content/laws.json";

export const COOKIE = "osz_glas";
export const ITEMS = new Set(Object.keys(LAWS));
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
const PEPPER = process.env.VOTE_PEPPER;

export const ready = () => Boolean(URL_ && KEY && PEPPER && PEPPER.length >= 24 && process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
const h = (s: string) => createHmac("sha256", PEPPER as string).update(s).digest("hex");
export const normEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const emailHash = (e: string) => h(`e:${e}`);
export const codeHash = (eh: string, code: string) => h(`c:${eh}:${code}`);
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const voterId = (e: string) => h(`v:${e}`).slice(0, 40);
export const itemVoter = (vid: string, item: string) => h(`i:${vid}:${item}`).slice(0, 40);
export const cookieValue = (vid: string) => `${vid}.${h(`s:${vid}`).slice(0, 32)}`;
export function readCookie(v: string | undefined): string | null {
  if (!v || !PEPPER) return null;
  const [vid, sig] = v.split(".");
  if (!vid || !sig) return null;
  const want = Buffer.from(h(`s:${vid}`).slice(0, 32)), got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? vid : null;
}
export const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY as string, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`db ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

export async function sendCode(email: string, code: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM, to: [email],
      subject: `Кодът ти за гласуване: ${code}`,
      text: `Здравей,\n\nкодът ти за гласуване в „Осъзнатост“ е ${code}. Валиден е 15 минути.\n\nНе пазим имейла ти. Пазим само необратим отпечатък, по който не може да се разбере кой си и как си гласувал.\n\nАко не си искал код, просто игнорирай това писмо.`,
    }),
  });
  return r.ok;
}

export type Totals = { za: number; protiv: number; ne_znam: number; total: number };
export async function totals(item: string): Promise<Totals> {
  const rows = await db(`cv_totals?item=eq.${encodeURIComponent(item)}&select=za,protiv,ne_znam,total`);
  const t = rows?.[0];
  return { za: +(t?.za ?? 0), protiv: +(t?.protiv ?? 0), ne_znam: +(t?.ne_znam ?? 0), total: +(t?.total ?? 0) };
}
