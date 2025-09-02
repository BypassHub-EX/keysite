const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const BRAND = "Lazy Devs";
const SCRIPT_FILE = path.join(__dirname, "secrets", "nmt.scripts");
const KEYS_FILE = path.join(__dirname, "public", "keys.txt");

// ==== HELPERS ====
function loadKeys() {
  if (!fs.existsSync(KEYS_FILE)) return [];
  return fs.readFileSync(KEYS_FILE, "utf8")
    .split(/\r?\n/)
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

function saveKeys(keys) {
  fs.writeFileSync(KEYS_FILE, keys.join("\n"), "utf8");
}

// ==== HOMEPAGE ====
app.get("/", (_req, res) => {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${BRAND} | No More Time Hub</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { margin:0; font-family:system-ui, sans-serif; background:#0b0e12; color:#e7edf5; }
    header { background:linear-gradient(135deg,#1a73e8,#0d47a1); padding:40px; text-align:center; }
    header h1 { margin:0; font-size:42px; }
    header p { margin:8px 0 0; font-size:18px; color:#cbd5e1; }
    main { padding:40px; max-width:960px; margin:auto; }
    section { margin-bottom:60px; }
    h2 { border-left:6px solid #1a73e8; padding-left:10px; }
    ul { line-height:1.8; }
    footer { text-align:center; padding:20px; color:#9ca3af; font-size:14px; border-top:1px solid #1f2937; }
    code { background:#1e293b; padding:3px 6px; border-radius:4px; }
  </style>
</head>
<body>
  <header>
    <h1>${BRAND}</h1>
    <p>Secure • Optimal • Free</p>
  </header>
  <main>
    <section>
      <h2>About Us</h2>
      <p>Lazy Devs delivers premium Roblox utilities through the <b>No More Time Hub</b>.
      Our focus: seamless performance, professional design, and secure execution.</p>
    </section>
    <section>
      <h2>Scripts</h2>
      <ul>
        <li>Player Tools (Speed, Jump, Fly, Noclip, Infinite Jump)</li>
        <li>Map Tools (Teleport to Start/End)</li>
        <li>Protection (Shield, AntiVoid, Fling, Auto-Carry)</li>
      </ul>
      <p>Use our loader:</p>
      <code>loadstring(game:HttpGet("https://www.lazydevs.site/script.nmt?key=YOURKEY"))()</code>
    </section>
    <section>
      <h2>Terms of Service</h2>
      <p>By using Lazy Devs services, you agree not to redistribute, resell, or exploit our code outside
      its intended educational/utility purposes. Access may be revoked in case of abuse.</p>
    </section>
    <section>
      <h2>Privacy Policy</h2>
      <p>No personal data is collected. Anonymous logs may be used for monitoring and abuse prevention.</p>
    </section>
  </main>
  <footer>
    © ${new Date().getFullYear()} ${BRAND}. All rights reserved.
  </footer>
</body>
</html>`;
  res.status(200).send(html);
});

// ==== VANITY LINK ====
// Redirect to real key page
app.get("/sealife-just-do-it", (req, res) => {
  res.redirect("/getkey");
});

// ==== GET KEY PAGE ====
app.get("/getkey", (req, res) => {
  const keys = loadKeys();

  if (keys.length === 0) {
    return res.status(404).send(`
      <h1>No More Keys Available</h1>
      <p>Come back later or join our Discord.</p>
    `);
  }

  const randomKey = keys[Math.floor(Math.random() * keys.length)];

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Get Key | ${BRAND}</title>
    <style>
      body {
        background-color: #0f172a;
        color: #e2e8f0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        text-align: center;
      }
      h1 {
        font-size: 36px;
        margin-bottom: 20px;
        color: #38bdf8;
      }
      .key-box {
        background: #1e293b;
        padding: 20px 40px;
        border-radius: 12px;
        font-size: 18px;
        border: 1px solid #334155;
        word-break: break-all;
      }
      p {
        margin-top: 20px;
        color: #cbd5e1;
      }
    </style>
  </head>
  <body>
    <h1>Your Key</h1>
    <div class="key-box">${randomKey}</div>
    <p>Use this key in the loader to unlock your access.</p>
  </body>
  </html>
  `;

  res.status(200).send(html);
});

// ==== KEY VALIDATION ====
// public file
app.get("/public/keys.txt", (req, res) => {
  if (!fs.existsSync(KEYS_FILE)) return res.status(404).send("No keys file.");
  res.type("text/plain");
  res.sendFile(KEYS_FILE);
});

// ==== SCRIPT DELIVERY ====
// requires ?key= param
app.get("/script.nmt", (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(401).send("Missing key.");

  const keys = loadKeys();
  if (!keys.includes(key)) return res.status(403).send("Invalid key.");

  if (!fs.existsSync(SCRIPT_FILE)) return res.status(500).send("Script missing.");
  res.type("text/plain");
  return res.sendFile(SCRIPT_FILE);
});

// ==== ADMIN ENDPOINTS ====
// very basic, secure behind a static admin key
const ADMIN_KEY = process.env.ADMIN_KEY || "changeme123";

app.get("/admin/keys", (req, res) => {
  if (req.query.admin !== ADMIN_KEY) return res.status(403).send("Forbidden");
  res.json({ keys: loadKeys() });
});

app.post("/admin/keys/add", (req, res) => {
  if (req.query.admin !== ADMIN_KEY) return res.status(403).send("Forbidden");
  const { key } = req.body;
  if (!key) return res.status(400).send("Missing key.");
  const keys = loadKeys();
  if (keys.includes(key)) return res.status(400).send("Key already exists.");
  keys.push(key);
  saveKeys(keys);
  res.json({ message: "Key added", key });
});

app.post("/admin/keys/remove", (req, res) => {
  if (req.query.admin !== ADMIN_KEY) return res.status(403).send("Forbidden");
  const { key } = req.body;
  if (!key) return res.status(400).send("Missing key.");
  let keys = loadKeys();
  keys = keys.filter(k => k !== key);
  saveKeys(keys);
  res.json({ message: "Key removed", key });
});

// ==== BLOCK SECRET FOLDER ====
app.use("/secrets", (_req, res) => res.status(403).send("Access Denied"));

// ==== FALLBACK ====
app.use((_req, res) => res.status(404).send("Not Found"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server running on :${PORT}`);
});
