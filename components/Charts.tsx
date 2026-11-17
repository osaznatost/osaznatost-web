"use client";

import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";

const INK = "#141a17";
const MUTED = "#56605b";

function usePlot(make: (width: number) => (SVGSVGElement | HTMLElement)) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const render = () => {
      el.replaceChildren(make(el.clientWidth));
    };
    render();
    const ro = new ResizeObserver(render);
    ro.observe(el);
    return () => ro.disconnect();
  }, [make]);
  return ref;
}

const base = {
  style: { fontFamily: "inherit", fontSize: "13px", color: INK, background: "transparent" },
  marginLeft: 44,
  marginBottom: 32,
};

export function LineChart({
  data, x, y, yLabel, highlightFrom, height = 300, xType = "year",
}: {
  data: Record<string, number | string>[];
  x: string;
  y: string;
  yLabel: string;
  highlightFrom?: number;
  height?: number;
  xType?: "year" | "band";
}) {
  const ref = usePlot(
    (width) =>
      Plot.plot({
        ...base,
        width,
        height,
        x: xType === "year" ? { tickFormat: "d", label: null } : { type: "band", label: null, tickRotate: width < 500 ? -45 : 0 },
        y: { grid: true, label: yLabel, labelAnchor: "top" },
        marks: [
          Plot.ruleY([0], { stroke: MUTED }),
          xType === "year"
            ? Plot.lineY(data, { x, y, stroke: "#3d5a80", strokeWidth: 2 })
            : Plot.barY(data, { x, y, fill: "#3d5a80" }),
          ...(highlightFrom !== undefined
            ? [Plot.dot(data.filter((d) => Number(d[x]) >= highlightFrom), { x, y, fill: "#c8102e", r: 3.5 })]
            : []),
          Plot.text(data.slice(-1), { x, y, text: (d) => `${String(d[y]).replace(".", ",")}%`, dy: -10, fontWeight: 700 }),
          Plot.tip(data, Plot.pointerX({ x, y, title: (d) => `${d[x]}: ${String(d[y]).replace(".", ",")}%` })),
        ],
      }) as SVGSVGElement,
  );
  return <div ref={ref} className="w-full" />;
}

export function GrowthChart({ series }: { series: { name: string; year: number; value: number }[] }) {
  const ref = usePlot(
    (width) =>
      Plot.plot({
        ...base,
        marginLeft: 60,
        marginRight: width < 500 ? 10 : 110,
        width,
        height: 300,
        x: { label: "години", labelAnchor: "right" },
        y: { grid: true, label: "€", tickFormat: (d: number) => `${Math.round(d / 1000)} хил.` },
        color: { domain: [...new Set(series.map((s) => s.name))], range: ["#8a8f8c", "#2a7f7a", "#3d5a80", "#b08436"] },
        marks: [
          Plot.lineY(series, { x: "year", y: "value", stroke: "name", strokeWidth: 2 }),
          ...(width < 500
            ? []
            : [Plot.text(series, Plot.selectLast({ x: "year", y: "value", z: "name", text: "name", textAnchor: "start", dx: 6, fill: "name" }))]),
          Plot.tip(series, Plot.pointer({ x: "year", y: "value", title: (d) => `${d.name}, година ${d.year}: ${Math.round(d.value).toLocaleString("bg-BG")} €` })),
        ],
      }) as SVGSVGElement,
  );
  return <div ref={ref} className="w-full" />;
}
