import express from "express";
import { middleware, Client } from "@line/bot-sdk";
import dotenv from "dotenv";

dotenv.config();
import { google } from "googleapis";
import fs from "fs";

// Google認証の設定（サービスアカウントキーを使う）
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// あなたのスプレッドシートID（URLの中の部分）
const SPREADSHEET_ID = "18TitZtNuwvrnt0gkYEPt1wNoZ2YaDFoLnIIqRBME-xo";

const app = express();

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new Client(lineConfig);

// ▼ 質問リスト
const questions = [
  "デート中に相手を自然に誘う言葉を知っていますか？",
  "『今日は疲れている』と言われた時、どう対応しますか？",
  "前戯はどのくらいの時間を意識していますか？",
  "相手が気持ちよさそうかどうか、どう判断していますか？",
  "行為後のフォローを意識していますか？",
];

// ▼ 各ユーザーの状態を一時保存
const userStates = {};

app.post("/webhook", middleware(lineConfig), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const userId = event.source.userId;
    const userMessage = event.message.text.trim();

    // ▼ 診断スタート判定
    if (!userStates[userId]) {
      if (/診断|スタート|はじめる/.test(userMessage)) {
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

    // ▼ 診断中の回答処理
    const state = userStates[userId];
    state.answers.push(userMessage);
    state.step++;

    if (state.step < questions.length) {
      // 次の質問を送る
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: questions[state.step],
      });
    } else {
      // ▼ 診断完了（スコア＋タイプ別コメント）
      const score = Math.floor(Math.random() * 41) + 60; // 60〜100のランダムスコア
      let resultType = "";
      let advice = "";

      if (score >= 85) {
        resultType = "💘理想的リードタイプ";
        advice = "自然な流れと気配りが完璧。相手の反応をよく見て、リズムを合わせるセンスあり。";
      } else if (score >= 70) {
        resultType = "🌹優しさ安定タイプ";
        advice = "思いやり重視の姿勢がGood。もう一歩だけリード力を意識してみて。";
      } else if (score >= 55) {
        resultType = "🔥情熱バランスタイプ";
        advice = "盛り上げは上手！でも焦らず「間」を意識すると完成度UP。";
      } else {
        resultType = "🌙ぎこちないけど誠実タイプ";
        advice = "丁寧さは伝わってる。経験を重ねると自然体の魅力が出てきます✨";
      }
import { google } from "googleapis"; // ← ファイルの一番上に1行追加（まだなければ）

// ======== スプレッドシート書き込み部分 ========
try {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const SPREADSHEET_ID = "18TitZtNuwvrnt0gkYEPt1wNoZ2YaDFoLnIIqRBME-xo";

  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[now, userId, score, resultType, advice]],
    },
  });

  console.log("✅ スプレッドシートに書き込み成功");
} catch (err) {
  console.error("❌ スプレッドシート書き込みエラー:", err);
}

      await client.replyMessage(event.replyToken, {
        type: "text",
        text: `診断完了🎉\nあなたのスコアは【${score}点】！\nタイプ：${resultType}\n${advice}`,
      });
      // スプレッドシートに記録
await sheets.spreadsheets.values.append({
  spreadsheetId: SPREADSHEET_ID,
  range: "シート1!A:D", // シート名が違う場合は変更
  valueInputOption: "USER_ENTERED",
  requestBody: {
    values: [
      [
        new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        userId,
        score,
        state.answers.join(" / "),
      ],
    ],
  },
});

      delete userStates[userId];
    }
  }

  res.status(200).end();
});

app.listen(3000, () => console.log("Server running"));
