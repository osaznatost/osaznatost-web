// Полукръг на местата по групи. Цветовете са неутрални и не са цветовете на партиите.
const PALETTE = ["#3d5a80", "#b08436", "#2a7f7a", "#8a6d9e", "#8a8f8c", "#5f7f4e", "#a0614a"];

export function Hemicycle({ groups }: { groups: { label: string; seats: number }[] }) {
  const total = groups.reduce((s, g) => s + g.seats, 0);
  const rows = Math.max(6, Math.round(Math.sqrt(total / 3)));
  const r0 = 0.38, r1 = 1;
  const radii = Array.from({ length: rows }, (_, i) => r0 + ((r1 - r0) * i) / (rows - 1));
  const sumR = radii.reduce((a, b) => a + b, 0);
  let counts = radii.map((r) => Math.round((total * r) / sumR));
  counts[rows - 1] += total - counts.reduce((a, b) => a + b, 0);
  const seats: { x: number; y: number; a: number }[] = [];
  radii.forEach((r, i) => {
    const n = counts[i];
    for (let k = 0; k < n; k++) {
      const a = Math.PI - (Math.PI * (k + 0.5)) / n;
      seats.push({ x: r * Math.cos(a), y: r * Math.sin(a), a });
    }
  });
  seats.sort((p, q) => q.a - p.a);
  const colors: string[] = [];
  groups.forEach((g, i) => { for (let k = 0; k < g.seats; k++) colors.push(PALETTE[i % PALETTE.length]); });
  const dot = 0.42 / rows;
  return (
    <figure>
      <svg viewBox="-1.08 -1.04 2.16 1.1" className="w-full max-w-xl" role="img" aria-label="Разпределение на местата по групи">
        {seats.map((s, i) => <circle key={i} cx={s.x} cy={-s.y} r={dot} fill={colors[i] ?? "#ddd"} />)}
        <text x="0" y="-0.08" textAnchor="middle" fontSize="0.16" fontWeight="700" fill="#141a17">{total}</text>
        <text x="0" y="0.02" textAnchor="middle" fontSize="0.06" fill="#56605b">депутати</text>
      </svg>
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
        {groups.map((g, i) => (
          <span key={g.label} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            {g.label} <b className="num">{g.seats}</b>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
