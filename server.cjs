const express = require("express");

const app = express();

const LUA_PAYLOAD = `loadstring(game:HttpGet("https://api.junkie-development.de/api/v1/luascripts/public/6bd9967a812544e37c0c01a3f4b6552b7fda3478ba9da7efc8f3aecb4e1c7a2c/download"))()`;

app.get("/", (_req, res) => {
  res
    .status(200)
    .set("Content-Type", "text/plain; charset=utf-8")
    .set("Cache-Control", "no-store")
    .send(LUA_PAYLOAD);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Lazy Devs Loader running on port " + PORT);
});
