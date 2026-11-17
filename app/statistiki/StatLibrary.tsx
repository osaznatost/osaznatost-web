"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

export type Card = {
  id: string; title: string; topic: string; unit: string; what: string;
  value?: string; period?: string; change?: string; good?: boolean | null; trend?: "up" | "down" | "flat";
  eu?: string; regional?: boolean;
};

const ARROW = { up: "↑", down: "↓", flat: "→" } as const;

export function StatLibrary({ cards, topics }: { cards: Card[]; topics: { id: string; about: string; n: number }[] }) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [only, setOnly] = useState<"all" | "good" | "bad">("all");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return cards.filter((c) =>
      (!topic || c.topic === topic) &&
      (only === "all" || (only === "good" ? c.good === true : c.good === false)) &&
      (!t || (c.title + " " + c.what + " " + c.topic).toLowerCase().includes(t)));
  }, [cards, q, topic, only]);
  const groups = topics.filter((t) => shown.some((c) => c.topic === t.id));

  return (
    <div>
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur py-3 -mx-1 px-1 mb-6 border-b border-rule">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Търси показател: инфлация, заплата, дълг, раждаемост…"
          className="w-full ring-1 ring-rule rounded-sm px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-green" aria-label="Търсене на показател" />
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => setTopic(null)} className={`text-sm rounded-full px-3 py-1 ring-1 ${!topic ? "bg-green text-white ring-green" : "ring-rule"}`}>Всички теми</button>
          {topics.map((t) => (
            <button key={t.id} onClick={() => setTopic(topic === t.id ? null : t.id)} className={`text-sm rounded-full px-3 py-1 ring-1 ${topic === t.id ? "bg-green text-white ring-green" : "ring-rule"}`}>{t.id} <span className="opacity-60">{t.n}</span></button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          {([["all", "Всички"], ["good", "Подобрение в последната година"], ["bad", "Влошаване в последната година"]] as const).map(([v, l]) => (
            <label key={v} className="inline-flex items-center gap-1.5 cursor-pointer"><input type="radio" name="only" checked={only === v} onChange={() => setOnly(v)} />{l}</label>
          ))}
          <span className="text-muted ml-auto">{shown.length} от {cards.length} показателя</span>
        </div>
      </div>

      {groups.map((t) => (
        <section key={t.id} className="mb-10">
          <h2 className="display text-[2rem] leading-none">{t.id}</h2>
          <p className="text-muted text-[15px] mb-4">{t.about}</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.filter((c) => c.topic === t.id).map((c) => (
              <li key={c.id}>
                <Link href={`/statistiki/${c.id}`} className="block h-full ring-1 ring-rule rounded-sm p-4 bg-white no-underline text-ink hover:ring-green hover:ring-2">
                  <p className="font-semibold leading-snug">{c.title}</p>
                  {c.value && (
                    <p className="mt-2 flex items-baseline gap-2 flex-wrap">
                      <span className="display text-[2rem] leading-none">{c.value}</span>
                      {c.change && c.trend && (
                        <span className={`text-sm font-semibold ${c.good === true ? "text-[#1f7a4a]" : c.good === false ? "text-red" : "text-muted"}`}>{ARROW[c.trend]} {c.change}</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-muted mt-1">{c.unit}{c.period ? ` · ${c.period}` : ""}</p>
                  {c.eu && <p className="text-sm mt-1">ЕС: {c.eu}</p>}
                  <p className="text-sm text-muted mt-2 line-clamp-2">{c.what}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!shown.length && <p className="text-[16px]">Няма показател, който отговаря на търсенето. Опитай с друга дума или изчисти филтрите.</p>}
    </div>
  );
}
