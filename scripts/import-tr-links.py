# Свързани лица по Търговския регистър, с цялата история (и бившите съдружници и управители).
# За всяко длъжностно лице в общините (кмет, заместник-кмет, председател на съвета, главен архитект, после съветниците):
#   1) търсим името му в регистъра, включително в историята → фирмите, в които е бил или е вписан;
#   2) за всяка такава фирма четем историята на управителите, съдружниците и собственика → кой, в каква роля, от кога до кога;
#   3) търсим и тези хора (бившите и сегашните му съдружници) → техните други фирми.
# Сайтът сравнява третото с изпълнителите на поръчки в общината на длъжностното лице.
# Връзките са по три имена (регистърът не показва ЕГН): възможни са съвпадения. Това е повод за въпрос, не доказателство.
# Щадящо: една заявка на PACE секунди. Пази прочетеното в scripts/tr-links/ и пише data/tr-links/<код на общината>.json.
import html, json, os, re, subprocess, sys, time
from datetime import date, timedelta

API = "https://portal.registryagency.bg/CR/api/Deeds"
UA = "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)"
MINUTES = float(os.environ.get("MINUTES", "45"))
PACE = float(os.environ.get("PACE", "4"))
REFRESH = int(os.environ.get("REFRESH_DAYS", "60"))
FIRST = [c.strip() for c in os.environ.get("CODES", "SFO07").split(",") if c.strip()]
DIR, OUT = "scripts/tr-links", "data/tr-links"
os.makedirs(DIR, exist_ok=True); os.makedirs(OUT, exist_ok=True)

def jload(p, d): return json.load(open(p)) if os.path.exists(p) else d
SEARCH = jload(f"{DIR}/search.json", {})   # ИМЕ → {at, hits:[{uic, firm, field}]}
DEEDS = jload(f"{DIR}/deeds.json", {})     # ЕИК → {at, name, status, people:[{n, role, from, to, share}]}
DONE = jload(f"{DIR}/done.json", {})       # slug на длъжностното лице → дата на обработката

ROLE = {"CR_F_7_L": "управител", "CR_F_19_L": "съдружник", "CR_F_23_L": "едноличен собственик", "CR_F_10_L": "член на съвета на директорите",
        "CR_F_12_L": "член на управителния съвет", "CR_F_18_L": "физическо лице търговец"}
IDENT = {"CR_F_7_L": "00070", "CR_F_19_L": "00190", "CR_F_23_L": "00230", "CR_F_10_L": "00100", "CR_F_12_L": "00120", "CR_F_18_L": "00180"}
NGO = re.compile(r"Сдружение|Фондация|Читалище|Народно читалище|Сдружение на собствениците", re.I)

start, calls = time.time(), 0
def out_of_time(): return time.time() - start > MINUTES * 60
def get(path):
    global calls
    for a in range(3):
        time.sleep(PACE); calls += 1
        try:
            r = subprocess.run(["curl", "-s", "-m", "90", "-A", UA, "-H", "Accept: application/json", "-w", "\n%{http_code}", f"{API}/{path}"], capture_output=True, timeout=120)
            body, _, code = r.stdout.decode("utf-8", "replace").rpartition("\n")
        except subprocess.TimeoutExpired:
            body, code = "", "0"
        CODES[code] = CODES.get(code, 0) + 1
        if code == "200":
            try: return json.loads(body) if body.strip() else None
            except ValueError: return None
        if code not in ("429", "0", "500", "502", "503", "504"): return None
        time.sleep(15 * (a + 1) if code == "429" else 5)
    return None

def norm(n): return re.sub(r"\s+", " ", (n or "").replace('"', "").replace("„", "").replace("“", "").strip()).upper()
from urllib.parse import quote as q

def entries(h):
    out = []
    for p in re.split(r"<hr[^>]*>", h or ""):
        t = html.unescape(re.sub(r"<[^>]+>", "\n", p)); t = re.sub(r"[ \t]+", " ", t)
        lines = [x.strip() for x in t.split("\n") if x.strip()]
        if lines: out.append(lines)
    return out
def person(lines):
    first = lines[0]
    name = re.split(r",\s*(Държава|Идентификация|ЕИК|ЕГН|Чуждестранно|Размер)", first)[0].strip().strip('"').strip()
    ident = re.search(r"ЕИК/ПИК\s*([0-9]{9,13})", " ".join(lines))
    share = next((m.group(1) for l in lines for m in [re.search(r"Размер[^:]*:\s*([\d.,]+\s*(?:€|лв\.?|%))", l)] if m), None)
    return name, (ident.group(1) if ident else None), share, any("Заличено обстоятелство" in l for l in lines)

def VALID(n, eik=None):
    if eik: return True
    return ":" not in n and len(re.findall(r"[А-Яа-яA-Za-z]{2,}", n)) >= 2 and not re.match(r"^(по |заедно|поотделно|и |или )", n, re.I)

CODES = {}
def search(name):
    k = norm(name)
    c = SEARCH.get(k)
    if c and c["at"] >= (date.today() - timedelta(days=REFRESH)).isoformat(): return c["hits"]
    r = get(f"SubjectInFields?name={q(k)}&searchInHistory=true&type=1")
    if r is None and c: return c["hits"]
    hits = [{"uic": x["uic"], "firm": x.get("companyFullName"), "field": x.get("fieldName")} for x in (r or []) if x.get("uic")]
    SEARCH[k] = {"at": date.today().isoformat(), "hits": hits}
    return hits

def deed(uic):
    c = DEEDS.get(uic)
    if c and c.get("v") == 2 and c["at"] >= (date.today() - timedelta(days=REFRESH)).isoformat(): return c
    d = get(uic)
    if not d: return c
    fields = []  # (nameCode, subUICType, subUIC, ident, current html, date)
    for s in d.get("sections", []):
        for sd in s.get("subDeeds", []):
            for g in sd.get("groups", []):
                for fl in g.get("fields", []):
                    if fl.get("nameCode") in ROLE:
                        fields.append((fl["nameCode"], sd.get("subUICType"), sd.get("subUIC"), fl.get("fieldIdent") or IDENT[fl["nameCode"]], fl.get("htmlData", ""), (fl.get("fieldEntryDate") or "")[:10]))
    people = []
    for code, t, sub, ident, cur, cdate in fields:
        hist = get(f"{uic}/SubDeeds/{t}/{sub}/Fields/{ident}/History")
        versions = sorted(((v.get("fieldEntryDate") or "")[:10], v.get("htmlData", "")) for v in (hist or []) if isinstance(v, dict))
        if not versions: versions = [(cdate, cur)]
        seen = {}  # име → списък периоди [{n, eik, from, to, share}]
        for i, (dt, h) in enumerate(versions):
            active, erased_now, info = set(), set(), {}
            for e in entries(h):
                n, eik, share, erased = person(e)
                if not n or n.startswith("Заличено") or not VALID(n, eik): continue
                k = norm(n)
                if erased: erased_now.add(k)
                else: active.add(k); info[k] = (n, eik, share)
            # Смяна на дял (напр. превалутиране в евро) е „заличен стар запис + нов запис“ за същия човек: периодът продължава.
            for k in active:
                cur = seen.get(k)
                n, eik, share = info[k]
                if not cur or cur[-1]["to"]: seen.setdefault(k, []).append({"n": n, "eik": eik, "from": dt, "to": None, "share": share})
                elif share: cur[-1]["share"] = share
            for k, iv in seen.items():
                if k not in active and not iv[-1]["to"] and (k in erased_now or (i > 0 and h.strip())): iv[-1]["to"] = dt
        for iv in seen.values():
            for v in iv:
                people.append({"n": v["n"], "role": ROLE[code], "from": v["from"], "to": v["to"], **({"share": v["share"]} if v["share"] else {}), **({"eik": v["eik"]} if v["eik"] else {})})
    rec = {"v": 2, "at": date.today().isoformat(), "name": d.get("companyName") or d.get("fullName"), "status": d.get("deedStatus"), "people": people}
    DEEDS[uic] = rec
    return rec

def save():
    json.dump(SEARCH, open(f"{DIR}/search.json", "w"), ensure_ascii=False)
    json.dump(DEEDS, open(f"{DIR}/deeds.json", "w"), ensure_ascii=False)
    json.dump(DONE, open(f"{DIR}/done.json", "w"), ensure_ascii=False)

# Длъжностните лица: първо поисканите общини, после кметове и ръководства, после съветниците.
PEOPLE = json.load(open("data/local/people.json"))
# Народните представители: код „MP“, slug „mp-<id>“.
for m in json.load(open("data/parliament-ns52.json"))["mps"]:
    PEOPLE[f"mp-{m['id']}"] = ["MP", m["name"], "Народен представител"]
rank = {"Кмет": 0, "Заместник кмет": 1, "Народен представител": 2, "Председател на ОбС": 3, "Главен архитект": 4}
order = sorted(PEOPLE.items(), key=lambda kv: (kv[1][0] not in FIRST, rank.get(kv[1][2], 5), kv[1][0]))
cutoff = (date.today() - timedelta(days=REFRESH)).isoformat()
if os.environ.get("ONLY"): order = [(s, PEOPLE[s]) for s in os.environ["ONLY"].split(",") if s in PEOPLE]
todo = [(s, p) for s, p in order if DONE.get(s, "") < cutoff or os.environ.get("ONLY")]
print("Длъжностни лица за обработка:", len(todo))

FIRM_MIN = float(os.environ.get("FIRM_MINUTES", "12"))  # последните минути от всяко пускане: история на фирмите с поръчки
def officials_time_up(): return time.time() - start > max(0, MINUTES - FIRM_MIN) * 60
n = 0
for slug, (code, name, role) in todo:
    if officials_time_up(): break
    own = [h for h in search(name) if h["field"] in ROLE]
    firms = sorted({h["uic"] for h in own})
    for uic in firms:
        if out_of_time(): break
        rec = deed(uic)
        if not rec or NGO.search(rec.get("name") or ""): continue
        for p in rec["people"]:
            if out_of_time(): break
            if p.get("eik"):  # съдружник е фирма: четем и нейните хора
                sub = deed(p["eik"][:9])
                for sp in (sub or {}).get("people", []):
                    if not sp.get("eik") and norm(sp["n"]) != norm(name) and not out_of_time(): search(sp["n"])
            elif norm(p["n"]) != norm(name): search(p["n"])
    if not officials_time_up():
        DONE[slug] = date.today().isoformat(); n += 1
    if n % 5 == 0: save()
save()
# Историята на изпълнителите на поръчки (по стойност; списъкът е от import-tr.py), за страниците на фирмите.
sup_tot = jload("scripts/tr-suppliers.json", {}).get("tot", {})
import glob as _g
if not sup_tot:
    for f in _g.glob("scripts/tr-cache/*.json"):
        try: sup_tot.update({k: 0 for k in json.load(open(f))})
        except Exception: pass
fq = [e for e in sorted(sup_tot, key=lambda e: -sup_tot[e]) if not (DEEDS.get(e, {}).get("v") == 2 and DEEDS[e]["at"] >= cutoff)]
fd = 0
for e in fq:
    if out_of_time(): break
    deed(e); fd += 1
    if fd % 20 == 0: save()
save()
print("Фирми с история:", fd, "остават:", len(fq) - fd)
print(f"Обработени: {n}, заявки: {calls}, минути: {(time.time() - start) / 60:.1f}, отговори: {CODES}")

# Изход за сайта: по община.
by = {}
for slug, (code, name, role) in PEOPLE.items():
    if slug not in DONE: continue
    k = norm(name)
    own = [h for h in SEARCH.get(k, {}).get("hits", []) if h["field"] in ROLE]
    firms = []
    co = {}
    for uic in sorted({h["uic"] for h in own}):
        rec = DEEDS.get(uic)
        if not rec: continue
        mine = [p for p in rec["people"] if norm(p["n"]) == k]
        firms.append({"eik": uic, "name": rec["name"], "status": rec["status"], "mine": [{x: p[x] for x in ("role", "from", "to", "share") if p.get(x)} for p in mine],
                      "others": [{x: p[x] for x in ("n", "role", "from", "to", "share", "eik") if p.get(x)} for p in rec["people"] if norm(p["n"]) != k and VALID(p["n"], p.get("eik"))]})
        if NGO.search(rec.get("name") or ""): continue
        cands = [(p, None) for p in rec["people"] if not p.get("eik")]
        for p in rec["people"]:
            if p.get("eik") and DEEDS.get(p["eik"][:9]):
                ent = DEEDS[p["eik"][:9]]
                cands += [(sp, {"eik": p["eik"][:9], "name": ent["name"]}) for sp in ent["people"] if not sp.get("eik")]
        for p, through in cands:
            pk = norm(p["n"])
            if pk == k or not VALID(p["n"]): continue
            o = co.setdefault(pk, {"n": p["n"], "via": set(), "firms": {}, "through": {}})
            o["via"].add(uic)
            if through: o["through"][uic] = {**through, "role": p["role"], "from": p.get("from"), "to": p.get("to")}
            for h in SEARCH.get(pk, {}).get("hits", []):
                if h["field"] in ROLE and h["uic"] not in {f["eik"] for f in firms} and h["uic"] != uic:
                    f0 = o["firms"].setdefault(h["uic"], {"name": h["firm"], "roles": []})
                    if ROLE[h["field"]] not in f0["roles"]: f0["roles"].append(ROLE[h["field"]])
    by.setdefault(code, {})[slug] = {"name": name, "role": role, "firms": firms,
        "co": [{"n": o["n"], "via": sorted(o["via"]), **({"through": o["through"]} if o["through"] else {}), "firms": [{"eik": e, "name": f["name"], "roles": f["roles"]} for e, f in sorted(o["firms"].items())]} for o in co.values()]}
for code, v in by.items():
    json.dump(v, open(f"{OUT}/{code}.json", "w"), ensure_ascii=False, separators=(",", ":"))

# Обратен индекс за страниците на фирмите: само фирми с обществени поръчки (тези в scripts/tr-cache).
import glob
SUP = set()
for f in glob.glob("scripts/tr-cache/*.json"):
    try: SUP |= set(json.load(open(f)).keys())
    except Exception: pass
rev = {}
for code, v in by.items():
    for slug, p in v.items():
        for f in p["firms"]:
            if f["eik"] in SUP: rev.setdefault(f["eik"], []).append({"c": code, "s": slug, "n": p["name"], "r": p["role"], "mine": f["mine"]})
        for c in p["co"]:
            for t in c["firms"]:
                if t["eik"] in SUP:
                    shared = [x["name"] for x in p["firms"] if x["eik"] in c["via"]]
                    rev.setdefault(t["eik"], []).append({"c": code, "s": slug, "n": p["name"], "r": p["role"], "via": c["n"], "vr": t.get("roles", []), "in": shared[:3]})
json.dump(rev, open(f"{OUT}/by-firm.json", "w"), ensure_ascii=False, separators=(",", ":"))
# История на хората във всяка прочетена фирма, на дялове по първите две цифри на ЕИК.
os.makedirs("data/tr-hist", exist_ok=True)
sh = {}
for e, rec in DEEDS.items():
    if rec.get("v") == 2: sh.setdefault(e[:2], {})[e] = {"name": rec["name"], "people": [{k: p[k] for k in ("n", "role", "from", "to", "share", "eik") if p.get(k)} for p in rec["people"] if VALID(p["n"], p.get("eik"))]}
for k, v in sh.items(): json.dump(v, open(f"data/tr-hist/{k}.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("Фирми с поръчки, свързани с длъжностни лица:", len(rev))
print("Общини с данни:", len(by))
