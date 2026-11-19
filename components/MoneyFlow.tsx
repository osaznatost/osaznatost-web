"use client";

import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import { useEffect, useMemo, useRef, useState } from "react";

export type FlowNode = { id: string; label: string; kind: "source" | "buyer" | "supplier" | "sub" | "unknown" | "annex"; color?: string; note?: string };
export type FlowLink = { source: string; target: string; value: number; label?: string };

const KIND: Record<FlowNode["kind"], string> = {
  source: "#2f7d57", buyer: "#143426", supplier: "#c8102e", sub: "#b08436", unknown: "#cfd8d2", annex: "#e08a2e",
};
/** Палитра за първата колона: всеки източник с отделен цвят, който „тече“ през потоците му. */
const PALETTE = ["#2f6f8f", "#c46a4a", "#2f7d57", "#b08436", "#8a5a8c", "#3d5a80", "#c8102e", "#5f7f4e", "#a0614a", "#4f6b8a", "#9a7b4f", "#2a7f7a"];

const eur = (n: number) => new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", notation: n >= 1e6 ? "compact" : "standard", maximumFractionDigits: n >= 1e6 ? 1 : 0 }).format(n);
const pc = (a: number, b: number) => (b ? `${(Math.round((a / b) * 1000) / 10).toLocaleString("bg-BG")}%` : "");

type N = FlowNode & { x0?: number; x1?: number; y0?: number; y1?: number; value?: number; depth?: number; sourceLinks?: L[]; targetLinks?: L[]; index?: number };
type L = FlowLink & { source: N; target: N; width?: number; y0?: number; y1?: number; index?: number };

/** Паричен поток (Sankey) с цветни потоци и подробности при посочване. */
export function MoneyFlow({ nodes, links, columns, minHeight = 300, unit = eur }: {
  nodes: FlowNode[]; links: FlowLink[]; columns?: string[]; minHeight?: number; unit?: (n: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState<{ kind: "link" | "node"; i: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const valid = links.filter((l) => l.value > 0);
  const narrow = width < 560;
  const graph = useMemo(() => {
    if (!valid.length) return null;
    const used = new Set(valid.flatMap((l) => [l.source, l.target]));
    const ns = nodes.filter((n) => used.has(n.id));
    const height = Math.max(minHeight, ns.length * (narrow ? 44 : 40));
    const labelSpace = narrow ? 0 : width > 1000 ? 310 : 200;
    const layout = sankey<N, L>()
      .nodeId((d) => d.id)
      .nodeAlign(sankeyJustify)
      .nodeWidth(16)
      .nodePadding(narrow ? 26 : 20)
      .extent([[1, columns ? 34 : 8], [width - labelSpace - 1, height - 8]]);
    const g = layout({ nodes: ns.map((n) => ({ ...n })) as N[], links: valid.map((l) => ({ ...l })) as unknown as L[] });
    // Цвят на всеки възел: първата колона получава цвят от палитрата, останалите наследяват от най-големия входящ поток.
    const color = new Map<string, string>();
    const sorted = [...g.nodes].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
    let p = 0;
    for (const n of sorted) {
      if (n.color) { color.set(n.id, n.color); continue; }
      if (!n.targetLinks?.length) { color.set(n.id, n.kind === "unknown" ? KIND.unknown : PALETTE[p++ % PALETTE.length]); continue; }
      const big = [...n.targetLinks].sort((a, b) => b.value - a.value)[0];
      color.set(n.id, n.kind === "unknown" ? KIND.unknown : n.kind === "annex" ? KIND.annex : (color.get(big.source.id) ?? KIND[n.kind]));
    }
    return { g, height, color };
  }, [valid, nodes, width, narrow, minHeight, columns]);

  if (!graph) return <p className="text-[15px] text-muted py-6 text-center">Няма данни, от които да се начертае разбивка на парите.</p>;
  const { g, height, color } = graph;
  const linkColor = (l: L) => (l.target.kind === "unknown" ? "#cfd8d2" : color.get(l.source.depth === 0 ? l.source.id : l.source.id) ?? "#d9e2dc");
  const active = (l: L) => !hover || (hover.kind === "link" ? l.index === hover.i : l.source.index === hover.i || l.target.index === hover.i);
  const xs = [...new Set(g.nodes.map((n) => Math.round(n.x0 ?? 0)))].sort((a, b) => a - b);
  const maxDepth = xs.length - 1;
  const colX = (d: number) => xs[d] ?? 0;
  const isLast = (n: N) => Math.round(n.x0 ?? 0) === xs[maxDepth];

  let tip: React.ReactNode = null;
  if (hover) {
    if (hover.kind === "link") {
      const l = g.links[hover.i];
      tip = (<><p className="font-semibold">{l.source.label} → {l.target.label}</p><p>{unit(l.value)}</p><p className="text-muted">{pc(l.value, l.source.value ?? 0)} от „{l.source.label}“ · {pc(l.value, l.target.value ?? 0)} от „{l.target.label}“</p>{l.label && <p className="text-muted">{l.label}</p>}</>);
    } else {
      const n = g.nodes[hover.i];
      const outs = [...(n.sourceLinks ?? [])].sort((a, b) => b.value - a.value).slice(0, 6);
      const ins = [...(n.targetLinks ?? [])].sort((a, b) => b.value - a.value).slice(0, 6);
      tip = (<><p className="font-semibold">{n.label}</p><p>{unit(n.value ?? 0)}</p>{n.note && <p className="text-muted">{n.note}</p>}
        {ins.length > 0 && <><p className="mt-1 text-muted">Идва от:</p>{ins.map((l, i) => <p key={i}>{l.source.label}: {unit(l.value)} ({pc(l.value, n.value ?? 0)})</p>)}</>}
        {outs.length > 0 && <><p className="mt-1 text-muted">Отива към:</p>{outs.map((l, i) => <p key={i}>{l.target.label}: {unit(l.value)} ({pc(l.value, n.value ?? 0)})</p>)}</>}</>);
    }
  }

  return (
    <div ref={ref} className="w-full min-w-0 max-w-full overflow-hidden relative" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} className="block max-w-full" role="img" aria-label="Паричен поток">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#e7efea" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#9aa39e" strokeWidth="2" />
          </pattern>
        </defs>
        {columns && !narrow && columns.slice(0, maxDepth + 1).map((c, d) => (
          <text key={c} x={colX(d)} y={18} fontSize={13} fontWeight={700} fill="#16201b">{c}</text>
        ))}
        {g.links.map((l, i) => (
          <path key={i} d={sankeyLinkHorizontal()(l as never) ?? ""} fill="none" stroke={linkColor(l)}
            strokeOpacity={active(l) ? (hover ? 0.7 : 0.38) : 0.08} strokeWidth={Math.max(1.5, l.width ?? 1)}
            onMouseMove={(e) => setHover({ kind: "link", i, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })} style={{ cursor: "pointer", transition: "stroke-opacity .15s" }} />
        ))}
        {g.nodes.map((n, i) => {
          const x0 = n.x0 ?? 0, x1 = n.x1 ?? 0, y0 = n.y0 ?? 0, y1 = n.y1 ?? 0;
          const right = x1 + 6;
          const labelX = narrow ? (x0 > width / 2 ? x0 - 6 : right) : right;
          const anchor = narrow && x0 > width / 2 ? "end" : "start";
          const max = narrow ? 24 : (isLast(n) ? (width > 1000 ? 40 : 26) : 30);
          const dim = hover && !(hover.kind === "node" ? hover.i === i : g.links[hover.i]?.source.index === i || g.links[hover.i]?.target.index === i);
          return (
            <g key={n.id} opacity={dim ? 0.35 : 1} onMouseMove={(e) => setHover({ kind: "node", i, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })} style={{ cursor: "pointer" }}>
              <rect x={x0} y={y0} width={x1 - x0} height={Math.max(3, y1 - y0)} fill={n.kind === "unknown" ? "url(#hatch)" : color.get(n.id)} rx={2} />
              <text x={labelX} y={(y0 + y1) / 2 - 2} textAnchor={anchor} fontSize={13} fontWeight={600} fill="#16201b" stroke="#fff" strokeWidth={4} paintOrder="stroke">
                {n.label.length > max ? `${n.label.slice(0, max - 1)}…` : n.label}
              </text>
              <text x={labelX} y={(y0 + y1) / 2 + 13} textAnchor={anchor} fontSize={12} fill="#56605b" stroke="#fff" strokeWidth={4} paintOrder="stroke">{unit(n.value ?? 0)}</text>
            </g>
          );
        })}
      </svg>
      {hover && tip && (
        <div className="absolute z-10 pointer-events-none bg-white ring-1 ring-rule shadow-lg rounded-sm px-3 py-2 text-[13px] max-w-[320px]"
          style={{ left: Math.min(hover.x + 14, width - 330), top: Math.max(0, hover.y - 10) }}>
          {tip}
        </div>
      )}
    </div>
  );
}
