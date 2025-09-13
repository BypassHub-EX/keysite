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
const SCRIPT_FILE_FORSAKEN = path.join(__dirname, "public", "fsk.script"); // NEW
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
// ... [UNCHANGED CODE ABOVE]
// ======================================================

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

// NEW: Forsaken Script route
app.get("/forsaken.script", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE_FORSAKEN)) return res.status(500).send("Forsaken script not found.");
  res.type("text/plain").sendFile(SCRIPT_FILE_FORSAKEN);
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
