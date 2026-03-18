import axios from 'axios';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash';

const PROMPTS: Record<string, { label: string; emoji: string; text: string }> =
  {
    shougaiji: {
      label: '障害児通所支援 最新動向レポート',
      emoji: '🧒',
      text: `障害児通所支援事業における報酬改定や制度・運営に関する最新動向について、厚生労働省およびこども家庭庁等が公開する検討会・審議会の議事録・報告書・公式通知・資料から、新着情報があればまとめてレポートしてください。特に令和9年度の改定の重要事項や検討中論点、現場運営に関係するトピックスを重点的に整理し、各情報の出典（公式発表ページURL、資料名）も明記してください。`,
    },
    ahaki: {
      label: 'あん摩マッサージ 最新動向レポート',
      emoji: '💆',
      text: `あん摩マッサージにおける報酬改定や制度・運営に関する最新動向について、厚生労働省等が公開する検討会・審議会の議事録・報告書・公式通知・資料から、新着情報があればまとめてレポートしてください。特に令和8年度の改定の重要事項や検討中論点、現場運営に関係するトピックスを重点的に整理し、各情報の出典（公式発表ページURL、資料名）も明記してください。`,
    },
  };

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const body = {
    contents: [{ parts: [{ text: prompt }], role: 'user' }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2 },
  };

  const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000,
  });

  const parts = response.data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p: { text?: string }) => p.text)
    .map((p: { text: string }) => p.text)
    .join('');
}

async function postToSlack(text: string, webhookUrl: string): Promise<void> {
  await axios.post(
    webhookUrl,
    { text },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    },
  );
}

function splitMessage(text: string, maxLen = 2800): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end < text.length) {
      const lastNewline = text.lastIndexOf('\n', end);
      if (lastNewline > start) end = lastNewline;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

// REPORT_TARGET 環境変数で "shougaiji" or "ahaki" を切り替え
export async function runGovReport(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const target = process.env.REPORT_TARGET;

  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません');
  if (!webhookUrl) throw new Error('SLACK_WEBHOOK_URL が設定されていません');
  if (!target || !(target in PROMPTS)) {
    throw new Error(
      `REPORT_TARGET は "shougaiji" または "ahaki" を指定してください`,
    );
  }

  const prompt = PROMPTS[target];
  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  });

  console.log(`Generating report: ${prompt.label}`);

  try {
    const report = await callGemini(prompt.text, apiKey);
    const header = `${prompt.emoji} *${prompt.label}*\n📅 ${today}\n${'─'.repeat(40)}\n`;
    const chunks = splitMessage(header + report);

    for (let i = 0; i < chunks.length; i++) {
      const suffix = chunks.length > 1 ? `\n_(${i + 1}/${chunks.length})_` : '';
      await postToSlack(chunks[i] + suffix, webhookUrl);
      if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(`  -> Posted to Slack (${chunks.length} message(s))`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`  Error: ${error.message}`);
      await postToSlack(
        `⚠️ *${prompt.label}* のレポート生成に失敗しました\n\`${error.message}\``,
        webhookUrl,
      ).catch(() => {});
    }
  }
}
