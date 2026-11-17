// Връзки „фирма ↔ политик или длъжностно лице“ по Търговския регистър, изчислени от „Наясно“ (MIT).
// Записва компактен индекс по ЕИК в data/political-links.json.
import { writeFileSync } from "node:fs";
const R = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data/procurement/derived";
const get = async (f) => (await fetch(`${R}/${f}`)).json();
const [mp, pep, party] = await Promise.all([get("mp_connected.json"), get("pep_connected.json"), get("mp_party.json")]);
const ROLE = {
  director: "управител / директор", manager: "управител", sole_owner: "едноличен собственик", partner: "съдружник",
  stake: "дял в капитала", actual_owner: "действителен собственик", representative: "представител", procurator: "прокурист",
  declared_role: "посочено в декларация", ngo_representative: "представител на организация", ngo_board: "в управлението на организация",
  branch_manager: "управител на клон", member: "член", board: "в управителен орган",
};
const POS = {
  "state enterprise": "ръководство на държавно дружество", "eu funds controller": "контрол на еврофондове", "political cabinet": "политически кабинет",
  international: "международна организация", "civil society": "гражданска организация", mayor: "кмет", "cultural institute": "културен институт",
  "secretary general": "главен секретар", "social fund": "социален фонд", "party leader": "партиен лидер", "chief architect": "главен архитект",
  "council chair": "председател на общински съвет", "revenue agency": "приходна агенция", school: "директор на училище", "social care": "социални грижи",
  "regional governor": "областен управител", "deputy mayor": "заместник-кмет", "deputy minister": "заместник-министър", regulator: "регулатор",
  "central bank": "централна банка", inspectorate: "инспекторат", kindergarten: "директор на детска градина", "security service": "служба за сигурност",
  councillor: "общински съветник", "procurement officer": "длъжностно лице по поръчки", cabinet: "министър", "agency head": "ръководител на агенция",
  "hospital head": "ръководител на болница", academic: "академична длъжност", "regional director": "регионален директор", "medical center": "медицински център",
};
const TIER = { national: "държавна длъжност", municipal: "общинска длъжност", regional: "областна длъжност", mp: "народен представител" };
const out = {};
for (const e of mp.entries) {
  (out[e.contractorEik] ??= []).push({
    who: e.mpName, kind: "mp", party: party.partyByMpId?.[e.mpId] ?? null, mpId: e.mpId,
    roles: e.relations.map((r) => `${ROLE[r.kind] ?? r.kind}${r.isCurrent === false ? " (в миналото)" : ""}`),
  });
}
for (const e of pep.entries) {
  if (out[e.contractorEik]?.some((x) => x.who === e.name)) continue;
  (out[e.contractorEik] ??= []).push({
    who: e.name, kind: "official", position: POS[e.role?.replace(/_/g, " ")] ?? TIER[e.tier] ?? e.tier,
    roles: e.relations.map((r) => ROLE[r.role] ?? r.role),
  });
}
writeFileSync("data/political-links.json", JSON.stringify({ generatedAt: mp.generatedAt, source: "Наясно (naiasno.bg), по Търговския регистър и декларациите", byEik: out }));
console.log(Object.keys(out).length, "фирми с връзки");
