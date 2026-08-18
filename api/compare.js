// api/compare.js - 多模型租屋比較分析引擎（支援 OpenAI, Gemini, Claude, Local LLM）
const https = require('https');
const http = require('http');
const { fetchVerifiedFacts, stripHtml } = require('./search');

// ==========================================
// 1. 資安防護：SSRF 檢驗
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
// 2. 結構化 Schema 定義 (Eleven Sections)
// ==========================================
const COMPARE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'conclusionFirst',
    'propertyAnalyses',
    'costComparison',
    'leaseAndHiddenRisks',
    'lifeStrategies',
    'theRealQuestion',
    'overallConclusion',
    'scenarioRankings',
    'rankReversals',
    'decisionAdvice',
  ],
  properties: {
    // ① 先講結論
    conclusionFirst: {
      type: 'object',
      additionalProperties: false,
      required: ['rankings', 'caveat'],
      properties: {
        rankings: {
          type: 'array',
          minItems: 2,
          maxItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['propertyName', 'rank', 'overallScore', 'verdict'],
            properties: {
              propertyName: { type: 'string' },
              rank: { type: 'integer', minimum: 1, maximum: 3 },
              overallScore: { type: 'number', minimum: 0, maximum: 10 },
              verdict: { type: 'string' },
            },
          },
        },
        caveat: { type: 'string' },
      },
    },

    // ② 各物件深入分析
    propertyAnalyses: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'rankLabel', 'costSummary', 'dimensions'],
        properties: {
          propertyName: { type: 'string' },
          rankLabel: { type: 'string' },
          costSummary: { type: 'string' },
          dimensions: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'score', 'hasWarning', 'analysis', 'keyInsight'],
              properties: {
                name: { type: 'string' },
                score: { type: 'number', minimum: 0, maximum: 10 },
                hasWarning: { type: 'boolean' },
                analysis: { type: 'string' },
                keyInsight: { type: 'string' },
              },
            },
          },
        },
      },
    },

    // ③ 租金真正的差異
    costComparison: {
      type: 'object',
      additionalProperties: false,
      required: ['properties', 'insight'],
      properties: {
        properties: {
          type: 'array',
          minItems: 2,
          maxItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['propertyName', 'originalMonthlyCost', 'estimatedSubsidizedCost', 'note'],
            properties: {
              propertyName: { type: 'string' },
              originalMonthlyCost: { type: 'string' },
              estimatedSubsidizedCost: { type: 'string' },
              note: { type: 'string' },
            },
          },
        },
        insight: { type: 'string' },
      },
    },

    // ④ 租約與隱性風險
    leaseAndHiddenRisks: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'maintenanceResponsibility', 'knownIssues', 'futureRisks', 'hiddenCostEstimate', 'riskVerdict'],
        properties: {
          propertyName: { type: 'string' },
          maintenanceResponsibility: { type: 'string' },
          knownIssues: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['issue', 'status'],
              properties: {
                issue: { type: 'string' },
                status: { type: 'string' },
              },
            },
          },
          futureRisks: { type: 'array', items: { type: 'string' } },
          hiddenCostEstimate: { type: 'string' },
          riskVerdict: { type: 'string' },
        },
      },
    },

    // ⑤ 生活策略框架
    lifeStrategies: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'label', 'strategy'],
        properties: {
          propertyName: { type: 'string' },
          label: { type: 'string' },
          strategy: { type: 'string' },
        },
      },
    },

    // ⑥ 真正的問題
    theRealQuestion: {
      type: 'object',
      additionalProperties: false,
      required: ['reframing', 'optionA', 'optionB'],
      properties: {
        reframing: { type: 'string' },
        optionA: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'description', 'relevantProperties'],
          properties: {
            label: { type: 'string' },
            description: { type: 'string' },
            relevantProperties: { type: 'array', items: { type: 'string' } },
          },
        },
        optionB: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'description', 'relevantProperties'],
          properties: {
            label: { type: 'string' },
            description: { type: 'string' },
            relevantProperties: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },

    // ⑦ 真正的結論
    overallConclusion: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'rankLabel', 'strengths', 'biggestRisk', 'conditionalNote'],
        properties: {
          propertyName: { type: 'string' },
          rankLabel: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          biggestRisk: { type: 'string' },
          conditionalNote: { type: 'string' },
        },
      },
    },

    // ⑧ 情境排名
    scenarioRankings: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['scenario', 'ranking'],
        properties: {
          scenario: { type: 'string' },
          ranking: { type: 'string' },
        },
      },
    },

    // ⑨ 條件式排名反轉
    rankReversals: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['condition', 'currentRank', 'reversedRank', 'reasoning'],
        properties: {
          condition: { type: 'string' },
          currentRank: { type: 'string' },
          reversedRank: { type: 'string' },
          reasoning: { type: 'string' },
        },
      },
    },

    // ⑩ 決策建議與待查事項
    decisionAdvice: {
      type: 'object',
      additionalProperties: false,
      required: ['shouldNotRush', 'criticalChecks', 'finalRecommendation'],
      properties: {
        shouldNotRush: { type: 'string' },
        criticalChecks: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['propertyName', 'checkItem', 'reason'],
            properties: {
              propertyName: { type: 'string' },
              checkItem: { type: 'string' },
              reason: { type: 'string' },
            },
          },
        },
        finalRecommendation: { type: 'string' },
      },
    },
  },
};

// ==========================================
// 3. 通用 HTTP 請求輔助函數
// ==========================================
function sendJsonRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const isHttps = options.protocol === 'https:' || (!options.protocol && options.port === 443);
    const client = isHttps ? https : http;

    const req = client.request(options, (res) => {
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
      reject(new Error('AI 請求逾時（超過 60 秒）'));
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// ==========================================
// 4. 各 Provider 呼叫適配器
// ==========================================

// --- OpenAI 適配器 ---
async function callOpenAI({ apiKey, model, baseUrl, systemPrompt, userContent }) {
  const url = new URL(`${baseUrl || 'https://api.openai.com/v1'}/responses`);
  const payload = {
    model: model || 'gpt-4o-mini',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'house_comparison_analysis',
        strict: true,
        schema: COMPARE_SCHEMA,
      },
    },
    temperature: 0.2,
  };

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
      timeout: 65000,
    },
    payload
  );

  if (response.output_text) {
    return JSON.parse(response.output_text);
  }
  // fallback for chat completions style if returned
  if (response.choices?.[0]?.message?.content) {
    return JSON.parse(response.choices[0].message.content);
  }
  throw new Error('OpenAI 回傳格式不符合預期。');
}

// --- Google Gemini 適配器 ---
async function callGemini({ apiKey, model, baseUrl, systemPrompt, userContent }) {
  const targetModel = model || 'gemini-2.5-flash';
  const base = baseUrl || 'https://generativelanguage.googleapis.com';
  const url = new URL(`${base}/v1beta/models/${targetModel}:generateContent?key=${apiKey}`);

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n${userContent}` }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: COMPARE_SCHEMA,
      temperature: 0.2,
    },
  };

  const response = await sendJsonRequest(
    {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 65000,
    },
    payload
  );

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 未回傳有效分析內容。');
  return JSON.parse(text);
}

// --- Anthropic Claude 適配器 ---
async function callClaude({ apiKey, model, baseUrl, systemPrompt, userContent }) {
  const targetModel = model || 'claude-3-7-sonnet-latest';
  const base = baseUrl || 'https://api.anthropic.com/v1';
  const url = new URL(`${base}/messages`);

  const payload = {
    model: targetModel,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `${userContent}\n\n請務必依據指定 JSON Schema 輸出完整合法的純 JSON，不可夾帶任何 markdown 標記或額外解釋。`,
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
      timeout: 65000,
    },
    payload
  );

  const rawText = response.content?.[0]?.text;
  if (!rawText) throw new Error('Claude 未回傳有效分析內容。');

  // 清理可能夾帶的 ```json ... ```
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

// --- 本地 Local LLM (Ollama / LM Studio / OpenAI-Compatible) ---
async function callLocalLLM({ apiKey, model, baseUrl, systemPrompt, userContent }) {
  const targetUrl = baseUrl || 'http://localhost:11434/v1';
  const url = new URL(`${targetUrl}/chat/completions`);

  const payload = {
    model: model || 'qwen2.5:14b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${userContent}\n\n請嚴格回傳符合 JSON Schema 結構的純 JSON 字串：\n${JSON.stringify(COMPARE_SCHEMA)}` },
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

  const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

// ==========================================
// 5. 主處理程序 handler
// ==========================================
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: '只接受 POST 請求' }));
  }

  try {
    const {
      provider = 'openai',
      apiKey,
      model,
      baseUrl,
      household,
      properties,
      enableWebSearch = true,
    } = req.body || {};

    // 基礎驗證
    if (!properties || !Array.isArray(properties) || properties.length < 2 || properties.length > 3) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'AI 比較需選取 2 至 3 間物件。' }));
    }

    if (provider !== 'ollama' && provider !== 'local' && !apiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: `請先至「AI 設定」輸入 ${provider.toUpperCase()} API Key。` }));
    }

    // SSRF 檢驗
    const validatedBaseUrl = baseUrl ? validateBaseUrl(baseUrl) : null;

    // 1. 執行即時公開網路查核 (若啟用)
    let verifiedSources = [];
    if (enableWebSearch) {
      try {
        verifiedSources = await fetchVerifiedFacts(properties, household);
      } catch {
        // 搜尋失敗不阻斷主比較流程
        verifiedSources = [];
      }
    }

    // 2. 組裝 System Prompt (深度參與者 + 梳理主客觀落差 + 挖掘真正核心問題)
    const systemPrompt = `
你是「住得明白」系統中具備頂級決策洞察力、同理心與批判性思維的「AI 租屋決策教練與深度參與者」。

═══════════════════════════════════════
【你的角色定位：決策參與者與思維教練，而非冰冷的報表機器】
═══════════════════════════════════════
你的任務不只是整理客觀規格，更重要的是「與使用者的主觀感覺深度對話」——
1. 梳理使用者現場記錄的「主觀直覺與隨筆」與「客觀規格 / 官方查核事實」之間的落差。
2. 若使用者在主觀筆記中有明顯盲點、樂觀偏誤或不必要焦慮，必須毫不留情地坦率指出並予以更正。
3. 穿透表面上「A 物件 vs B 物件」的二選一，替使用者提煉並挖出背後真正面臨的「核心問題（The Real Question）」！

═══════════════════════════════════════
【你接收到的輸入資料結構】
═══════════════════════════════════════
1. ═══ 家庭基本背景 (全域客觀脈絡) ═══
   包含家庭成員年齡、先生/太太/孩子的上班上學地點、月收入組成與租屋核心需求清單。
2. ═══ 待比較物件客觀規格與條款 ═══
   包含租金、坪數、格局、樓層、屋齡、租約條款、修繕責任、已知設施與交通備註。
3. ═══ 使用者現場主觀直覺與看房隨筆 (subjective 欄位) ═══
   包含使用者的星級喜好評分（overallRating）、最終決策標記（decision）、最愛亮點（highlightPros）、最在意雷點（dealBreakerCons）、四大面向軟性隨筆（aspects 的現在感受 vs 未來想像）與家庭討論筆記（familyNotes）。
4. ═══ 即時公開網路查核事實摘要 (Verified Facts) ═══
   包含教育局學校額滿公告、交通局路線班距與轉乘資訊。

═══════════════════════════════════════
【核心推理與輸出準則（極其重要）】
═══════════════════════════════════════
一、梳理主客觀落差，直言更正盲點（Discrepancy Correction）：
- 在【各物件深入面向分析 (propertyAnalyses)】與【核心結論 (overallConclusion)】中，必須主動比對使用者的 subjective 感受：
  - 【主觀盲點 / 錯誤更正】：例如使用者現場覺得「有接駁車交通很順」，但查核數據顯示尖峰班距長達 25 分且容易塞車；或使用者因為「裝潢新、景觀美」給了 5 顆星，卻完全忽視了「租約規定修繕全自負」且「學區已額滿」的重大隱患，你必須一針見血地指出並更正其主觀誤判！
  - 【破除過度焦慮】：若使用者對老屋或單衛浴過度擔憂，但客觀上水電管線已翻新且租補後實質成本極低、省下的通勤時間高達每天 1.5 小時，你也應理性平反，說明真實利弊。

二、依照個案真實脈絡，診斷出使用者真正卡住或難以決策的核心問題（The Real Question）：
- 不要刻意生硬套用宏大的生活哲學公式，而是深入觀察使用者在看房筆記（最愛亮點、最在意雷點、面向隨筆、直覺打分）與家庭背景中的「真實猶豫點、拉扯與矛盾」。
- 依照個案真實情況，精準診斷出「這個家庭在此時此刻，究竟卡在什麼問題無法做決定？」：
  - 【類型 A：生活型態與區域取捨】例如：跨區大空間與綠意 vs 原生活圈的通勤便利。
  - 【類型 B：具體實務痛點的容忍度】例如：四口之家單衛浴的晨間混亂 vs 每天爬三樓追垃圾車的體力消耗；或接駁車班距能否配合小孩接送。
  - 【類型 C：風險承受度 vs 穩定感】例如：要不要承擔「老舊設備損壞自理」或「租補未定」的風險來換取低租金，還是花錢買省心？
  - 【類型 D：純粹性價比與預算極小化】例如：兩間條件類似，核心糾結純粹是「每月多花 3,000 元買電梯車位到底值不值得」。
  - 【類型 E：優劣懸殊、無複雜矛盾】若其中一間在客觀與主觀上均全面壓倒性勝出，就誠實直白地點明，無需刻意無病呻吟或硬套難題。
- 在 theRealQuestion.reframing 中，用精準、切中要害、自然且有同理心的語氣，一針見血地點破使用者當下真正卡關的核心所在，並在 optionA 與 optionB 中具體呈現兩種相互拉扯的取捨方向。

三、租約維修責任的嚴格剖析：
- 房東口頭承諾「入住前會修好」≠「入住後維修有保障」。若租約要求入住後損壞由租客負責，必須視為重大隱性財務地雷。

四、生活策略框架 (lifeStrategies)：
- 依個案為各物件提煉具體的價值定位與交換代價（得到什麼 vs 犧牲什麼）。

五、條件式排名反轉 (rankReversals)：
- 明確列出哪些關鍵事實一旦確認（例如：學區額滿排不到、房東拒絕修改修繕條款、租補被否決），會直接導致排名如何反轉。

六、輸出要求：
- 必須嚴格遵循提供的 JSON Schema。
- 全程以繁體中文（台灣習慣用語）、真誠、務實、自然且切中要害的語氣回答。
`.trim();

    // 3. 組裝 User Content (包含客觀、主觀隨筆與公開查核)
    let userContent = `
═══ 1. 家庭基本背景 (全域脈絡) ═══
${JSON.stringify(household || {}, null, 2)}

═══ 2. 待比較物件完整資料（包含客觀規格與使用者現場主觀筆記/SWOT隨筆）═══
${JSON.stringify(properties, null, 2)}
`.trim();

    if (verifiedSources.length > 0) {
      userContent += `\n\n═══ 3. 即時公開網路查核事實摘要 (Verified Facts) ═══\n${JSON.stringify(verifiedSources, null, 2)}`;
    }

    // 4. 派發至對應 Provider
    let result;
    if (provider === 'gemini') {
      result = await callGemini({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent });
    } else if (provider === 'claude') {
      result = await callClaude({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent });
    } else if (provider === 'ollama' || provider === 'local') {
      result = await callLocalLLM({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent });
    } else {
      // 預設 OpenAI
      result = await callOpenAI({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent });
    }

    // 5. 附加公開查核來源至回傳結構
    result._verifiedSources = verifiedSources;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  } catch (error) {
    // 資安原則：嚴禁 log req.body，只 log error.message
    console.error('[Compare API Error]:', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        error: error.message || 'AI 比較分析時發生未預期的錯誤。',
      })
    );
  }
};
