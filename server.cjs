const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const fetch = require("node-fetch"); // v2.6.7 compatible

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const SCRIPT_FILE = path.join(__dirname, "secrets", "nmt.scripts");
const KEYS_FILE = path.join(__dirname, "public", "keys.txt");
const BINDINGS_FILE = path.join(__dirname, "keyBindings.json");
const WEBHOOK_URL = "https://discord.com/api/webhooks/1412375650811252747/DaLBISW_StaxXagr6uNooBW6CQfCaY8NgsOb13AMaqGkpRBVzYumol657iGuj0k5SRTo";

const oneTimeRoutes = new Map(); // slug => key
const bindings = fs.existsSync(BINDINGS_FILE)
  ? JSON.parse(fs.readFileSync(BINDINGS_FILE))
  : {};

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

// ==== GET: Show Discord ID Form ====
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

// ==== POST: Verify Discord ID + Assign Key ====
app.post("/verify-discord", async (req, res) => {
  const discordId = req.body.discordId;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (!discordId) return res.status(400).send("Missing Discord ID");

  // Prevent multiple keys from same IP
  for (const data of Object.values(bindings)) {
    if (data.ip === ip) {
      return res.status(403).send(`
        <html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding-top:100px;">
        <h1>One Key Per IP</h1><p>You already claimed a key.</p>
        </body></html>
      `);
    }
  }

  const keys = loadKeys();
  if (keys.length === 0) return res.status(404).send("No keys available.");

  const key = keys[Math.floor(Math.random() * keys.length)];
  bindings[key] = { ip, discord: discordId };
  saveBindings();

  const slug = generateSlug();
  oneTimeRoutes.set("/" + slug, key);

  sendWebhookLog(`🎟️ New Key for <@${discordId}>\n🔑 Key: \`${key}\`\n🌐 IP: \`${ip}\``);

  return res.redirect("/" + slug);
});

// ==== GET: One-Time Key Page ====
app.get("/:slug1/:slug2", (req, res) => {
  const route = `/${req.params.slug1}/${req.params.slug2}`;
  const key = oneTimeRoutes.get(route);
  if (!key) {
    return res.status(404).send(`
      <html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding-top:100px;">
      <h1>Page Expired</h1><p>This key page has been used or is invalid.</p>
      </body></html>
    `);
  }

  const html = `
  <!DOCTYPE html><html lang="en">
  <head>
    <meta charset="UTF-8"><title>Your Key</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body { background:#0f172a; color:#e2e8f0; font-family:sans-serif; text-align:center; padding-top:80px; }
      h1 { color:#38bdf8; }
      .key-box { background:#1e293b; padding:20px 30px; margin-top:20px; border-radius:8px; font-size:18px; user-select:all; }
      button { margin-top:20px; padding:10px 20px; font-size:16px; background:#1a73e8; color:white; border:none; border-radius:6px; cursor:pointer; }
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
            document.body.innerHTML = '<h1>Key Copied</h1><p>This page has now expired.</p>';
          });
        });
      }
    </script>
  </body>
  </html>
  `;
  res.status(200).send(html);
});

// ==== POST: Invalidate Page ====
app.post("/:slug1/:slug2/invalidate", (req, res) => {
  const route = `/${req.params.slug1}/${req.params.slug2}`;
  oneTimeRoutes.delete(route);
  res.status(200).send("Invalidated");
});

// ==== GET: PUBLIC Script Loader ====
app.get("/script.nmt", (_req, res) => {
  if (!fs.existsSync(SCRIPT_FILE)) return res.status(500).send("Script missing.");
  res.type("text/plain");
  return res.sendFile(SCRIPT_FILE);
});

// ==== BLOCK SECRET FOLDER ====
app.use("/secrets", (_req, res) => res.status(403).send("Access Denied"));

// ==== FALLBACK ====
app.use((_req, res) => res.status(404).send("Not Found"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
