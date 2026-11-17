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

const SERIES_COLORS: Record<string, string> = {
  "България": "#1F4D3A", "ЕС": "#9aa39e", "Румъния": "#b08436", "Гърция": "#3d5a80", "Хърватия": "#8a5a8c", "Германия": "#56605b", "Полша": "#c46a4a",
};
const PALETTE = ["#1F4D3A", "#c8102e", "#3d5a80", "#b08436", "#8a5a8c", "#2a7f7a", "#9aa39e"];

/** Раздалечава надписите в края на линиите, за да не се застъпват (в стойности по оста y). */
function spread<T extends { value: number }>(rows: T[], height: number): (T & { ly: number })[] {
  if (rows.length < 2) return rows.map((r) => ({ ...r, ly: r.value }));
  const vals = rows.map((r) => r.value);
  const span = (Math.max(...vals) - Math.min(...vals)) || Math.abs(vals[0]) || 1;
  const plotH = Math.max(120, height - 60);
  const gap = (span / plotH) * 15 * 1.6; // около 15 px между надписите
  const sorted = rows.map((r, i) => ({ i, v: r.value })).sort((a, b) => a.v - b.v);
  for (let k = 1; k < sorted.length; k++) if (sorted[k].v - sorted[k - 1].v < gap) sorted[k].v = sorted[k - 1].v + gap;
  const out = rows.map((r) => ({ ...r, ly: r.value }));
  for (const s of sorted) out[s.i].ly = s.v;
  return out;
}

/** Няколко линии с етикет в края. x е година (число) или месец „YYYY-MM“. */
export function MultiLine({
  data, unit = "", yLabel, height = 320, zero = false,
}: {
  data: { series: string; x: number | string; value: number }[];
  unit?: string;
  yLabel?: string;
  height?: number;
  zero?: boolean;
}) {
  const ref = usePlot((width) => {
    const names = [...new Set(data.map((d) => d.series))];
    const colors = names.map((n, i) => SERIES_COLORS[n] ?? PALETTE[i % PALETTE.length]);
    const monthly = typeof data[0]?.x === "string";
    const rows = data.map((d) => ({ ...d, x: monthly ? new Date(`${d.x}-01`) : d.x }));
    const lastOf = names.map((n) => rows.filter((d) => d.series === n).at(-1)!).filter(Boolean);
    const f = (v: number) => `${String(Math.round(v * 10) / 10).replace(".", ",")}${unit}`;
    const longest = Math.max(...names.map((n) => n.length)) + 7;
    const endLabels = width >= 500 && longest <= 34 && names.length <= 8;
    return Plot.plot({
      ...base,
      width,
      height,
      marginRight: endLabels ? Math.min(260, longest * 7.4) : 16,
      marginLeft: Math.max(...data.map((d) => Math.abs(d.value))) >= 10000 ? 62 : 44,
      x: monthly ? { label: null, type: "utc" } : { tickFormat: "d", label: null },
      y: { grid: true, label: yLabel ?? null, labelAnchor: "top", zero, tickFormat: (v: number) => v.toLocaleString("bg-BG") },
      color: { domain: names, range: colors, legend: !endLabels },
      marks: [
        ...(zero ? [Plot.ruleY([0], { stroke: MUTED })] : []),
        Plot.lineY(rows, { x: "x", y: "value", stroke: "series", strokeWidth: (d: { series: string }) => (d.series === "България" ? 2.75 : 1.75) }),
        ...(!endLabels ? [] : [Plot.text(spread(lastOf, height), { x: "x", y: "ly", text: (d: { series: string; value: number }) => `${d.series} ${f(d.value)}`, dx: 6, textAnchor: "start", fill: "series", fontWeight: 600 })]),
        Plot.tip(rows, Plot.pointer({ x: "x", y: "value", title: (d: { series: string; x: number | Date; value: number }) => `${d.series}, ${d.x instanceof Date ? d.x.toISOString().slice(0, 7) : d.x}: ${f(d.value)}` })),
      ],
    }) as SVGSVGElement;
  });
  return <div ref={ref} className="w-full" />;
}

/** Хоризонтални стълбове, подредени по стойност. */
export function BarRank({ data, unit = "", highlight }: { data: { name: string; value: number }[]; unit?: string; highlight?: string }) {
  const ref = usePlot((width) => {
    const rows = [...data].sort((a, b) => b.value - a.value);
    return Plot.plot({
      ...base,
      width,
      height: rows.length * 24 + 40,
      marginLeft: Math.min(width < 600 ? 150 : 320, Math.max(90, Math.max(...rows.map((r) => r.name.length)) * 7.2 + 14)),
      marginRight: 60,
      x: { grid: true, label: null, axis: "top" },
      y: { label: null, domain: rows.map((r) => r.name), tickFormat: (t: string) => (width < 600 && t.length > 22 ? `${t.slice(0, 21)}…` : t) },
      marks: [
        Plot.barX(rows, { y: "name", x: "value", fill: (d: { name: string; value: number }) => (d.name === highlight ? "#c8102e" : d.value < 0 ? "#d2353f" : "#1F4D3A") }),
        Plot.text(rows, { y: "name", x: "value", text: (d: { value: number }) => `${String(Math.round(d.value * 10) / 10).replace(".", ",")}${unit}`, dx: 4, textAnchor: "start", fontSize: 12 }),
        Plot.ruleX([0], { stroke: MUTED }),
      ],
    }) as SVGSVGElement;
  });
  return <div ref={ref} className="w-full" />;
}
