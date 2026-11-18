# Поръчките на България от европейската база TED (над европейските прагове), за годините, които
# липсват в отворените данни на ЦАИС ЕОП (2020–2021). Чете дневните пакети на Официалния вестник на ЕС,
# взема обявленията за възложени поръчки на български възложители и ги записва в proc_contracts
# с id „ted|номер|позиция“. Пропуска договори, които вече са внесени от ЦАИС ЕОП.
# Нужни: SUPABASE_URL, SUPABASE_SECRET_KEY. По желание: YEARS="2020,2021", MAX_PACKAGES=120.
import io, json, os, re, sys, tarfile, time, urllib.request, urllib.error
import xml.etree.ElementTree as ET

URL, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"]
YEARS = [int(y) for y in os.environ.get("YEARS", "2020,2021").split(",")]
MAX = int(os.environ.get("MAX_PACKAGES", "120"))
STATE = "data/ted-state.json"
BGN = 1.95583
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

PROC = {"PT_OPEN": "Открита процедура", "PT_RESTRICTED": "Ограничена процедура", "PT_COMPETITIVE_NEGOTIATION": "Състезателна процедура с договаряне",
        "PT_NEGOTIATED_WITH_PRIOR_CALL": "Договаряне с предварителна покана", "PT_AWARD_CONTRACT_WITHOUT_CALL": "Договаряне без предварително обявление",
        "PT_COMPETITIVE_DIALOGUE": "Състезателен диалог", "PT_INNOVATION_PARTNERSHIP": "Партньорство за иновации", "PT_AWARD_CONTRACT_WITHOUT_PUBLICATION": "Договаряне без предварително обявление"}
TYPE = {"WORKS": "Строителство", "SUPPLIES": "Доставки", "SERVICES": "Услуги"}

def req(url, data=None, headers=None, method=None, tries=4):
    for i in range(tries):
        try:
            r = urllib.request.Request(url, data=data, headers=headers or {"User-Agent": "osaznatost (open data)"}, method=method)
            with urllib.request.urlopen(r, timeout=300) as f:
                return f.status, f.read()
        except urllib.error.HTTPError as e:
            if e.code in (404, 410): return e.code, b""
            if i == tries - 1: return e.code, e.read()
        except Exception as e:
            if i == tries - 1: return 0, str(e).encode()
        time.sleep(3 * (i + 1))

def local(tag): return tag.rsplit("}", 1)[-1]
def strip(root):
    for el in root.iter():
        el.tag = local(el.tag)
        el.attrib = {local(k): v for k, v in el.attrib.items()}
    return root
def text(el, path):
    x = el.find(path) if el is not None else None
    return " ".join("".join(x.itertext()).split()) if x is not None else None
def num(v):
    if v is None: return None
    try: return float(str(v).replace(" ", "").replace(",", "."))
    except ValueError: return None
def eur(v, cur):
    if v is None: return None
    return round(v / BGN, 2) if cur == "BGN" else (v if cur == "EUR" else None)
def eik(v):
    d = re.sub(r"\D", "", v or "")
    return d[:9] if len(d) >= 9 else (d or None)
def d8(v): return f"{v[:4]}-{v[4:6]}-{v[6:8]}" if v and len(v) == 8 else None
def dmy(v):
    if not v: return None
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", v)
    return m.group(0) if m else None

def parse(xml_bytes):
    root = strip(ET.fromstring(xml_bytes))
    cds = root.find("CODED_DATA_SECTION")
    if cds is None: return []
    if (cds.find("NOTICE_DATA/ISO_COUNTRY") is None) or cds.find("NOTICE_DATA/ISO_COUNTRY").get("VALUE") != "BG": return []
    if cds.find("CODIF_DATA/TD_DOCUMENT_TYPE") is None or cds.find("CODIF_DATA/TD_DOCUMENT_TYPE").get("CODE") != "7": return []  # обявление за възложена поръчка
    pn = text(cds, "NOTICE_DATA/NO_DOC_OJS")  # напр. 2020/S 001-000056
    m = re.match(r"(\d{4})/S \d+-0*(\d+)", pn or "")
    if not m: return []
    year, no = m.group(1), m.group(2)
    pub = f"{int(no)}-{year}"
    date_pub = d8(text(cds, "REF_OJS/DATE_PUB"))
    forms = [f for f in root.find("FORM_SECTION")] if root.find("FORM_SECTION") is not None else []
    form = next((f for f in forms if f.get("LG") == "BG"), forms[0] if forms else None)
    if form is None: return []
    cb = form.find("CONTRACTING_BODY/ADDRESS_CONTRACTING_BODY")
    oc = form.find("OBJECT_CONTRACT")
    proc = form.find("PROCEDURE")
    ptype = next((PROC.get(c.tag) for c in (proc if proc is not None else []) if c.tag.startswith("PT_")), None)
    ctype = TYPE.get((oc.find("TYPE_CONTRACT").get("CTYPE") if oc is not None and oc.find("TYPE_CONTRACT") is not None else ""), None)
    title = text(oc, "TITLE")
    cpv = oc.find("CPV_MAIN/CPV_CODE").get("CODE") if oc is not None and oc.find("CPV_MAIN/CPV_CODE") is not None else None
    eu = any(x is not None for x in (oc.findall("OBJECT_DESCR/EU_PROGR_RELATED") if oc is not None else []))
    est_el = oc.find("VAL_ESTIMATED_TOTAL") if oc is not None else None
    rows = []
    for ac in form.findall("AWARD_CONTRACT"):
        aw = ac.find("AWARDED_CONTRACT")
        if aw is None: continue  # непроведена или прекратена позиция
        conts = aw.findall("CONTRACTORS/CONTRACTOR") or aw.findall("CONTRACTOR")
        names = [text(c, "ADDRESS_CONTRACTOR/OFFICIALNAME") for c in conts]
        ids = [eik(text(c, "ADDRESS_CONTRACTOR/NATIONALID")) for c in conts]
        val = aw.find("VALUES/VAL_TOTAL")
        if val is None: val = aw.find("VAL_TOTAL")
        cur = val.get("CURRENCY") if val is not None else None
        v = num(val.text if val is not None else None)
        est = aw.find("VALUES/VAL_ESTIMATED_TOTAL")
        est_v, est_c = (num(est.text), est.get("CURRENCY")) if est is not None else (num(est_el.text) if est_el is not None else None, est_el.get("CURRENCY") if est_el is not None else None)
        item = ac.get("ITEM") or str(len(rows) + 1)
        rows.append({
            "id": f"ted|{pub}|{item}", "notice_id": int(year) * 1000000 + int(no), "published_at": date_pub, "unp": f"TED {pub}",
            "tender_id": int(year) * 1000000 + int(no), "tender_name": (text(ac, "TITLE") and title and f"{title}: {text(ac, 'TITLE')}") or title or text(ac, "TITLE"),
            "procedure_type": ptype, "legal_basis": "TED (обявление в Официалния вестник на ЕС)", "cpv": cpv, "contract_type": ctype,
            "estimated_value": est_v, "currency": est_c, "estimated_value_eur": eur(est_v, est_c),
            "buyer_eik": eik(text(cb, "NATIONALID")), "buyer_name": text(cb, "OFFICIALNAME"),
            "lot": text(ac, "LOT_NO"), "contract_number": text(ac, "CONTRACT_NO") or item, "contract_date": dmy(text(aw, "DATE_CONCLUSION_CONTRACT")) or date_pub,
            "contract_value": v, "contract_currency": cur, "contract_value_eur": eur(v, cur),
            "supplier_eiks": [x for x in ids if x], "supplier_names": [x for x in names if x], "awarded_to_group": len(conts) > 1,
            "offers_count": int(num(text(aw, "TENDERS/NB_TENDERS_RECEIVED")) or 0) or None,
            "sme_offers_count": int(num(text(aw, "TENDERS/NB_TENDERS_RECEIVED_SME")) or 0) or None,
            "is_eu_funded": eu, "ted_link": f"https://ted.europa.eu/bg/notice/-/detail/{pub}",
        })
    return rows

def upsert(rows):
    for i in range(0, len(rows), 500):
        st, body = req(f"{URL}/rest/v1/proc_contracts?on_conflict=id", json.dumps(rows[i:i + 500]).encode(), {**H, "Prefer": "resolution=merge-duplicates,return=minimal"}, "POST")
        if st not in (200, 201, 204): print("Грешка при запис:", st, body[:300]); sys.exit(1)

# Договорите от ЦАИС ЕОП за същите години: за да не ги дублираме
st, body = req(f"{URL}/rest/v1/proc_contracts?contract_date=lt.2022-03-01&id=not.like.ted*&select=buyer_eik,contract_value_eur&limit=20000", headers=H)
have = {(r["buyer_eik"], round(r["contract_value_eur"] or 0)) for r in json.loads(body or b"[]")}
print("Вече внесени от ЦАИС ЕОП за тези години:", len(have))

state = json.load(open(STATE)) if os.path.exists(STATE) else {"done": []}
done = set(state["done"])
todo = [f"{y}{n:05d}" for y in YEARS for n in range(1, 262) if f"{y}{n:05d}" not in done][:MAX]
total = skipped = 0
for pkg in todo:
    st, data = req(f"https://ted.europa.eu/packages/daily/{pkg}")
    if st in (404, 410) or (st == 200 and not data):
        done.add(pkg); continue
    if st != 200 and st != 206:
        print(pkg, "недостъпен", st); continue
    rows = []
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tf:
            for m in tf:
                if not m.isfile() or not m.name.endswith(".xml"): continue
                raw = tf.extractfile(m).read()
                if b'<ISO_COUNTRY VALUE="BG"' not in raw[:20000] or b'TD_DOCUMENT_TYPE CODE="7"' not in raw[:20000]: continue
                try: rows += parse(raw)
                except ET.ParseError: pass
    except tarfile.TarError as e:
        print(pkg, "повреден пакет", e); continue
    keep = [r for r in rows if (r["buyer_eik"], round(r["contract_value_eur"] or 0)) not in have]
    skipped += len(rows) - len(keep)
    if os.environ.get("DRY"):
        for r in keep[:3]: print(json.dumps(r, ensure_ascii=False)[:700])
    elif keep: upsert(keep)
    total += len(keep)
    done.add(pkg)
    print(pkg, "договори:", len(keep))
state["done"] = sorted(done)
if not os.environ.get("DRY"): json.dump(state, open(STATE, "w"))
print(f"Пакети: {len(todo)}; нови договори: {total}; пропуснати като дубликати: {skipped}; общо обработени пакети: {len(done)}")
