import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Вътрешният прототип е заключен с една обща парола (SITE_PASSWORD).
// След вход се пази бисквитка с SHA-256 хеш на паролата.
export const COOKIE = "osz_auth";

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function proxy(request: NextRequest) {
  // Суровите файлове с данни (Cloudflare ги държи под /_data) се четат само от сървъра.
  if (request.nextUrl.pathname.startsWith("/_data/")) return new NextResponse(null, { status: 404 });
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    // в Cloudflare без парола не пускаме никого (иначе прототипът би станал публичен)
    if (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers" && process.env.ALLOW_PUBLIC !== "1") return new NextResponse("Сайтът още се настройва.", { status: 503 });
    return NextResponse.next(); // без парола (локална разработка)
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/vhod" || pathname === "/api/vhod") return NextResponse.next();

  const expected = await sha256(password);
  if (request.cookies.get(COOKIE)?.value === expected) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/vhod";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|woff2?)$).*)"],
};
