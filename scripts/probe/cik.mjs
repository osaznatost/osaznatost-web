import { writeFileSync } from "node:fs"; import { execSync } from "node:child_process";
const UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const L="https://2020.eufunds.bg/bg/0/0/Project";
const warm=await fetch(L,{headers:{"User-Agent":UA,"Accept-Language":"bg-BG,bg;q=0.9","Accept":"text/html"}});
const cookie=warm.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
console.log("## warm",warm.status, cookie.slice(0,60));
const t0=Date.now();
const r=await fetch(L+"/ExportToExcel",{headers:{"User-Agent":UA,"Accept-Language":"bg-BG,bg;q=0.9",Referer:L,Accept:"*/*",...(cookie?{Cookie:cookie}:{})}});
const b=Buffer.from(await r.arrayBuffer()); console.log("## export",r.status,b.length,b.subarray(0,2).toString("latin1"),(Date.now()-t0)/1000+"s");
writeFileSync("/tmp/p.xlsx",b);
execSync("pip install -q openpyxl 2>/dev/null || pip install -q --break-system-packages openpyxl");
const out=execSync(`python3 - <<'PY'
import openpyxl
wb=openpyxl.load_workbook('/tmp/p.xlsx',read_only=True)
ws=wb.active
for i,row in enumerate(ws.iter_rows(values_only=True)):
    if i<3 or i in (100,5000,20000): print('## ROW',i,[str(c)[:60] if c is not None else None for c in row][:16])
    if i>20000: break
PY`).toString(); console.log(out);
