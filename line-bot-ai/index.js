import express from "express";
import { middleware, Client } from "@line/bot-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json()); // ←これが重要（LINE署名エラー対策）

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new Client(lineConfig);

// ▼ 質問リスト（ここは自由に編集可能）
const questions = [
  "デート中に相手を自然に誘う言葉を知っていますか？",
  "『今日は疲れている』と言われた時、どう対応しますか？",
  "前戯はどのくらいの時間を意識していますか？",
  "相手が気持ちよさそうかどうか、どう判断していますか？",
  "行為後のフォローを意識していますか？",
];

// ▼ 各ユーザーの進行状態を一時保存
const userStates = {};

app.post("/webhook", middleware(lineConfig), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const userId = event.source.userId;
    const userMessage = event.message.text.trim();

    // もし初回メッセージなら診断開始
    if (!userStates[userId]) {
      userStates[userId] = { step: 0, answers: [] };
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "【診断スタート】\nこれからいくつかの質問をしますね！",
      });
      // 1問目を送る
      await client.pushMessage(userId, { type: "text", text: questions[0] });
      continue;
    }

    // 回答を保存
    const state = userStates[userId];
    state.answers.push(userMessage);
    state.step++;

    // 次の質問があれば送る
    if (state.step < questions.length) {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: questions[state.step],
      });
    } else {
      // 全部回答したら結果を生成（簡易スコア）
      const score = Math.floor(Math.random() * 40) + 60; // 仮スコア（60〜100点）

      await client.replyMessage(event.replyToken, {
        type: "text",
        text: `診断完了🎉\nあなたのスコアは【${score}点】です！\n強み：優しさ・安定感\n弱み：もう少し自然な誘い方を練習しましょう✨`,
      });

      // 完了したらリセット
      delete userStates[userId];
    }
  }

  res.status(200).end();
});

app.listen(3000, () => console.log("Server running"));
