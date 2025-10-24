// ======================================================
// Lazy Devs Server | Keys + Scripts + Polls + Pricing + Rules
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

const RULES_WEBHOOK = "https://discord.com/api/webhooks/1431392663122481223/Y7aF9agrgmROli4e1Uz1LSYr-9EfUn5ikaiSjmmmXq4MOiUvV2FVkdbKIJFFyXdUTtIF";

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
  fetch(RULES_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message })
  }).catch(console.error);
}

function sendRulesEmbed() {
  const rules = `
# Lazy Devs - Rules & Terms  
**Effective as of October 2025**  
This server is a private hub for advanced scripting discussions, tool previews, and automation logic — not a place to promote or glamorize exploits. All members are expected to follow these terms strictly.

———————————————————————————————————————————————————————

# 1. Purpose  
**This is a scripting-focused server.**  
We do not promote exploiting. Tools shared here are for educational, testing, and automation purposes only.  
-# Any abuse of these tools is entirely the user’s responsibility.

———————————————————————————————————————————————————————

# 2. Behavior  
* Stay respectful and mature at all times.  
* No spam, hate speech, slurs, or harassment.  
* No impersonation of developers or staff.  
* Stay on topic in channels.

———————————————————————————————————————————————————————

# 3. Script Access  
* Most scripts require keys — nothing is truly keyless.  
* Keys are not to be shared, resold, or bypassed.  
* Violating this results in blacklist or permanent ban.  
* All scripts are provided "as-is" — we are not responsible for account bans.

———————————————————————————————————————————————————————

# 4. Legal Notice  
* Don’t share malicious code, viruses, stealers, or crashers.  
* Anything violating Roblox or Discord’s TOS will be removed.  
* This server disclaims all liability for what users do with scripts.

———————————————————————————————————————————————————————

# 5. Ownership  
* Don’t repost, resell, or steal code that isn’t yours.  
* Credit all creators when using or editing tools.  
* Proven theft = blacklist.

———————————————————————————————————————————————————————

# 6. Privacy  
* We do not collect personal data beyond basic whitelisting (e.g., HWID, IP).  
* Do not post your login info, tokens, or files publicly.  
* Asking others for personal access = ban.

———————————————————————————————————————————————————————

# 7. Moderation  
* Mods may remove content or users without warning.  
* All bans are final unless appealed with proof.  
* Circumventing bans results in full blacklist.

———————————————————————————————————————————————————————

# 8. Reporting  
* If you find bugs, loopholes, or broken rules — report them.  
* We appreciate honest feedback and fix reports.  
* We update the rules regularly.

———————————————————————————————————————————————————————

# 9. Final Note  
**By being in this server, using our tools, or accessing any content — you agree to all of the above.**  
This is a private scripting hub, not a public exploit warehouse.  
Don’t test us.
`;

  sendWebhookLog(rules);
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

// Public files
app.use("/public", express.static(path.join(__dirname, "public")));

// ======================================================
// PRICING PAGE
// ======================================================
app.get("/pricing", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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
  console.log("Server running on port " + PORT);
  sendRulesEmbed();
});
