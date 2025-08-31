// server.cjs
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Config ----
const ADMIN_PATH  = process.env.ADMIN_PATH || "/super-secret-admin-492xya";
const SLUG_TTL_MS = 5 * 60 * 1000; // 5 minutes
const HOST_TITLE  = "Lazy Devs | Key Delivery";
const BRAND       = "Lazy Devs";
const SCRIPT_FILE = path.join(__dirname, "secrets", "nmt.scripts");
const KEYS_FILE   = path.join(__dirname, "keys.txt");
const EXPIRED_HTML= path.join(__dirname, "public", "expired.html");

// ---- Sanity files ----
if (!fs.existsSync(KEYS_FILE)) {
  console.error("Missing keys.txt");
  process.exit(1);
}
if (!fs.existsSync(EXPIRED_HTML)) {
  fs.mkdirSync(path.dirname(EXPIRED_HTML), { recursive: true });
  fs.writeFileSync(EXPIRED_HTML, "<!doctype html><title>Expired</title><h1>Link expired</h1>");
}
if (!fs.existsSync(SCRIPT_FILE)) {
  fs.mkdirSync(path.dirname(SCRIPT_FILE), { recursive: true });
  fs.writeFileSync(SCRIPT_FILE, "-- placeholder: put your Roblox script here\n");
}

// ---- Request logger (helps debug why it “didn’t execute”) ----
app.use((req, _res, next) => {
  console.log(
    new Date().toISOString(),
    req.method,
    req.url,
    "| UA:",
    (req.headers["user-agent"] || "").slice(0, 120)
  );
  next();
});

// ---- In-memory key pool & one-time slugs ----
let keyPool = fs.readFileSync(KEYS_FILE, "utf8")
  .split(/\r?\n/).map(s => s.trim()).filter(Boolean);

const slugs = new Map(); // slug -> { key, nonce, expiresAt, consumed }

const randomSlug  = (len = 10) => crypto.randomBytes(len).toString("base64url").slice(0, len);
const randomNonce = () => crypto.randomBytes(16).toString("base64url");

function takeRandomKey() {
  if (keyPool.length === 0) return null;
  const i = Math.floor(Math.random() * keyPool.length);
  const key = keyPool[i];
  keyPool.splice(i, 1); // remove from pool (one-time)
  // persist removal so key can’t reappear if server restarts
  fs.writeFileSync(KEYS_FILE, keyPool.join("\n"));
  return key;
}

function cleanupSlugs() {
  const now = Date.now();
  for (const [slug, rec] of slugs.entries()) {
    if (rec.consumed || rec.expiresAt < now) slugs.delete(slug);
  }
}
setInterval(cleanupSlugs, 60_000);

// ---- Health ----
app.get("/health", (_req, res) => res.json({ ok: true }));

// ---- Admin entry: mint one-time page with a key ----
app.get(ADMIN_PATH, (req, res) => {
  const key = takeRandomKey();
  if (!key) return res.status(503).send("No keys available.");

  const slug  = randomSlug(10);
  const nonce = randomNonce();
  slugs.set(slug, {
    key,
    nonce,
    createdAt: Date.now(),
    expiresAt: Date.now() + SLUG_TTL_MS,
    consumed: false
  });

  return res.redirect(302, `/k/${slug}?t=${encodeURIComponent(nonce)}`);
});

// ---- One-time key page ----
app.get("/k/:slug", (req, res) => {
  const { slug } = req.params;
  const { t: nonce } = req.query;

  const rec = slugs.get(slug);
  if (!rec) return res.status(404).sendFile(EXPIRED_HTML);
  if (rec.consumed) return res.status(410).sendFile(EXPIRED_HTML);
  if (!nonce || nonce !== rec.nonce) return res.status(403).send("Forbidden");
  if (Date.now() > rec.expiresAt) {
    slugs.delete(slug);
    return res.status(410).sendFile(EXPIRED_HTML);
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${HOST_TITLE}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#0b0e12;--panel:#12161d;--text:#e7edf5;--muted:#9fb0c6;--accent:#4da3ff;--accent2:#215aa6;--border:#212833}
body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial}
.card{background:var(--panel);padding:36px;border-radius:16px;border:1px solid var(--border);max-width:480px;width:100%;text-align:center;box-shadow:0 6px 28px rgba(0,0,0,.45)}
h1{margin:0 0 8px;font-size:24px}
h2{margin:0 0 18px;font-size:14px;color:var(--muted);font-weight:500}
code{display:block;background:#0e131a;border:1px solid var(--border);padding:14px;border-radius:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:16px;word-break:break-all;margin-bottom:16px}
button{background:linear-gradient(180deg,var(--accent),var(--accent2));border:none;color:#fff;padding:12px 18px;font-size:15px;font-weight:600;border-radius:10px;cursor:pointer;transition:transform .05s ease,opacity .2s ease}
button:hover{opacity:.92}
button:active{transform:translateY(1px)}
button:disabled{background:#30363d;cursor:not-allowed}
.msg{margin-top:14px;color:var(--muted);font-size:13px}
.brand{margin-top:24px;color:var(--muted);font-size:12px;letter-spacing:.5px}
</style></head>
<body>
<div class="card">
  <h1>${BRAND}</h1>
  <h2>One-Time Key</h2>
  <code id="keyBox">${rec.key}</code>
  <button id="copyBtn">Copy Key</button>
  <div class="msg" id="msg">Copy the key. This page will expire immediately after.</div>
  <div class="brand">© ${new Date().getFullYear()} ${BRAND}</div>
</div>
<script>
const slug=${JSON.stringify(slug)}, nonce=${JSON.stringify(rec.nonce)};
const msgEl=document.getElementById('msg'); const btn=document.getElementById('copyBtn');
const key=document.getElementById('keyBox').textContent.trim();
async function consume(){
  try{
    await fetch('/k/'+encodeURIComponent(slug)+'/consume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce})});
  }catch(e){}
}
async function doCopy(){
  try{
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(key);
    } else {
      const ta=document.createElement('textarea'); ta.value=key; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    btn.disabled=true; msgEl.textContent='Key copied. This page is now invalid.';
    await consume();
    setTimeout(()=>{ location.replace('/expired'); }, 900);
  }catch(e){ msgEl.textContent='Copy failed. Please copy manually.'; }
}
btn.addEventListener('click', doCopy);
// Auto-consume after 30s even if user doesn’t click
setTimeout(()=>{ consume(); }, 30000);
// Also consume on navigation
window.addEventListener('beforeunload', consume);
</script>
</body></html>`;
  res.status(200).send(html);
});

// Consumes (invalidates) a one-time key page
app.post("/k/:slug/consume", (req, res) => {
  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    try {
      const payload = body ? JSON.parse(body) : {};
      const rec = slugs.get(req.params.slug);
      if (!rec) return res.status(410).json({ ok:false, reason:"expired" });
      if (!payload.nonce || payload.nonce !== rec.nonce) return res.status(403).json({ ok:false, reason:"forbidden" });
      rec.consumed = true; slugs.set(req.params.slug, rec);
      return res.json({ ok:true });
    } catch {
      return res.status(400).json({ ok:false });
    }
  });
});

// Simple redirect for /expired
app.get("/expired", (_req, res) => res.status(410).sendFile(EXPIRED_HTML));

// ---- SCRIPT DELIVERY (no key param). Blocks browsers. ----
app.get("/script", (req, res) => {
  const ua = req.headers["user-agent"] || "";
  // Block common browsers; allow Roblox/WinInet, curl, etc.
  if (/mozilla|chrome|safari|firefox|edge|edg/i.test(ua)) {
    return res.status(403).send("Access Denied (browser not allowed)");
  }
  if (!fs.existsSync(SCRIPT_FILE)) {
    return res.status(500).send("Script missing.");
  }
  res.set("Cache-Control", "no-store");
  res.type("text/plain");
  return res.sendFile(SCRIPT_FILE);
});

// Harden folders
app.use("/public", (_req, res) => res.status(403).send("Access Denied"));
app.use("/secrets", (_req, res) => res.status(403).send("Access Denied"));

// Fallbacks
app.get("/", (_req, res) => res.status(404).send("Not Found"));
app.use((_req, res) => res.status(404).send("Not Found"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("server running on :" + PORT));
