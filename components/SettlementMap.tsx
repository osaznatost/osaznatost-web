"use client";
import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";

type Feature = { type: "Feature"; properties: { ekatte: string }; geometry: unknown };

/** Карта на общината по землища на населените места. Градовете са в по-тъмен цвят. */
export function SettlementMap({ geo, names }: { geo: { type: "FeatureCollection"; features: Feature[] }; names: Record<string, { name: string; town: boolean }> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const render = () => {
      const width = el.clientWidth;
      el.replaceChildren(Plot.plot({
        width, height: Math.round(Math.min(width, 900) * 0.7),
        projection: { type: "mercator", domain: geo as never },
        style: { fontFamily: "inherit", fontSize: "13px", background: "transparent" },
        marks: [
          Plot.geo(geo.features, { fill: (f: Feature) => (names[f.properties.ekatte]?.town ? "#1F4D3A" : "#cfe0d6"), stroke: "#fff", strokeWidth: 1.2 }),
          Plot.text(geo.features, Plot.centroid({ text: (f: Feature) => names[f.properties.ekatte]?.name ?? "", fill: (f: Feature) => (names[f.properties.ekatte]?.town ? "#fff" : "#16201b"), fontWeight: 600, stroke: (f: Feature) => (names[f.properties.ekatte]?.town ? "#1F4D3A" : "#cfe0d6"), strokeWidth: 3 })),
        ],
      }));
    };
    render();
    const ro = new ResizeObserver(render);
    ro.observe(el);
    return () => ro.disconnect();
  }, [geo, names]);
  return <div ref={ref} className="w-full" />;
}
