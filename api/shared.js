// api/shared.js - 核心共用服務模組（技能動態載入、多 Provider 適配、SSRF 防護、通用 HTTP 通訊）
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ==========================================
// 1. 動態技能載入器 (Skill-Driven Brain)
// ==========================================
let cachedSkillContent = null;
let lastSkillReadTime = 0;

/**
 * 動態載入專案根目錄的 SKILL.md
 * 具備 3 秒記憶體快取以減少頻繁 I/O，但在開發修改時仍能即時反應
 */
function loadSkillPrompt() {
  const now = Date.now();
  if (cachedSkillContent && now - lastSkillReadTime < 3000) {
    return cachedSkillContent;
  }

  const possiblePaths = [
    path.resolve(__dirname, '../SKILL.md'),
    path.resolve(process.cwd(), 'SKILL.md'),
    path.join(__dirname, 'SKILL.md'),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        cachedSkillContent = fs.readFileSync(p, 'utf8');
        lastSkillReadTime = now;
        return cachedSkillContent;
      }
    } catch {
      // 嘗試下一個路徑
    }
  }

  // 防禦性 Fallback：若因特殊部署環境未找到檔案，提供核心規範
  return `
# Rental & Purchase Property Evaluation (Fallback)
1. Separate objective property assessment from resident assessment.
2. Normalize facts, calculate all-in cost and price per ping.
3. Assess SWOT across Transport, School, Space & Condition, Neighbourhood.
4. Grade risks into Critical, High, Medium, Low.
5. Score 7 dimensions objectively with risk-gate check.
6. Cross-check resident notes with Confirmed, Partly confirmed, Unverified, Contradicted.
`;
}

// ==========================================
// 2. 資安防護：SSRF 檢驗
// ==========================================
function validateBaseUrl(urlStr, isProduction = process.env.NODE_ENV === 'production') {
  if (!urlStr) return null;
  const parsed = new URL(urlStr);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('僅支援 HTTP 或 HTTPS 協定端點。');
  }

  const hostname = parsed.hostname.toLowerCase();
  const BLOCKED_HOSTS = [
    '169.254.169.254',
    'metadata.google.internal',
    '100.100.100.200',
    'instance-data',
  ];

  if (BLOCKED_HOSTS.includes(hostname)) {
    throw new Error('禁止存取雲端內部 Metadata 服務。');
  }

  if (isProduction) {
    const ALLOWED = [
      'api.openai.com',
      'generativelanguage.googleapis.com',
      'api.anthropic.com',
      'localhost',
      '127.0.0.1',
    ];
    if (!ALLOWED.includes(hostname)) {
      throw new Error(`生產環境不允許存取未經認證的外部端點: ${hostname}`);
    }
  }

  return parsed.toString().replace(/\/+$/, '');
}

// ==========================================
// 3. 通用 HTTP 請求輔助函數
// ==========================================
function sendJsonRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const isHttps = options.protocol === 'https:' || (!options.protocol && options.port === 443);
    const client = isHttps ? https : http;

    const req = client.request(options, (res) => {
      res.setEncoding('utf8');
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const errorMsg = parsed.error?.message || parsed.message || `HTTP ${res.statusCode}: ${body.slice(0, 150)}`;
            reject(new Error(errorMsg));
          }
        } catch {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 150)}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('AI 模型運算逾時（超過 150 秒），請確認網路連線或更換模型後再試。'));
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// ==========================================
// 4. Schema 轉換輔助 (Gemini Compatibility)
// ==========================================
function toGeminiSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);

  const clean = {};
  for (const [key, value] of Object.entries(schema)) {
    if (['additionalProperties', 'minItems', 'maxItems', 'minimum', 'maximum'].includes(key)) {
      continue;
    }
    clean[key] = toGeminiSchema(value);
  }
  return clean;
}

// ==========================================
// 4.5 安全 JSON 解析器 (Safe JSON Parser)
// ==========================================
function safeJsonParse(rawText, fallbackErrorPrefix = 'AI 模型回傳內容不是有效的 JSON') {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error(`${fallbackErrorPrefix}：回傳內容為空。`);
  }

  // 1. 去除 Markdown 程式碼區塊標記 (```json ... ```)
  let cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 2. 嘗試直接解析
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // 3. 嘗試尋找第一個 { 與最後一個 } 截取 JSON 物件
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // continue
      }
    }

    // 4. 若開頭為常見純文字錯誤（如 "An error occurred..."）
    if (cleaned.startsWith('An error') || cleaned.startsWith('Error:') || cleaned.startsWith('<!DOCTYPE') || cleaned.startsWith('<html>')) {
      throw new Error(`AI 提供商伺服器回傳錯誤：${cleaned.slice(0, 150)}`);
    }

    throw new Error(`${fallbackErrorPrefix}：${err.message} (內容片段: ${cleaned.slice(0, 100)}...)`);
  }
}

// ==========================================
// 5. 多 Provider 呼叫適配器
// ==========================================

// --- OpenAI 適配器 ---
async function callOpenAI({ apiKey, model, baseUrl, systemPrompt, userContent, schema, schemaName = 'property_evaluation' }) {
  const base = baseUrl || 'https://api.openai.com/v1';
  const endpoint = base.endsWith('/chat/completions') || base.endsWith('/responses')
    ? base
    : `${base.replace(/\/+$/, '')}/chat/completions`;

  const url = new URL(endpoint);
  const isResponsesEndpoint = url.pathname.endsWith('/responses');
  let payload;

  if (isResponsesEndpoint) {
    payload = {
      model: model || 'gpt-4o-mini',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema: schema,
        },
      },
      temperature: 0.2,
    };
  } else {
    // 標準 /v1/chat/completions 格式
    payload = {
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${userContent}\n\n請嚴格輸出符合以下結構的合法純 JSON，不可夾帶任何 markdown 標記：\n${JSON.stringify(schema)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    };
  }

  const response = await sendJsonRequest(
    {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 150000,
    },
    payload
  );

  if (typeof response === 'string') {
    return safeJsonParse(response, 'OpenAI');
  }
  if (response.output_text) {
    return safeJsonParse(response.output_text, 'OpenAI');
  }
  if (response.choices?.[0]?.message?.content) {
    return safeJsonParse(response.choices[0].message.content, 'OpenAI');
  }
  if (response.output?.[0]?.content?.[0]?.text) {
    return safeJsonParse(response.output[0].content[0].text, 'OpenAI');
  }
  throw new Error(`OpenAI 未回傳預期的文字內容：${JSON.stringify(response).slice(0, 150)}`);
}

// --- Google Gemini 適配器 ---
async function callGemini({ apiKey, model, baseUrl, systemPrompt, userContent, schema }) {
  const rawModel = (model || 'gemini-3.6-flash').replace(/^models\//i, '').replace(/^\/+/, '').trim();
  const base = baseUrl || 'https://generativelanguage.googleapis.com';

  const sendGemini = async (targetModel) => {
    const url = new URL(`${base}/v1beta/models/${targetModel}:generateContent?key=${apiKey}`);
    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(schema),
        temperature: 0.2,
      },
    };

    return await sendJsonRequest(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 150000,
      },
      payload
    );
  };

  let response;
  try {
    response = await sendGemini(rawModel);
  } catch (err) {
    if (err.message && err.message.includes('high demand') && rawModel !== 'gemini-3.5-flash') {
      console.warn(`[Gemini Warn]: ${rawModel} 尖峰壅塞，自動降級重試 gemini-3.5-flash...`);
      response = await sendGemini('gemini-3.5-flash');
    } else {
      throw err;
    }
  }

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      throw new Error(`Gemini 模型回應被中斷 (${finishReason})，請檢查設定或更換模型。`);
    }
    throw new Error('Gemini 未回傳有效分析內容。');
  }
  return safeJsonParse(text, 'Gemini');
}

// --- Anthropic Claude 適配器 ---
async function callClaude({ apiKey, model, baseUrl, systemPrompt, userContent }) {
  const targetModel = model || 'claude-sonnet-4-6';
  const base = baseUrl || 'https://api.anthropic.com/v1';
  const url = new URL(`${base}/messages`);

  const payload = {
    model: targetModel,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `${userContent}\n\n請務必依據指定的結構輸出完整合法的純 JSON，不可夾帶任何 markdown 標記（如 \`\`\`json）或額外解釋。`,
      },
    ],
    temperature: 0.2,
  };

  const response = await sendJsonRequest(
    {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      timeout: 150000,
    },
    payload
  );

  const rawText = response.content?.[0]?.text;
  if (!rawText) throw new Error('Claude 未回傳有效分析內容。');
  return safeJsonParse(rawText, 'Claude');
}

// --- 本地 Local LLM 適配器 ---
async function callLocalLLM({ apiKey, model, baseUrl, systemPrompt, userContent, schema }) {
  const targetUrl = baseUrl || 'http://localhost:11434/v1';
  const url = new URL(`${targetUrl}/chat/completions`);

  const payload = {
    model: model || 'qwen2.5:14b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${userContent}\n\n請嚴格回傳符合以下 JSON Schema 結構的純 JSON 字串：\n${JSON.stringify(schema)}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  };

  const response = await sendJsonRequest(
    {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      protocol: url.protocol,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      timeout: 90000,
    },
    payload
  );

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('本地模型未回傳有效內容。');
  return safeJsonParse(content, '本地模型');
}

module.exports = {
  loadSkillPrompt,
  validateBaseUrl,
  sendJsonRequest,
  toGeminiSchema,
  safeJsonParse,
  callOpenAI,
  callGemini,
  callClaude,
  callLocalLLM,
};
