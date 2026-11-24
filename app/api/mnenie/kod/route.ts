import { NextResponse } from "next/server";
import { codeHash, db, emailHash, newCode, normEmail, preview, ready, sendCode, validEmail } from "@/lib/citizenVote";

const DAILY_LIMIT = 90; // безплатният план за имейли позволява 100 писма на ден

export async function POST(req: Request) {
  if (!ready()) return NextResponse.json({ error: "Гласуването още не е отворено." }, { status: 503 });
  const { email: raw } = (await req.json().catch(() => ({}))) as { email?: string };
  const email = normEmail(String(raw ?? ""));
  if (!validEmail(email)) return NextResponse.json({ error: "Провери имейла." }, { status: 400 });
  const eh = emailHash(email);
  const now = Date.now();
  const prev = (await db(`cv_codes?email_hash=eq.${eh}&select=sent_at,sends_hour`))?.[0];
  const recent = prev && now - Date.parse(prev.sent_at) < 3600e3;
  if (recent && now - Date.parse(prev.sent_at) < 60e3) return NextResponse.json({ error: "Изчакай минута, преди да поискаш нов код." }, { status: 429 });
  if (recent && prev.sends_hour >= 3) return NextResponse.json({ error: "Поискани са твърде много кодове. Опитай след час." }, { status: 429 });
  const sentToday = await db("rpc/cv_count_send", { method: "POST", body: JSON.stringify({ d: new Date().toISOString().slice(0, 10) }) });
  if (+sentToday > DAILY_LIMIT) return NextResponse.json({ error: "За днес лимитът на писмата е изчерпан. Опитай утре." }, { status: 429 });
  const code = newCode();
  await db("cv_codes", {
    method: "POST", headers: { prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ email_hash: eh, code_hash: codeHash(eh, code), expires_at: new Date(now + 15 * 60e3).toISOString(), attempts: 0, sent_at: new Date(now).toISOString(), sends_hour: recent ? prev.sends_hour + 1 : 1 }),
  });
  if (preview()) return NextResponse.json({ ok: true, preview: code });
  if (!(await sendCode(email, code))) return NextResponse.json({ error: "Писмото не можа да се изпрати. Опитай отново по-късно." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
