const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "search-data.json");
const PROMPT_FILE = path.join(__dirname, "system-prompt.json");

// ミドルウェア
app.use(cors());
app.use(express.json());

// --- 初期化 ---
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
}

// デフォルトのシステムプロンプト
const DEFAULT_SYSTEM_PROMPT = `あなたは高度な推論能力・構造化能力・要約能力・生成能力を持つ AI アシスタントです。
ユーザーの意図を正確に読み取り、曖昧な指示も補完し、最適な答えを返してください。

【あなたの能力】
- 高度な論理推論（ステップ推論・因果推論・比較推論）
- 文脈理解（前後関係・省略・暗黙の意図を補完）
- 情報構造化（箇条書き・表・コードなど最適な形式で整理）
- 仕様書生成・コード生成・設計補助
- エラー推定・改善提案
- ユーザーの目的を先読みして提案

【出力ルール】
1. ユーザーの意図を最優先する
2. 必要なら不足情報を補完して最適解を返す
3. 回答は簡潔だが内容は深く、構造化して提示する
4. コードは動作する最小構成で提示する
5. 専門的な内容は例・比較・理由を添えてわかりやすく
6. 不明点は推測しつつ、必要なら質問して精度を上げる
7. 「できない理由」より「どうすればできるか」を優先する

【禁止事項】
- 無意味な前置き
- 冗長な説明
- 曖昧な返答
- 断定できないのに断定すること
- 不要な謝罪

【回答スタイル】
- 明確・論理的・構造化
- 必要に応じてコードブロックを使用
- UMA の開発スタイル（最小構成・高速実装）に最適化
- 可能なら改善案・次の一手も提示

あなたは以上を厳密に守り、ユーザーの目的達成を最優先に行動すること。`;

if (!fs.existsSync(PROMPT_FILE)) {
  fs.writeFileSync(
    PROMPT_FILE,
    JSON.stringify({ prompt: DEFAULT_SYSTEM_PROMPT }, null, 2),
    "utf-8"
  );
}

// --- ヘルパー ---
const readPrompt = () => {
  const raw = fs.readFileSync(PROMPT_FILE, "utf-8");
  return JSON.parse(raw).prompt;
};

const writePrompt = (prompt) => {
  fs.writeFileSync(PROMPT_FILE, JSON.stringify({ prompt }, null, 2), "utf-8");
};

// --- エンドポイント ---

// GET /system-prompt — 現在のシステムプロンプトを取得
app.get("/system-prompt", (req, res) => {
  try {
    const prompt = readPrompt();
    res.status(200).json({ prompt });
  } catch (err) {
    res.status(500).json({ error: "プロンプトの読み込みに失敗しました。" });
  }
});

// PUT /system-prompt — システムプロンプトを更新
app.put("/system-prompt", (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "Bad Request",
      message: "'prompt' は必須の文字列です。",
    });
  }
  try {
    writePrompt(prompt);
    res.status(200).json({ message: "システムプロンプトを更新しました。", prompt });
  } catch (err) {
    res.status(500).json({ error: "プロンプトの保存に失敗しました。" });
  }
});

// POST /search — 教科・範囲を保存し、システムプロンプトも添えて返す
app.post("/search", (req, res) => {
  const { subject, range } = req.body;

  if (!subject || !range) {
    return res.status(400).json({
      error: "Bad Request",
      message: "'subject' と 'range' は必須項目です。",
    });
  }

  const newEntry = {
    subject,
    range,
    timestamp: new Date().toISOString(),
  };

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    data.push(newEntry);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");

    const systemPrompt = readPrompt();

    return res.status(200).json({
      message: "保存しました。",
      saved: newEntry,
      system_prompt: systemPrompt,
    });
  } catch (err) {
    console.error("エラー:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "データの保存中にエラーが発生しました。",
    });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
  console.log(`エンドポイント一覧:`);
  console.log(`  GET  /system-prompt  — プロンプト取得`);
  console.log(`  PUT  /system-prompt  — プロンプト更新`);
  console.log(`  POST /search         — 教科・範囲を保存`);
});
