// server.cjs
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const __dirnameResolved = __dirname;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const ADMIN_PATH  = process.env.ADMIN_PATH || "/example";
const SLUG_TTL_MS = 5 * 60 * 1000;
const HOST_TITLE  = "Lazy Devs | Key Delivery";
const BRAND       = "Lazy Devs";

// KEYS
const KEYS_FILE = path.join(__dirnameResolved, "keys.txt");
if (!fs.existsSync(KEYS_FILE)) {
  console.error("Missing keys.txt");
  process.exit(1);
}
let keyPool = fs.readFileSync(KEYS_FILE, "utf8")
  .split(/\r?\n/).map(s => s.trim()).filter(Boolean);

// slug store
const slugs = new Map();
const randomSlug  = (len=10)=> crypto.randomBytes(len).toString("base64url").slice(0,len);
const randomNonce = ()=> crypto.randomBytes(16).toString("base64url");
function takeRandomKey(){
  if (keyPool.length===0) return null;
  const i = Math.floor(Math.random()*keyPool.length);
  const key = keyPool[i];
  keyPool.splice(i,1);
  return key;
}
setInterval(()=>{
  const now=Date.now();
  for (const [slug,rec] of slugs.entries()){
    if (rec.consumed || rec.expiresAt < now) slugs.delete(slug);
  }
}, 60000);

// ==== ADMIN ENTRY ====
app.get(ADMIN_PATH, (req,res)=>{
  const key = takeRandomKey();
  if (!key) return res.status(503).send("No keys available.");
  const slug  = randomSlug(10);
  const nonce = randomNonce();
  slugs.set(slug, {
    key, nonce, createdAt: Date.now(),
    expiresAt: Date.now() + SLUG_TTL_MS, consumed: false
  });
  return res.redirect(302, `/k/${slug}?t=${encodeURIComponent(nonce)}`);
});

// ==== ONE-TIME KEY PAGE ====
app.get("/k/:slug", (req,res)=>{
  const { slug } = req.params;
  const { t: nonce } = req.query;
  const rec = slugs.get(slug);
  const expiredHtml = path.join(__dirnameResolved, "public", "expired.html");

  if (!rec) return res.status(404).sendFile(expiredHtml);
  if (rec.consumed) return res.status(410).sendFile(expiredHtml);
  if (!nonce || nonce !== rec.nonce) return res.status(403).send("Forbidden");
  if (Date.now() > rec.expiresAt) { slugs.delete(slug); return res.status(410).sendFile(expiredHtml); }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${HOST_TITLE}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0e12;color:#e7edf5;font-family:system-ui}
.card{background:#12161d;padding:36px;border-radius:16px;border:1px solid #212833;max-width:460px;width:100%;text-align:center}
h1{margin:0 0 6px;font-size:24px}
code{display:block;background:#0e131a;border:1px solid #212833;padding:14px;border-radius:10px;margin-bottom:16px;font-family:monospace;font-size:16px}
button{background:linear-gradient(180deg,#4da3ff,#215aa6);border:none;color:#fff;padding:12px 18px;font-size:15px;font-weight:600;border-radius:10px;cursor:pointer}
.msg{margin-top:14px;color:#9fb0c6;font-size:13px}
</style></head>
<body><div class="card"><h1>${BRAND}</h1><h2>One-Time Key</h2>
<code id="keyBox">${rec.key}</code><button id="copyBtn">Copy Key</button>
<div class="msg" id="msg">Copy the key. This page will expire immediately after.</div></div>
<script>
const slug=${JSON.stringify(slug)}, nonce=${JSON.stringify(rec.nonce)};
const msgEl=document.getElementById('msg'); const btn=document.getElementById('copyBtn');
const key=document.getElementById('keyBox').textContent.trim();
async function consume(){try{await fetch('/k/'+encodeURIComponent(slug)+'/consume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce})});}catch(e){}}
btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(key);btn.disabled=true;msgEl.textContent='Key copied. This page is now invalid.';await consume();setTimeout(()=>{window.location.replace('/public/expired.html');},900);}catch(e){msgEl.textContent='Copy failed. Please copy manually.'}});
window.addEventListener('beforeunload',consume);
btn.click(); // auto copy trigger
</script></body></html>`;
  res.status(200).send(html);
});

// ==== CONSUME ====
app.post("/k/:slug/consume",(req,res)=>{
  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", ()=>{
    try {
      const payload = body ? JSON.parse(body) : {};
      const rec = slugs.get(req.params.slug);
      if (!rec) return res.status(410).json({ ok:false, reason:"expired" });
      if (!payload.nonce || payload.nonce !== rec.nonce) return res.status(403).json({ ok:false, reason:"forbidden" });
      rec.consumed = true; slugs.set(req.params.slug, rec);
      res.json({ ok:true });
    } catch {
      res.status(400).json({ ok:false });
    }
  });
});

// ==== SCRIPT DELIVERY ====
// expects: GET /script?key=XXXX
app.get("/script", (req,res)=>{
  const { key } = req.query;
  const ua = req.get("user-agent") || "";
  if (ua.includes("Mozilla") || ua.includes("Chrome") || ua.includes("Safari") || ua.includes("Firefox")) {
    return res.status(403).send("Access denied: executors only.");
  }

  if (!key || !keyPool.includes(key)) return res.status(403).send("Access Denied");

  const scriptFile = path.join(__dirnameResolved, "secrets", "nmt.scripts");
  if (!fs.existsSync(scriptFile)) return res.status(500).send("Script missing.");

  res.type("text/plain");
  res.sendFile(scriptFile);

  // schedule deletion after 10 min
  setTimeout(() => {
    keyPool = keyPool.filter(k => k !== key);
    fs.writeFileSync(KEYS_FILE, keyPool.join("\n"), "utf8");
    console.log(`Key ${key} deleted after 10 min.`);
  }, 10 * 60 * 1000);
});

// Block folder browsing
app.use("/public", (_req,res)=> res.status(403).send("Access Denied"));
app.use("/secrets", (_req,res)=> res.status(403).send("Access Denied"));

// Fallbacks
app.get("/", (_req,res)=> res.status(404).send("Not Found"));
app.use((_req,res)=> res.status(404).send("Not Found"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("server running on :"+PORT));
