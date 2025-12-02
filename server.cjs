// ======================================================
// Lazy Devs Server | Keys + Scripts + Polls + Pricing + Redirects
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

// Scripts
const SCRIPT_FILE_PROTECTED = path.join(__dirname, "secrets", "nmt.scripts");
const SCRIPT_FILE_PUBLIC = path.join(__dirname, "public", "nmt.script");
const SCRIPT_FILE_FORSAKEN = path.join(__dirname, "public", "fsk.script");
const SCRIPT_FILE_FISH = path.join(__dirname, "public", "project-fish.script"); // PROJECT-FISH & FOREST

// Keys + Poll
const KEYS_FILE = path.join(__dirname, "public", "keys.txt");
const BINDINGS_FILE = path.join(__dirname, "keyBindings.json");
const POLL_FILE = path.join(__dirname, "pollVotes.json");

// Webhook
const WEBHOOK_URL =
  "https://discord.com/api/webhooks/1431392663122481223/Y7aF9agrgmROli4e1Uz1LSYr-9EfUn5ikaiSjmmmXq4MOiUvV2FVkdbKIJFFyXdUTtIF";

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
  return fs
    .readFileSync(KEYS_FILE, "utf8")
    .split(/\r?\n/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function generateSlug() {
  return (
    crypto.randomBytes(6).toString("hex") +
    "/" +
    crypto.randomBytes(4).toString("hex")
  );
}

function sendWebhookLog(payload) {
  fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(console.error);
}

// ======================================================
// SCRIPT ROUTES
// ======================================================

// Protected NMT
app.get("/script.nmt", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_PROTECTED))
    return res.status(500).send("Script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_PROTECTED);
});

// Public NMT
app.get("/nmt.script", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_PUBLIC))
    return res.status(500).send("Script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_PUBLIC);
});

// Forsaken
app.get("/forsaken.script", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_FORSAKEN))
    return res.status(500).send("Forsaken script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_FORSAKEN);
});

// PROJECT FISH (MAIN)
app.get("/project-fish.script", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_FISH))
    return res.status(500).send("Project Fish script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_FISH);
});

// PROJECT FOREST (USES SAME FILE AS PROJECT FISH)
app.get("/project-forest.script", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_FISH))
    return res.status(500).send("Project Forest script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_FISH);
});

// ======================================================
// SEND RULES TO WEBHOOK (/send-rules)
// ======================================================
app.get("/send-rules", (req, res) => {
  const embedPayload = {
    embeds: [
      {
        title: "Lazy Devs - Rules & Terms",
        description:
          "**Effective as of October 2025**\nThis server is a private hub for advanced scripting discussions and automation logic.",
        color: 0xff0000,
        fields: [
          {
            name: "1. Purpose",
            value:
              "**This is a scripting-focused server.** Tools here are for educational/testing use only.",
          },
          {
            name: "2. Behavior",
            value:
              "• No spam or harassment.\n• Stay respectful.\n• Keep channels clean.",
          },
          {
            name: "3. Script Access",
            value:
              "• Keys required.\n• No sharing/reselling.\n• Violations = blacklist.",
          },
          {
            name: "4. Legal Notice",
            value:
              "• No malicious code.\n• No stealers, crashers, or illegal tools.",
          },
          {
            name: "5. Ownership",
            value: "• Do NOT steal or repost code.\n• Theft = permanent ban.",
          },
          {
            name: "6. Privacy",
            value:
              "• Only whitelist data is collected.\n• Never post credentials.",
          },
          {
            name: "7. Moderation",
            value:
              "• Mods may remove anything.\n• Evading bans = permanent blacklist.",
          },
          {
            name: "8. Reporting",
            value: "• Report bugs or rule breaks.\n• Feedback is appreciated.",
          },
          {
            name: "9. Final Note",
            value:
              "**Using our tools = accepting these rules.**",
          },
        ],
        footer: { text: "www.lazydevs.site" },
      },
    ],
  };

  sendWebhookLog(embedPayload);
  res.send("Rules embed sent to Discord webhook.");
});

// ======================================================
// PRICING PAGE
// ======================================================
app.get("/pricing", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Forsaken Premium Pricing</title>
      <style>
        body { margin: 0; background:#0f172a; color:#e2e8f0; text-align:center; font-family:Arial; }
        h1 { color:#38bdf8; font-size:2.4rem; margin-top:60px; }
        .pricing-cards { display:flex; justify-content:center; gap:30px; margin-top:50px; }
        .card { width:300px; padding:40px 30px; background:#1e293b; border-radius:12px; }
        .price { font-size:2rem; color:#facc15; margin:15px 0; }
      </style>
    </head>
    <body>
      <h1>Forsaken Premium</h1>

      <div class="pricing-cards">
        <div class="card">
          <h3>Weekly Access</h3>
          <p class="price">$2.50</p>
          <a href="https://ko-fi.com/oilmoney01">Buy Weekly</a>
        </div>

        <div class="card">
          <h3>Monthly Access</h3>
          <p class="price">$7.00</p>
          <a href="https://ko-fi.com/oilmoney01">Buy Monthly</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ======================================================
// REDIRECTS
// ======================================================
app.get("/buy-premium", (_req, res) => res.redirect("/pricing"));

app.get("/invite-lazycat", (_req, res) =>
  res.redirect(
    "https://discord.com/oauth2/authorize?client_id=1433948727118135336&permissions=8&scope=bot%20applications.commands"
  )
);

// ======================================================
// POLL SYSTEM
// ======================================================
app.get("/poll", (_req, res) => {
  res.send("<h1>Poll system coming soon...</h1>");
});

// ======================================================
// BLOCK /secrets
// ======================================================
app.use("/secrets", (_req, res) => res.status(403).send("Access Denied"));

// ======================================================
// START SERVER (RAILWAY SAFE)
// ======================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log("Lazy Devs Server running on port " + PORT)
);
