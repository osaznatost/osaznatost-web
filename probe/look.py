import re,subprocess,html,sys
UA="osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)"
def get(u): return subprocess.run(["curl","-sL","-m","30","-A",UA,u],capture_output=True).stdout.decode('utf8','ignore')
for u in sys.argv[1:]:
    s=get(u); print("##",u,len(s))
    links=[(html.unescape(a),re.sub(r'<[^>]+>|\s+',' ',html.unescape(b)).strip()) for a,b in re.findall(r'href="([^"]+)"[^>]*>(.{0,160}?)</a>',s,re.S)]
    main=s[s.find('<main') if '<main' in s else 0:]
    for a,b in links:
        if re.search(r'(?i)reshen|решени|page=|mandat|protokol|stranica|\?p=|samokov.obshtini',a+b): print("   L",a[:150],"|",b[:80])
    t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',re.sub(r'<script.*?</script>|<style.*?</style>|<nav.*?</nav>|<header.*?</header>','',s,flags=re.S)))
    i=t.find('РЕШЕНИЕ'); print("   T",t[max(0,i-300):i+1500] if i>=0 else t[:600])
