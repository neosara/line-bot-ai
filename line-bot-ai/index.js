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

// 質問リスト
const questions = [
  "デート中に相手を自然に誘う言葉を知っていますか？",
  "「今日は疲れている」と言われた時、どう対応しますか？",
  "前戯はどのくらいの時間を意識していますか？",
  "相手が気持ちよさそうかどうか、どう判断していますか？",
  "行為後のフォローを意識していますか？"
];

// ユーザーごとの回答を保存するメモリ（暫定）
const userAnswers = {};

app.post("/webhook", middleware(lineConfig), async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userId = event.source.userId;
      const userMessage = event.message.text;

      // 初回メッセージ
      if (!userAnswers[userId]) {
        userAnswers[userId] = { step: 0, answers: [] };
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: `こんにちは！男性向け実用診断を始めます。\n${questions[0]}`,
        });
        continue;
      }

      // 回答を保存
      const userData = userAnswers[userId];
      userData.answers.push(userMessage);
      userData.step++;

      // 全質問が終わったらAI診断へ
      if (userData.step >= questions.length) {
        try {
          const prompt = `
あなたは男性の行動心理に詳しい恋愛コーチです。
以下の回答をもとに100点満点でスコアリングし、強み・弱み・アドバイスを出してください。
回答: ${userData.answers.join(" / ")}
`;
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
          });

          const resultText = aiResponse.choices[0].message.content;

          await client.replyMessage(event.replyToken, {
            type: "text",
            text: `診断結果です👇\n${resultText}`,
          });
        } catch (error) {
          console.error("Error:", error);
          await client.replyMessage(event.replyToken, {
            type: "text",
            text: "ごめんなさい、診断の生成中にエラーが発生しました💦",
          });
        }

        // データを初期化
        delete userAnswers[userId];
      } else {
        // 次の質問へ
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: questions[userData.step],
        });
      }
    }
  }
  res.status(200).end();
});

app.listen(3000, () => console.log("Server running"));

