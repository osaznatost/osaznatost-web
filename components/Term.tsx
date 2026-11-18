"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

/** Термин с обяснение при натискане (на телефона) или посочване (на компютър). */
export function Term({ k, children }: { k: GlossaryKey; children?: React.ReactNode }) {
  const g = GLOSSARY[k];
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const open = pos !== null;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(open) : v;
    if (!next) return setPos(null);
    const r = ref.current!.getBoundingClientRect(), width = Math.min(288, window.innerWidth - 24);
    setPos({ left: Math.max(12, Math.min(r.left, window.innerWidth - width - 12)), top: r.bottom + 6, width });
  };
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setPos(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPos(null); };
    const close = () => setPos(null);
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", close, { passive: true });
    return () => { document.removeEventListener("pointerdown", off); document.removeEventListener("keydown", esc); window.removeEventListener("scroll", close); };
  }, [open]);
  if (!g) return <>{children}</>;
  return (
    <span ref={ref} className="relative inline">
      <button type="button" aria-expanded={open} aria-describedby={open ? id : undefined} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className="underline decoration-dotted decoration-1 underline-offset-[3px] cursor-help text-inherit font-inherit">
        {children ?? g.term}
      </button>
      {pos && (
        <span id={id} role="tooltip" style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width }} className="z-50 rounded bg-ink text-white text-sm font-normal leading-snug p-3 shadow-lg text-left normal-case">
          <b className="block mb-0.5">{g.term}</b>{g.text} <a href={`/rechnik#${k}`} className="text-white underline">Речник</a>
        </span>
      )}
    </span>
  );
}
