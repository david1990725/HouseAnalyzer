// api/compare.js - 多模型租屋與購屋決策比較引擎（依據 SKILL.md 動態載入執行）
const { fetchVerifiedFacts } = require('./search');
const {
  loadSkillPrompt,
  validateBaseUrl,
  callOpenAI,
  callGemini,
  callClaude,
  callLocalLLM,
} = require('./shared');

// ==========================================
// 1. 結構化 Schema 定義 (對齊 SKILL.md 核心規範)
// ==========================================
const COMPARE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'conclusionFirst',
    'factsAndEvidence',
    'costAndValue',
    'independentSWOT',
    'objectiveScorecard',
    'riskAssessment',
    'objectiveRecommendation',
    'residentCrossCheck',
    'costComparison',
    'theRealQuestion',
    'scenarioRankings',
    'rankReversals',
    'decisionSynthesis',
  ],
  properties: {
    // ① 先講結論（總覽排名與但書）
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

    // ② 各物件事實與證據狀態表 (SKILL.md Facts & Evidence Status)
    factsAndEvidence: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'items'],
        properties: {
          propertyName: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['item', 'finding', 'status', 'confidence'],
              properties: {
                item: { type: 'string' },
                finding: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['verified', 'reported', 'observed', 'estimated', 'unknown'],
                },
                confidence: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                },
              },
            },
          },
        },
      },
    },

    // ③ 成本與價值量化 (SKILL.md Cost & Value Calculation)
    costAndValue: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'monthlyAllInCost', 'annualAllInCost', 'unitCostCalculation', 'marketConclusion'],
        properties: {
          propertyName: { type: 'string' },
          monthlyAllInCost: { type: 'string' },
          annualAllInCost: { type: 'string' },
          unitCostCalculation: { type: 'string' },
          marketConclusion: { type: 'string' },
        },
      },
    },

    // ④ 四面向獨立客觀 SWOT (SKILL.md Independent SWOT)
    independentSWOT: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'rankLabel', 'transport', 'school', 'spaceAndCondition', 'neighbourhood'],
        properties: {
          propertyName: { type: 'string' },
          rankLabel: { type: 'string' },
          transport: {
            type: 'object',
            additionalProperties: false,
            required: ['score', 'hasWarning', 'strengths', 'weaknesses', 'opportunities', 'threats', 'keyInsight'],
            properties: {
              score: { type: 'number', minimum: 0, maximum: 10 },
              hasWarning: { type: 'boolean' },
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
            required: ['score', 'hasWarning', 'strengths', 'weaknesses', 'opportunities', 'threats', 'keyInsight'],
            properties: {
              score: { type: 'number', minimum: 0, maximum: 10 },
              hasWarning: { type: 'boolean' },
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
            required: ['score', 'hasWarning', 'strengths', 'weaknesses', 'opportunities', 'threats', 'keyInsight'],
            properties: {
              score: { type: 'number', minimum: 0, maximum: 10 },
              hasWarning: { type: 'boolean' },
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
            required: ['score', 'hasWarning', 'strengths', 'weaknesses', 'opportunities', 'threats', 'keyInsight'],
            properties: {
              score: { type: 'number', minimum: 0, maximum: 10 },
              hasWarning: { type: 'boolean' },
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
              opportunities: { type: 'array', items: { type: 'string' } },
              threats: { type: 'array', items: { type: 'string' } },
              keyInsight: { type: 'string' },
            },
          },
        },
      },
    },

    // ⑤ 客觀評分卡 7 維度 (SKILL.md Objective Scorecard)
    objectiveScorecard: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'dimensions', 'weightedTotalScore', 'riskGateStatus'],
        properties: {
          propertyName: { type: 'string' },
          dimensions: {
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
          weightedTotalScore: { type: 'number', minimum: 0, maximum: 10 },
          riskGateStatus: {
            type: 'string',
            enum: ['通過 (Clear)', '條件式通過 (Conditional)', '未通過 (Blocked)'],
          },
        },
      },
    },

    // ⑥ 結構化風險分級評估 (SKILL.md Risk Grading: Critical / High / Medium / Low)
    riskAssessment: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'risks', 'hiddenCostEstimate', 'maintenanceResponsibility', 'riskVerdict'],
        properties: {
          propertyName: { type: 'string' },
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
                grade: {
                  type: 'string',
                  enum: ['Critical', 'High', 'Medium', 'Low'],
                },
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
    },

    // ⑦ 客觀建議等級 (SKILL.md Objective Recommendation)
    objectiveRecommendation: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'recommendationLevel', 'rationale'],
        properties: {
          propertyName: { type: 'string' },
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
          rationale: { type: 'string' },
        },
      },
    },

    // ⑧ 主客觀交叉比對驗證 (SKILL.md Resident Assessment Cross-check)
    residentCrossCheck: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['propertyName', 'checks'],
        properties: {
          propertyName: { type: 'string' },
          checks: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['residentItem', 'resultStatus', 'objectiveEvidence', 'decisionImplication'],
              properties: {
                residentItem: { type: 'string' },
                resultStatus: {
                  type: 'string',
                  enum: [
                    '證實屬實 (Confirmed)',
                    '部分證實 (Partly confirmed)',
                    '尚待查證 (Unverified)',
                    '事實矛盾/偏誤 (Contradicted)',
                  ],
                },
                objectiveEvidence: { type: 'string' },
                decisionImplication: { type: 'string' },
              },
            },
          },
        },
      },
    },

    // ⑨ 跨物件租金成本實質差異
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

    // ⑩ 真正的核心問題與困境提煉 (The Real Question)
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

    // ⑪ 情境優先級動態排名 (Scenario Rankings)
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

    // ⑫ 條件式排名反轉 (Rank Reversals)
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

    // ⑬ 家庭決策綜合與實地查核行動 (Decision Synthesis & Checklist)
    decisionSynthesis: {
      type: 'object',
      additionalProperties: false,
      required: ['bestFitFor', 'consciousTradeoffs', 'negotiationPoints', 'criticalChecks', 'finalRecommendation'],
      properties: {
        bestFitFor: { type: 'string' },
        consciousTradeoffs: { type: 'array', items: { type: 'string' } },
        negotiationPoints: { type: 'array', items: { type: 'string' } },
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
// 2. 主處理程序 handler
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
        verifiedSources = [];
      }
    }

    // 2. 動態讀取專案核心大腦 SKILL.md
    const skillManual = loadSkillPrompt();

    // 3. 組裝 System Prompt（以 SKILL.md 為核心真理來源）
    const systemPrompt = `
你是「住得明白」系統的核心評估引擎。你必須嚴格遵循並執行以下【核心方法論手冊：SKILL.md】中的所有規範。

═══════════════════════════════════════
【核心方法論手冊：SKILL.md (單一真理來源)】
═══════════════════════════════════════
${skillManual}

═══════════════════════════════════════
【強制執行細則與工作流程】
═══════════════════════════════════════
1. 嚴格執行六步驟（Six-Step Workflow）：
   - Step 1: 標準化事實（分離月度/一次性成本、可用坪數計算、承諾五要素責任方歸屬）。
   - Step 2: 鎖定客觀評估（Step 1 至 Step 5 嚴禁使用或參考使用者的主觀喜好與評分）。
   - Step 3: 量化成本與價值（計算全包月成本、年度總成本、每坪單價，並與可比市場對照）。
   - Step 4: 風險分級（Critical / High / Medium / Low 四級制，禁止用加權平均掩蓋 Critical 風險）。
   - Step 5: 客觀評分（7 維度評分卡 + 風險閘門狀態 + 五級客觀建議等級）。
   - Step 6: 主客觀交叉驗證（客觀結論鎖定後，逐一對照使用者主觀感受標記：證實屬實 / 部分證實 / 尚待查證 / 事實矛盾偏誤）。
2. 偏誤控制與證據標準：
   - 每項重要聲明必須標註證據狀態：verified（已查證）、reported（口頭陳述）、observed（現場觀察）、estimated（合理推估）、unknown（未知）。
   - 禁止從距離推斷學區名額、禁止從外觀推斷無漏水、禁止將口頭承諾視為保固。
   - 資料不足時直接標記 unknown 並降低信心度，絕不可腦補捏造。
3. 挖掘核心問題（The Real Question）：
   - 精準診斷此家庭在不同方案拉扯時真正面臨的生活抉擇（如：空間與通勤拉扯、風險承受度、生活機能 vs 安靜）。
4. 輸出格式：
   - 必須嚴格遵循提供的 JSON Schema，全程繁體中文（台灣用語），文字務實、嚴謹、一針見血。
`.trim();

    // 4. 分離客觀規格與主觀筆記組裝 User Content
    const sanitizedObjectiveProps = properties.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      address: p.address,
      rent: p.rent,
      size: p.size,
      layout: p.layout,
      floor: p.floor,
      age: p.age,
      costs: p.costs,
      leaseTerms: p.leaseTerms,
      amenities: p.amenities,
      trafficAndSchool: p.trafficAndSchool,
      url: p.url,
    }));

    const userSubjectiveNotes = properties.map((p) => ({
      name: p.name,
      subjective: p.subjective || {},
    }));

    let userContent = `
═══ 1. 家庭背景需求 (全域脈絡) ═══
${JSON.stringify(household || {}, null, 2)}

═══ 2. 待比較物件客觀規格與條款 (用於 Step 1-5 客觀分析) ═══
${JSON.stringify(sanitizedObjectiveProps, null, 2)}

═══ 3. 使用者現場主觀筆記與隨筆 (僅限於 Step 6 交叉驗證時對照，禁止在客觀評分中迎合) ═══
${JSON.stringify(userSubjectiveNotes, null, 2)}
`.trim();

    if (verifiedSources.length > 0) {
      userContent += `\n\n═══ 4. 即時公開網路查核事實摘要 (Verified Facts) ═══\n${JSON.stringify(verifiedSources, null, 2)}`;
    }

    // 5. 派發至對應 Provider 適配器
    let result;
    if (provider === 'gemini') {
      result = await callGemini({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent, schema: COMPARE_SCHEMA });
    } else if (provider === 'claude') {
      result = await callClaude({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent });
    } else if (provider === 'ollama' || provider === 'local') {
      result = await callLocalLLM({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent, schema: COMPARE_SCHEMA });
    } else {
      result = await callOpenAI({ apiKey, model, baseUrl: validatedBaseUrl, systemPrompt, userContent, schema: COMPARE_SCHEMA, schemaName: 'house_comparison_analysis' });
    }

    // 附加公開查核來源
    result._verifiedSources = verifiedSources;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  } catch (error) {
    console.error('[Compare API Error]:', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        error: error.message || 'AI 比較分析時發生未預期的錯誤。',
      })
    );
  }
};
