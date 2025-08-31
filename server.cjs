// server.cjs
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const ADMIN_PATH  = process.env.ADMIN_PATH || "/lazy-secret-admin-path-9283";
const SLUG_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BRAND       = "Lazy Devs";
const SCRIPT_FILE = path.join(__dirname, "secrets", "nmt.scripts");

// ==== KEY STORAGE ====
const KEYS_FILE = path.join(__dirname, "keys.txt");
if (!fs.existsSync(KEYS_FILE)) {
  fs.writeFileSync(KEYS_FILE, "");
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
  // also remove from keys.txt
  fs.writeFileSync(KEYS_FILE, keyPool.join("\n"));
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
  const expiredHtml = path.join(__dirname, "public", "expired.html");

  if (!rec) return res.status(404).sendFile(expiredHtml);
  if (rec.consumed) return res.status(410).sendFile(expiredHtml);
  if (!nonce || nonce !== rec.nonce) return res.status(403).send("Forbidden");
  if (Date.now() > rec.expiresAt) { slugs.delete(slug); return res.status(410).sendFile(expiredHtml); }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${BRAND} Key</title>
<style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0e12;color:#e7edf5;font-family:system-ui}
.card{background:#12161d;padding:36px;border-radius:16px;border:1px solid #212833;max-width:460px;width:100%;text-align:center}
h1{margin:0 0 6px;font-size:24px}
code{display:block;background:#0e131a;border:1px solid #212833;padding:14px;border-radius:10px;margin-bottom:16px;font-family:monospace;font-size:18px}
button{background:linear-gradient(180deg,#4da3ff,#215aa6);border:none;color:#fff;padding:12px 18px;font-size:15px;font-weight:600;border-radius:10px;cursor:pointer}
.msg{margin-top:14px;color:#9fb0c6;font-size:13px}</style></head>
<body><div class="card"><h1>${BRAND}</h1><h2>One-Time Key</h2>
<code id="keyBox">${rec.key}</code><button id="copyBtn">Copy Key</button>
<div class="msg" id="msg">Copying key...</div></div>
<script>
const slug=${JSON.stringify(slug)}, nonce=${JSON.stringify(rec.nonce)};
const key=document.getElementById('keyBox').textContent.trim();
async function consume(){try{await fetch('/k/'+encodeURIComponent(slug)+'/consume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce})});}catch(e){}}
navigator.clipboard.writeText(key).then(()=>{document.getElementById('msg').textContent='Key copied! Page now invalid.';consume();setTimeout(()=>{location.replace('/public/expired.html');},900);});
document.getElementById('copyBtn').addEventListener('click',()=>{navigator.clipboard.writeText(key);consume();location.replace('/public/expired.html');});
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
// executors only (blocks browsers)
app.get("/script.nmt", (req,res)=>{
  const ua = req.headers["user-agent"] || "";
  if (/mozilla|chrome|safari|firefox|edge/i.test(ua)) {
    return res.status(403).send("Access Denied (browser not allowed)");
  }
  if (!fs.existsSync(SCRIPT_FILE)) return res.status(500).send("Script missing.");
  res.type("text/plain");
  return res.sendFile(SCRIPT_FILE);
});

// Block secrets
app.use("/secrets", (_req,res)=> res.status(403).send("Access Denied"));

// ==== HOMEPAGE ====
app.get("/", (_req,res)=>{
  res.send(`<!doctype html><html><head><title>${BRAND}</title>
<style>body{margin:0;font-family:system-ui;background:#0b0e12;color:#e7edf5;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center}
h1{font-size:2em;margin-bottom:10px}
p{color:#9fb0c6;margin:4px 0}</style></head>
<body><h1> Welcome to ${BRAND}</h1>
<p>Key system and script delivery server is running.</p>
<p>Use the admin link to generate keys.</p></body></html>`);
});

// ==== FALLBACK ====
app.use((_req,res)=> res.status(404).send("Not Found"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("server running on :"+PORT));
