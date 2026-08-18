const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['overallScore', 'recommendation', 'summary', 'dimensions', 'strengths', 'weaknesses', 'opportunities', 'threats', 'tradeoff', 'suitableFor', 'notSuitableFor', 'nextChecks', 'conclusion'],
  properties: {
    overallScore: { type: 'number', minimum: 0, maximum: 10 },
    recommendation: { type: 'string' },
    summary: { type: 'string' },
    dimensions: { type: 'array', minItems: 4, maxItems: 5, items: { type: 'object', additionalProperties: false, required: ['name', 'score', 'comment'], properties: { name: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 10 }, comment: { type: 'string' } } } },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    opportunities: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'confidence'], properties: { text: { type: 'string' }, confidence: { type: 'string', enum: ['confirmed', 'likely', 'possible', 'speculative'] } } } },
    threats: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'confidence'], properties: { text: { type: 'string' }, confidence: { type: 'string', enum: ['confirmed', 'likely', 'possible', 'speculative'] } } } },
    tradeoff: { type: 'string' },
    suitableFor: { type: 'array', items: { type: 'string' } },
    notSuitableFor: { type: 'array', items: { type: 'string' } },
    nextChecks: { type: 'array', items: { type: 'string' } },
    conclusion: { type: 'string' }
  }
};

function readOutput(response) {
  if (response.output_text) return response.output_text;
  return response.output?.flatMap((item) => item.content || []).find((part) => part.type === 'output_text')?.text;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST is supported.' });
  const { apiKey, model = 'gpt-5.4-nano', objective } = req.body || {};
  if (typeof apiKey !== 'string' || !apiKey.startsWith('sk-')) return res.status(400).json({ error: '請提供有效的 OpenAI API Key。' });
  if (!objective || typeof objective !== 'object' || 'subjective' in objective) return res.status(400).json({ error: '請求只能包含客觀物件資料。' });

  const instructions = '你是台灣租屋物件的客觀分析助手。只可根據提供的客觀物件資料做判斷，不得猜測使用者的喜好、家庭、收入或最終決策。資料不足時須明說，避免捏造距離、學區名額、租金行情或未來建設。機會和威脅必須標示可信程度：confirmed 為已知事實、likely 為高度可能、possible 為合理可能、speculative 為資訊不足的推論。以繁體中文、白話、務實地回覆。';
  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        instructions,
        input: `請分析以下客觀物件資料：\n${JSON.stringify(objective, null, 2)}`,
        text: { format: { type: 'json_schema', name: 'rental_property_analysis', strict: true, schema: ANALYSIS_SCHEMA } }
      })
    });
    const response = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: response.error?.message || 'OpenAI API 呼叫失敗。' });
    const output = readOutput(response);
    if (!output) throw new Error('AI 沒有回傳可讀取的分析內容。');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ analysis: JSON.parse(output) });
  } catch (error) {
    return res.status(502).json({ error: error.message || '分析時發生問題，請稍後再試。' });
  }
};
