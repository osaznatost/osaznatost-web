# Преференции за всеки депутат от изборите на 19.04.2026 г.
# Входни файлове (ЦИК, през „Наясно“): preferences.json, local_candidates.txt, section_votes.json в папката, подадена като аргумент.
# Изход: data/preferences-2026.json (по номер на депутат).
import json, re, sys, collections
SRC = sys.argv[1]
W = sys.argv[2] if len(sys.argv) > 2 else "."
places = json.load(open(f"{W}/data/places.json"))["oblasts"]
ek2m, mname = {}, {}
for o in places:
    for m in o["municipalities"]:
        mname[m["code"]] = m["name"]
        for s in m["settlements"]:
            ek2m[s[0]] = m["code"]
sv = json.load(open(f"{SRC}/section_votes.json"))
sec2m = {s["section"]: ek2m.get(s.get("zip_code")) or ("ABROAD" if s["section"].startswith("32") else None) for s in sv}
cand = {}
for line in open(f"{SRC}/local_candidates.txt", encoding="utf-8"):
    p = line.rstrip("\n").split(";")
    if len(p) < 6:
        continue
    cand[(int(p[0]), int(p[2]), p[4])] = {"mir": int(p[0]), "mirName": p[1], "party": int(p[2]), "pos": int(p[4]), "name": p[5].strip()}
listv = collections.Counter()
for s in sv:
    for v in s["results"]["votes"]:
        listv[(int(s["section"][:2]), v["partyNum"])] += v["totalVotes"]
tot, bym = collections.Counter(), collections.defaultdict(collections.Counter)
for r in json.load(open(f"{SRC}/preferences.json")):
    if not r["pref"].isdigit():
        continue
    k = (int(r["section"][:2]), r["partyNum"], r["pref"])
    tot[k] += r["totalVotes"]
    bym[k][sec2m.get(r["section"]) or "?"] += r["totalVotes"]
norm = lambda n: re.sub(r"\s*-\s*", "-", re.sub(r"\s+", " ", n.strip().upper()))
byname = collections.defaultdict(list)
for c in cand.values():
    byname[norm(c["name"])].append(c)
mps = json.load(open(f"{W}/data/parliament-ns52.json"))["mps"]
out, miss = {}, []
for m in mps:
    cs = byname.get(norm(m["name"]))
    if not cs:
        miss.append(m["name"]); continue
    ents = []
    for c in cs:
        k = (c["mir"], c["party"], str(c["pos"]))
        p, lv = tot.get(k, 0), listv.get((c["mir"], c["party"]), 0)
        top = [{"code": mc, "name": mname.get(mc, "Извън страната" if mc == "ABROAD" else mc), "votes": v} for mc, v in bym[k].most_common(6)]
        ents.append({"mir": c["mir"], "mirName": re.sub(r"^\d+\.\s*", "", c["mirName"]).title(), "party": c["party"], "pos": c["pos"],
                     "prefs": p, "listVotes": lv, "pct": round(p / lv * 100, 2) if lv else None, "top": top})
    ents.sort(key=lambda e: -e["prefs"])
    out[str(m["id"])] = ents
json.dump({"source": "ЦИК, преференции по секции, избори за Народно събрание 19.04.2026 (обработени през „Наясно“)", "byMp": out}, open(f"{W}/data/preferences-2026.json", "w"), ensure_ascii=False)
print(len(out), "депутати;", "без съвпадение:", miss)
