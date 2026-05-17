import express from "express";

const app = express();
app.disable("x-powered-by");

const LUA_PAYLOAD = `  -- loader, loader
local supported = {
    [126509999114328] = "forest_round"
}

local BLOX_FRUITS_GAME_ID = 994732206
local FORSAKEN_GAME_ID = 6331902150
local TSB_GAME_ID = 3808081382

local lobbyIds = {
    [79546208627805] = true,
    [137826330724902] = true
}

local loaders = {
    forsaken = function()
        loadstring(game:HttpGet("https://api.junkie-development.de/api/v1/luascripts/public/acffd1617c650928a65879a7e7368c6d067671733b9361ec23e86448ac39175c/download"))()
    end,
    forest_round = function()
        loadstring(game:HttpGet("https://api.junkie-development.de/api/v1/luascripts/public/056e9ea3aeaacd64dcc39705667ea9136117acdd20c64cd8749afdac3e0e0f71/download"))()
    end,
    shawarma_kiosk_an = function()
        loadstring(game:HttpGet("https://api.junkie-development.de/api/v1/luascripts/public/a7ee9d243eb6e77bc176d8295bbeccaece7fa9eb59759f550bad4307ffdb3197/download"))()
    end,
    blox_fruits = function()
        loadstring(game:HttpGet("https://api.jnkie.com/api/v1/luascripts/public/ee4522288c6c06771b840c90921e8259b8459fda0d13002bdfc38b84ae60f726/download"))()
    end,
tsb = function()
        loadstring(game:HttpGet("https://api.jnkie.com/api/v1/luascripts/public/87b5273e97c82537a157015a8a56a50c0805f6329c4f0a783b394b839be65975/download"))()
	end
}

local function createTopWarning(text)
    local gui = Instance.new("ScreenGui")
    gui.IgnoreGuiInset = true
    gui.ResetOnSpawn = false
    gui.Parent = game:GetService("CoreGui")

    local bar = Instance.new("Frame")
    bar.Size = UDim2.new(1,0,0.25,0)
    bar.BackgroundColor3 = Color3.new(0,0,0)
    bar.Parent = gui

    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(1,0,1,0)
    label.BackgroundTransparency = 1
    label.Text = text
    label.TextColor3 = Color3.new(1,0,0)
    label.TextScaled = true
    label.Font = Enum.Font.GothamBlack
    label.Parent = bar
end

local function createFullWarning(text)
    local gui = Instance.new("ScreenGui")
    gui.IgnoreGuiInset = true
    gui.ResetOnSpawn = false
    gui.Parent = game:GetService("CoreGui")

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1,0,1,0)
    frame.BackgroundColor3 = Color3.new(0,0,0)
    frame.Parent = gui

    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(1,0,1,0)
    label.BackgroundTransparency = 1
    label.Text = text
    label.TextColor3 = Color3.new(1,0,0)
    label.TextScaled = true
    label.Font = Enum.Font.GothamBlack
    label.Parent = frame
end

if lobbyIds[game.PlaceId] then
    createTopWarning("U ARE IN THE LOBBY, PLEASE JOIN A ROUND")
    return
end

if game.GameId == BLOX_FRUITS_GAME_ID then
    loaders.blox_fruits()
    return
end

if game.GameId == FORSAKEN_GAME_ID then
    loaders.forsaken()
    return
end

local key = supported[game.PlaceId]
if not key or not loaders[key] then
    createFullWarning("JOIN A SUPPORTED GAME")
    return
end

loaders[key]()


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

