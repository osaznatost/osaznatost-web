const r = await fetch("https://yambol.bg/uploads/E4CC01AC0CC9C4733AD7B3E55B21184F", { headers: { "user-agent": "Mozilla/5.0 osaznatost" } });
const html = await r.text();
const text = html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n");
const i = text.search(/\n\s*ОТНОСНО/i);
console.log(text.slice(i - 1500, i + 3500));
console.log("#### LAST"); console.log(text.slice(-2500));
const nums = [...text.matchAll(/№\s*(\d{3,4})/g)].map(m => m[1]); console.log("#### nums", nums.length, nums.slice(0, 20).join(","));
