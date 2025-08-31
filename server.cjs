// server.cjs
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const ADMIN_PATH   = process.env.ADMIN_PATH || "/admin-secret-9gZs3R"; // hidden admin link
const SLUG_TTL_MS  = 5 * 60 * 1000; // 5 min keys
const BRAND        = "Lazy Devs";
const SCRIPT_FILE  = path.join(__dirname, "secrets", "nmt.scripts");

// ==== KEYS ====
const KEYS_FILE = path.join(__dirname, "keys.txt");
if (!fs.existsSync(KEYS_FILE)) {
  console.error("Missing keys.txt");
  process.exit(1);
}
let keyPool = fs.readFileSync(KEYS_FILE, "utf8")
  .split(/\r?\n/)
  .map(s=>s.trim())
  .filter(Boolean);

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
    if (rec.expiresAt < now) slugs.delete(slug);
  }
},60000);

// ==== ADMIN ENTRY ====
app.get(ADMIN_PATH,(req,res)=>{
  const key = takeRandomKey();
  if (!key) return res.status(503).send("No keys available.");
  const slug  = randomSlug(10);
  const nonce = randomNonce();
  slugs.set(slug,{
    key, nonce, createdAt: Date.now(),
    expiresAt: Date.now()+SLUG_TTL_MS, consumed:false
  });
  return res.redirect(302,`/k/${slug}?t=${encodeURIComponent(nonce)}`);
});

// ==== ONE-TIME KEY PAGE ====
app.get("/k/:slug",(req,res)=>{
  const {slug}=req.params; const {t:nonce}=req.query;
  const rec=slugs.get(slug);
  const expiredHtml = "<h1>Expired</h1><p>This key is no longer valid.</p>";

  if(!rec) return res.status(404).send(expiredHtml);
  if(!nonce || nonce!==rec.nonce) return res.status(403).send("Forbidden");
  if(Date.now()>rec.expiresAt){slugs.delete(slug);return res.status(410).send(expiredHtml);}

  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${BRAND} Key</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#0b0e12;color:#fff;font-family:system-ui}
.card{background:#12161d;padding:30px;border-radius:12px;text-align:center;max-width:420px}
code{display:block;background:#0e131a;padding:12px;border-radius:8px;margin:12px 0;font-size:18px}
button{padding:10px 16px;border:none;border-radius:8px;background:#4da3ff;color:#fff;font-weight:600;cursor:pointer}</style>
</head><body>
<div class="card">
<h1>${BRAND}</h1><p>Your one-time key:</p>
<code id="keyBox">${rec.key}</code>
<button id="copyBtn">Copy Key</button>
<p id="msg">This page will self-expire after copy.</p>
</div>
<script>
const btn=document.getElementById("copyBtn");
const msg=document.getElementById("msg");
const key=document.getElementById("keyBox").textContent.trim();
btn.addEventListener("click",async()=>{
 try{
   await navigator.clipboard.writeText(key);
   msg.textContent="Key copied. Closing…";
   setTimeout(()=>document.body.innerHTML="<h2>Expired</h2>",1200);
 }catch(e){msg.textContent="Copy failed. Copy manually";}
});
</script></body></html>`;
  res.send(html);
});

// ==== SCRIPT DELIVERY ====
// GET /script?key=XXXX
app.get("/script",(req,res)=>{
  const {key}=req.query;
  if(!key) return res.status(403).send("Missing key");

  // allow if key exists in slugs (Option A)
  if(![...slugs.values()].some(r=>r.key===key)){
    return res.status(403).send("Invalid key");
  }

  if(!fs.existsSync(SCRIPT_FILE)) return res.status(500).send("Script missing.");
  res.type("text/plain");
  res.sendFile(SCRIPT_FILE);
});

// ==== HOMEPAGE ====
app.get("/",(req,res)=>{
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>${BRAND}</title>
<style>body{margin:0;font-family:system-ui;background:#0b0e12;color:#e7edf5}
header{background:#12161d;padding:20px;text-align:center}
h1{margin:0;font-size:32px}main{padding:30px;max-width:800px;margin:auto}
.section{margin:40px 0}footer{background:#12161d;padding:10px;text-align:center;color:#9fb0c6;font-size:14px}</style>
</head><body>
<header><h1>Welcome to ${BRAND}</h1></header>
<main>
<div class="section"><h2>What We Do</h2><p>We build custom scripts, tools, and automation. Keys are distributed securely through our key system.</p></div>
<div class="section"><h2>Our Scripts</h2><ul><li>NMT Loader</li><li>Custom Executors</li><li>Utility Tools</li></ul></div>
<div class="section"><h2>Terms</h2><p>Use of our services is at your own risk. Redistribution or resale of keys/scripts is forbidden. Misuse may result in revocation.</p></div>
<div class="section"><h2>Privacy Policy</h2><p>We respect your privacy. We do not collect personal data, except logs required to operate the key system (temporary). These are deleted periodically.</p></div>
</main>
<footer>© ${new Date().getFullYear()} ${BRAND}</footer>
</body></html>`);
});

// ==== FALLBACKS ====
app.use((_req,res)=>res.status(404).send("Not Found"));

// ==== START ====
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log("server running on :"+PORT));
