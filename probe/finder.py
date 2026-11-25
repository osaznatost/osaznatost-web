import json,re,subprocess,html,concurrent.futures as cf
UA="osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)"
T={'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sht','ъ':'a','ь':'y','ю':'yu','я':'ya'}
def tr(s): return ''.join(T.get(ch,ch) for ch in s.lower())
def get(u):
    r=subprocess.run(["curl","-sL","-m","25","-A",UA,"-o","-","-w","\n@@%{http_code} %{url_effective}",u],capture_output=True)
    s=r.stdout.decode('utf8','ignore'); i=s.rfind('\n@@'); return s[:i], s[i+3:]
def fp(s):
    f=[]
    for k,re_ in [('wp','wp-content'),('wpjson','wp-json'),('nk','/bg/page/|nk-soft'),('bgres','bg/resheniya|/resheniya'),('mandat','mandat-2023-2027'),('joomla','Joomla|com_content'),('drupal','Drupal|sites/default/files'),('egov','egov.bg'),('pdf','\.pdf'),('reshenia','reshenia|решения|Решения')]:
        if re.search(re_,s): f.append(k)
    g=re.search(r'<meta name="generator" content="([^"]+)"',s); 
    if g: f.append('gen:'+g.group(1)[:30])
    return f
def find(m):
    c,name,pop,obl=m
    n=re.sub(r'^(Столична|Район .*)$','sofia',name); t=tr(name).replace(' ','-')
    cands=[f"https://www.{t}.bg",f"https://{t}.bg",f"https://www.obshtina-{t}.bg",f"https://obshtina{t}.bg",f"https://www.{t.replace('-','')}.bg",f"https://www.{t}.org",f"https://{t}.egov.bg"]
    for u in cands:
        s,meta=get(u)
        if len(s)>3000 and (name.split()[0][:5] in s):
            return [c,name,pop,u,meta.split(' ',1)[-1][:80],fp(s)]
    return [c,name,pop,None,None,[]]
munis=json.load(open('probe/munis.json'))
with cf.ThreadPoolExecutor(12) as ex:
    for r in ex.map(find,munis): print("R",json.dumps(r,ensure_ascii=False))
