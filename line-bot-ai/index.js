import express from "express";
import { middleware, Client } from "@line/bot-sdk";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new Client(lineConfig);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/webhook", middleware(lineConfig), async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text;

      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: userMessage }],
        });

        const replyText = aiResponse.choices[0].message.content;
        await client.replyMessage(event.replyToken, { type: "text", text: replyText });
      } catch (error) {
        console.error("Error:", error);
        await client.replyMessage(event.replyToken, { type: "text", text: "ごめんなさい、少し調子が悪いみたいです💦" });
      }
    }
  }
  res.status(200).end();
});

app.listen(3000, () => console.log("Server running"));
