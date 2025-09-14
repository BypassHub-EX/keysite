// ======================================================
// Lazy Devs Server | Keys + Scripts + Polls + Pricing
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
const SCRIPT_FILE_FORSAKEN = path.join(__dirname, "public", "fsk.script");
const KEYS_FILE = path.join(__dirname, "public", "keys.txt");
const BINDINGS_FILE = path.join(__dirname, "keyBindings.json");
const POLL_FILE = path.join(__dirname, "pollVotes.json");
const WEBHOOK_URL = "https://discord.com/api/webhooks/1412375650811252747/DaLBISW_StaxXagr6uNooBW6CQfCaY8NgsOb13AMaqGkpRBVzYumol657iGuj0k5SRTo";

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

app.get("/forsaken.script", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_FORSAKEN)) return res.status(500).send("Forsaken script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_FORSAKEN);
});

// Public keys.txt and other public files
app.use("/public", express.static(path.join(__dirname, "public")));

// ======================================================
// PRICING PAGE
// ======================================================
app.get("/pricing", (_req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Forsaken Premium Pricing</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        text-align: center;
      }
      h1 {
        font-size: 2.4rem;
        color: #38bdf8;
        margin-top: 60px;
      }
      p.sub {
        font-size: 1.1rem;
        margin-bottom: 50px;
        color: #94a3b8;
      }
      .pricing-cards {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 30px;
        margin: 0 auto;
        max-width: 900px;
      }
      .card {
        background: #1e293b;
        border-radius: 12px;
        padding: 40px 30px;
        width: 300px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.4);
        transition: transform 0.2s ease;
      }
      .card:hover { transform: translateY(-5px); }
      .card h3 { font-size: 1.5rem; margin-bottom: 15px; }
      .card .price {
        font-size: 2rem;
        font-weight: 700;
        color: #facc15;
        margin-bottom: 15px;
      }
      .card .price span { font-size: 1rem; color: #94a3b8; }
      .card .desc { font-size: 0.95rem; color: #cbd5e1; margin-bottom: 25px; }
      .btn {
        display: block;
        margin: 8px 0;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 1rem;
        text-decoration: none;
        font-weight: 600;
      }
      .btn-primary {
        background: #38bdf8;
        color: #0f172a;
      }
      .btn-secondary {
        background: transparent;
        border: 2px solid #38bdf8;
        color: #e2e8f0;
      }
    </style>
  </head>
  <body>
    <h1>Forsaken Premium</h1>
    <p class="sub">Choose your plan and unlock Forsaken instantly.</p>
    <div class="pricing-cards">
      <!-- Weekly -->
      <div class="card">
        <h3>Weekly Access</h3>
        <p class="price">$2.50 <span>/ week</span></p>
        <p class="desc">Full premium access with updates included.</p>
        <a href="https://ko-fi.com/yourpage" class="btn btn-primary">Buy with Ko-fi</a>
        <a href="https://paypal.me/yourpage" class="btn btn-secondary">Buy with PayPal</a>
      </div>

      <!-- Monthly -->
      <div class="card">
        <h3>Monthly Access</h3>
        <p class="price">$7.00 <span>/ month</span></p>
        <p class="desc">Best value — premium access for a full month.</p>
        <a href="https://ko-fi.com/yourpage" class="btn btn-primary">Buy with Ko-fi</a>
        <a href="https://paypal.me/yourpage" class="btn btn-secondary">Buy with PayPal</a>
      </div>
    </div>
  </body>
  </html>
  `);
});

// ======================================================
// REDIRECTS
// ======================================================
app.get("/buy-premium", (_req, res) => {
  res.redirect("/pricing");
});

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
  console.log(\`Server running on port \${PORT}\`);
});
