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
const SCRIPT_FILE_PROTECTED = path.join(__dirname, "secrets", "nmt.scripts");
const SCRIPT_FILE_PUBLIC = path.join(__dirname, "public", "nmt.script");
const SCRIPT_FILE_FORSAKEN = path.join(__dirname, "public", "fsk.script");
const KEYS_FILE = path.join(__dirname, "public", "keys.txt");
const BINDINGS_FILE = path.join(__dirname, "keyBindings.json");
const POLL_FILE = path.join(__dirname, "pollVotes.json");

const WEBHOOK_URL = "https://discord.com/api/webhooks/1431392663122481223/Y7aF9agrgmROli4e1Uz1LSYr-9EfUn5ikaiSjmmmXq4MOiUvV2FVkdbKIJFFyXdUTtIF";

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
app.get("/script.nmt", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_PROTECTED))
    return res.status(500).send("Script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_PROTECTED);
});

app.get("/nmt.script", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_PUBLIC))
    return res.status(500).send("Script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_PUBLIC);
});

app.get("/forsaken.script", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_FORSAKEN))
    return res.status(500).send("Forsaken script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_FORSAKEN);
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
          "**Effective as of October 2025**\n\nThis server is a private hub for advanced scripting discussions, tool previews, and automation logic — not a place to promote or glamorize exploits. All members are expected to follow these terms strictly.",
        color: 0xff0000,
        fields: [
          {
            name: "1. Purpose",
            value:
              "**This is a scripting-focused server.**\nWe do not promote exploiting. Tools shared here are for educational, testing, and automation purposes only.\n\nAny abuse of these tools is entirely the user’s responsibility.",
          },
          {
            name: "2. Behavior",
            value:
              "• Stay respectful and mature at all times.\n• No spam, hate speech, slurs, or harassment.\n• No impersonation of developers or staff.\n• Stay on topic in channels.",
          },
          {
            name: "3. Script Access",
            value:
              "• Most scripts require keys — nothing is truly keyless.\n• Keys are not to be shared, resold, or bypassed.\n• Violating this results in blacklist or permanent ban.\n• All scripts are provided 'as-is' — we are not responsible for account bans.",
          },
          {
            name: "4. Legal Notice",
            value:
              "• Don’t share malicious code, viruses, stealers, or crashers.\n• Anything violating Roblox or Discord’s TOS will be removed.\n• This server disclaims all liability for what users do with scripts.",
          },
          {
            name: "5. Ownership",
            value:
              "• Don’t repost, resell, or steal code that isn’t yours.\n• Credit all creators when using or editing tools.\n• Proven theft = blacklist.",
          },
          {
            name: "6. Privacy",
            value:
              "• We do not collect personal data beyond basic whitelisting (e.g., HWID, IP).\n• Do not post your login info, tokens, or files publicly.\n• Asking others for personal access = ban.",
          },
          {
            name: "7. Moderation",
            value:
              "• Mods may remove content or users without warning.\n• All bans are final unless appealed with proof.\n• Circumventing bans results in full blacklist.",
          },
          {
            name: "8. Reporting",
            value:
              "• If you find bugs, loopholes, or broken rules — report them.\n• We appreciate honest feedback and fix reports.\n• We update the rules regularly.",
          },
          {
            name: "9. Final Note",
            value:
              "**By being in this server, using our tools, or accessing any content — you agree to all of the above.**\nThis is a private scripting hub, not a public exploit warehouse.\nDon’t test us.",
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
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Forsaken Premium Pricing</title>
      <style>
        body { margin: 0; font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; text-align: center; }
        h1 { font-size: 2.4rem; color: #38bdf8; margin-top: 60px; }
        p.sub { font-size: 1.1rem; margin-bottom: 50px; color: #94a3b8; }
        .pricing-cards { display: flex; justify-content: center; flex-wrap: wrap; gap: 30px; margin: 0 auto; max-width: 900px; }
        .card { background: #1e293b; border-radius: 12px; padding: 40px 30px; width: 320px; box-shadow: 0 6px 18px rgba(0,0,0,0.4); transition: transform 0.2s ease; }
        .card:hover { transform: translateY(-5px); }
        .card h3 { font-size: 1.5rem; margin-bottom: 15px; }
        .card .price { font-size: 2rem; font-weight: 700; color: #facc15; margin-bottom: 15px; }
        .card .price span { font-size: 1rem; color: #94a3b8; }
        .card .desc { font-size: 0.95rem; color: #cbd5e1; margin-bottom: 25px; }
        .btn { display: block; margin: 8px 0; padding: 12px 20px; border-radius: 8px; font-size: 1rem; text-decoration: none; font-weight: 600; }
        .btn-primary { background: #38bdf8; color: #0f172a; }
        .btn-secondary { background: transparent; border: 2px solid #38bdf8; color: #e2e8f0; }
      </style>
    </head>
    <body>
      <h1>Forsaken Premium</h1>
      <p class="sub">This plan is for <strong>one script only</strong>. All payments (card/PayPal) are securely processed by Ko-fi.</p>
      <div class="pricing-cards">
        <div class="card">
          <h3>Weekly Access</h3>
          <p class="price">$2.50 <span>/ week</span></p>
          <p class="desc">Full premium access with updates included.</p>
          <a href="https://ko-fi.com/oilmoney01" class="btn btn-primary">Buy with Ko-fi</a>
        </div>
        <div class="card">
          <h3>Monthly Access</h3>
          <p class="price">$7.00 <span>/ month</span></p>
          <p class="desc">Best value — premium access for a full month.</p>
          <a href="https://ko-fi.com/oilmoney01" class="btn btn-primary">Buy with Ko-fi</a>
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

// ✅ NEW: LazyCat Invite Redirect
app.get("/invite-lazycat", (_req, res) => {
  res.redirect("https://discord.com/oauth2/authorize?client_id=1433948727118135336&permissions=8&scope=bot%20applications.commands");
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
  console.log("Lazy Devs Server running on port " + PORT);
});
