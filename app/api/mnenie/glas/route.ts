import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE, ITEMS, db, itemVoter, readCookie, ready, totals } from "@/lib/citizenVote";

const CHOICE: Record<string, number> = { za: 1, protiv: -1, ne_znam: 0 };

// GET ?item=… → дали си потвърдил имейл, дали си гласувал и (само ако си гласувал) общият резултат.
export async function GET(req: Request) {
  const item = new URL(req.url).searchParams.get("item") ?? "";
  if (!ready()) return NextResponse.json({ open: false });
  if (!ITEMS.has(item)) return NextResponse.json({ error: "Няма такъв закон." }, { status: 400 });
  const vid = readCookie((await cookies()).get(COOKIE)?.value);
  if (!vid) return NextResponse.json({ open: true, verified: false });
  const mine = (await db(`cv_votes?item=eq.${encodeURIComponent(item)}&voter=eq.${itemVoter(vid, item)}&select=choice`))?.[0];
  if (!mine) return NextResponse.json({ open: true, verified: true, voted: null });
  return NextResponse.json({ open: true, verified: true, voted: mine.choice, totals: await totals(item) });
}

// POST {item, choice} → записва или променя гласа и връща общия резултат.
export async function POST(req: Request) {
  if (!ready()) return NextResponse.json({ error: "Гласуването още не е отворено." }, { status: 503 });
  const vid = readCookie((await cookies()).get(COOKIE)?.value);
  if (!vid) return NextResponse.json({ error: "Първо потвърди имейла си." }, { status: 401 });
  const { item, choice } = (await req.json().catch(() => ({}))) as { item?: string; choice?: string };
  if (!item || !ITEMS.has(item) || !(String(choice) in CHOICE)) return NextResponse.json({ error: "Невалиден глас." }, { status: 400 });
  await db("cv_votes", {
    method: "POST", headers: { prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ item, voter: itemVoter(vid, item), choice: CHOICE[String(choice)], updated_at: new Date().toISOString() }),
  });
  return NextResponse.json({ ok: true, voted: CHOICE[String(choice)], totals: await totals(item) });
}
