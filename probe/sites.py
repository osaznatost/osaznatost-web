import re,subprocess,html,sys
UA="osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)"
def get(u):
    try: return subprocess.run(["curl","-sL","-m","40","-A",UA,u],capture_output=True).stdout.decode('utf8','ignore')
    except Exception as e: return ""
for u in sys.argv[1:]:
    s=get(u); print("##",u,len(s))
    seen=set()
    for h,t in re.findall(r'href="([^"]+)"[^>]*>(.{0,200}?)</a>',s,re.S):
        t=re.sub(r'<[^>]+>|\s+',' ',html.unescape(t)).strip(); h=html.unescape(h)
        if re.search(r'(?i)reshen|решени|resheni|obs|съвет|savet|protokol|протокол',h+t) and h not in seen:
            seen.add(h); print("   ",h[:140],"|",t[:90])
            if len(seen)>45: break
