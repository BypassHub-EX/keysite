// server.cjs
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const BRAND = "Lazy Devs";
const ADMIN_PATH = process.env.ADMIN_PATH || "/lazy-secret-admin"; // set secret admin path
const SLUG_TTL_MS = 5 * 60 * 1000;
const SCRIPT_FILE = path.join(__dirname, "secrets", "nmt.scripts");
const KEYS_FILE = path.join(__dirname, "keys.txt");

// ==== KEYS ====
let keyPool = [];
if (fs.existsSync(KEYS_FILE)) {
  keyPool = fs.readFileSync(KEYS_FILE, "utf8")
    .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}
const slugs = new Map();
const randomSlug = (len=10)=> crypto.randomBytes(len).toString("base64url").slice(0,len);
const randomNonce = ()=> crypto.randomBytes(16).toString("base64url");
function takeRandomKey(){
  if (keyPool.length===0) return null;
  const i = Math.floor(Math.random()*keyPool.length);
  const key = keyPool[i];
  keyPool.splice(i,1);
  fs.writeFileSync(KEYS_FILE, keyPool.join("\n")); // persist removal
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

  if (!rec) return res.status(404).send("Key expired or invalid.");
  if (rec.consumed) return res.status(410).send("This key has already been used.");
  if (!nonce || nonce !== rec.nonce) return res.status(403).send("Forbidden");
  if (Date.now() > rec.expiresAt) { slugs.delete(slug); return res.status(410).send("Key expired."); }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${BRAND} | One-Time Key</title>
  <style>
  body{background:#0b0e12;color:#e7edf5;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
  .card{background:#12161d;padding:40px;border-radius:16px;text-align:center;border:1px solid #212833}
  button{margin-top:15px;background:linear-gradient(180deg,#4da3ff,#215aa6);border:none;color:#fff;padding:12px 18px;font-weight:600;border-radius:10px;cursor:pointer}
  </style></head><body>
  <div class="card">
    <h1>${BRAND}</h1>
    <h2>Your One-Time Key</h2>
    <code id="keyBox">${rec.key}</code><br>
    <button id="copyBtn">Copy Key</button>
    <p id="msg">This page will expire once the key is copied.</p>
  </div>
<script>
const slug=${JSON.stringify(slug)}, nonce=${JSON.stringify(rec.nonce)};
const key=document.getElementById("keyBox").textContent.trim();
const btn=document.getElementById("copyBtn"), msg=document.getElementById("msg");
async function consume(){try{await fetch('/k/'+encodeURIComponent(slug)+'/consume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce})});}catch{}}
btn.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(key);btn.disabled=true;msg.textContent="Copied! Key is now invalid.";await consume();setTimeout(()=>{document.body.innerHTML="<h1 style='color:#e7edf5;text-align:center'>Key Deleted</h1>";},800);}catch{msg.textContent="Copy failed. Copy manually.";}});</script>
</body></html>`;
  res.status(200).send(html);
});
app.post("/k/:slug/consume",(req,res)=>{
  let body=""; req.on("data",c=>body+=c);
  req.on("end",()=>{ try {
    const payload=body?JSON.parse(body):{};
    const rec=slugs.get(req.params.slug);
    if (!rec) return res.status(410).json({ok:false});
    if (!payload.nonce||payload.nonce!==rec.nonce) return res.status(403).json({ok:false});
    rec.consumed=true; slugs.set(req.params.slug,rec);
    res.json({ok:true});
  } catch{res.status(400).json({ok:false});}});
});

// ==== SCRIPT DELIVERY ====
// No key needed — directly serves obfuscated script
app.get("/script.nmt", (req,res)=>{
  if (!fs.existsSync(SCRIPT_FILE)) return res.status(500).send("Script missing.");
  res.type("text/plain");
  return res.sendFile(SCRIPT_FILE);
});

// ==== HOMEPAGE ====
app.get("/", (_req, res) => {
  res.send(`<!doctype html><html lang="en"><head>
  <meta charset="utf-8"><title>${BRAND} Hub</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
  body{margin:0;font-family:system-ui;background:#0b0e12;color:#e7edf5;line-height:1.7}
  header{background:linear-gradient(135deg,#1b2430,#0b0e12);padding:80px 20px;text-align:center;color:#fff}
  header h1{font-size:3em;margin:0;color:#4da3ff}
  header p{color:#9fb0c6}
  nav a{margin:0 12px;color:#e7edf5;text-decoration:none;font-weight:600}
  nav a:hover{color:#4da3ff}
  .container{max-width:900px;margin:60px auto;padding:0 20px}
  h2{border-left:4px solid #4da3ff;padding-left:10px}
  footer{background:#12161d;color:#9fb0c6;text-align:center;padding:20px}
  footer a{color:#4da3ff;text-decoration:none}
  </style></head><body>
  <header>
    <h1>${BRAND} Hub</h1>
    <p>Secure • Optimal • Free</p>
    <nav><a href="#about">About</a><a href="#scripts">Scripts</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></nav>
  </header>
  <div class="container" id="about">
    <h2>About Us</h2><p>${BRAND} builds tools & scripts for developers, focusing on safety, optimization, and simplicity.</p>
    <h2 id="scripts">Scripts</h2><p>Execute in Roblox with:</p><code>loadstring(game:HttpGet("https://www.lazydevs.site/script.nmt"))()</code>
  </div>
  <footer>&copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.</footer>
  </body></html>`);
});

// ==== TERMS ====
app.get("/terms", (_req,res)=>{
  res.send("<h1>Terms of Service</h1><p>By using our services you agree not to misuse or redistribute them. We are not liable for damages, bans, or misuse.</p>");
});

// ==== PRIVACY ====
app.get("/privacy", (_req,res)=>{
  res.send("<h1>Privacy Policy</h1><p>We do not collect personal data. We may log basic technical info for anti-abuse. We never sell or share data.</p>");
});

// ==== START ====
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("server running on :"+PORT));
