import express from "express";
import { middleware, Client } from "@line/bot-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new Client(lineConfig);

// ✅ 重要ポイント！
// express.json() は middleware(lineConfig) より「後」に配置する
app.post("/webhook", middleware(lineConfig), express.json(), async (req, res) => {
  const events = req.body.events;

  // ▼ 質問リスト
  const questions = [
    "デート中に相手を自然に誘う言葉を知っていますか？",
    "『今日は疲れている』と言われた時、どう対応しますか？",
    "前戯はどのくらいの時間を意識していますか？",
    "相手が気持ちよさそうかどうか、どう判断していますか？",
    "行為後のフォローを意識していますか？",
  ];

  // ▼ 各ユーザーの状態を一時保存（メモリ上）
  const userStates = {};

  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const userId = event.source.userId;
    const userMessage = event.message.text.trim();

    // まだ診断スタートしてない場合
    if (!userStates[userId]) {
      if (userMessage.match(/診断|スタート|はじめる/)) {
        userStates[userId] = { step: 0, answers: [] };
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "【診断スタート】\nこれからいくつか質問をしますね！",
        });
        await client.pushMessage(userId, {
          type: "text",
          text: questions[0],
        });
      } else {
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "こんにちは！「診断」と送ると自己診断が始まります✨",
        });
      }
      continue;
    }

    // 診断中の場合
    const state = userStates[userId];
    state.answers.push(userMessage);
    state.step++;

    if (state.step < questions.length) {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: questions[state.step],
      });
    } else {
      const score = Math.floor(Math.random() * 40) + 60; // 仮スコア
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: `診断完了🎉\nあなたのスコアは【${score}点】です！\n\n強み：優しさ・安定感\n弱み：もう少し自然な誘い方を練習しましょう✨\n\n👉 次回は「より実践的な診断」にも挑戦できます！`,
      });
      delete userStates[userId];
    }
  }

  res.status(200).end();
});

app.listen(3000, () => console.log("Server running"));
