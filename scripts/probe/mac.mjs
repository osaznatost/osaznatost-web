import { execSync } from "node:child_process";
const UA = "Mozilla/5.0 (osaznatost.bg; civic data)";
const sh=(c)=>{try{return execSync(c,{maxBuffer:1e8}).toString()}catch(e){return "ERR "+e.message.slice(0,200)}};
console.log("## root", sh(`curl -sSL -m 40 -A "${UA}" https://register.cacbg.bg/ | grep -oE 'href="[^"]*"' | sort -u | head -60 | tr '\\n' ' '`));
for (const y of ["2021","2019","2018"]) console.log("## y", y, sh(`curl -sSL -m 40 -o /dev/null -w "%{http_code} %{size_download}" -A "${UA}" https://register.cacbg.bg/${y}/list.xml`), sh(`curl -sSL -m 40 -A "${UA}" https://register.cacbg.bg/${y}/ | head -c 300`));
