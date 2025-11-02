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

// ユーザーごとの状態を管理（どの質問まで答えたか）
const userState = {};
const questions = [
  "デート中に相手を自然に誘う言葉を知っていますか？（はい / いいえ）",
  "「今日は疲れている」と言われた時、どう対応しますか？（気づかう / 無理に誘う）",
  "前戯はどのくらいの時間を意識していますか？（短め / 普通 / 長め）",
  "相手が気持ちよさそうかどうか、どう判断していますか？（表情 / 声 / 雰囲気）",
  "行為後のフォローを意識していますか？（はい / いいえ）"
];

app.post("/webhook", middleware(lineConfig), async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const userId = event.source.userId;
    const message = event.message.text.trim();

    // 初回メッセージ
    if (!userState[userId]) {
      userState[userId] = { step: 0, answers: [] };
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "男性力診断を始めます！5問の質問に答えてください。\n\n" + questions[0],
      });
      continue;
    }

    const state = userState[userId];
    state.answers.push(message);
    state.step++;

    // 質問がまだ残っている
    if (state.step < questions.length) {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: questions[state.step],
      });
    } else {
      // 全回答が終わったらAIで診断
      try {
        const prompt = `
次の回答に基づいて男性の恋愛力を100点満点でスコア化し、
強み・弱み・アドバイスを日本語で簡潔に出してください。

回答: ${state.answers.join(" / ")}
        `;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        });

        const result = aiResponse.choices[0].message.content;

        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "診断が完了しました！結果はこちら👇\n\n" + result,
        });
      } catch (err) {
        console.error(err);
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "すみません、診断でエラーが発生しました💦",
        });
      }

      // 状態をリセット
      delete userState[userId];
    }
  }
  res.status(200).end();
});

app.listen(3000, () => console.log("Server running"));

  res.status(200).end();
});

app.listen(3000, () => console.log("Server running"));
