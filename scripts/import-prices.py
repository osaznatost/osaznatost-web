# Цени в магазините от портала „Колко струва“ на КЗП (kolkostruva.bg, чл. 55б ЗВЕРБ).
# Всеки ден порталът публикува ZIP с по един CSV на търговска верига: населено място (ЕКАТТЕ), обект,
# продукт, код, категория (1–101 от списъка на КЗП), цена на дребно, цена в промоция.
# Скриптът пази обобщения, не суровите редове:
#   data/prices/latest.json   — последният ден: типична цена по категория, по верига, по област
#   data/prices/history.json  — типичната цена по категория във времето (една точка на ден/седмица)
#   data/prices/places.json   — колко по-скъпо/евтино е в дадено населено място спрямо страната
# Употреба: python3 scripts/import-prices.py [ГГГГ-ММ-ДД ...]   (без дати: вчера)
import csv, io, json, os, re, statistics, subprocess, sys, zipfile
from collections import defaultdict
from datetime import date, timedelta

OUT = "data/prices"
os.makedirs(OUT, exist_ok=True)
# Списъкът на КЗП (чл. 55б, ал. 1 ЗВЕРБ). Лекарствата (86–101) са групи по АТС код с много различни продукти: не ги сравняваме.
CATS = {1: "Бял хляб (500 г – 1 кг)", 2: "Хляб „Добруджа“ (500 г – 1 кг)", 3: "Ръжен хляб (400–600 г)", 4: "Типов хляб (400–600 г)", 5: "Точени кори (400–500 г)",
 6: "Прясно мляко 2–3,6%, 1 л", 7: "Кисело мляко 2–3,6% (370–500 г)", 8: "Сирене, насипно, 1 кг", 9: "Сирене, пакетирано, за 1 кг", 10: "Кашкавал, насипен, 1 кг",
 11: "Кашкавал, пакетиран, за 1 кг", 12: "Краве масло (125–250 г)", 13: "Извара, насипна, 1 кг", 14: "Извара, пакетирана (200 г – 1 кг)", 15: "Пиле, цяло, охладено, 1 кг",
 16: "Пилешко филе, 1 кг", 17: "Пилешки бут, 1 кг", 18: "Свинска плешка, 1 кг", 19: "Свински бут, 1 кг", 20: "Свински шол, 1 кг", 21: "Свински врат, 1 кг",
 22: "Свинско за готвене, 1 кг", 23: "Телешки шол, 1 кг", 24: "Телешко за готвене, 1 кг", 25: "Кайма 60/40, 1 кг", 26: "Кренвирши, насипни, 1 кг",
 27: "Колбаси пресни (300 г – 1 кг)", 28: "Колбаси сухи (250 г – 1 кг)", 29: "Риба замразена, 1 кг", 30: "Риба охладена, 1 кг", 31: "Яйца M (6–10 бр.)",
 32: "Яйца L (6–10 бр.)", 33: "Боб, 1 кг", 34: "Леща, 1 кг", 35: "Ориз, 1 кг", 36: "Макарони (400–500 г)", 37: "Спагети, 500 г", 38: "Захар, 1 кг", 39: "Сол, 1 кг",
 40: "Брашно тип 500, 1 кг", 41: "Брашно екстра, 1 кг", 42: "Олио, 1 л", 43: "Зехтин, 1 л", 44: "Винен оцет, 700 мл", 45: "Ябълков оцет, 700 мл",
 46: "Консерва боб (400–800 г)", 47: "Консерва грах (400–800 г)", 48: "Консервирани домати (400–800 г)", 49: "Лютеница (400–800 г)", 50: "Лимони, 1 кг",
 51: "Портокали, 1 кг", 52: "Банани, 1 кг", 53: "Ябълки, 1 кг", 54: "Домати, 1 кг", 55: "Кромид лук, 1 кг", 56: "Моркови, 1 кг", 57: "Зеле, 1 кг",
 58: "Краставици, 1 кг", 59: "Чесън, 1 кг", 60: "Гъби, 1 кг", 61: "Картофи, 1 кг", 62: "Маслини, 1 кг", 63: "Детска каша (190–250 г)", 64: "Детско пюре (190–250 г)",
 65: "Адаптирано мляко (400–800 г)", 66: "Бисквити", 67: "Кроасан (50–110 г)", 68: "Баница (100–500 г)", 69: "Млечен шоколад (80–100 г)", 70: "Мляно кафе (200–250 г)",
 71: "Кафе на зърна, 1 кг", 72: "Билков чай", 73: "Минерална вода 6 × 1,5 л", 74: "Светла бира, 2 л", 75: "Бяло вино, 750 мл", 76: "Червено вино, 750 мл",
 77: "Ракия, 700 мл", 78: "Цигари, кутия", 79: "Препарат за съдове (от 400 мл)", 80: "Четка за зъби", 81: "Паста за зъби (50–125 мл)", 82: "Шампоан (250–500 мл)",
 83: "Сапун", 84: "Мокри кърпи", 85: "Тоалетна хартия, 8 ролки"}
# Малка кошница за индекса по населени места: стоки, които се продават почти навсякъде.
BASKET = [1, 4, 6, 7, 8, 12, 15, 16, 25, 31, 33, 35, 38, 40, 42, 52, 53, 54, 55, 61]

PLACES = {}  # ЕКАТТЕ → (област, код на общината, име)
for o in json.load(open("data/places.json"))["oblasts"]:
    for m in o["municipalities"]:
        for s in m["settlements"]:
            PLACES[s[0]] = (o["name"], m["code"], s[1])

# Еднакви продукти за сравнение с чужбина (content/identical-products.json): цена на точното име във веригата.
IDENT = json.load(open("content/identical-products.json"))["items"] if os.path.exists("content/identical-products.json") else []
norm = lambda x: re.sub(r"\s+", " ", x).strip().upper()
WANT = {(i["bg"]["chain"], norm(i["bg"]["name"])): i["id"] for i in IDENT}
for i in IDENT:  # същият продукт и в другите вериги (точното му име там)
    for m in i.get("bgMore", []):
        WANT[(m["chain"], norm(m["name"]))] = i["id"]
PROD = defaultdict(list)  # id → редовни цени по обекти (последния прочетен ден), основната верига
PRODCH = defaultdict(lambda: defaultdict(list))  # id → верига → цени
MAIN = {i["id"]: i["bg"]["chain"] for i in IDENT}

def num(x):
    try:
        v = float(str(x).replace(" ", "").replace(",", "."))
        return v if 0 < v < 1000 else None
    except ValueError:
        return None

def fetch(d):
    f = f"/tmp/kolkostruva-{d}.zip"
    if not os.path.exists(f):
        r = subprocess.run(["curl", "-sSLf", "-m", "300", "-A", "Mozilla/5.0 (osaznatost.bg; open data)", "-o", f, f"https://kolkostruva.bg/opendata_files/{d}.zip"])
        if r.returncode != 0:
            return None
    return f

def chain_name(fn):
    base = os.path.basename(fn).rsplit("_", 1)[0]
    return re.sub(r"\s*\(.*$", "", base).strip() or base

def day(d):
    f = fetch(d)
    if not f:
        return None
    cat_chain = defaultdict(lambda: defaultdict(list))   # кат → верига → цени
    cat_place = defaultdict(lambda: defaultdict(list))   # кат → ЕКАТТЕ → цени
    stores = defaultdict(set)                            # верига → обекти
    PROD.clear(); PRODCH.clear()
    with zipfile.ZipFile(f) as z:
        for name in z.namelist():
            if not name.lower().endswith(".csv"):
                continue
            ch = chain_name(name)
            with z.open(name) as fh:
                for r in csv.reader(io.TextIOWrapper(fh, encoding="utf-8-sig", errors="replace")):
                    if len(r) < 6:
                        continue
                    pid = WANT.get((ch, norm(r[2])))
                    if pid:
                        pp = num(r[5])
                        if pp is not None:
                            PRODCH[pid][ch].append(pp)
                            if ch == MAIN.get(pid):
                                PROD[pid].append(pp)
                    if not r[4].strip().isdigit():
                        continue
                    c = int(r[4])
                    if c not in CATS:
                        continue
                    p = num(r[5])
                    if p is None:
                        continue
                    ek = r[0].strip().lstrip("0").zfill(5)
                    cat_chain[c][ch].append(p)
                    cat_place[c][ek].append(p)
                    stores[ch].add((ek, r[1].strip()))
    return cat_chain, cat_place, stores

def med(xs):
    return round(statistics.median(xs), 2) if xs else None

def summarize(d, cat_chain, cat_place, stores):
    cats = {}
    for c, by in cat_chain.items():
        allp = [p for xs in by.values() for p in xs]
        if len(allp) < 30:
            continue
        q = statistics.quantiles(allp, n=4)
        chains = {ch: {"med": med(xs), "min": round(min(xs), 2), "n": len(xs)} for ch, xs in by.items() if len(xs) >= 5}
        oblasts = defaultdict(list)
        for ek, xs in cat_place[c].items():
            if ek in PLACES:
                oblasts[PLACES[ek][0]].extend(xs)
        cats[c] = {"name": CATS[c], "med": med(allp), "p25": round(q[0], 2), "p75": round(q[2], 2), "n": len(allp),
                   "chains": dict(sorted(chains.items(), key=lambda kv: kv[1]["med"])),
                   "oblasts": {o: med(xs) for o, xs in sorted(oblasts.items()) if len(xs) >= 10}}
    # Индекс на населено място: средно отношение на местната типична цена към националната, по стоките от кошницата.
    places = {}
    by_place = defaultdict(dict)
    for c in BASKET:
        if c not in cats:
            continue
        for ek, xs in cat_place[c].items():
            if len(xs) >= 3:
                by_place[ek][c] = statistics.median(xs) / cats[c]["med"]
    for ek, rel in by_place.items():
        if len(rel) >= 10 and ek in PLACES:
            o, mc, nm = PLACES[ek]
            places[ek] = {"name": nm, "oblast": o, "muni": mc, "index": round((statistics.mean(rel.values()) - 1) * 100, 1), "items": len(rel)}
    return {"date": d, "source": "КЗП, портал „Колко струва“ (kolkostruva.bg), отворени данни по чл. 55б ЗВЕРБ",
            "chains": {ch: len(s) for ch, s in sorted(stores.items(), key=lambda kv: -len(kv[1]))}, "basket": BASKET, "cats": cats}, places

dates = sys.argv[1:] or [(date.today() - timedelta(days=1)).isoformat()]
if dates == ["backfill"]:  # по една дата на седмица от въвеждането на еврото
    d0 = date(2026, 1, 5)
    dates = [(d0 + timedelta(days=7 * i)).isoformat() for i in range(0, ((date.today() - d0).days // 7) + 1)] + [(date.today() - timedelta(days=1)).isoformat()]
hf = f"{OUT}/history.json"
hist = json.load(open(hf)) if os.path.exists(hf) else {"dates": [], "cats": {}}
latest = None
for d in sorted(set(dates)):
    got = day(d)
    if not got:
        print(d, "няма файл")
        continue
    summ, places = summarize(d, *got)
    summ_prod = {"date": d, "items": {pid: {"med": med(xs), "min": round(min(xs), 2), "max": round(max(xs), 2), "stores": len(xs),
        "chains": {ch: {"med": med(ys), "stores": len(ys)} for ch, ys in PRODCH[pid].items() if ys}} for pid, xs in PROD.items()}}
    if d not in hist["dates"]:
        hist["dates"].append(d)
        hist["dates"].sort()
    for c, v in summ["cats"].items():
        hist["cats"].setdefault(str(c), {})[d] = v["med"]
    print(d, len(summ["cats"]), "категории,", sum(summ["chains"].values()), "обекта,", len(places), "населени места")
    if latest is None or d >= latest[0]["date"]:
        latest = (summ, places, summ_prod)
    try:
        os.remove(f"/tmp/kolkostruva-{d}.zip")
    except OSError:
        pass
json.dump(hist, open(hf, "w"), ensure_ascii=False, separators=(",", ":"))
if latest:
    prev = json.load(open(f"{OUT}/latest.json")) if os.path.exists(f"{OUT}/latest.json") else None
    if not prev or latest[0]["date"] >= prev["date"]:
        json.dump(latest[0], open(f"{OUT}/latest.json", "w"), ensure_ascii=False, separators=(",", ":"))
        json.dump(latest[1], open(f"{OUT}/places.json", "w"), ensure_ascii=False, separators=(",", ":"))
        if IDENT:
            json.dump(latest[2], open(f"{OUT}/products.json", "w"), ensure_ascii=False, separators=(",", ":"))
