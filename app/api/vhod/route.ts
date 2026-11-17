import { NextResponse } from "next/server";

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const form = await request.formData();
  const given = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const password = process.env.SITE_PASSWORD ?? "";

  if (!password || given !== password) {
    return NextResponse.redirect(new URL(`/vhod?greshka=1&next=${encodeURIComponent(safeNext)}`, request.url), 303);
  }
  const res = NextResponse.redirect(new URL(safeNext, request.url), 303);
  res.cookies.set("osz_auth", await sha256(password), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
