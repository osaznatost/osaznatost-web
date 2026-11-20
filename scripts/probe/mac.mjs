const u = "http://dksbt.bg/?a=" + encodeURIComponent("ЦЕНИ и АНАЛИЗИ") + "&p=204";
const t = await (await fetch(u, { headers: { "user-agent": "Mozilla/5.0 osaznatost" } })).text();
const txt = t.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n");
const i = txt.indexOf("Захар"); console.log(txt.slice(Math.max(0, i - 1500), i + 2500));
