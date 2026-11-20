import { NextResponse } from "next/server";
import { COOKIE, codeHash, cookieValue, db, emailHash, normEmail, ready, same, voterId } from "@/lib/citizenVote";

export async function POST(req: Request) {
  if (!ready()) return NextResponse.json({ error: "Гласуването още не е отворено." }, { status: 503 });
  const { email: raw, code } = (await req.json().catch(() => ({}))) as { email?: string; code?: string };
  const email = normEmail(String(raw ?? "")), c = String(code ?? "").replace(/\D/g, "");
  const eh = emailHash(email);
  const row = (await db(`cv_codes?email_hash=eq.${eh}&select=code_hash,expires_at,attempts`))?.[0];
  if (!row || Date.parse(row.expires_at) < Date.now() || row.attempts >= 5) return NextResponse.json({ error: "Кодът е изтекъл. Поискай нов." }, { status: 400 });
  if (c.length !== 6 || !same(row.code_hash, codeHash(eh, c))) {
    await db(`cv_codes?email_hash=eq.${eh}`, { method: "PATCH", body: JSON.stringify({ attempts: row.attempts + 1 }) });
    return NextResponse.json({ error: "Грешен код." }, { status: 400 });
  }
  await db(`cv_codes?email_hash=eq.${eh}`, { method: "DELETE" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, cookieValue(voterId(email)), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
