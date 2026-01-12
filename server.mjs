import express from "express";

const app = express();
app.disable("x-powered-by");

const LUA_PAYLOAD = `

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
