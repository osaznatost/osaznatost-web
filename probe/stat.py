import json,sys
for c in sys.argv[1:]:
    try: d=json.load(open(f'data/council/{c}.json'))
    except Exception as e: print('X',c,'нищо'); continue
    ds=d['decisions']; print('X',c,len(ds),'tally',sum(1 for x in ds if x.get('tally')),'votes',sum(1 for x in ds if x.get('votes')))
    for x in ds[:3]: print('   ',x['number'],x['date'],x.get('tally'),'|',x['title'][:110])
