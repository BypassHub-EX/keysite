const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const BRAND = "Lazy Devs";
const SCRIPT_FILE = path.join(__dirname, "secrets", "nmt.scripts");
const KEYS_FILE = path.join(__dirname, "public", "keys.txt");

const oneTimeRoutes = new Map(); // /slug → key

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

function generateSlug() {
  return crypto.randomBytes(6).toString("hex") + "/" + crypto.randomBytes(4).toString("hex");
}

// ==== VANITY ENTRY POINT ====
app.get("/sealife-just-do-it", (req, res) => {
  const keys = loadKeys();
  if (keys.length === 0) return res.status(404).send("No keys available");

  const key = keys[Math.floor(Math.random() * keys.length)];
  const slug = generateSlug();

  oneTimeRoutes.set("/" + slug, key);

  res.redirect("/" + slug);
});

// ==== ONE-TIME-USE ROUTES ====
app.get("/:slug1/:slug2", (req, res) => {
  const routePath = `/${req.params.slug1}/${req.params.slug2}`;
  const key = oneTimeRoutes.get(routePath);

  if (!key) {
    return res.status(404).send(`
      <html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding-top:100px;">
      <h1>Page Expired</h1><p>This key link has already been used or does not exist.</p>
      </body></html>
    `);
  }

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Get Key | ${BRAND}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body {
        background-color: #0f172a;
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        text-align: center;
      }
      h1 { font-size: 32px; color: #38bdf8; }
      .key-box {
        background: #1e293b;
        padding: 20px 30px;
        margin-top: 20px;
        border-radius: 8px;
        font-size: 18px;
        user-select: all;
      }
      button {
        margin-top: 20px;
        padding: 10px 20px;
        font-size: 16px;
        background: #1a73e8;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      }
      button:hover { background: #0d47a1; }
    </style>
  </head>
  <body>
    <h1>Your Key</h1>
    <div class="key-box" id="key">${key}</div>
    <button onclick="copyKey()">Copy Key</button>

    <script>
      function copyKey() {
        const key = document.getElementById("key").textContent;
        navigator.clipboard.writeText(key).then(() => {
          fetch(window.location.pathname + "/invalidate", { method: "POST" }).then(() => {
            document.body.innerHTML = '<h1 style="color:#38bdf8;">Key Copied</h1><p>This page has now expired.</p>';
          });
        });
      }
    </script>
  </body>
  </html>
  `;

  res.status(200).send(html);
});

// ==== ONE-TIME PAGE INVALIDATION ====
app.post("/:slug1/:slug2/invalidate", (req, res) => {
  const routePath = `/${req.params.slug1}/${req.params.slug2}`;
  oneTimeRoutes.delete(routePath);
  res.status(200).send("Page invalidated");
});

// ==== SCRIPT DELIVERY ====
app.get("/script.nmt", (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(401).send("Missing key.");

  const keys = loadKeys();
  if (!keys.includes(key)) return res.status(403).send("Invalid key.");

  if (!fs.existsSync(SCRIPT_FILE)) return res.status(500).send("Script missing.");
  res.type("text/plain");
  return res.sendFile(SCRIPT_FILE);
});

// ==== ADMIN ====
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
