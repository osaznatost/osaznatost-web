import { billaAtSearch } from "../lib/billa-at.mjs";
for (const s of ["barilla spaghetti", "milka alpenmilch", "lurpak", "president butter", "lavazza qualita rossa", "jacobs", "kinder schokolade", "aptamil", "hipp", "colgate", "sensodyne", "monini", "bertolli", "lindt", "ritter sport", "nescafe", "coca cola", "fairy", "zewa", "nivea"]) {
  const r = await billaAtSearch(s); await new Promise((x) => setTimeout(x, 2000));
  console.log("## AT", s, r ? r.length : "null"); for (const p of (r || []).slice(0, 8)) console.log("   ", p.name, "|", p.amount, p.unit, "|", p.price, p.promo ? "PROMO" : "", "|", p.sku);
}
