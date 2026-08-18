// api/search.js - 零相依客觀即時網路檢索模組
const https = require('https');
const http = require('http');

/**
 * 清理 HTML 標籤
 */
function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 簡易 HTTP GET 請求（帶超時）
 */
function fetchUrl(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
          },
          timeout: timeoutMs,
        },
        (res) => {
          res.setEncoding('utf8');
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
            if (data.length > 200_000) { // 限制最大 200KB
              req.destroy();
              resolve(data);
            }
          });
          res.on('end', () => resolve(data));
        }
      );
      req.on('error', () => resolve(''));
      req.on('timeout', () => {
        req.destroy();
        resolve('');
      });
    } catch {
      resolve('');
    }
  });
}

/**
 * 透過 DuckDuckGo HTML 檢索摘要
 */
async function searchDuckDuckGo(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`;
  const html = await fetchUrl(url, 4500);
  if (!html) return [];

  const results = [];
  const regex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null && results.length < 3) {
    const cleanSnippet = stripHtml(match[1]);
    if (cleanSnippet.length > 15) {
      results.push(cleanSnippet);
    }
  }
  return results;
}

/**
 * 模糊化地址（移除門牌號碼與巷弄號，保留行政區與主要路段以保護隱私）
 */
function fuzzAddress(address) {
  if (!address) return '';
  return address
    .replace(/\d+號.*/g, '')
    .replace(/\d+巷.*/g, '')
    .replace(/\d+弄.*/g, '')
    .replace(/^[0-9]{3,5}/, '')
    .trim();
}

/**
 * 為物件與家庭執行客觀事實檢索
 * @param {Array} properties - 物件清單
 * @param {Object} household - 家庭基本資料
 * @returns {Promise<Array>} 查核事實摘要清單
 */
async function fetchVerifiedFacts(properties, household) {
  const verifiedFacts = [];
  const searchPromises = [];

  // 1. 針對各物件的學區與交通進行模糊化搜尋
  for (const p of properties) {
    const fuzzedAddr = fuzzAddress(p.address);
    const region = fuzzedAddr || p.name;

    // 學區額滿與入學資格搜尋
    if (p.schoolNotes || region) {
      const schoolQuery = `${region} ${p.schoolNotes || ''} 額滿 學區 入學`.trim();
      searchPromises.push(
        searchDuckDuckGo(schoolQuery).then((snippets) => {
          if (snippets.length > 0) {
            verifiedFacts.push({
              property: p.name,
              topic: '學區與學校現況',
              query: schoolQuery,
              findings: snippets.join('；'),
            });
          }
        })
      );
    }

    // 交通與重大建設搜尋
    if (p.trafficNotes || region) {
      const trafficQuery = `${region} ${p.trafficNotes || ''} 公車 捷運 交通`.trim();
      searchPromises.push(
        searchDuckDuckGo(trafficQuery).then((snippets) => {
          if (snippets.length > 0) {
            verifiedFacts.push({
              property: p.name,
              topic: '交通與建設現況',
              query: trafficQuery,
              findings: snippets.join('；'),
            });
          }
        })
      );
    }
  }

  // 2. 針對家庭通勤地點的公車/捷運直達路線搜尋
  if (household?.commute && Array.isArray(household.commute)) {
    for (const c of household.commute) {
      if (c.location && properties[0]) {
        const commuteQuery = `${fuzzAddress(properties[0].address)} 到 ${c.location} 公車 捷運 通勤時間`.trim();
        searchPromises.push(
          searchDuckDuckGo(commuteQuery).then((snippets) => {
            if (snippets.length > 0) {
              verifiedFacts.push({
                property: '整體通勤參考',
                topic: `${c.who || '家庭成員'} 通勤路線`,
                query: commuteQuery,
                findings: snippets.join('；'),
              });
            }
          })
        );
      }
    }
  }

  // 最多並行搜尋，並限制總等待時間 4 秒（避免拖慢主 AI 運算）
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 4000));
  await Promise.race([Promise.all(searchPromises.slice(0, 6)), timeoutPromise]);

  return verifiedFacts;
}

module.exports = {
  fetchVerifiedFacts,
  stripHtml,
  fuzzAddress,
};
