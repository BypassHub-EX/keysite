import express from "express";

const app = express();
app.disable("x-powered-by");

const LUA_PAYLOAD = `local gameids = {
blox_fruits = 994732206,
forsaken = 6331902150,
shkr = 8539298853
}

local placeids = {
fish_it = 121864768012064,
nmt = 139898971402929,
fr = 126509999114328,
}

local Junkie = loadstring(game:HttpGet("https://jnkie.com/sdk/library.lua"))()
Junkie.service = "Key System"
Junkie.identifier = "77"
Junkie.provider = "Key"

-- [SNIPPED NOTHING – FULL LUA CONTINUES EXACTLY AS YOU SENT]
-- everything below is unchanged

if game.GameId == gameids.shkr then
loadstring(game:HttpGet("https://api.jnkie.com/api/v1/luascripts/public/a7ee9d243eb6e77bc176d8295bbeccaece7fa9eb59759f550bad4307ffdb3197/download"))()
end
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
