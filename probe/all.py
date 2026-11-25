import re,subprocess,html,sys
UA="osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)"
def get(u): return subprocess.run(["curl","-sL","-m","30","-A",UA,u],capture_output=True).stdout.decode('utf8','ignore')
for arg in sys.argv[1:]:
    u,flt=(arg.split('|')+[''])[:2]
    s=get(u); print("##",u,len(s))
    links=[(html.unescape(a),re.sub(r'<[^>]+>|\s+',' ',html.unescape(b)).strip()) for a,b in re.findall(r'href="([^"]+)"[^>]*>(.{0,200}?)</a>',s,re.S)]
    n=0
    for a,b in links:
        if flt and not re.search(flt,a+' '+b): continue
        print("   L",a[:150],"|",b[:80]); n+=1
        if n>40: break
