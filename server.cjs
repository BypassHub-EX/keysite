// server.js
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== CONFIG ====
const BRAND = "Lazy Devs";
const SCRIPT_FILE = path.join(__dirname, "secrets", "nmt.scripts");

// ==== SCRIPT DELIVERY ====
// Endpoint: https://yourdomain.com/script.nmt
app.get("/script.nmt", (req, res) => {
  const ua = req.headers["user-agent"] || "";

  // Block common browsers
  if (/mozilla|chrome|safari|firefox|edge/i.test(ua)) {
    return res.status(403).send("Access Denied (browser not allowed)");
  }

  if (!fs.existsSync(SCRIPT_FILE)) {
    return res.status(500).send("Script missing.");
  }

  res.type("text/plain");
  return res.sendFile(SCRIPT_FILE);
});

// ==== BLOCK DIRECT ACCESS TO /secrets ====
app.use("/secrets", (_req, res) => res.status(403).send("Access Denied"));

// ==== NICE HOMEPAGE ====
app.get("/", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${BRAND} | Home</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{margin:0;background:#0b0e12;color:#e7edf5;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial;display:flex;align-items:center;justify-content:center;height:100vh}
    .card{background:#12161d;padding:40px;border-radius:16px;border:1px solid #212833;max-width:600px;width:100%;text-align:center;box-shadow:0 6px 28px rgba(0,0,0,.45)}
    h1{margin:0;font-size:32px;color:#4da3ff}
    p{margin:14px 0;color:#9fb0c6;font-size:15px}
    .brand{margin-top:20px;color:#9fb0c6;font-size:13px}
    a{color:#4da3ff;text-decoration:none;font-weight:bold}
    a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to ${BRAND}</h1>
    <p>This is the official key delivery & script service.</p>
    <p>If you’re here by accident, nothing to see 😅</p>
    <p>Executors can fetch scripts via <code>/script.nmt</code>.</p>
    <div class="brand">© ${new Date().getFullYear()} ${BRAND}</div>
  </div>
</body>
</html>`;
  res.status(200).send(html);
});

// ==== FALLBACK ====
app.use((_req, res) => res.status(404).send("Not Found"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server running on :${PORT}`);
});
