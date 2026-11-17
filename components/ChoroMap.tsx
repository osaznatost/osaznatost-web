"use client";
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "react";

type Feature = { type: "Feature"; properties: { code: string }; geometry: unknown };
type Geo = { type: "FeatureCollection"; features: Feature[] };
const ABROAD = /^(AF|AS|EU|NA|OC|SA)$/;

/** Карта на общините, оцветени по стойност. `values` е по код на община. */
export function ChoroMap({ values, color, legend, unit = "", decimals = 0 }: {
  values: Record<string, { name: string; value: number; note?: string }>; color: string; legend: string; unit?: string; decimals?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  useEffect(() => { fetch("/geo/bg-munis.json").then((r) => r.json()).then(setGeo).catch(() => setGeo(null)); }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || !geo) return;
    const feats = geo.features.filter((f) => values[f.properties.code] && !ABROAD.test(f.properties.code));
    const vals = feats.map((f) => values[f.properties.code].value);
    const fmt = (v: number) => `${v.toLocaleString("bg-BG", { maximumFractionDigits: decimals })}${unit}`;
    const render = () => {
      const width = el.clientWidth;
      el.replaceChildren(Plot.plot({
        width, height: Math.round(width * 0.62),
        projection: { type: "mercator", domain: { type: "FeatureCollection", features: feats } as never },
        style: { fontFamily: "inherit", fontSize: "13px", background: "transparent" },
        color: { type: "linear", domain: [Math.min(...vals), Math.max(...vals)], range: ["#f3f5f4", color], legend: true, label: legend, tickFormat: fmt },
        marks: [
          Plot.geo(feats, { fill: (f: Feature) => values[f.properties.code].value, stroke: "#fff", strokeWidth: 0.4 }),
          Plot.tip(feats, Plot.pointer(Plot.centroid({ title: (f: Feature) => { const s = values[f.properties.code]; return `${s.name}\n${fmt(s.value)}${s.note ? `\n${s.note}` : ""}`; } }))),
        ],
      }));
    };
    render();
    const ro = new ResizeObserver(render);
    ro.observe(el);
    return () => ro.disconnect();
  }, [geo, values, color, legend, unit, decimals]);
  return <div ref={ref} className="w-full min-h-[200px]">{!geo && <p className="text-sm text-muted">Зареждане на картата…</p>}</div>;
}
