import express from "express";
import { middleware, Client } from "@line/bot-sdk";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};
const client = new Client(lineConfig);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 質問データ
const questions = [
  "デート中に相手を自然に誘う言葉を知っていますか？",
  "『今日は疲れてる』と言われた時、どう対応しますか？",
  "前戯はどのくらいの時間を意識していますか？",
  "相手が気持ちよさそうかどうか、どう判断していますか？",
  "行為後のフォローを意識していますか？"
];

// ユーザーの進行状況を管理
const sessions = {};

app.post("/webhook", middleware(lineConfig), async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const userId = event.source.userId;
    const userMessage = event.message.text;

    if (!sessions[userId]) {
      // 新規診断開始
      sessions[userId] = { step: 0, answers: [] };
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "OK！簡単な5問の診断を始めましょう✨\n\n" + questions[0],
      });
      continue;
    }

    const session = sessions[userId];
    session.answers.push(userMessage);
    session.step++;

    if (session.step < questions.length) {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: questions[session.step],
      });
    } else {
      // 全回答完了 → AIで診断結果生成
      const prompt = `
あなたは恋愛診断の専門家です。
以下の回答をもとに、男性の恋愛スキルを100点満点で評価し、
「スコア」「強み」「弱み」「改善アドバイス」を出してください。

回答:
${session.answers.join("\n")}
`;

      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        });

        const replyText = aiResponse.choices[0].message.content;
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: replyText + "\n\n👀 データ収集中！ご協力ありがとうございます。",
        });
      } catch (error) {
        console.error("Error:", error);
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "すみません、少し調子が悪いみたいです💦",
        });
      }

      delete sessions[userId]; // 診断終了後セッションを削除
    }
  }

  res.status(200).end();
});

app.listen(3000, () => console.log("Server running"));

