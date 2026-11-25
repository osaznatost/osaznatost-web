import json,re,subprocess,html,concurrent.futures as cf
UA="osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)"
def get(u):
    r=subprocess.run(["curl","-sL","-m","25","-A",UA,u],capture_output=True); return r.stdout.decode('utf8','ignore')
def go(x):
    c,name,pop,site=x[:4]
    if not site: return None
    out={'c':c,'n':name,'pop':pop,'site':site}
    s=get(site+"/bg/resheniya")
    L=re.findall(r'href="([^"]*reshenie-?\d+[^"]*)"',s)
    out['bgres']=len(L); out['bgres_s']=L[:2]
    out['pag']=sorted(set(re.findall(r'href="([^"]*[?&](?:page|p)=\d+[^"]*)"',s)))[:3]
    j=get(site+"/wp-json/wp/v2/categories?search=%D1%80%D0%B5%D1%88%D0%B5%D0%BD&per_page=20")
    try: out['wpcat']=[(k['id'],k['name'],k['count']) for k in json.loads(j)][:6]
    except: out['wpcat']=None
    if not out['bgres'] and not out['wpcat']:
        h=get(site)
        links=[(html.unescape(a),re.sub(r'<[^>]+>|\s+',' ',html.unescape(b)).strip()) for a,b in re.findall(r'href="([^"]+)"[^>]*>(.{0,120}?)</a>',h,re.S)]
        out['links']=[l for l in links if re.search(r'(?i)решени|reshen|obs|съвет|savet',l[0]+l[1])][:8]
    return out
L=[json.loads(l) for l in open('probe/sites.jsonl')]
with cf.ThreadPoolExecutor(12) as ex:
    for r in ex.map(go,L):
        if r: print("F",json.dumps(r,ensure_ascii=False))
