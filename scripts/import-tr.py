# Търговски регистър за фирмите, които печелят обществени поръчки: управители, съдружници, едноличен
# собственик, действителни собственици, седалище, капитал, предмет на дейност и кога е създадена фирмата.
# Източник: публичното API на Агенция по вписванията (portal.registryagency.bg/CR/api/Deeds/{ЕИК}).
# Агенцията допуска около 1 заявка на 5 секунди, затова всяко пускане обработва порция фирми
# (първо най-големите по стойност на поръчките) и пази резултата в scripts/tr-cache/.
# Нужни: SUPABASE_URL, SUPABASE_SECRET_KEY. По желание: MINUTES=50, REFRESH_DAYS=120.
import html, json, os, re, subprocess, time
from datetime import date, datetime, timedelta

URL, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"]
MINUTES = float(os.environ.get("MINUTES", "50"))
REFRESH = int(os.environ.get("REFRESH_DAYS", "120"))
DIR = "scripts/tr-cache"
os.makedirs(DIR, exist_ok=True)

def curl(url, headers=()):
    cmd = ["curl", "-sS", "-m", "60", "-w", "\n%{http_code}", url]
    for h in headers: cmd += ["-H", h]
    try:
        out = subprocess.run(cmd, capture_output=True, timeout=90).stdout.decode("utf-8", "replace")
    except subprocess.TimeoutExpired:
        return 0, ""
    body, _, code = out.rpartition("\n")
    return int(code or 0), body

def shard(eik): return f"{DIR}/{eik[:2]}.json"
cache = {}
def load(eik):
    f = shard(eik)
    if f not in cache: cache[f] = json.load(open(f)) if os.path.exists(f) else {}
    return cache[f]

def clean(h): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<br\s*/?>", "\n", re.sub(r"<(?!br)[^>]+>", " ", h or "")))).strip()
def entries(h):
    parts = re.split(r"<hr[^>]*>", h or "")
    out = []
    for p in parts:
        t = html.unescape(re.sub(r"<[^>]+>", "\n", p)); t = re.sub(r"[ \t]+", " ", t)
        lines = [x.strip() for x in t.split("\n") if x.strip()]
        if lines: out.append(lines)
    return out
def person(lines):
    first = lines[0]
    name = re.split(r",\s*(Държава|Идентификация|ЕИК|ЕГН|Чуждестранно)", first)[0].strip().strip('"').strip()
    ident = re.search(r"(?:Идентификация|ЕИК/ПИК|ЕИК)\s*([0-9]{9,13})", first)
    country = re.search(r"Държава:\s*([А-ЯA-Z ]+)", first)
    share = None
    for l in lines:
        m = re.search(r"Размер[^:]*:\s*([\d.,]+\s*(?:€|лв\.?|%))", l)
        if m: share = m.group(1)
    return {k: v for k, v in {"name": name, "eik": ident.group(1) if ident else None, "country": country.group(1).strip() if country else None, "share": share}.items() if v}

def parse(d):
    f = {}
    mins = []
    for s in d.get("sections", []):
        for sd in s.get("subDeeds", []):
            for g in sd.get("groups", []):
                for fl in g.get("fields", []):
                    code = fl.get("nameCode", "")
                    f.setdefault(code, []).append(fl.get("htmlData", ""))
                    if fl.get("fieldEntryDate"): mins.append(fl["fieldEntryDate"][:10])
    t = lambda c: clean(f.get(c, [""])[0]) if c in f else None
    case = re.search(r"Фирмено дело:\s*\d+/(\d{4})", t("CR_F_1_L") or "")
    ppl = lambda c: [person(e) for h in f.get(c, []) for e in entries(h)]
    seat = t("CR_F_5_L") or ""
    town = re.search(r"Населено място:\s*([^,]+)", seat)
    muni = re.search(r"Община:\s*([^\n,]+?)\s+Населено", seat)
    return {
        "name": d.get("companyName"), "form": t("CR_F_3_L"), "status": d.get("deedStatus"),
        "founded": case.group(1) if case else None, "firstEntry": min(mins) if mins else None,
        "town": town.group(1).strip() if town else None, "muni": muni.group(1).strip() if muni else None,
        "address": seat[:200] or None, "activity": (t("CR_F_6_L") or "")[:300] or None,
        "capital": t("CR_F_31_L"),
        "managers": ppl("CR_F_7_L"), "board": ppl("CR_F_10_L") + ppl("CR_F_12_L"), "partners": ppl("CR_F_19_L"),
        "owner": ppl("CR_F_23_L"), "ubo": ppl("CR_F_550_L"), "procurator": ppl("CR_F_14_L"),
        "closed": bool(re.search(r"заличен|ликвидац|несъстоятел", json.dumps(d, ensure_ascii=False)[:200000], re.I)) if d.get("deedStatus") != 2 else False,
        "fetched": date.today().isoformat(),
    }

# Кои фирми: изпълнителите по стойност на поръчките
H = (f"apikey: {KEY}", f"Authorization: Bearer {KEY}")
# Списъкът изпълнители се чете от базата най-много веднъж седмично (пълен преглед на договорите харчи дисковия бюджет на базата).
SUP = "scripts/tr-suppliers.json"
tot = {}
cached = json.load(open(SUP)) if os.path.exists(SUP) else {}
fresh = cached.get("at", "") >= (date.today() - timedelta(days=7)).isoformat()
if os.environ.get("ONLY_EIKS") or fresh:
    tot = cached.get("tot", {})
    print("Изпълнители от кеша от", cached.get("at"))
else:
    last, ok = "", True
    while True:  # по id, на порции (агрегиращият изглед изтича по време)
        code, body = curl(f"{URL}/rest/v1/proc_contracts?select=id,supplier_eiks,contract_value_eur&id=gt.{last}&order=id&limit=1000", H)
        rows = json.loads(body or "[]") if code == 200 else []
        if code != 200: print("Грешка при четене на договорите:", code, body[:200]); ok = False; break
        for r in rows:
            for e in r.get("supplier_eiks") or []:
                if re.fullmatch(r"\d{9}|\d{13}", e or ""): tot[e[:9]] = tot.get(e[:9], 0) + (r.get("contract_value_eur") or 0) / max(1, len(r["supplier_eiks"]))
        if len(rows) < 1000: break
        last = rows[-1]["id"].replace("&", "%26").replace("#", "%23").replace(" ", "%20")
    if ok and tot: json.dump({"at": date.today().isoformat(), "tot": {k: round(v) for k, v in tot.items()}}, open(SUP, "w"))
    elif not tot: tot = cached.get("tot", {})
# Първо фирмите, които трябват за декларациите (data/tr/priority.json от build-declaration-links.mjs), после по стойност.
prio = set(json.load(open("data/tr/priority.json"))) if os.path.exists("data/tr/priority.json") else set()
# Проверени от редакцията връзки лице ↔ фирма (content/person-firms.json): четат се първи, дори без поръчки.
if os.path.exists("content/person-firms.json"):
    for v in json.load(open("content/person-firms.json"))["people"].values(): prio |= {e[:9] for e in v.get("eiks", [])}
eiks = sorted(set(tot) | prio, key=lambda e: (e not in prio, -tot.get(e, 0)))
print("Изпълнители в базата:", len(eiks))
cutoff = (date.today() - timedelta(days=REFRESH)).isoformat()
todo = [e for e in eiks if (load(e).get(e) or {}).get("fetched", "") < cutoff]
if os.environ.get("ONLY_EIKS"): todo = [e.strip()[:9] for e in os.environ["ONLY_EIKS"].split(",") if e.strip()]
print("За проверка:", len(todo))

start, done, empty, fail, pace = time.time(), 0, 0, 0, 5.0
for e in todo:
    if time.time() - start > MINUTES * 60: break
    code, body = curl(f"https://portal.registryagency.bg/CR/api/Deeds/{e[:9]}", ("Accept: application/json",))
    time.sleep(pace)
    if code != 200:
        fail += 1; pace = min(120, pace * 1.5)
        if fail >= 10: print("Регистърът отказва: спираме за днес"); break
        continue
    fail, pace = 0, 5.0
    if not body.strip():
        load(e)[e] = {"missing": True, "fetched": date.today().isoformat()}; empty += 1; continue
    try:
        d = json.loads(body)
        if not isinstance(d, dict) or "sections" not in d: continue
        load(e)[e] = parse(d); done += 1
        if done % 100 == 0:  # записваме по пътя, за да не се загуби работата при прекъсване
            for f, data in cache.items(): json.dump(data, open(f, "w"), ensure_ascii=False, separators=(",", ":"))
    except json.JSONDecodeError:
        continue
for f, data in cache.items():
    json.dump(data, open(f, "w"), ensure_ascii=False, separators=(",", ":"))
total = sum(len(json.load(open(os.path.join(DIR, x)))) for x in os.listdir(DIR) if x.endswith(".json"))
print(f"Прочетени: {done}; липсващи в регистъра: {empty}; в кеша общо: {total}; за {round((time.time() - start) / 60)} мин.")
