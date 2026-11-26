import re,sys,urllib.request,urllib.parse,ssl
UA="osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)"
ctx=ssl.create_default_context()
def get(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=20,context=ctx); return r.read().decode("utf-8","ignore"), r.geturl()
    except Exception as e: return "",u
for line in open("cand.txt"):
    c,home=line.strip().split("|",1)
    h,base=get(home)
    links=re.findall(r'href="([^"#]+)"[^>]*>([^<]{0,80})',h)
    cand=[]
    for href,t in links:
        if re.search(r'решени|resheni|reshenia|протокол|protokol|obs|общински съвет|obshtinski-savet',href+" "+t,re.I) and not re.search(r'facebook|razreshen|разрешени|mailto',href+t,re.I):
            cand.append(urllib.parse.urljoin(base,href))
    best=[]
    for u in list(dict.fromkeys(cand))[:12]:
        p,_=get(u)
        n=len(re.findall(r'href="[^"]+\.(?:pdf|docx?)"',p,re.I)); r_=len(re.findall(r'Решени|РЕШЕНИ|reshenie',p))
        best.append((n,r_,u))
    best.sort(reverse=True)
    print(c,home,"|",best[:3])
