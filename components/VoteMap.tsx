"use client";
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "react";

type Feature = { type: "Feature"; properties: { code: string }; geometry: unknown };
type Geo = { type: "FeatureCollection"; features: Feature[] };

/** Карта по общини: делът на една листа от гласовете за партии. */
export function VoteMap({ shares, color, label }: { shares: Record<string, { name: string; pct: number; votes: number }>; color: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  useEffect(() => { fetch("/geo/bg-munis.json").then((r) => r.json()).then(setGeo).catch(() => setGeo(null)); }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || !geo) return;
    const domestic = { ...geo, features: geo.features.filter((f) => shares[f.properties.code] && !/^(AF|AS|EU|NA|OC|SA)$/.test(f.properties.code)) };
    const vals = domestic.features.map((f) => shares[f.properties.code].pct);
    const render = () => {
      const width = el.clientWidth;
      el.replaceChildren(Plot.plot({
        width, height: Math.round(width * 0.62),
        projection: { type: "mercator", domain: domestic as never },
        style: { fontFamily: "inherit", fontSize: "13px", background: "transparent" },
        color: { type: "linear", domain: [Math.min(...vals), Math.max(...vals)], range: ["#f3f5f4", color], legend: true, label: `${label}, % от гласовете за партии`, tickFormat: (v: number) => `${Math.round(v)}%` },
        marks: [
          Plot.geo(domestic.features, { fill: (f: Feature) => shares[f.properties.code].pct, stroke: "#fff", strokeWidth: 0.4 }),
          Plot.tip(domestic.features, Plot.pointer(Plot.centroid({
            title: (f: Feature) => { const s = shares[f.properties.code]; return `${s.name}\n${String(s.pct.toFixed(1)).replace(".", ",")}% · ${s.votes.toLocaleString("bg-BG")} гласа`; },
          }))),
        ],
      }));
    };
    render();
    const ro = new ResizeObserver(render);
    ro.observe(el);
    return () => ro.disconnect();
  }, [geo, shares, color, label]);
  return <div ref={ref} className="w-full min-h-[200px]">{!geo && <p className="text-sm text-muted">Зареждане на картата…</p>}</div>;
}
