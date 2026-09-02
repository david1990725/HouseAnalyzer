// api/analyze.js - 單物件客觀深度分析引擎（依據 SKILL.md 動態載入執行，嚴格純客觀）
const {
  loadSkillPrompt,
  validateBaseUrl,
  callOpenAI,
  callGemini,
  callClaude,
  callLocalLLM,
} = require('./shared');

const SINGLE_ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'propertyName',
    'overallScore',
    'recommendationLevel',
    'riskGateStatus',
    'summary',
    'factsAndEvidence',
    'costAndValue',
    'independentSWOT',
    'objectiveScorecard',
    'riskAssessment',
    'criticalChecks',
    'conclusion',
  ],
  properties: {
    propertyName: { type: 'string' },
    overallScore: { type: 'number', minimum: 0, maximum: 10 },
    recommendationLevel: {
      type: 'string',
      enum: [
        '強力推薦 (Strongly recommend)',
        '附條件推薦 (Recommend with conditions)',
        '列入考慮 (Consider)',
        '不建議 (Do not recommend)',
        '強烈排除 (Reject)',
      ],
    },
    riskGateStatus: {
      type: 'string',
      enum: ['通過 (Clear)', '條件式通過 (Conditional)', '未通過 (Blocked)'],
    },
    summary: { type: 'string' },
    factsAndEvidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'finding', 'status', 'confidence'],
        properties: {
          item: { type: 'string' },
          finding: { type: 'string' },
          status: { type: 'string', enum: ['verified', 'reported', 'observed', 'estimated', 'unknown'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    costAndValue: {
      type: 'object',
      additionalProperties: false,
      required: ['monthlyAllInCost', 'annualAllInCost', 'unitCostCalculation', 'marketConclusion'],
      properties: {
        monthlyAllInCost: { type: 'string' },
        annualAllInCost: { type: 'string' },
        unitCostCalculation: { type: 'string' },
        marketConclusion: { type: 'string' },
      },
    },
    independentSWOT: {
      type: 'object',
      additionalProperties: false,
      required: ['transport', 'school', 'spaceAndCondition', 'neighbourhood'],
      properties: {
        transport: {
          type: 'object',
          additionalProperties: false,
          required: ['score', 'strengths', 'weaknesses', 'opportunities', 'threats', 'keyInsight'],
          properties: {
            score: { type: 'number', minimum: 0, maximum: 10 },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
            threats: { type: 'array', items: { type: 'string' } },
            keyInsight: { type: 'string' },
          },
        },
        school: {
          type: 'object',
          additionalProperties: false,
          required: ['score', 'strengths', 'weaknesses', 'opportunities', 'threats', 'keyInsight'],
          properties: {
            score: { type: 'number', minimum: 0, maximum: 10 },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
            threats: { type: 'array', items: { type: 'string' } },
            keyInsight: { type: 'string' },
          },
        },
        spaceAndCondition: {
          type: 'object',
          additionalProperties: false,
          required: ['score', 'strengths', 'weaknesses', 'opportunities', 'threats', 'keyInsight'],
          properties: {
            score: { type: 'number', minimum: 0, maximum: 10 },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
            threats: { type: 'array', items: { type: 'string' } },
            keyInsight: { type: 'string' },
          },
        },
        neighbourhood: {
          type: 'object',
          additionalProperties: false,
          required: ['score', 'strengths', 'weaknesses', 'opportunities', 'threats', 'keyInsight'],
          properties: {
            score: { type: 'number', minimum: 0, maximum: 10 },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
            threats: { type: 'array', items: { type: 'string' } },
            keyInsight: { type: 'string' },
          },
        },
      },
    },
    objectiveScorecard: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dimensionName', 'score', 'weight', 'rationale'],
        properties: {
          dimensionName: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 10 },
          weight: { type: 'string' },
          rationale: { type: 'string' },
        },
      },
    },
    riskAssessment: {
      type: 'object',
      additionalProperties: false,
      required: ['risks', 'hiddenCostEstimate', 'maintenanceResponsibility', 'riskVerdict'],
      properties: {
        maintenanceResponsibility: { type: 'string' },
        hiddenCostEstimate: { type: 'string' },
        riskVerdict: { type: 'string' },
        risks: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['riskName', 'grade', 'evidence', 'consequence', 'mitigation', 'responsibleParty', 'decisionImpact'],
            properties: {
              riskName: { type: 'string' },
              grade: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
              evidence: { type: 'string' },
              consequence: { type: 'string' },
              mitigation: { type: 'string' },
              responsibleParty: { type: 'string' },
              decisionImpact: { type: 'string' },
            },
          },
        },
      },
    },
    criticalChecks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['checkItem', 'reason'],
        properties: {
          checkItem: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
    conclusion: { type: 'string' },
  },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: '只支援 POST 請求。' }));
  }

  try {
    const {
      provider = 'openai',
      apiKey,
      model,
      baseUrl,
      objective,
    } = req.body || {};

    if (provider !== 'ollama' && provider !== 'local' && !apiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: '請提供有效的 API Key。' }));
    }

    if (!objective || typeof objective !== 'object' || 'subjective' in objective) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: '單物件分析端點嚴格只接收客觀物件資料，不得包含 subjective 欄位。' }));
    }

    const validatedBaseUrl = baseUrl ? validateBaseUrl(baseUrl) : null;
    const skillManual = loadSkillPrompt();

    const systemPrompt = `
你是「住得明白」系統的單物件客觀評估引擎。你必須嚴格遵守以下方法論手冊（SKILL.md）中的 Step 1 至 Step 5 客觀規範：

═══════════════════════════════════════
【核心方法論手冊：SKILL.md】
═══════════════════════════════════════
${skillManual}

═══════════════════════════════════════
【單物件分析執行準則】
═══════════════════════════════════════
1. 嚴格基於提供的客觀規格進行獨立 SWOT、全包成本計算、四級風險分級（Critical/High/Medium/Low）與 7 維度評分卡評估。
2. 標註所有事實的證據狀態（verified/reported/observed/estimated/unknown）。
3. 嚴格輸出符合 JSON Schema 的純 JSON，以繁體中文回答。
`.trim();

    const userContent = `請對以下單一客觀物件進行完整評估分析：\n${JSON.stringify(objective, null, 2)}`;

    let result;
    if (provider === 'gemini') {
      result = await callGemini({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent, schema: SINGLE_ANALYSIS_SCHEMA });
    } else if (provider === 'claude') {
      result = await callClaude({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent });
    } else if (provider === 'ollama' || provider === 'local') {
      result = await callLocalLLM({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent, schema: SINGLE_ANALYSIS_SCHEMA });
    } else {
      result = await callOpenAI({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent, schema: SINGLE_ANALYSIS_SCHEMA, schemaName: 'single_property_evaluation' });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ analysis: result }));
  } catch (error) {
    console.error('[Analyze API Error]:', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: error.message || '單物件分析時發生問題，請稍後再試。' }));
  }
};
