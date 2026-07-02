exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "伺服器未設定 API 金鑰（ANTHROPIC_API_KEY）" }) };
  }

  let zhText = "";
  try {
    const parsed = JSON.parse(event.body || "{}");
    zhText = (parsed.text || "").trim();
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "請求格式錯誤" }) };
  }
  if (!zhText) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "沒有提供文字" }) };
  }

  try {
    const apiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content:
              "請將以下繁體中文的展覽導覽講稿，翻譯成自然流暢、口語化的日文導覽講稿，語氣使用です・ます調，適合現場口說導覽。只回傳翻譯後的日文文字本身，不要加任何前言、引號、或說明文字。\n\n中文原文：\n" +
              zhText,
          },
        ],
      }),
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      return { statusCode: apiResp.status, headers, body: JSON.stringify({ error: "Anthropic API 錯誤 " + apiResp.status + "：" + errText.slice(0, 300) }) };
    }

    const data = await apiResp.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    const ja = textBlock ? textBlock.text.trim() : "";
    if (!ja) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "翻譯回應為空" }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ja }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "呼叫翻譯服務失敗：" + (e && e.message ? e.message : String(e)) }) };
  }
};
