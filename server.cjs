// ======================================================
// Lazy Devs Server | Keys + Scripts + Polls
// ======================================================

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const SCRIPT_FILE_PROTECTED = path.join(__dirname, "secrets", "nmt.scripts");
const SCRIPT_FILE_PUBLIC = path.join(__dirname, "public", "nmt.script");
const KEYS_FILE = path.join(__dirname, "public", "keys.txt");
const BINDINGS_FILE = path.join(__dirname, "keyBindings.json");
const POLL_FILE = path.join(__dirname, "pollVotes.json");
const WEBHOOK_URL = "https://discord.com/api/webhooks/1412375650811252747/DaLBISW_StaxXagr6uNooBW6CQfCaY8NgsOb13AMaqGkpRBVzYumol657iGuj0k5SRTo";

// External Forsaken script URL
const FORSAKEN_SCRIPT_URL = "https://api.junkie-development.de/api/v1/luascripts/public/878fc52448af874b46df0f3e2005822da975ffe7306cf77e090c61ee64bb755f/download";

const oneTimeRoutes = new Map();
const bindings = fs.existsSync(BINDINGS_FILE)
  ? JSON.parse(fs.readFileSync(BINDINGS_FILE))
  : {};

// ==== HELPERS ====
function saveBindings() {
  fs.writeFileSync(BINDINGS_FILE, JSON.stringify(bindings, null, 2));
}

function loadKeys() {
  if (!fs.existsSync(KEYS_FILE)) return [];
  return fs.readFileSync(KEYS_FILE, "utf8")
    .split(/\r?\n/)
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

function generateSlug() {
  return crypto.randomBytes(6).toString("hex") + "/" + crypto.randomBytes(4).toString("hex");
}

function sendWebhookLog(message) {
  fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message })
  }).catch(console.error);
}

// ======================================================
// FREE UNIVERSAL KEY (DISABLED)
// ======================================================
app.get("/freekey", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Free Keys Disabled</title></head>
    <body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding-top:120px;">
      <h1 style="color:#f87171;">Free Keys Disabled</h1>
      <p>The free key period has ended. Please obtain a valid key from the main key system.</p>
    </body>
    </html>
  `);
});

// ======================================================
// STAFF PREMIUM KEY PAGE
// ======================================================
app.get("/jshsu28182jsjsxssxk", (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const key = "LAZY-STAFF-PREM-IUM-14";
  const timestamp = new Date().toISOString();

  sendWebhookLog(
    `Staff Key Accessed\nKey: ${key}\nIP: ${ip}\nTime: ${timestamp}`
  );

  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Lazy Devs Staff Key</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        height: 100vh;
        background: linear-gradient(135deg,#0f172a,#1e293b);
        display: flex;
        justify-content: center;
        align-items: center;
        color: #e2e8f0;
      }
      .glass {
        background: rgba(30, 41, 59, 0.7);
        border-radius: 12px;
        padding: 40px;
        backdrop-filter: blur(12px);
        text-align: center;
        box-shadow: 0 4px 30px rgba(0,0,0,0.5);
        max-width: 420px;
      }
      h1 { color: #38bdf8; margin-bottom: 10px; }
      h2 { color: #facc15; margin-bottom: 20px; font-size: 18px; }
      .key-box {
        background: #1e293b;
        padding: 15px;
        margin-top: 15px;
        border-radius: 8px;
        font-size: 20px;
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
    </style>
  </head>
  <body>
    <div class="glass">
      <h1>Staff Premium Key</h1>
      <h2>(Authorized Staff Only)</h2>
      <div class="key-box" id="key">${key}</div>
      <button onclick="copyKey()">Copy Key</button>
    </div>
    <script>
      function copyKey() {
        const key = document.getElementById("key").textContent;
        navigator.clipboard.writeText(key).then(() => {
          alert("Key copied: " + key);
        });
      }
    </script>
  </body>
  </html>
  `);
});

// ======================================================
// NORMAL KEY SYSTEM
// ======================================================
app.get("/sealife-just-do-it", (_req, res) => {
  res.send(`
    <html><head><title>Verify Discord</title></head>
    <body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding-top:100px;">
      <h1>Enter Your Discord ID</h1>
      <form method="POST" action="/verify-discord">
        <input type="text" name="discordId" placeholder="e.g. 105483920..." required
         style="padding:10px;font-size:16px;width:300px;border-radius:6px;border:1px solid #555;" />
        <br><br>
        <button type="submit"
         style="padding:10px 20px;font-size:16px;background:#1a73e8;color:white;border:none;border-radius:6px;">Continue</button>
      </form>
    </body>
    </html>
  `);
});

app.post("/verify-discord", async (req, res) => {
  const discordId = req.body.discordId;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (!discordId) return res.status(400).send("Missing Discord ID");

  for (const data of Object.values(bindings)) {
    if (data.ip === ip) {
      return res.status(403).send(`<h1>One Key Per IP</h1><p>You already claimed a key.</p>`);
    }
  }

  const keys = loadKeys();
  if (keys.length === 0) return res.status(404).send("No keys available.");

  const key = keys[Math.floor(Math.random() * keys.length)];
  bindings[key] = { ip, discord: discordId };
  saveBindings();

  const slug = generateSlug();
  oneTimeRoutes.set("/" + slug, key);

  sendWebhookLog(`New Key for <@${discordId}>\nKey: ${key}\nIP: ${ip}`);

  return res.redirect("/" + slug);
});

app.get("/:slug1/:slug2", (req, res) => {
  const route = `/${req.params.slug1}/${req.params.slug2}`;
  const key = oneTimeRoutes.get(route);
  if (!key) return res.status(404).send(`<h1>Page Expired</h1>`);

  res.send(`
  <html><head><title>Your Key</title></head>
  <body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding-top:80px;">
    <h1 style="color:#38bdf8;">Your Key</h1>
    <div style="background:#1e293b;padding:20px 30px;margin-top:20px;border-radius:8px;font-size:18px;user-select:all;">${key}</div>
    <button onclick="copyKey()">Copy Key</button>
    <script>
      function copyKey() {
        const key = document.querySelector("div").textContent;
        navigator.clipboard.writeText(key).then(() => {
          fetch(window.location.pathname + "/invalidate", { method: "POST" }).then(() => {
            document.body.innerHTML = '<h1>Key Copied</h1><p>This page has now expired.</p>';
          });
        });
      }
    </script>
  </body></html>
  `);
});

app.post("/:slug1/:slug2/invalidate", (req, res) => {
  const route = `/${req.params.slug1}/${req.params.slug2}`;
  oneTimeRoutes.delete(route);
  res.status(200).send("Invalidated");
});

// ======================================================
// SCRIPT ROUTES
// ======================================================
app.get("/script.nmt", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_PROTECTED)) return res.status(500).send("Script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_PROTECTED);
});

app.get("/nmt.script", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_PUBLIC)) return res.status(500).send("Script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_PUBLIC);
});

// NEW: Forsaken Script route (redirects to external Lua)
app.get("/forsaken.script", (_req, res) => {
  res.redirect(FORSAKEN_SCRIPT_URL);
});

// Public keys.txt and other public files
app.use("/public", express.static(path.join(__dirname, "public")));

// ======================================================
// POLL SYSTEM
// ======================================================
app.get("/poll", (_req, res) => {
  res.send(`<h1>Poll system coming soon...</h1>`);
});

// ======================================================
// BLOCK SECRETS
// ======================================================
app.use("/secrets", (_req, res) => res.status(403).send("Access Denied"));

// ======================================================
// START SERVER
// ======================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
