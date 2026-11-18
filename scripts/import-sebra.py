# Плащания от СЕБРА (Министерство на финансите / МИДТ, data.egov.bg, набор 57f1e2e7-b235-45e8-94c4-4d69f0b1a690):
# всяко плащане на бюджетна организация над 5000 лв. по тримесечия. Получателят е само с име (без ЕИК).
# Скриптът чете CSV файловете от папка (аргумент), махa физическите лица изцяло (име и сметка)
# и записва обобщение по получател (нормализирано име) и по платец в data/payments/.
# Употреба: python3 scripts/import-sebra.py /път/до/папката/с/csv
import csv, json, os, re, sys, hashlib
from collections import defaultdict

SRC = sys.argv[1]
OUT = "data/payments"
BGN = 1.95583
FORMS = r"\b(ЕООД|ООД|ЕАД|АД|ЕТ|ДЗЗД|КД|КДА|СД|ЕАДСИЦ|АДСИЦ|ЛТД|LTD|GMBH|SRL|SPA|S\.A\.|SA)\b"

def norm(name):
    s = name.upper().replace("Ё", "Е")
    s = re.sub(r"[„“\"'«»`]", " ", s)
    s = re.sub(FORMS, " ", s)
    s = re.sub(r"[^0-9A-ZА-Я]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def num(v):
    try: return float(str(v).replace(" ", "").replace(",", "."))
    except ValueError: return 0.0
def iso(d):
    m = re.match(r"(\d{2})\.(\d{2})\.(\d{4})", d or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None

rec = defaultdict(lambda: {"name": None, "total": 0.0, "n": 0, "payers": defaultdict(lambda: [0.0, 0, None, None]), "top": [], "forms": set(), "variants": defaultdict(float)})
FORM_RE = re.compile(r"(?:^|[^0-9A-ZА-Я])(ЕООД|ООД|ЕАД|АД|ЕТ|ДЗЗД|КДА|КД|СД|ЕАДСИЦ|АДСИЦ)(?=[^0-9A-ZА-Я]|$)")
payer_tot = defaultdict(lambda: {"total": 0.0, "n": 0, "primary": None})
payer_rec = defaultdict(lambda: defaultdict(float))  # платец → получател → сума
quarters, persons, rows_all = [], 0, 0
for f in sorted(os.listdir(SRC)):
    if not f.endswith(".csv"): continue
    m = re.search(r"(\d{2})(\d{2})(\d{4})-g-(\d{2})(\d{2})(\d{4})", f)
    quarters.append(f"{m.group(3)}-{m.group(2)}" if m else f)
    with open(os.path.join(SRC, f), encoding="utf-8-sig", errors="replace") as fh:
        for r in csv.DictReader(fh):
            rows_all += 1
            name = (r.get("CLIENT_RECEIVER_NAME") or "").strip()
            amt = num(r.get("AMOUNT"))
            if (r.get("CURRENCY") or "EUR") == "BGN": amt /= BGN
            payer = (r.get("ORGANIZATION") or r.get("FIN_NAME") or "").strip()
            pt = payer_tot[payer]; pt["total"] += amt; pt["n"] += 1; pt["primary"] = r.get("PRIMARY_ORGANIZATION")
            if "ФИЗИЧЕСКО ЛИЦЕ" in name.upper() or not name:
                persons += 1; continue  # физическите лица не се пазят по никакъв начин
            k = norm(name)
            if not k: continue
            payer_rec[payer][k] += amt
            x = rec[k]; x["name"] = x["name"] or name; x["total"] += amt; x["n"] += 1
            fm = FORM_RE.findall(name.upper()); x["forms"].add(fm[-1] if fm else "")
            if len(x["variants"]) < 8 or name in x["variants"]: x["variants"][name] += amt
            d = iso(r.get("SETTLEMENT_DATE"))
            p = x["payers"][payer]; p[0] += amt; p[1] += 1
            if d: p[2] = min(p[2] or d, d); p[3] = max(p[3] or d, d)
            if len(x["top"]) < 12 or amt > x["top"][-1][0]:
                x["top"].append([round(amt, 2), d, payer, (r.get("REASON1") or "")[:80], (r.get("REASON2") or "")[:80]])
                x["top"].sort(key=lambda t: -t[0]); del x["top"][12:]

os.makedirs(f"{OUT}/receivers", exist_ok=True)
shards = defaultdict(dict)
MIN = 50000  # получатели под 50 000 € за целия период не се пазят
kept = 0
for k, x in rec.items():
    if x["total"] < MIN: continue
    kept += 1
    sh = hashlib.md5(k.encode()).hexdigest()[:2]
    payers = sorted(([n, round(v[0], 2), v[1], v[2], v[3]] for n, v in x["payers"].items()), key=lambda t: -t[1])
    forms = sorted(f for f in x["forms"] if f)
    # Съмнително съвпадение: различни правни форми (напр. ООД и АД) под едно име, или твърде кратко име.
    amb = len(forms) > 1 or len(k.replace(" ", "")) < 4
    o = {"name": x["name"], "total": round(x["total"], 2), "n": x["n"], "payers": payers[:10], "top": [[t[0], t[1], t[2], (t[3] + " " + t[4]).strip()[:90]] for t in x["top"][:3]]}
    if amb: o["amb"] = [[n, round(v, 2)] for n, v in sorted(x["variants"].items(), key=lambda t: -t[1])[:5]]
    shards[sh][k] = o
for sh, d in shards.items():
    json.dump(d, open(f"{OUT}/receivers/{sh}.json", "w"), ensure_ascii=False, separators=(",", ":"))
payers = sorted(([n, round(v["total"], 2), v["n"], v["primary"]] for n, v in payer_tot.items()), key=lambda t: -t[1])
pr = {}
for n, d in payer_rec.items():
    top = sorted(d.items(), key=lambda t: -t[1])[:15]
    pr[norm(n)] = {"name": n, "top": [[rec[k]["name"], k, round(v, 2)] for k, v in top]}
json.dump(pr, open(f"{OUT}/payers.json", "w"), ensure_ascii=False, separators=(",", ":"))
json.dump({"source": "СЕБРА, тримесечни списъци на плащанията над 5000 лв. (data.egov.bg, набор 57f1e2e7-b235-45e8-94c4-4d69f0b1a690, лиценз CC0)",
           "quarters": sorted(quarters), "rows": rows_all, "personsExcluded": persons, "receivers": len(rec), "kept": kept, "ambiguous": sum(1 for d in shards.values() for v in d.values() if "amb" in v), "minEur": MIN, "payers": payers},
          open(f"{OUT}/index.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(f"Редове: {rows_all}; физически лица (махнати): {persons}; получатели: {len(rec)} (запазени {kept}); платци: {len(payer_tot)}; тримесечия: {sorted(quarters)}")
