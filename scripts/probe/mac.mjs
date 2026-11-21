import { execSync } from "node:child_process";
const UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const sh=(c)=>{try{return execSync(c,{maxBuffer:1e8}).toString()}catch(e){return "ERR "+e.message.slice(0,200)}};
console.log("## isun", sh(`curl -sSL --compressed --max-time 600 -c /tmp/cj -b /tmp/cj -H "User-Agent: ${UA}" -H "Accept-Language: bg-BG,bg;q=0.9" https://2020.eufunds.bg/bg/0/0/Project -o /tmp/l.html -w "%{http_code} %{size_download}"; curl -sSL --compressed --max-time 600 -c /tmp/cj -b /tmp/cj -H "User-Agent: ${UA}" -H "Referer: https://2020.eufunds.bg/bg/0/0/Project" https://2020.eufunds.bg/bg/0/0/Project/ExportToExcel -o /tmp/p.xlsx -w " %{http_code} %{size_download}"; head -c 4 /tmp/p.xlsx | xxd | head -1`));
console.log("## cols", sh(`python3 -c "
import zipfile,re
z=zipfile.ZipFile('/tmp/p.xlsx'); ss=z.read('xl/sharedStrings.xml').decode()[:3000]; print(re.sub(r'<[^>]+>',' | ',ss)[:1500])"`));
// Общински съвети (български IP)
for (const u of ["https://www.silistra.bg/","https://www.targovishte.bg/","https://www.vidin.bg/","https://www.smolyan.bg/","https://www.plovdiv.bg/","https://www.kustendil.bg/"]) console.log("## site", u, sh(`curl -sS -o /tmp/s.html -w "%{http_code} %{size_download}" --max-time 25 -H "User-Agent: Mozilla/5.0 (osaznatost.bg; civic data)" ${u}; grep -oiE 'href="[^"]*(reshen|решени|%d1%80%d0%b5%d1%88|obs|savet|council)[^"]*"' /tmp/s.html | sort -u | head -8 | tr '\\n' ' '`));
