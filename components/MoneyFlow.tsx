"use client";

import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import { useEffect, useRef, useState } from "react";

export type FlowNode = { id: string; label: string; kind: "source" | "buyer" | "supplier" | "sub" | "unknown" | "annex" };
export type FlowLink = { source: string; target: string; value: number; label?: string };

const COLOR: Record<FlowNode["kind"], string> = {
  source: "#2f7d57", buyer: "#143426", supplier: "#c8102e", sub: "#b08436", unknown: "#cfd8d2", annex: "#e08a2e",
};

const eur = (n: number) => new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", notation: n >= 1e6 ? "compact" : "standard", maximumFractionDigits: n >= 1e6 ? 1 : 0 }).format(n);

/** Паричен поток от източника до изпълнителите (диаграма тип Sankey). */
export function MoneyFlow({ nodes, links }: { nodes: FlowNode[]; links: FlowLink[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 560;
  const height = Math.max(260, nodes.length * 52);
  const labelSpace = narrow ? 0 : 150;
  const layout = sankey<FlowNode, FlowLink>()
    .nodeId((d) => d.id)
    .nodeAlign(sankeyJustify)
    .nodeWidth(14)
    .nodePadding(narrow ? 34 : 26)
    .extent([[1, 8], [width - labelSpace - 1, height - 8]]);
  const graph = layout({ nodes: nodes.map((n) => ({ ...n })), links: links.filter((l) => l.value > 0).map((l) => ({ ...l })) });

  return (
    <div ref={ref} className="w-full overflow-hidden">
      <svg width={width} height={height} role="img" aria-label="Паричен поток по договора">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#e7efea" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#9aa39e" strokeWidth="2" />
          </pattern>
        </defs>
        {graph.links.map((l, i) => (
          <path
            key={i}
            d={sankeyLinkHorizontal()(l) ?? ""}
            fill="none"
            stroke={(l.target as FlowNode).kind === "unknown" ? "#cfd8d2" : (l.source as FlowNode).kind === "annex" ? "#f3c99a" : "#d9e2dc"}
            strokeOpacity={0.85}
            strokeWidth={Math.max(1, l.width ?? 1)}
          >
            <title>{`${(l.source as FlowNode).label} → ${(l.target as FlowNode).label}: ${eur(l.value)}`}</title>
          </path>
        ))}
        {graph.nodes.map((n) => {
          const x0 = n.x0 ?? 0, x1 = n.x1 ?? 0, y0 = n.y0 ?? 0, y1 = n.y1 ?? 0;
          const right = x1 + 6;
          const labelX = narrow ? (x0 > width / 2 ? x0 - 6 : right) : right;
          const anchor = narrow && x0 > width / 2 ? "end" : "start";
          return (
            <g key={n.id}>
              <rect x={x0} y={y0} width={x1 - x0} height={Math.max(2, y1 - y0)} fill={n.kind === "unknown" ? "url(#hatch)" : COLOR[n.kind]} rx={2} />
              <text x={labelX} y={(y0 + y1) / 2 - 7} textAnchor={anchor} fontSize={12.5} fontWeight={600} fill="#16201b">
                {n.label.length > (narrow ? 26 : 34) ? `${n.label.slice(0, narrow ? 25 : 33)}…` : n.label}
              </text>
              <text x={labelX} y={(y0 + y1) / 2 + 9} textAnchor={anchor} fontSize={12} fill="#56605b">{eur(n.value ?? 0)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
