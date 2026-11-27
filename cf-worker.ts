// Входна точка в Cloudflare: обвива сайта (OpenNext) с кеш на готовите страници в KV.
// Страниците не зависят от това кой ги гледа (паролата е само врата), затова един и същ HTML/RSC отговор
// може да се даде на всички. Ключът включва номера на изграждането: при ново качване (на всеки 6 часа и при промяна)
// кешът започва наново, така че данните не остаряват повече от едно обновяване.
// @ts-expect-error: файлът се създава от OpenNext при изграждане
import handler from "./.open-next/worker.js";
import SCHEDULE from "./content/schedule.json";

type KV = { get(k: string, t: "stream"): Promise<ReadableStream | null>; getWithMetadata<M>(k: string, t: "stream"): Promise<{ value: ReadableStream | null; metadata: M | null }>; put(k: string, v: ReadableStream | ArrayBuffer | string, o?: { expirationTtl?: number; metadata?: unknown }): Promise<void> };
type Env = { CACHE?: KV; SITE_PASSWORD?: string; BUILD_ID?: string; GH_DISPATCH_TOKEN?: string };
type Ctx = { waitUntil(p: Promise<unknown>): void; passThroughOnException?(): void };

const TTL = 12 * 3600;
const SKIP = /^\/(vhod|mnenie|api|_next\/static|_data|cdn-cgi)(\/|$)|\.(png|jpg|svg|ico|woff2?|js|css|map|txt|xml)$/;

async function sha(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
async function authed(req: Request, env: Env) {
  if (!env.SITE_PASSWORD) return false;
  const c = req.headers.get("cookie") ?? "";
  const m = c.match(/(?:^|;\s*)osz_auth=([0-9a-f]{64})/);
  if (!m) return false;
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.SITE_PASSWORD));
  return m[1] === Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Заглавките, по които Next различава отговорите (RSC навигация и т.н.)
const VARY = ["rsc", "next-router-state-tree", "next-router-prefetch", "next-router-segment-prefetch", "next-url"];

// Минимален cron: числа, *, */n, a-b, a-b/n и списъци; ден от седмицата 0–6 (0 = неделя). Часовете са UTC.
function field(expr: string, v: number, min: number, max: number) {
  return expr.split(",").some((part) => {
    const [rng, stepS] = part.split("/");
    const step = stepS ? Number(stepS) : 1;
    let lo = min, hi = max;
    if (rng !== "*") { const [a, b] = rng.split("-").map(Number); lo = a; hi = b ?? (stepS ? max : a); }
    return v >= lo && v <= hi && (v - lo) % step === 0;
  });
}
export function cronMatch(cron: string, d: Date) {
  const [mi, h, dom, mo, dow] = cron.trim().split(/\s+/);
  return field(mi, d.getUTCMinutes(), 0, 59) && field(h, d.getUTCHours(), 0, 23) && field(dom, d.getUTCDate(), 1, 31) && field(mo, d.getUTCMonth() + 1, 1, 12) && field(dow, d.getUTCDay(), 0, 6);
}

// Планировчик: всяка минута проверява графика и пуска съответните обновявания в GitHub (workflow_dispatch).
async function scheduled(ev: { scheduledTime: number }, env: Env, ctx: Ctx) {
  if (!env.GH_DISPATCH_TOKEN) return;
  const d = new Date(ev.scheduledTime);
  const due = Object.entries(SCHEDULE as Record<string, string[]>).filter(([, cs]) => cs.some((c) => cronMatch(c, d))).map(([f]) => f);
  ctx.waitUntil(Promise.all(due.map(async (f) => {
    const r = await fetch(`https://api.github.com/repos/osaznatost/osaznatost-web/actions/workflows/${f}/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "osaznatost-scheduler", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({ ref: "main" }),
    });
    console.log(`график ${d.toISOString().slice(0, 16)} ${f}: ${r.status}`);
  })));
}

export default {
  scheduled,
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url);
    const kv = env.CACHE;
    if (!kv || req.method !== "GET" || SKIP.test(url.pathname) || !(await authed(req, env))) return handler.fetch(req, env, ctx);

    const key = `page:${env.BUILD_ID ?? "dev"}:${await sha(url.pathname + url.search + "|" + VARY.map((h) => req.headers.get(h) ?? "").join("|"))}`;
    const hit = await kv.getWithMetadata<{ s: number; h: [string, string][] }>(key, "stream").catch(() => null);
    if (hit?.value && hit.metadata) {
      const h = new Headers(hit.metadata.h);
      h.set("x-osz-cache", "hit");
      return new Response(hit.value, { status: hit.metadata.s, headers: h });
    }

    const res: Response = await handler.fetch(req, env, ctx);
    const type = res.headers.get("content-type") ?? "";
    if (res.status !== 200 || res.headers.has("set-cookie") || !/text\/html|text\/x-component/.test(type) || !res.body) return res;
    const [a, b] = res.body.tee();
    const keep: [string, string][] = [...res.headers].filter(([k]) => !/^(set-cookie|content-length|content-encoding|transfer-encoding|x-osz-cache)$/i.test(k));
    ctx.waitUntil(new Response(b).arrayBuffer().then((buf) => (buf.byteLength < 20e6 && !new TextDecoder().decode(buf).includes("osz-partial") ? kv.put(key, buf, { expirationTtl: TTL, metadata: { s: 200, h: keep } }) : undefined)).catch(() => {}));
    const out = new Response(a, res);
    out.headers.set("x-osz-cache", "miss");
    return out;
  },
};

