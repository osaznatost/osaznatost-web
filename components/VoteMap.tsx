"use client";
import { ChoroMap } from "./ChoroMap";

/** Карта по общини: делът на една листа от гласовете за партии. */
export function VoteMap({ shares, color, label }: { shares: Record<string, { name: string; pct: number; votes: number }>; color: string; label: string }) {
  const values = Object.fromEntries(Object.entries(shares).map(([c, s]) => [c, { name: s.name, value: s.pct, note: `${s.votes.toLocaleString("bg-BG")} гласа` }]));
  return <ChoroMap values={values} color={color} legend={`${label}, % от гласовете за партии`} unit="%" decimals={1} />;
}
