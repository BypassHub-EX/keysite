import express from "express";

const app = express();
app.disable("x-powered-by");

const LUA_PAYLOAD = `loadstring(game:HttpGet("https://raw.githubusercontent.com/1azydevs/lz/refs/heads/main/loader.lua"))
`.trim();

/* MAIN LOADER */
app.get("/", (req, res) => {
  res
    .status(200)
    .set("Content-Type", "text/plain; charset=utf-8")
    .set("Cache-Control", "no-store")
    .send(LUA_PAYLOAD);
});

/* RAW TEXT PAGE */
app.get("/10192sas", (req, res) => {
  res
    .status(200)
    .set("Content-Type", "text/plain; charset=utf-8")
    .set("Cache-Control", "no-store")
    .send("ily<333333");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Loader running on port ${PORT}`);
});

