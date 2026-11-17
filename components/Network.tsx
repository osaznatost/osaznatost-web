import Link from "next/link";

export type NetNode = { id: string; label: string; sub?: string; href?: string; group: "buyer" | "partner" | "politician" | "sanction"; weight?: number };
const COL: Record<NetNode["group"], { fill: string; title: string }> = {
  buyer: { fill: "#2f6f8f", title: "Възложители" }, partner: { fill: "#b08436", title: "Съдружници в обединения" },
  politician: { fill: "#c8102e", title: "Политици и длъжностни лица" }, sanction: { fill: "#7a1e26", title: "Санкции" },
};

/** Звездна мрежа: фирмата в центъра, свързаните лица и институции около нея, по групи. Чертае се на сървъра (SVG). */
export function Network({ center, nodes }: { center: string; nodes: NetNode[] }) {
  if (!nodes.length) return null;
  const W = 1000, H = Math.max(420, Math.min(760, 260 + nodes.length * 18)), cx = W / 2, cy = H / 2;
  const groups = (["buyer", "partner", "politician", "sanction"] as const).filter((g) => nodes.some((n) => n.group === g));
  // Всяка група получава сектор от окръжността.
  const placed: (NetNode & { x: number; y: number })[] = [];
  const sector = (2 * Math.PI) / groups.length;
  groups.forEach((g, gi) => {
    const ns = nodes.filter((n) => n.group === g);
    ns.forEach((n, i) => {
      const a = -Math.PI / 2 + gi * sector + (sector * (i + 0.5)) / ns.length;
      const r = Math.min(cx, cy) - 70 - (i % 2) * 40;
      placed.push({ ...n, x: cx + Math.cos(a) * r * 1.55, y: cy + Math.sin(a) * r });
    });
  });
  const maxW = Math.max(1, ...nodes.map((n) => n.weight ?? 1));
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" role="img" aria-label="Мрежа от връзки">
        {placed.map((n) => <line key={`l${n.id}`} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={COL[n.group].fill} strokeOpacity={0.35} strokeWidth={1 + ((n.weight ?? 1) / maxW) * 6} />)}
        <circle cx={cx} cy={cy} r={34} fill="#16201b" />
        <text x={cx} y={cy + 52} textAnchor="middle" fontSize={15} fontWeight={700} fill="#16201b" stroke="#fff" strokeWidth={4} paintOrder="stroke">{center.length > 40 ? center.slice(0, 39) + "…" : center}</text>
        {placed.map((n) => {
          const right = n.x >= cx;
          const body = (
            <g>
              <circle cx={n.x} cy={n.y} r={9} fill={COL[n.group].fill} />
              <text x={n.x + (right ? 14 : -14)} y={n.y - 1} textAnchor={right ? "start" : "end"} fontSize={13} fontWeight={600} fill="#16201b" stroke="#fff" strokeWidth={4} paintOrder="stroke">{n.label.length > 34 ? n.label.slice(0, 33) + "…" : n.label}</text>
              {n.sub && <text x={n.x + (right ? 14 : -14)} y={n.y + 14} textAnchor={right ? "start" : "end"} fontSize={11.5} fill="#56605b" stroke="#fff" strokeWidth={4} paintOrder="stroke">{n.sub}</text>}
              <title>{`${n.label}${n.sub ? ` — ${n.sub}` : ""}`}</title>
            </g>
          );
          return n.href ? <Link key={n.id} href={n.href}>{body}</Link> : <g key={n.id}>{body}</g>;
        })}
      </svg>
      <p className="flex flex-wrap gap-4 text-sm mt-1">{groups.map((g) => <span key={g} className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full" style={{ background: COL[g].fill }} />{COL[g].title}</span>)}<span className="text-muted">Дебелината на линията е според сумата.</span></p>
    </div>
  );
}
