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
PACE = float(os.environ.get("PACE", "2.5"))
REFRESH = int(os.environ.get("REFRESH_DAYS", "60"))
FIRST = [c.strip() for c in os.environ.get("CODES", "SFO07").split(",") if c.strip()]
DIR, OUT = "scripts/tr-links", "data/tr-links"
os.makedirs(DIR, exist_ok=True); os.makedirs(OUT, exist_ok=True)

def jload(p, d): return json.load(open(p)) if os.path.exists(p) else d
SEARCH = jload(f"{DIR}/search.json", {})   # ИМЕ → {at, hits:[{uic, firm, field}]}
DEEDS = jload(f"{DIR}/deeds.json", {})     # ЕИК → {at, name, status, people:[{n, role, from, to, share}]}
DONE = jload(f"{DIR}/done.json", {})       # slug на длъжностното лице → дата на обработката

ROLE = {"CR_F_7_L": "управител", "CR_F_19_L": "съдружник", "CR_F_23_L": "едноличен собственик", "CR_F_10_L": "член на съвета на директорите",
        "CR_F_12_L": "член на управителния съвет", "CR_F_11_L": "член на надзорния съвет", "CR_F_18_L": "физическо лице търговец"}
IDENT = {"CR_F_7_L": "00070", "CR_F_19_L": "00190", "CR_F_23_L": "00230", "CR_F_10_L": "00100", "CR_F_12_L": "00120", "CR_F_11_L": "00110", "CR_F_18_L": "00180"}
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
        if code == "200":
            try: return json.loads(body) if body.strip() else None
            except ValueError: return None
        if code in ("404", "400"): return None
        time.sleep(10 * (a + 1))
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
    if c and c["at"] >= (date.today() - timedelta(days=REFRESH)).isoformat(): return c
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
        seen = {}  # име → {from, to, share}
        for i, (dt, h) in enumerate(versions):
            active = set()
            for e in entries(h):
                n, eik, share, erased = person(e)
                if not n or n.startswith("Заличено"): continue
                k = norm(n)
                if erased:
                    if k in seen and not seen[k]["to"]: seen[k]["to"] = dt
                    continue
                active.add(k)
                if k not in seen or seen[k]["to"]: seen[k] = {"n": n, "eik": eik, "from": dt, "to": None, "share": share}
                elif share: seen[k]["share"] = share
            for k, v in seen.items():
                if k not in active and not v["to"] and i > 0 and h.strip(): v["to"] = dt
        for v in seen.values():
            people.append({"n": v["n"], "role": ROLE[code], "from": v["from"], "to": v["to"], **({"share": v["share"]} if v["share"] else {}), **({"eik": v["eik"]} if v["eik"] else {})})
    rec = {"at": date.today().isoformat(), "name": d.get("companyName") or d.get("fullName"), "status": d.get("deedStatus"), "people": people}
    DEEDS[uic] = rec
    return rec

def save():
    json.dump(SEARCH, open(f"{DIR}/search.json", "w"), ensure_ascii=False)
    json.dump(DEEDS, open(f"{DIR}/deeds.json", "w"), ensure_ascii=False)
    json.dump(DONE, open(f"{DIR}/done.json", "w"), ensure_ascii=False)

# Длъжностните лица: първо поисканите общини, после кметове и ръководства, после съветниците.
PEOPLE = json.load(open("data/local/people.json"))
rank = {"Кмет": 0, "Заместник кмет": 1, "Председател на ОбС": 2, "Главен архитект": 3}
order = sorted(PEOPLE.items(), key=lambda kv: (kv[1][0] not in FIRST, rank.get(kv[1][2], 4), kv[1][0]))
cutoff = (date.today() - timedelta(days=REFRESH)).isoformat()
if os.environ.get("ONLY"): order = [(s, PEOPLE[s]) for s in os.environ["ONLY"].split(",") if s in PEOPLE]
todo = [(s, p) for s, p in order if DONE.get(s, "") < cutoff or os.environ.get("ONLY")]
print("Длъжностни лица за обработка:", len(todo))

n = 0
for slug, (code, name, role) in todo:
    if out_of_time(): break
    own = [h for h in search(name) if h["field"] in ROLE]
    firms = sorted({h["uic"] for h in own})
    for uic in firms:
        if out_of_time(): break
        rec = deed(uic)
        if not rec or NGO.search(rec.get("name") or ""): continue
        for p in rec["people"]:
            if norm(p["n"]) != norm(name) and not out_of_time(): search(p["n"])
    if not out_of_time():
        DONE[slug] = date.today().isoformat(); n += 1
    if n % 5 == 0: save()
save()
print(f"Обработени: {n}, заявки: {calls}, минути: {(time.time() - start) / 60:.1f}")

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
                      "others": [{x: p[x] for x in ("n", "role", "from", "to", "share", "eik") if p.get(x)} for p in rec["people"] if norm(p["n"]) != k]})
        if NGO.search(rec.get("name") or ""): continue
        for p in rec["people"]:
            pk = norm(p["n"])
            if pk == k or p.get("eik"): continue
            o = co.setdefault(pk, {"n": p["n"], "via": set(), "firms": {}})
            o["via"].add(uic)
            for h in SEARCH.get(pk, {}).get("hits", []):
                if h["field"] in ROLE and h["uic"] not in {f["eik"] for f in firms} and h["uic"] != uic:
                    o["firms"][h["uic"]] = h["firm"]
    by.setdefault(code, {})[slug] = {"name": name, "role": role, "firms": firms,
        "co": [{"n": o["n"], "via": sorted(o["via"]), "firms": [{"eik": e, "name": f} for e, f in sorted(o["firms"].items())]} for o in co.values()]}
for code, v in by.items():
    json.dump(v, open(f"{OUT}/{code}.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("Общини с данни:", len(by))
