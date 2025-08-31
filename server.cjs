// server.cjs
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const ADMIN_PATH  = process.env.ADMIN_PATH || "/example";
const SLUG_TTL_MS = 5 * 60 * 1000;
const BRAND       = "Lazy Devs";
const HOST_TITLE  = "Lazy Devs | Key Delivery";

// ==== KEYS ====
const KEYS_FILE = path.join(__dirname, "keys.txt");
if (!fs.existsSync(KEYS_FILE)) {
  console.error("Missing keys.txt");
  process.exit(1);
}
let keyPool = fs.readFileSync(KEYS_FILE, "utf8")
  .split(/\r?\n/).map(s => s.trim()).filter(Boolean);

// ==== SLUG STORE ====
const slugs = new Map();
function rand(len=10) { return crypto.randomBytes(len).toString("base64url").slice(0,len); }
function nonce() { return crypto.randomBytes(16).toString("base64url"); }
function takeRandomKey(){
  if (!keyPool.length) return null;
  const i = Math.floor(Math.random()*keyPool.length);
  const k = keyPool[i]; keyPool.splice(i,1);
  fs.writeFileSync(KEYS_FILE, keyPool.join("\n"), "utf8");
  return k;
}

// cleanup
setInterval(()=>{
  const now = Date.now();
  for (const [slug, rec] of slugs.entries()){
    if (rec.consumed || rec.expiresAt < now) slugs.delete(slug);
  }
}, 60000);

// ==== ADMIN ENTRY ====
app.get(ADMIN_PATH, (req,res)=>{
  const key = takeRandomKey();
  if (!key) return res.status(503).send("No keys available.");
  const s = rand(10), n = nonce();
  slugs.set(s, { key, nonce:n, expiresAt:Date.now()+SLUG_TTL_MS, consumed:false });
  res.redirect(302, `/k/${s}?t=${encodeURIComponent(n)}`);
});

// ==== KEY PAGE ====
app.get("/k/:slug", (req,res)=>{
  const { slug } = req.params, { t } = req.query;
  const rec = slugs.get(slug);
  const expiredHtml = path.join(__dirname, "public", "expired.html");

  if (!rec) return res.status(404).sendFile(expiredHtml);
  if (rec.consumed) return res.status(410).sendFile(expiredHtml);
  if (!t || t !== rec.nonce) return res.status(403).send("Forbidden");
  if (Date.now()>rec.expiresAt){ slugs.delete(slug); return res.status(410).sendFile(expiredHtml); }

  const html = `
  <!doctype html><html><head><meta charset="utf-8"><title>${HOST_TITLE}</title>
  <style>body{display:flex;align-items:center;justify-content:center;height:100vh;background:#0b0e12;color:#e7edf5;font-family:system-ui}
  .card{padding:30px;background:#12161d;border-radius:10px;text-align:center}
  code{display:block;margin:15px 0;padding:10px;background:#0e131a;border:1px solid #212833;border-radius:6px}
  button{padding:10px 16px;border:none;border-radius:6px;background:#4da3ff;color:#fff;cursor:pointer;font-weight:600}
  </style></head>
  <body><div class="card"><h1>${BRAND}</h1><h2>One-Time Key</h2>
  <code id="keyBox">${rec.key}</code><button id="copyBtn">Copy Key</button>
  <div id="msg">Key invalidates after copy.</div></div>
  <script>
  const slug=${JSON.stringify(slug)}, nonce=${JSON.stringify(rec.nonce)};
  const key=document.getElementById("keyBox").textContent.trim();
  async function consume(){try{await fetch('/k/'+encodeURIComponent(slug)+'/consume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce})});}catch(e){}}
  document.getElementById("copyBtn").onclick=async()=>{
    try{await navigator.clipboard.writeText(key);}catch(e){}
    await consume();
    document.getElementById("msg").textContent="Copied & invalidated.";
    setTimeout(()=>location.replace('/public/expired.html'),500);
  };
  window.addEventListener("beforeunload",consume);
  </script></body></html>`;
  res.status(200).send(html);
});

app.post("/k/:slug/consume",(req,res)=>{
  let body=""; req.on("data",c=>body+=c); req.on("end",()=>{
    try{
      const {nonce} = body?JSON.parse(body):{};
      const rec=slugs.get(req.params.slug);
      if (!rec) return res.status(410).json({ok:false});
      if (nonce!==rec.nonce) return res.status(403).json({ok:false});
      rec.consumed=true; slugs.set(req.params.slug,rec);
      res.json({ok:true});
    }catch{res.status(400).json({ok:false});}
  });
});

// ==== SCRIPT DELIVERY ====
// Only serves to executors, not browsers
app.get("/script",(req,res)=>{
  const { key } = req.query;
  const ua=(req.get("user-agent")||"").toLowerCase();

  // block browsers
  const browserish = ["mozilla","chrome","safari","firefox","edge"];
  if (browserish.some(w=>ua.includes(w))) return res.status(403).send("Access denied: executors only.");

  if (!key || !keyPool.includes(key)) return res.status(403).send("Invalid key.");

  const scriptFile = path.join(__dirname,"secrets","nmt.scripts");
  if (!fs.existsSync(scriptFile)) return res.status(500).send("Script missing.");

  res.type("text/plain"); res.sendFile(scriptFile);

  // delete key after 10m
  setTimeout(()=>{
    const idx=keyPool.indexOf(key);
    if(idx!==-1){ keyPool.splice(idx,1); fs.writeFileSync(KEYS_FILE,keyPool.join("\\n"),"utf8"); }
  },10*60*1000);
});

// ==== BLOCK FOLDERS ====
app.use("/public",(_req,res)=>res.status(403).send("Access Denied"));
app.use("/secrets",(_req,res)=>res.status(403).send("Access Denied"));

// ==== FALLBACK ====
app.get("/",(_req,res)=>res.status(404).send("Not Found"));
app.use((_req,res)=>res.status(404).send("Not Found"));

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log("server running on :"+PORT));
