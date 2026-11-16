const base = process.argv[2] || "http://localhost:3000";
const pages = ["/agents","/agents/needs","/agents/harness","/agents/protocol","/agents/covenant","/agents/mcp","/agents/examples","/agents/handbook"];
const cache = new Map();
async function get(p){ if(cache.has(p)) return cache.get(p); const r = await fetch(base+p,{redirect:"manual"}); const t = r.headers.get("content-type")?.includes("html") ? await r.text() : ""; const v={s:r.status,t}; cache.set(p,v); return v; }
for (const p of pages) {
  const {s,t} = await get(p);
  console.log(`\n== ${p} ${s}`);
  const hrefs = [...new Set([...t.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replace(/&amp;/g,"&")))];
  const ids = new Set([...t.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
  for (const h of hrefs) {
    if (h.startsWith("/_next")||h.startsWith("http")||h.startsWith("mailto")) continue;
    if (h.startsWith("#")) { if(!ids.has(h.slice(1))) console.log("  MISSING ANCHOR", h); continue; }
    const [path,hash] = h.split("#");
    const r = await get(path);
    if (r.s>=400) console.log("  BROKEN", r.s, h);
    else if (hash) { const ids2=new Set([...r.t.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1])); if(!ids2.has(hash)) console.log("  MISSING REMOTE ANCHOR", h); }
  }
}
