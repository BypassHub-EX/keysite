import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));

//
// ==== CONFIG ====
//
const ADMIN_PATH   = process.env.ADMIN_PATH || "/example";   // the secret path only admins know
const SLUG_TTL_MS  = 5 * 60 * 1000;                          // slug valid for 5 minutes
const HOST_TITLE   = "Lazy Devs | Key Delivery";
const BRAND        = "Lazy Devs";

// Load keys into memory
const KEYS_FILE = path.join(__dirname, "keys.txt");
if (!fs.existsSync(KEYS_FILE)) {
  console.error("Missing keys.txt");
  process.exit(1);
}
let keyPool = fs.readFileSync(KEYS_FILE, "utf8")
  .split(/\r?\n/)
  .map(s => s.trim())
  .filter(Boolean);

// Store slugs in-memory: slug -> { key, nonce, expiresAt, consumed }
const slugs = new Map();

function randomSlug(len = 10) {
  return crypto.randomBytes(len).toString("base64url").slice(0, len);
}
function randomNonce() {
  return crypto.randomBytes(16).toString("base64url");
}
function takeRandomKey() {
  if (keyPool.length === 0) return null;
  const i = Math.floor(Math.random() * keyPool.length);
  const key = keyPool[i];
  // remove from pool (one-time globally)
  keyPool.splice(i, 1);
  return key;
}
function cleanExpired() {
  const now = Date.now();
  for (const [slug, rec] of slugs.entries()) {
    if (rec.consumed || rec.expiresAt < now) {
      slugs.delete(slug);
    }
  }
}
// periodic cleanup
setInterval(cleanExpired, 60 * 1000);

//
// ==== ADMIN ENTRY (LootLabs Destination URL) ====
// Visiting this creates a fresh one-time slug and redirects to it.
// Example: https://your.app/example  ->  302 ->  /k/<slug>?t=<nonce>
//
app.get(ADMIN_PATH, (req, res) => {
  const key = takeRandomKey();
  if (!key) {
    return res.status(503).send("No keys available.");
  }
  const slug  = randomSlug(10);
  const nonce = randomNonce();
  const rec = {
    key,
    nonce,
    createdAt: Date.now(),
    expiresAt: Date.now() + SLUG_TTL_MS,
    consumed: false
  };
  slugs.set(slug, rec);

  return res.redirect(302, `/k/${slug}?t=${encodeURIComponent(nonce)}`);
});

//
// ==== ONE-TIME KEY PAGE ====
// Only renders if slug exists, not expired, not consumed, and nonce matches.
//
app.get("/k/:slug", (req, res) => {
  const { slug } = req.params;
  const { t: nonce } = req.query;

  const rec = slugs.get(slug);
  if (!rec) return res.status(404).sendFile(path.join(__dirname, "public/expired.html"));
  if (rec.consumed) return res.status(410).sendFile(path.join(__dirname, "public/expired.html"));
  if (!nonce || nonce !== rec.nonce) return res.status(403).send("Forbidden");
  if (Date.now() > rec.expiresAt) {
    slugs.delete(slug);
    return res.status(410).sendFile(path.join(__dirname, "public/expired.html"));
  }

  // Render minimal branded page with inline key and copy handler.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${HOST_TITLE}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root{--bg:#0b0e12;--panel:#12161d;--text:#e7edf5;--muted:#9fb0c6;--accent:#4da3ff;--accent2:#215aa6;--border:#212833}
    body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial}
    .card{background:var(--panel);padding:36px;border-radius:16px;border:1px solid var(--border);max-width:460px;width:100%;text-align:center;box-shadow:0 6px 28px rgba(0,0,0,.45)}
    h1{margin:0 0 6px;font-size:24px;letter-spacing:.4px}
    h2{margin:0 0 18px;font-size:14px;color:var(--muted);font-weight:500}
    code{display:block;background:#0e131a;border:1px solid var(--border);padding:14px;border-radius:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:16px;word-break:break-all;margin-bottom:16px}
    button{background:linear-gradient(180deg,var(--accent),var(--accent2));border:none;color:#fff;padding:12px 18px;font-size:15px;font-weight:600;border-radius:10px;cursor:pointer;transition:transform .05s ease,opacity .2s ease}
    button:hover{opacity:.92}
    button:active{transform:translateY(1px)}
    button:disabled{background:#30363d;cursor:not-allowed}
    .msg{margin-top:14px;color:var(--muted);font-size:13px}
    .brand{margin-top:24px;color:var(--muted);font-size:12px;letter-spacing:.5px}
  </style>
</head>
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
  const slug  = ${JSON.stringify(slug)};
  const nonce = ${JSON.stringify(rec.nonce)};
  const msgEl = document.getElementById('msg');
  const btn   = document.getElementById('copyBtn');
  const key   = document.getElementById('keyBox').textContent.trim();

  async function consume() {
    try {
      await fetch('/k/' + encodeURIComponent(slug) + '/consume', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ nonce })
      });
    } catch (e) {}
  }

  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(key);
      btn.disabled = true;
      msgEl.textContent = 'Key copied. This page is now invalid.';
      await consume();
      setTimeout(() => {
        window.location.replace('/public/expired.html');
      }, 900);
    } catch (e) {
      msgEl.textContent = 'Copy failed. Please copy manually.';
    }
  });

  // Also consume if they navigate away or refresh
  window.addEventListener('beforeunload', consume);
</script>
</body>
</html>`;

  res.status(200).send(html);
});

//
// ==== CONSUME (invalidate) ====
// Marks the slug as consumed. Requires the correct nonce.
//
app.post("/k/:slug/consume", (req, res) => {
  const { slug } = req.params;
  const { nonce } = req.body || {};
  const rec = slugs.get(slug);
  if (!rec) return res.status(410).json({ ok: false, reason: "expired" });
  if (!nonce || nonce !== rec.nonce) return res.status(403).json({ ok: false, reason: "forbidden" });
  rec.consumed = true;
  slugs.set(slug, rec);
  return res.json({ ok: true });
});

//
// ==== HARD 404s FOR ANYTHING ELSE ====
//
app.get("/", (_req, res) => {
  res.status(404).send("Not Found");
});
app.use((_req, res) => {
  res.status(404).send("Not Found");
});

//
// ==== START SERVER ====
//
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("server running on :" + PORT);
});
