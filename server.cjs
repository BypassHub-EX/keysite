// server.cjs
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const BRAND = "Lazy Devs";
const SCRIPT_FILE = path.join(__dirname, "secrets", "nmt.scripts");

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
      <p>Lazy Devs is dedicated to delivering premium Roblox utilities through the <b>No More Time Hub</b>. 
      Our focus: seamless performance, professional design, and secure execution.</p>
    </section>
    <section>
      <h2>Scripts</h2>
      <ul>
        <li>Player Tools (Speed, Jump, Fly, Noclip)</li>
        <li>Map Tools (Teleport to Start/End)</li>
        <li>Protection (Godmode - Coming Soon)</li>
      </ul>
      <p>Use our loader:</p>
      <code>loadstring(game:HttpGet("https://www.lazydevs.site/script.nmt"))()</code>
    </section>
    <section>
      <h2>Terms of Service</h2>
      <p>By using Lazy Devs services, you agree not to redistribute, resell, or exploit our code outside
      its intended educational/utility purposes. We may suspend access at any time if misuse is detected.</p>
    </section>
    <section>
      <h2>Privacy Policy</h2>
      <p>We do not collect personal data. Basic anonymous logs may be used for performance monitoring 
      and abuse prevention. No sensitive or identifying data is stored.</p>
    </section>
  </main>
  <footer>
    © ${new Date().getFullYear()} ${BRAND}. All rights reserved.
  </footer>
</body>
</html>`;
  res.status(200).send(html);
});

// ==== SCRIPT DELIVERY ====
// always serve obfuscated hub script, no key
app.get("/script.nmt", (req, res) => {
  if (!fs.existsSync(SCRIPT_FILE)) {
    return res.status(500).send("Script missing.");
  }
  res.type("text/plain");
  return res.sendFile(SCRIPT_FILE);
});

// ==== BLOCK FOLDER ACCESS ====
app.use("/secrets", (_req, res) => res.status(403).send("Access Denied"));

// ==== FALLBACK ====
app.use((_req, res) => res.status(404).send("Not Found"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server running on :${PORT}`);
});
