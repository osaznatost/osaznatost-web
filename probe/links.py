import re,subprocess,html,sys
UA="osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)"
def get(u): return subprocess.run(["curl","-sL","-m","30","-A",UA,u],capture_output=True).stdout.decode('utf8','ignore')
for u in sys.argv[1:]:
    s=get(u); print("##",u,len(s))
    m=re.search(r'<main[\s\S]*?</main>',s) or re.search(r'<article[\s\S]*?</article>',s) or re.search(r'id="content"[\s\S]*',s)
    body=m.group(0) if m else s
    links=[(html.unescape(a),re.sub(r'<[^>]+>|\s+',' ',html.unescape(b)).strip()) for a,b in re.findall(r'href="([^"]+)"[^>]*>(.{0,200}?)</a>',body,re.S)]
    n=0
    for a,b in links:
        if re.search(r'(?i)facebook|twitter|mailto|javascript|#',a): continue
        if re.search(r'(?i)реш|resh|\.pdf|\.doc|протокол|protokol|202[3-6]|r-6|page',a+b):
            print("   L",a[:160],"|",b[:90]); n+=1
            if n>30: break
