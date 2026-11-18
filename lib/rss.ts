// RSS: известия без регистрация — читателят се абонира в приложение за новини (Feedly, Inoreader, Outlook, телефона).
import { contractFlags, personalLink, riskScore } from "@/lib/redFlags";
import type { Contract } from "@/lib/procurement";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const eur = (v: number | null) => (v == null ? "" : `${Math.round(v).toLocaleString("bg-BG")} €`);

export function contractsFeed(origin: string, title: string, link: string, items: Contract[]) {
  const rows = items.slice(0, 60).map((c) => {
    const f = contractFlags(c, [], c.supplier_eiks.some(personalLink));
    const s = riskScore(f);
    const t = `${s >= 45 ? "⚠ висок риск · " : ""}${eur(c.contract_value_eur)} · ${c.tender_name.slice(0, 160)}`;
    const d = `${c.buyer_name} → ${c.supplier_names.join(", ")}. ${f.length ? `Сигнали: ${f.map((x) => x.label.toLowerCase()).join(", ")}.` : "Без сигнали."}`;
    const url = `${origin}/porachki/dogovor/${encodeURIComponent(c.id)}`;
    return `<item><title>${esc(t)}</title><link>${url}</link><guid isPermaLink="false">${esc(c.id)}</guid><pubDate>${new Date(c.published_at ?? c.contract_date ?? Date.now()).toUTCString()}</pubDate><description>${esc(d)}</description></item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(title)}</title><link>${origin}${link}</link><description>Нови обществени поръчки със сигналите за риск. Осъзнатост.</description><language>bg</language>${rows.join("")}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
