import { execSync } from "node:child_process";
const sh=(c)=>{try{return execSync(c,{maxBuffer:1e8}).toString()}catch(e){return "ERR "+e.message.slice(0,200)}};
// Само следване на пренасочвания, с честен User-Agent на проекта.
for (const u of ["https://www.silistra.bg/","https://www.targovishte.bg/","https://www.kustendil.bg/"]) console.log("## site", u, sh(`curl -sSL -o /tmp/s.html -w "%{http_code} %{size_download} %{url_effective}" --max-time 30 -A "Mozilla/5.0 (osaznatost.bg; civic data)" ${u}; echo; grep -oiE 'href="[^"]*"[^>]*>[^<]{0,50}(съвет|решени|протокол|заседани)[^<]{0,30}' /tmp/s.html | sort -u | head -8 | tr '\\n' ' '`));
