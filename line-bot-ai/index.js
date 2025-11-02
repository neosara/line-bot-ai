import express from "express";
import { middleware, Client } from "@line/bot-sdk";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
// ===== 男性向け診断データ =====
const questions = [
  {
    id: 1,
    text: "デート中に相手を自然に誘う言葉を知っていますか？",
    options: ["A. はい、得意です", "B. 少し自信がない", "C. 苦手です"]
  },
  {
    id: 2,
    text: "『今日は疲れている』と言われた時、どう対応しますか？",
    options: ["A. 優しく休ませる", "B. 予定を少しだけ続ける", "C. 何も言わない"]
  },
  {
    id: 3,
    text: "前戯はどのくらいの時間を意識していますか？",
    options: ["A. 15分以上", "B. 5〜10分", "C. あまり意識していない"]
  },
  {
    id: 4,
    text: "相手が気持ちよさそうかどうか、どう判断していますか？",
    options: ["A. 表情や反応を見て判断", "B. なんとなく感覚で", "C. 特に気にしていない"]
  },
  {
    id: 5,
    text: "行為後のフォローを意識していますか？",
    options: ["A. 毎回している", "B. たまに", "C. あまりしていない"]
  }
];

// ===== ユーザーの進行状態を保存するための一時メモリ =====
const userSessions = {};


const app = express();

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new Client(lineConfig);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ LINE webhook用：raw bodyを扱う
app.post("/webhook", middleware(lineConfig), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userId = event.source.userId;
      const userMessage = event.message.text;

      // 新規スタート
      if (!userSessions[userId]) {
        userSessions[userId] = { current: 0, answers: [] };
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: "男性向け実用診断を始めます！\n\n" + questions[0].text + "\n" + questions[0].options.join("\n")
        });
        continue;
      }

      // 現在の質問を取得
      const session = userSessions[userId];
      session.answers.push(userMessage);
      session.current++;

      if (session.current < questions.length) {
        // 次の質問を送信
        const nextQ = questions[session.current];
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: nextQ.text + "\n" + nextQ.options.join("\n")
        });
      } else {
        // すべて回答済み → OpenAIで診断結果生成
        const userAnswersText = session.answers.join(" / ");
        try {
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "あなたは恋愛スキル診断の専門家です。回答からスコアとアドバイスを作成してください。"
              },
              {
                role: "user",
                content: `以下の回答をもとに100点満点で評価し、強み・弱み・改善ポイントを短くまとめてください。\n回答: ${userAnswersText}`
              }
            ]
          });

          const result = aiResponse.choices[0].message.content;
          await client.replyMessage(event.replyToken, {
            type: "text",
            text: "診断が完了しました！\n\n" + result
          });
        } catch (error) {
          console.error("Error:", error);
          await client.replyMessage(event.replyToken, {
            type: "text",
            text: "エラーが発生しました。時間をおいて再試行してください。"
          });
        }

        // セッション削除
        delete userSessions[userId];
      }
    }
  }

  res.status(200).end();
});


// ✅ それ以外のルートは通常JSONでOK
app.use(express.json());

app.get("/", (req, res) => {
  res.send("LINE Bot Server is running!");
});

app.listen(3000, () => console.log("Server running"));
