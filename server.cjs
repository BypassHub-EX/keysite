// server.cjs
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const ADMIN_PATH  = process.env.ADMIN_PATH || "/lazy-admin-3948hf"; // hidden admin URL
const SLUG_TTL_MS = 5 * 60 * 1000; // 5 mins
const HOST_TITLE  = "Lazy Devs | Key Delivery";
const BRAND       = "Lazy Devs";
const SCRIPT_FILE = path.join(__dirname, "secrets", "nmt.scripts");

// ==== Load keys ====
const KEYS_FILE = path.join(__dirname, "keys.txt");
if (!fs.existsSync(KEYS_FILE)) {
  console.error("Missing keys.txt");
  process.exit(1);
}
let keyPool = fs.readFileSync(KEYS_FILE, "utf8")
  .split(/\r?\n/).map(s => s.trim()).filter(Boolean);

// ==== Slug Store ====
const slugs = new Map();
function randomSlug(len=10){ return crypto.randomBytes(len).toString("base64url").slice(0,len); }
function randomNonce(){ return crypto.randomBytes(16).toString("base64url"); }
function takeRandomKey(){
  if (keyPool.length===0) return null;
  const i = Math.floor(Math.random()*keyPool.length);
  const key = keyPool[i];
  keyPool.splice(i,1);
  return key;
}
setInterval(()=>{
  const now = Date.now();
  for (const [slug,rec] of slugs.entries()){
    if (rec.consumed || rec.expiresAt < now) slugs.delete(slug);
  }
},60000);

// ==== ADMIN ENTRY ====
app.get(ADMIN_PATH,(req,res)=>{
  const key = takeRandomKey();
  if (!key) return res.status(503).send("No keys available.");
  const slug=randomSlug(10), nonce=randomNonce();
  slugs.set(slug,{ key, nonce, createdAt:Date.now(), expiresAt:Date.now()+SLUG_TTL_MS, consumed:false });
  return res.redirect(302, `/k/${slug}?t=${encodeURIComponent(nonce)}`);
});

// ==== ONE-TIME KEY PAGE ====
app.get("/k/:slug",(req,res)=>{
  const { slug } = req.params; const { t:nonce } = req.query;
  const rec = slugs.get(slug);
  if (!rec || rec.consumed || Date.now() > rec.expiresAt || nonce !== rec.nonce){
    return res.status(410).send("Expired or invalid key page");
  }
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${HOST_TITLE}</title></head>
<body style="background:#0b0e12;color:#e7edf5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
<div style="background:#12161d;padding:36px;border-radius:16px;text-align:center;max-width:400px;">
<h1>${BRAND}</h1>
<h2>One-Time Key</h2>
<code id="keyBox" style="display:block;background:#0e131a;padding:12px;border-radius:10px;margin-bottom:16px;">${rec.key}</code>
<button id="copyBtn">Copy Key</button>
<p id="msg">Copy the key. This page will expire immediately after.</p>
</div>
<script>
const slug=${JSON.stringify(slug)}, nonce=${JSON.stringify(rec.nonce)}, key=document.getElementById("keyBox").textContent.trim();
async function consume(){try{await fetch("/k/"+encodeURIComponent(slug)+"/consume",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nonce})});}catch{}}
document.getElementById("copyBtn").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(key);document.getElementById("msg").textContent="Copied. Page expired.";await consume();setTimeout(()=>{document.body.innerHTML="<h2>Expired</h2>";},800);}catch{document.getElementById("msg").textContent="Copy failed.";}
});
</script>
</body></html>`;
  res.send(html);
});

// ==== CONSUME ====
app.post("/k/:slug/consume",(req,res)=>{
  let body=""; req.on("data",c=>body+=c);
  req.on("end",()=>{
    try{const {nonce}=JSON.parse(body||"{}");const rec=slugs.get(req.params.slug);
      if (!rec||nonce!==rec.nonce) return res.status(403).json({ok:false});
      rec.consumed=true;slugs.set(req.params.slug,rec);
      res.json({ok:true});
    }catch{res.status(400).json({ok:false});}
  });
});

// ==== SCRIPT DELIVERY ====
// Requires ?key=XXXX
app.get("/script",(req,res)=>{
  const { key } = req.query;
  if (!key) return res.status(403).send("Missing key");
  // check if key is valid (already handed out)
  if (![...slugs.values()].some(r=>r.key===key && r.consumed)) return res.status(403).send("Invalid or unused key");

  if (!fs.existsSync(SCRIPT_FILE)) return res.status(500).send("Script missing.");
  res.type("text/plain"); res.sendFile(SCRIPT_FILE);
});

// ==== Fallback ====
app.get("/",(_req,res)=>res.send(`<h1>Welcome to ${BRAND}</h1><p>Use admin link to generate keys.</p>`));
app.use((_req,res)=>res.status(404).send("Not Found"));

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log("Server running on :"+PORT));
