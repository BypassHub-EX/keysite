// ======================================================
// Lazy Devs Server | Keys + Polls + Scripts + FreeKey
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
const WEBHOOK_URL = "YOUR_DISCORD_WEBHOOK_HERE"; // replace

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
// FREE KEY (valid this week only)
// ======================================================
app.get("/freekey", (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const freeKey = "LAZYDEVS-FREEKEY-2025"; // one shared key for all

  bindings[freeKey] = { ip, discord: "FreeKeyUser" };
  saveBindings();

  sendWebhookLog(`🆓 Free Key issued\n🔑 ${freeKey}\n🌐 ${ip}`);

  res.send(`
    <html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding-top:100px;">
      <h1>Your Free Key</h1>
      <p>This universal key is active for this week only.</p>
      <div style="background:#1e293b;padding:15px;border-radius:6px;font-size:20px;">${freeKey}</div>
      <br>
      <p><b>Note:</b> This route will be disabled and <code>keys.txt</code> updated next week.</p>
    </body></html>
  `);
});

// ======================================================
// KEY SYSTEM
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
    </body></html>
  `);
});

app.post("/verify-discord", async (req, res) => {
  const discordId = req.body.discordId;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (!discordId) return res.status(400).send("Missing Discord ID");

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

  sendWebhookLog(`🎟️ New Key for <@${discordId}>\n🔑 ${key}\n🌐 ${ip}`);
  return res.redirect("/" + slug);
});

app.get("/:slug1/:slug2", (req, res) => {
  const route = `/${req.params.slug1}/${req.params.slug2}`;
  const key = oneTimeRoutes.get(route);
  if (!key) {
    return res.status(404).send("Page Expired");
  }
  res.send(`
  <html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding-top:80px;">
    <h1>Your Key</h1>
    <div style="background:#1e293b;padding:20px;border-radius:6px;font-size:18px;user-select:all;">${key}</div>
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
  </body></html>`);
});
app.post("/:slug1/:slug2/invalidate", (req, res) => {
  oneTimeRoutes.delete(`/${req.params.slug1}/${req.params.slug2}`);
  res.send("Invalidated");
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
app.use("/public", express.static(path.join(__dirname, "public")));

// ======================================================
// POLL SYSTEM
// ======================================================
app.get("/poll", (_req, res) => {
  res.send(`
  <html><head><title>Lazy Devs Poll</title></head>
  <body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding-top:60px;">
    <h1>Vote for the Next PvP Game Script</h1>
    <form method="POST" action="/vote">
      <label>Roblox Username:</label><br>
      <input type="text" name="robloxUser" required style="padding:6px;width:260px;"><br><br>
      <label>Discord ID:</label><br>
      <input type="text" name="discordUser" required style="padding:6px;width:260px;"><br><br>
      <label>Pick a Game:</label><br>
      <select name="vote" style="padding:6px;width:260px;">
        <option value="BedWars">BedWars</option>
        <option value="Arsenal">Arsenal</option>
        <option value="Murder Mystery 2">Murder Mystery 2</option>
        <option value="Tower Battles">Tower Battles</option>
        <option value="Phantom Forces">Phantom Forces</option>
      </select>
      <br><br>
      <label>Or Custom Option:</label><br>
      <input type="text" name="customVote" style="padding:6px;width:260px;"><br><br>
      <button type="submit" style="padding:10px 20px;background:#1a73e8;color:#fff;border:none;border-radius:6px;">Vote</button>
    </form>
  </body></html>
  `);
});

app.post("/vote", (req, res) => {
  const { robloxUser, discordUser, vote, customVote } = req.body;
  const finalVote = customVote && customVote.trim() !== "" ? customVote.trim() : vote;

  if (!robloxUser || !discordUser || !finalVote) return res.status(400).send("Missing fields.");

  const votes = fs.existsSync(POLL_FILE)
    ? JSON.parse(fs.readFileSync(POLL_FILE))
    : {};

  if (votes[robloxUser]) return res.status(403).send("You already voted.");

  votes[robloxUser] = { discordUser, vote: finalVote };
  fs.writeFileSync(POLL_FILE, JSON.stringify(votes, null, 2));

  const counts = {};
  for (const r of Object.values(votes)) counts[r.vote] = (counts[r.vote] || 0) + 1;

  let tally = Object.entries(counts).map(([opt, count]) => `${opt} (${count} votes)`).join("\n");

  const msg = `Poll Vote\n\nRoblox User: ${robloxUser}\nDiscord User: <@${discordUser}>\nVote For: ${finalVote}\n\nCurrent Votes:\n${tally}`;
  fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msg }) }).catch(console.error);

  res.send(`<h1>Thanks for voting!</h1><p>You voted for: ${finalVote}</p>`);
});

// ======================================================
// BLOCK SECRETS
// ======================================================
app.use("/secrets", (_req, res) => res.status(403).send("Access Denied"));

// Fallback
app.use((_req, res) => res.status(404).send("Not Found"));

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
