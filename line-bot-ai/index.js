import express from "express";
import bodyParser from "body-parser";
import line from "@line/bot-sdk";

const app = express();

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);
app.use(bodyParser.json());

// Webhookエンドポイント
app.post("/webhook", (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result));
});

function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }
  const reply = { type: "text", text: `あなたのメッセージ: ${event.message.text}` };
  return client.replyMessage(event.replyToken, reply);
}

app.listen(3000, () => console.log("Server running"));
