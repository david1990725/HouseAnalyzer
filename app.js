/**
 * 住得明白｜AI Rental Property Analyzer - Core Application Logic
 * Standard:
 *  - Zero Emojis (Vector SVG Icons & Badges only)
 *  - Local-First Architecture (Subjective notes never leave device)
 *  - Multi-Provider Adapter (OpenAI, Gemini, Claude, Ollama, LM Studio)
 */

// ==========================================
// 1. 全域工具函式 (Utilities)
// ==========================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]*>/g, '')
    .trim();
}

// ==========================================
// 2. 本機儲存層 (Local-First Stores)
// ==========================================
const STORAGE_KEYS = {
  HOUSEHOLD: 'house_analyzer_household',
  PROPERTIES: 'house_analyzer_properties',
  REPORTS: 'house_analyzer_reports_v1',
  PROVIDER: 'house_analyzer_provider',
  MODEL: 'house_analyzer_model',
  BASE_URL: 'house_analyzer_baseurl',
  WEB_SEARCH: 'house_analyzer_websearch',
  API_KEY: 'house_analyzer_apikey', // 存於 sessionStorage
};

// 預設示範家庭資料 (全新去識別化示範背景)
const DEFAULT_HOUSEHOLD = {
  members: [
    { role: '先生', age: 38, note: '硬體研發工程師' },
    { role: '太太', age: 34, note: '國中英語教師' },
    { role: '女兒', age: 7, note: '國小一年級' },
    { role: '兒子', age: 4, note: '幼兒園中班' },
  ],
  commute: [
    { who: '先生', location: '台北市內湖科學園區（瑞光路）' },
    { who: '太太', location: '新北市板橋區（近板橋高中）' },
  ],
  currentAddress: '新北市中和區景平路',
  currentArea: '南勢角、景安生活圈',
  income: {
    entries: [
      { who: '先生', amount: 55000 },
      { who: '太太', amount: 48000 },
    ],
    other: '額外兼職與津貼約 8,000/月',
  },
  requirements: ['申請租屋補貼', '需入戶籍', '注重孩童學區教育', '家庭空間充足', '需要平面車位', '需要電梯'],
};

// 預設示範三間物件資料 (新店青山綠境、三重碧波水漾、文山靜巷雅舍)
const DEFAULT_PROPERTIES = [
  {
    id: 'prop-sample-1',
    name: '01 青山綠境',
    type: '電梯大樓',
    address: '231新北市新店區安祥路100號',
    rent: 23000,
    size: '34 坪',
    layout: '3 房 2 廳 2 衛 1 陽台',
    floor: '10 / 18 樓',
    age: '約 8 年',
    costs: {
      managementFee: '另計 1800 元/月',
      parkingFee: '包含 (平面車位)',
      subsidy: '可申請',
    },
    leaseTerms: '房東附全套冷氣與實木家具，租期簽兩年；日常設備自然耗損由房東維修，人為損壞由租客自理。',
    amenities: '社區泳池、健身房、垃圾代收、24H保全管理、天然瓦斯、平面車位；高樓層採光極佳，客廳落地窗面山景。',
    trafficAndSchool: '近安坑輕軌安康站，社區有直達七張捷運站接駁公車；學區為雙城國小、安康高中附設國中部。',
    url: 'https://example.com/sample-1',
    subjective: {
      overallRating: 4,
      decision: '值得議價',
      highlightPros: '視野山景開闊安靜，公設新穎完整，34坪大三房空間住起來很舒服放鬆。',
      dealBreakerCons: '開車進台北市區上下班容易在安康路塞車，且管理費每月1800元需另計。',
      aspects: {
        transportation: { rating: 'neutral', now: '依賴社區接駁車與開車，進台北市約50分鐘。', future: '期待安坑輕軌轉乘路網更成熟；但尖峰通勤時間仍需注意。' },
        school: { rating: 'positive', now: '雙城國小有名額且可搭校車，就學確定性高。', future: '國中階段需評估是否轉往市區學校。' },
        condition: { rating: 'positive', now: '8年新屋齡屋況佳，廚衛設備齊全，採光極佳。', future: '社區管委會運作良好，長期公設維護有保障。' },
        neighborhood: { rating: 'positive', now: '山景綠意安靜清幽，社區內有超商與生活超市。', future: '休閒生活品質高，但非市中心熱鬧商圈。' },
      },
      familyNotes: '太太喜歡山景採光與社區大空間，但需要跟房東討論管理費是否能稍微折讓。',
    },
  },
  {
    id: 'prop-sample-2',
    name: '02 碧波水漾',
    type: '電梯大樓',
    address: '241新北市三重區集英路88號',
    rent: 28000,
    size: '31 坪',
    layout: '3 房 2 廳 2 衛',
    floor: '5 / 12 樓',
    age: '約 12 年',
    costs: {
      managementFee: '包含於租金',
      parkingFee: '另計 2500 元/月',
      subsidy: '可申請 (新北市租補)',
    },
    leaseTerms: '一年一約，水電瓦斯依公營事業帳單自行繳納，退租時需完成基本清潔。',
    amenities: '電梯大樓、天然瓦斯、垃圾冷藏處理、戶數單純一層三戶、主臥有浴缸；現況無附洗衣機需自備。',
    trafficAndSchool: '過重陽橋即到台北市士林區，公車816直達士林捷運站；學區為五華國小（雙語額滿學校）、碧華國中。',
    url: 'https://example.com/sample-2',
    subjective: {
      overallRating: 5,
      decision: '優先考慮',
      highlightPros: '過重陽橋就到士林，重劃區街道整齊公園多，五華國小雙語教育資源優秀！',
      dealBreakerCons: '若加租車位每月需另加2500元使總支出偏高，且五華國小需確認入籍年資。',
      aspects: {
        transportation: { rating: 'positive', now: '過橋即進北市，公車與開車進市區非常迅速。', future: '北環段捷運預計未來完工，交通潛力大。' },
        school: { rating: 'neutral', now: '五華國小是熱門雙語學校，需盡快遷戶籍排隊。', future: '若額滿需有分發至碧華國小的備用方案。' },
        condition: { rating: 'positive', now: '格局方正乾淨，通風好，主衛有對外窗。', future: '需自行添購洗衣機，其他大型家電狀況良好。' },
        neighborhood: { rating: 'positive', now: '家樂福生活圈成熟，河濱公園散步運動方便。', future: '重劃區住戶水準齊整，環境穩定。' },
      },
      familyNotes: '交通與學區綜合平衡度最高，若能順利申請租補，每月負擔在可控範圍內。',
    },
  },
  {
    id: 'prop-sample-3',
    name: '03 靜巷雅舍',
    type: '無電梯公寓',
    address: '116台北市文山區景興路150巷',
    rent: 25000,
    size: '28 坪',
    layout: '3 房 2 廳 1 衛 2 陽台',
    floor: '3 / 4 樓',
    age: '約 32 年',
    costs: {
      managementFee: '無管理費',
      parkingFee: '無車位 / 附近好停',
      subsidy: '可申請 (台北市最高補貼)',
    },
    leaseTerms: '房東同意設籍並協助申請台北市租屋補貼，室內剛重新粉刷，水電管線5年前翻新過。',
    amenities: '前後雙陽台採光通風好、近愛買與景美夜市生活機能極佳；但無電梯需爬3樓，無垃圾代收需自行等垃圾車。',
    trafficAndSchool: '步行5分鐘至景美捷運站，公車路線四通八達直達大安區；學區為景美國小、景美國中。',
    url: '',
    subjective: {
      overallRating: 4,
      decision: '值得議價',
      highlightPros: '捷運站步行5分鐘生活極方便！台北市租補金額最高，實質負擔很低。',
      dealBreakerCons: '只有1間衛浴四口人早上會搶，無電梯且需自行倒垃圾。',
      aspects: {
        transportation: { rating: 'positive', now: '捷運與公車極為便利，上班通勤時間最短。', future: '完全不依賴汽車，省下高額養車成本。' },
        school: { rating: 'positive', now: '景美國小走路可達，老牌文教區資源豐富。', future: '台北市學區與升學管道成熟穩定。' },
        condition: { rating: 'neutral', now: '室內水電有翻新過，但只有1間衛浴稍嫌不足。', future: '老屋無電梯，3樓爬梯尚可接受但帶推車稍累。' },
        neighborhood: { rating: 'positive', now: '市場、超商、夜市、河濱公園機能成熟應有盡有。', future: '文山區文教住宅區，居住氛圍安全穩定。' },
      },
      familyNotes: '地段與租補優勢極強，先生上班最快，主要缺點是單衛浴和要追垃圾車。',
    },
  },
];

const EMPTY_HOUSEHOLD = {
  members: [],
  commute: [],
  currentAddress: '',
  currentArea: '',
  income: {
    entries: [],
    other: '',
  },
  requirements: [],
};

const HouseholdStore = {
  get() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HOUSEHOLD);
      if (!raw) return { ...EMPTY_HOUSEHOLD };
      return JSON.parse(raw);
    } catch {
      return { ...EMPTY_HOUSEHOLD };
    }
  },
  save(data) {
    localStorage.setItem(STORAGE_KEYS.HOUSEHOLD, JSON.stringify(data));
  },
};

const PropertyStore = {
  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },
  saveAll(list) {
    localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(list));
  },
  getById(id) {
    return this.getAll().find((p) => p.id === id);
  },
  save(prop) {
    const list = this.getAll();
    const idx = list.findIndex((p) => p.id === prop.id);
    if (idx >= 0) {
      list[idx] = prop;
    } else {
      list.push(prop);
    }
    this.saveAll(list);
  },
  delete(id) {
    const list = this.getAll().filter((p) => p.id !== id);
    this.saveAll(list);
  },
};

const ReportStore = {
  getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  getById(id) {
    return this.getAll().find((r) => r.id === id) || null;
  },
  save(report) {
    const list = this.getAll();
    const existingIndex = list.findIndex((r) => r.id === report.id);
    if (existingIndex >= 0) {
      list[existingIndex] = report;
    } else {
      list.unshift(report);
    }
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(list));
    return report;
  },
  delete(id) {
    const list = this.getAll().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(list));
  },
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
  },
};

const SettingsStore = {
  get() {
    return {
      provider: localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'openai',
      model: localStorage.getItem(STORAGE_KEYS.MODEL) || 'gpt-4o-mini',
      baseUrl: localStorage.getItem(STORAGE_KEYS.BASE_URL) || '',
      enableWebSearch: localStorage.getItem(STORAGE_KEYS.WEB_SEARCH) !== 'false',
      apiKey: sessionStorage.getItem(STORAGE_KEYS.API_KEY) || '',
    };
  },
  save(data) {
    if (data.provider) localStorage.setItem(STORAGE_KEYS.PROVIDER, data.provider);
    if (data.model) localStorage.setItem(STORAGE_KEYS.MODEL, data.model);
    if (data.baseUrl !== undefined) localStorage.setItem(STORAGE_KEYS.BASE_URL, data.baseUrl);
    localStorage.setItem(STORAGE_KEYS.WEB_SEARCH, data.enableWebSearch ? 'true' : 'false');
    if (data.apiKey !== undefined) {
      sessionStorage.setItem(STORAGE_KEYS.API_KEY, data.apiKey);
    }
  },
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.PROPERTIES);
    localStorage.removeItem(STORAGE_KEYS.HOUSEHOLD);
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
    localStorage.removeItem(STORAGE_KEYS.PROVIDER);
    localStorage.removeItem(STORAGE_KEYS.MODEL);
    localStorage.removeItem(STORAGE_KEYS.BASE_URL);
    localStorage.removeItem(STORAGE_KEYS.WEB_SEARCH);
    sessionStorage.removeItem(STORAGE_KEYS.API_KEY);
    PropertyStore.saveAll([]);
    HouseholdStore.save(EMPTY_HOUSEHOLD);
    ReportStore.clearAll();
  },
};

// ==========================================
// 3. 全域應用程式狀態 (State)
// ==========================================
const State = {
  currentView: 'home', // 'home' | 'list' | 'reports' | 'compare'
  selectedPropertyIds: new Set(),
  lastComparisonResult: null,
  lastComparisonContext: null,
  viewingSavedReportId: null,
  previousView: 'list',
};

// ==========================================
// 4. 視圖導航切換 (View Navigation)
// ==========================================
function switchView(viewName) {
  if (State.currentView !== 'compare') {
    State.previousView = State.currentView;
  }
  State.currentView = viewName;

  const homeSec = document.getElementById('view-home');
  const listSec = document.getElementById('view-list');
  const reportsSec = document.getElementById('view-reports');
  const compSec = document.getElementById('view-compare');
  const topHeading = document.getElementById('topbar-heading');
  const topActions = document.getElementById('topbar-actions');
  const topEyebrow = document.getElementById('topbar-eyebrow');
  const navHomeBtn = document.getElementById('nav-home-btn');
  const navListBtn = document.getElementById('nav-list-btn');
  const navReportsBtn = document.getElementById('nav-reports-btn');

  // 重設所有導覽狀態
  if (navHomeBtn) navHomeBtn.classList.remove('active');
  if (navListBtn) navListBtn.classList.remove('active');
  if (navReportsBtn) navReportsBtn.classList.remove('active');
  if (homeSec) {
    homeSec.classList.remove('active');
    homeSec.style.display = 'none';
  }
  if (listSec) {
    listSec.classList.remove('active');
    listSec.style.display = 'none';
  }
  if (reportsSec) {
    reportsSec.classList.remove('active');
    reportsSec.style.display = 'none';
  }
  if (compSec) {
    compSec.classList.remove('active');
    compSec.style.display = 'none';
  }

  if (viewName === 'home') {
    document.body.classList.add('is-home-view');
    if (homeSec) {
      homeSec.classList.add('active');
      homeSec.style.display = 'block';
    }
    if (navHomeBtn) navHomeBtn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'list') {
    document.body.classList.remove('is-home-view');
    if (listSec) {
      listSec.classList.add('active');
      listSec.style.display = 'block';
    }
    if (topEyebrow) topEyebrow.textContent = 'AI RENTAL PROPERTY COMPARATOR';
    if (topHeading) topHeading.textContent = '我的租屋物件';
    if (topActions) topActions.style.display = 'flex';
    if (navListBtn) navListBtn.classList.add('active');
    renderPropertyList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'reports') {
    document.body.classList.remove('is-home-view');
    if (reportsSec) {
      reportsSec.classList.add('active');
      reportsSec.style.display = 'block';
    }
    if (topEyebrow) topEyebrow.textContent = 'SAVED AI COMPARISON REPORTS';
    if (topHeading) topHeading.textContent = '歷史分析結果';
    if (topActions) topActions.style.display = 'none';
    if (navReportsBtn) navReportsBtn.classList.add('active');
    renderReportList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'compare') {
    document.body.classList.remove('is-home-view');
    if (compSec) {
      compSec.classList.add('active');
      compSec.style.display = 'block';
    }
    if (topEyebrow) topEyebrow.textContent = 'AI COMPARATIVE DECISION REPORT';
    if (topHeading) topHeading.textContent = 'AI 租屋橫向比較報告';
    if (topActions) topActions.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function renderStarsSvg(score = 0) {
  let starsHtml = '<span class="star-rating-display">';
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= score;
    starsHtml += `<svg class="icon-svg star-icon ${isFilled ? 'filled' : 'empty'}" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  }
  starsHtml += '</span>';
  return starsHtml;
}

// ==========================================
// 5. 物件卡片清單渲染 (List View Rendering)
// ==========================================
function renderPropertyList() {
  const grid = document.getElementById('property-grid');
  const emptyState = document.getElementById('empty-state');
  const totalStats = document.getElementById('stat-total-props');
  const selectedStats = document.getElementById('stat-selected-props');

  const list = PropertyStore.getAll();

  if (totalStats) totalStats.textContent = list.length;
  if (selectedStats) selectedStats.textContent = `${State.selectedPropertyIds.size} / 3`;

  if (list.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    updateCompareBar();
    return;
  }

  emptyState.style.display = 'none';

  grid.innerHTML = list
    .map((p) => {
      const isSelected = State.selectedPropertyIds.has(p.id);
      const subj = p.subjective || {};
      const decisionClass = subj.decision || '';
      const proQuote = subj.highlightPros ? escapeHtml(subj.highlightPros) : (subj.dealBreakerCons ? escapeHtml(subj.dealBreakerCons) : '點擊卡片記錄看房第一直覺與筆記...');

      return `
      <article class="prop-card ${isSelected ? 'selected' : ''}" data-id="${escapeHtml(p.id)}">
        <div class="prop-card-header">
          <div>
            <h3 class="prop-card-title">${escapeHtml(p.name)}</h3>
            <p class="prop-card-address">${escapeHtml(p.address || '未填寫地址')}</p>
          </div>
          <label class="prop-select-checkbox">
            <input type="checkbox" class="prop-checkbox" data-id="${escapeHtml(p.id)}" ${isSelected ? 'checked' : ''} />
            比對
          </label>
        </div>

        <div class="prop-specs-row">
          <span class="prop-tag rent-tag">$${Number(p.rent || 0).toLocaleString()} /月</span>
          <span class="prop-tag">${escapeHtml(p.type || '未指定型態')}</span>
          ${p.size ? `<span class="prop-tag">${escapeHtml(p.size)}</span>` : ''}
          ${p.layout ? `<span class="prop-tag">${escapeHtml(p.layout)}</span>` : ''}
          ${p.age ? `<span class="prop-tag">${escapeHtml(p.age)}</span>` : ''}
        </div>

        <div class="prop-subjective-box">
          <div class="prop-subj-header">
            <span class="prop-rating-stars" title="直覺喜好評分">${renderStarsSvg(subj.overallRating || 0)}</span>
            ${subj.decision ? `<span class="decision-badge ${escapeHtml(decisionClass)}">${escapeHtml(subj.decision)}</span>` : '<span class="subtle">未決策</span>'}
          </div>
          <p class="prop-subj-quote">"${proQuote}"</p>
        </div>

        <div class="prop-card-actions">
          <button class="outline-button edit-prop-btn" data-id="${escapeHtml(p.id)}">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            編輯 / 筆記
          </button>
          <button class="outline-button export-prop-btn" data-id="${escapeHtml(p.id)}">
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            下載 MD
          </button>
          <button class="danger-button delete-prop-btn" data-id="${escapeHtml(p.id)}" title="刪除物件">
            <svg class="icon-svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </article>
    `;
    })
    .join('');

  // 綁定卡片選取核取方塊
  grid.querySelectorAll('.prop-checkbox').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      if (e.target.checked) {
        if (State.selectedPropertyIds.size >= 3) {
          e.target.checked = false;
          alert('最多只能選取 3 間物件進行橫向比較分析！');
          return;
        }
        State.selectedPropertyIds.add(id);
      } else {
        State.selectedPropertyIds.delete(id);
      }
      renderPropertyList();
    });
  });

  grid.querySelectorAll('.edit-prop-btn').forEach((btn) => {
    btn.addEventListener('click', () => openPropertyDialog(btn.dataset.id));
  });

  grid.querySelectorAll('.export-prop-btn').forEach((btn) => {
    btn.addEventListener('click', () => exportPropertyMarkdown(btn.dataset.id));
  });

  grid.querySelectorAll('.delete-prop-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const prop = PropertyStore.getById(id);
      if (confirm(`確定要刪除「${prop?.name || '此物件'}」嗎？本機資料將被移除。`)) {
        PropertyStore.delete(id);
        State.selectedPropertyIds.delete(id);
        renderPropertyList();
      }
    });
  });

  updateCompareBar();
}

function updateCompareBar() {
  const bar = document.getElementById('compare-bar');
  const countBadge = document.getElementById('compare-count-badge');
  const barText = document.getElementById('compare-bar-text');
  const startBtn = document.getElementById('start-compare-btn');

  const count = State.selectedPropertyIds.size;
  if (count > 0) {
    bar.classList.add('active');
    countBadge.textContent = `已選取 ${count} 間`;
    if (count === 1) {
      barText.textContent = '請再選取 1 至 2 間物件以啟動橫向對比';
      startBtn.disabled = true;
    } else {
      barText.textContent = `已就緒！可立即啟動多模型客觀比較 (${count} 間)`;
      startBtn.disabled = false;
    }
  } else {
    bar.classList.remove('active');
  }
}

// ==========================================
// 6. Markdown 匯出與匯入 (Security Sanitized)
// ==========================================
function downloadFile(content, fileName, mimeType = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportPropertyMarkdown(id) {
  const p = PropertyStore.getById(id);
  if (!p) return;

  const subj = p.subjective || {};
  const aspects = subj.aspects || {};

  const md = `# ${p.name || '未命名物件'}

## 基本客觀條件
- 型態: ${p.type || ''}
- 地址: ${p.address || ''}
- 月租金: ${p.rent || 0} 元/月
- 坪數: ${p.size || ''}
- 格局: ${p.layout || ''}
- 樓層: ${p.floor || ''}
- 屋齡: ${p.age || ''}
- 管理費: ${p.costs?.managementFee || '包含'}
- 停車位: ${p.costs?.parkingFee || '無'}
- 租屋補貼: ${p.costs?.subsidy || '待確認'}

## 租約條款與維修責任
${p.leaseTerms || '無特別約定'}

## 設備與已知屋況
${p.amenities || '無'}

## 交通與學區可驗證備註
${p.trafficAndSchool || '無'}

## 參考連結
${p.url || '無'}

---

## 我的主觀想法（本地保存，AI 比較時用於偏誤檢驗）
- 主觀喜好: ${subj.overallRating || 0} / 5
- 最終決策: ${subj.decision || '尚未決定'}

### 最喜歡的地方
${subj.highlightPros || '無'}

### 最在意的缺點
${subj.dealBreakerCons || '無'}

### 四大面向觀察（前瞻隨筆）
#### 交通 (${aspects.transportation?.rating || '未評'})
- 現在感受: ${aspects.transportation?.now || '無'}
- 未來想像: ${aspects.transportation?.future || '無'}

#### 學區 (${aspects.school?.rating || '未評'})
- 現在感受: ${aspects.school?.now || '無'}
- 未來想像: ${aspects.school?.future || '無'}

#### 空間屋況 (${aspects.condition?.rating || '未評'})
- 現在感受: ${aspects.condition?.now || '無'}
- 未來想像: ${aspects.condition?.future || '無'}

#### 周邊環境 (${aspects.neighborhood?.rating || '未評'})
- 現在感受: ${aspects.neighborhood?.now || '無'}
- 未來想像: ${aspects.neighborhood?.future || '無'}

### 其他看房筆記
${subj.familyNotes || '無'}
`;

  const safeName = (p.name || 'property').replace(/[^\w\u4e00-\u9fa5]/g, '_');
  downloadFile(md, `${safeName}.md`);
}

async function handleImportMarkdown(file) {
  if (file.size > 100 * 1024) {
    alert('安全限制：上傳檔案大小不得超過 100KB。');
    return;
  }
  if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
    alert('請上傳 .md 格式的 Markdown 檔案。');
    return;
  }

  const text = await file.text();
  const lines = text.split('\n');

  const prop = {
    id: 'prop-' + Date.now(),
    name: '匯入物件',
    type: '電梯大樓',
    address: '',
    rent: 0,
    size: '',
    layout: '',
    floor: '',
    age: '',
    costs: { managementFee: '包含', parkingFee: '無', subsidy: '待確認' },
    leaseTerms: '',
    amenities: '',
    trafficAndSchool: '',
    url: '',
    subjective: {
      overallRating: 0,
      decision: '',
      highlightPros: '',
      dealBreakerCons: '',
      aspects: {
        transportation: { rating: '', now: '', future: '' },
        school: { rating: '', now: '', future: '' },
        condition: { rating: '', now: '', future: '' },
        neighborhood: { rating: '', now: '', future: '' },
      },
      familyNotes: '',
    },
  };

  let section = '';
  let subSection = '';

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('# ')) {
      prop.name = stripHtml(line.replace(/^#\s*/, ''));
      continue;
    }

    if (line.startsWith('## ')) {
      section = line.replace(/^##\s*/, '');
      subSection = '';
      continue;
    }

    if (line.startsWith('### ')) {
      subSection = line.replace(/^###\s*/, '');
      continue;
    }

    if (line.startsWith('#### ')) {
      subSection = line.replace(/^####\s*/, '');
      continue;
    }

    if (section === '基本客觀條件' && line.startsWith('- ')) {
      const [k, ...vParts] = line.replace(/^- /, '').split(':');
      const v = stripHtml(vParts.join(':').trim());
      if (k.includes('型態')) prop.type = v;
      if (k.includes('地址')) prop.address = v;
      if (k.includes('租金')) prop.rent = parseInt(v.replace(/[^\d]/g, '')) || 0;
      if (k.includes('坪數')) prop.size = v;
      if (k.includes('格局')) prop.layout = v;
      if (k.includes('樓層')) prop.floor = v;
      if (k.includes('屋齡')) prop.age = v;
      if (k.includes('管理費')) prop.costs.managementFee = v;
      if (k.includes('停車位')) prop.costs.parkingFee = v;
      if (k.includes('租屋補貼')) prop.costs.subsidy = v;
      continue;
    }

    if (section === '租約條款與維修責任') {
      prop.leaseTerms = prop.leaseTerms ? prop.leaseTerms + '\n' + stripHtml(line) : stripHtml(line);
      continue;
    }

    if (section === '設備與已知屋況') {
      prop.amenities = prop.amenities ? prop.amenities + '\n' + stripHtml(line) : stripHtml(line);
      continue;
    }

    if (section === '交通與學區可驗證備註') {
      prop.trafficAndSchool = prop.trafficAndSchool ? prop.trafficAndSchool + '\n' + stripHtml(line) : stripHtml(line);
      continue;
    }

    if (section === '參考連結') {
      prop.url = stripHtml(line);
      continue;
    }

    if (section.includes('主觀想法')) {
      if (line.startsWith('- 主觀喜好:')) {
        prop.subjective.overallRating = parseInt(line.replace(/[^\d]/g, '')) || 0;
      } else if (line.startsWith('- 最終決策:')) {
        prop.subjective.decision = stripHtml(line.replace('- 最終決策:', '').trim());
      } else if (subSection === '最喜歡的地方') {
        prop.subjective.highlightPros = prop.subjective.highlightPros ? prop.subjective.highlightPros + '\n' + stripHtml(line) : stripHtml(line);
      } else if (subSection === '最在意的缺點') {
        prop.subjective.dealBreakerCons = prop.subjective.dealBreakerCons ? prop.subjective.dealBreakerCons + '\n' + stripHtml(line) : stripHtml(line);
      } else if (subSection.includes('交通')) {
        if (line.startsWith('- 現在感受:')) prop.subjective.aspects.transportation.now = stripHtml(line.replace('- 現在感受:', '').trim());
        if (line.startsWith('- 未來想像:')) prop.subjective.aspects.transportation.future = stripHtml(line.replace('- 未來想像:', '').trim());
      } else if (subSection.includes('學區')) {
        if (line.startsWith('- 現在感受:')) prop.subjective.aspects.school.now = stripHtml(line.replace('- 現在感受:', '').trim());
        if (line.startsWith('- 未來想像:')) prop.subjective.aspects.school.future = stripHtml(line.replace('- 未來想像:', '').trim());
      } else if (subSection.includes('空間屋況')) {
        if (line.startsWith('- 現在感受:')) prop.subjective.aspects.condition.now = stripHtml(line.replace('- 現在感受:', '').trim());
        if (line.startsWith('- 未來想像:')) prop.subjective.aspects.condition.future = stripHtml(line.replace('- 未來想像:', '').trim());
      } else if (subSection.includes('周邊環境')) {
        if (line.startsWith('- 現在感受:')) prop.subjective.aspects.neighborhood.now = stripHtml(line.replace('- 現在感受:', '').trim());
        if (line.startsWith('- 未來想像:')) prop.subjective.aspects.neighborhood.future = stripHtml(line.replace('- 未來想像:', '').trim());
      } else if (subSection === '其他看房筆記') {
        prop.subjective.familyNotes = prop.subjective.familyNotes ? prop.subjective.familyNotes + '\n' + stripHtml(line) : stripHtml(line);
      }
    }
  }

  PropertyStore.save(prop);
  renderPropertyList();
  alert(`成功匯入物件「${prop.name}」！`);
}

// ==========================================
// 7. 彈窗管理 (Dialogs & Form Handlers)
// ==========================================

// --- 家庭基本資料 Dialog ---
function openHouseholdDialog() {
  const dialog = document.getElementById('household-dialog');
  const data = HouseholdStore.get();

  renderHouseholdMembers(data.members || []);
  renderHouseholdCommute(data.commute || []);

  const form = document.getElementById('household-form');
  form.currentAddress.value = data.currentAddress || '';
  form.currentArea.value = data.currentArea || '';

  const entries = data.income?.entries || [];
  form.income1.value = entries[0]?.amount || '';
  form.income2.value = entries[1]?.amount || '';
  form.incomeOther.value = data.income?.other || '';

  const reqBoxes = document.querySelectorAll('#requirements-checkboxes input[type="checkbox"]');
  const userReqs = new Set(data.requirements || []);
  reqBoxes.forEach((cb) => {
    cb.checked = userReqs.has(cb.value);
  });

  dialog.showModal();
}

function renderHouseholdMembers(members) {
  const container = document.getElementById('members-container');
  container.innerHTML = members
    .map(
      (m, i) => `
    <div class="dynamic-row member-row" data-index="${i}">
      <input name="member_role_${i}" value="${escapeHtml(m.role)}" placeholder="稱謂 (如: 先生)" style="flex:1" required />
      <input name="member_age_${i}" type="number" value="${m.age || ''}" placeholder="年齡" style="width:75px" min="0" max="120" />
      <input name="member_note_${i}" value="${escapeHtml(m.note || '')}" placeholder="身分/職業/就學 (如: 準備讀小一)" style="flex:2" />
      <button type="button" class="row-delete-btn" onclick="this.parentElement.remove()" title="刪除此列">
        <svg class="icon-svg sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `
    )
    .join('');
}

function renderHouseholdCommute(commutes) {
  const container = document.getElementById('commute-container');
  container.innerHTML = commutes
    .map(
      (c, i) => `
    <div class="dynamic-row commute-row" data-index="${i}">
      <input name="commute_who_${i}" value="${escapeHtml(c.who)}" placeholder="對象 (如: 先生)" style="width:90px" required />
      <input name="commute_loc_${i}" value="${escapeHtml(c.location)}" placeholder="工作/上學地點 (如: 台北市大安區)" style="flex:2" required />
      <button type="button" class="row-delete-btn" onclick="this.parentElement.remove()" title="刪除此列">
        <svg class="icon-svg sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `
    )
    .join('');
}

// --- 物件資料與看房筆記 Dialog ---
function openPropertyDialog(id = null) {
  const dialog = document.getElementById('property-dialog');
  const form = document.getElementById('property-form');
  const title = document.getElementById('property-dialog-title');

  const p = id ? PropertyStore.getById(id) : null;
  title.textContent = p ? `編輯物件：${p.name}` : '新增租屋物件';

  form.id.value = p ? p.id : '';
  form.name.value = p ? p.name : '';
  form.type.value = p ? p.type : '電梯大樓';
  form.rent.value = p ? p.rent : '';

  // 結構化數值帶入
  const sizeNum = p?.size ? parseFloat(String(p.size).replace(/[^\d.]/g, '')) : '';
  form.size_num.value = !isNaN(sizeNum) && sizeNum > 0 ? sizeNum : '';

  const layoutStr = p?.layout || '';
  const rMatch = layoutStr.match(/(\d+)\s*房/);
  const hMatch = layoutStr.match(/(\d+)\s*廳/);
  const bMatch = layoutStr.match(/(\d+)\s*衛/);
  const balMatch = layoutStr.match(/(\d+)\s*陽台/);
  form.layout_rooms.value = rMatch ? rMatch[1] : (p ? '' : '3');
  form.layout_halls.value = hMatch ? hMatch[1] : (p ? '' : '2');
  form.layout_baths.value = bMatch ? bMatch[1] : (p ? '' : '2');
  form.layout_balconies.value = balMatch ? balMatch[1] : (p ? '' : '1');

  const floorStr = p?.floor || '';
  const fMatch = floorStr.match(/(-?\d+)\s*\/\s*(\d+)/);
  if (fMatch) {
    form.floor_current.value = fMatch[1];
    form.floor_total.value = fMatch[2];
  } else {
    form.floor_current.value = '';
    form.floor_total.value = '';
  }

  const ageStr = p?.age || '';
  const aMatch = ageStr.match(/(\d+)/);
  form.age_num.value = aMatch ? aMatch[1] : (ageStr.includes('新') ? '0' : '');

  const mgmtStr = p?.costs?.managementFee || '包含';
  const mgmtAmtWrap = document.getElementById('prop-mgmt-amount-wrap');
  if (mgmtStr.includes('另計') || (/\d+/.test(mgmtStr) && !mgmtStr.includes('包含'))) {
    form.mgmt_mode.value = 'extra';
    const numMatch = mgmtStr.match(/(\d+)/);
    form.mgmt_amount.value = numMatch ? numMatch[1] : '';
    if (mgmtAmtWrap) mgmtAmtWrap.style.display = 'flex';
  } else if (mgmtStr.includes('無')) {
    form.mgmt_mode.value = 'none';
    form.mgmt_amount.value = '';
    if (mgmtAmtWrap) mgmtAmtWrap.style.display = 'none';
  } else {
    form.mgmt_mode.value = 'included';
    form.mgmt_amount.value = '';
    if (mgmtAmtWrap) mgmtAmtWrap.style.display = 'none';
  }

  form.parkingFee.value = p?.costs?.parkingFee || '包含 (平面車位)';
  form.subsidy.value = p?.costs?.subsidy || '可申請';
  form.address.value = p ? p.address : '';
  form.leaseTerms.value = p ? p.leaseTerms : '';
  form.amenities.value = p ? p.amenities : '';
  form.trafficAndSchool.value = p ? p.trafficAndSchool : '';
  form.url.value = p ? p.url : '';

  // 主觀部分
  const subj = p?.subjective || {};
  setStarRating(subj.overallRating || 0);

  // 決策 Radio
  form.querySelectorAll('input[name="subj_decision"]').forEach((radio) => {
    radio.checked = radio.value === subj.decision;
  });

  form.subj_pros.value = subj.highlightPros || '';
  form.subj_cons.value = subj.dealBreakerCons || '';

  // 四大面向軟性 SWOT
  const aspects = subj.aspects || {};
  form.subj_trans_rating.value = aspects.transportation?.rating || '';
  form.subj_trans_now.value = aspects.transportation?.now || '';
  form.subj_trans_future.value = aspects.transportation?.future || '';

  form.subj_school_rating.value = aspects.school?.rating || '';
  form.subj_school_now.value = aspects.school?.now || '';
  form.subj_school_future.value = aspects.school?.future || '';

  form.subj_cond_rating.value = aspects.condition?.rating || '';
  form.subj_cond_now.value = aspects.condition?.now || '';
  form.subj_cond_future.value = aspects.condition?.future || '';

  form.subj_neigh_rating.value = aspects.neighborhood?.rating || '';
  form.subj_neigh_now.value = aspects.neighborhood?.now || '';
  form.subj_neigh_future.value = aspects.neighborhood?.future || '';

  form.subj_family.value = subj.familyNotes || '';

  dialog.showModal();
}

function setStarRating(val) {
  const hiddenInput = document.getElementById('prop-subj-rating');
  const label = document.getElementById('dialog-star-text');
  const buttons = document.querySelectorAll('#dialog-stars-picker .star-btn');

  hiddenInput.value = val;
  buttons.forEach((btn) => {
    const bVal = parseInt(btn.dataset.val);
    if (bVal <= val) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const texts = ['未評分', '1 星（普通偏低）', '2 星（尚可）', '3 星（符合基本期待）', '4 星（相當滿意）', '5 星（極力推薦 / 心動首選）'];
  if (label) label.textContent = texts[val] || `${val} 星`;
}

// AI 供應商支援模型列舉清單
const PROVIDER_MODELS = {
  gemini: [
    { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (推薦，最新主力快速)' },
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (極速穩定)' },
    { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (超輕量低延遲)' },
    { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (輕量穩定)' },
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview (旗艦深度推理)' },
    { value: '__custom__', label: '自訂其他 Gemini 模型...' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini (推薦，經濟穩定)' },
    { value: 'gpt-4o', label: 'GPT-4o (旗艦全方位智慧)' },
    { value: 'o3-mini', label: 'o3-mini (高強度邏輯推理)' },
    { value: 'gpt-5.6-sol', label: 'GPT-5.6 Sol (新一代通用旗艦)' },
    { value: 'gpt-5.6-terra', label: 'GPT-5.6 Terra (新一代高效率模型)' },
    { value: '__custom__', label: '自訂其他 OpenAI 模型...' },
  ],
  claude: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (推薦，最新主力旗艦)' },
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (超旗艦深度思考)' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (極速輕量)' },
    { value: '__custom__', label: '自訂其他 Claude 模型...' },
  ],
  ollama: [
    { value: 'llama3.1', label: 'Llama 3.1 (推薦通用)' },
    { value: 'qwen2.5:14b', label: 'Qwen 2.5 14B (繁中/邏輯表現佳)' },
    { value: 'mistral', label: 'Mistral (快速輕量)' },
    { value: 'gemma2', label: 'Gemma 2' },
    { value: '__custom__', label: '自訂本地模型名稱...' },
  ],
  local: [
    { value: 'local-model', label: 'Local Model (預設載入模型)' },
    { value: '__custom__', label: '自訂端點模型名稱...' },
  ],
};

// --- AI 設定 Dialog ---
function openSettingsDialog() {
  const dialog = document.getElementById('settings-dialog');
  const s = SettingsStore.get();

  const form = document.getElementById('settings-form');
  form.provider.value = s.provider;
  form.baseUrl.value = s.baseUrl || '';
  form.enableWebSearch.checked = s.enableWebSearch;
  form.apiKey.value = s.apiKey || '';

  updateProviderFormDisplay(s.provider, s.model);
  dialog.showModal();
}

function updateProviderFormDisplay(provider, preferredModel = null) {
  const apiKeyLabel = document.getElementById('setting-apikey-label');
  const apiKeyHelp = document.getElementById('setting-apikey-help');
  const baseUrlLabel = document.getElementById('setting-baseurl-label');
  const modelSelect = document.getElementById('setting-model-select');
  const customLabel = document.getElementById('setting-model-custom-label');
  const customInput = document.getElementById('setting-model-custom');

  if (provider === 'ollama') {
    baseUrlLabel.style.display = 'block';
    apiKeyLabel.style.display = 'none';
    apiKeyHelp.textContent = '本地 Ollama 預設端點為 http://localhost:11434/v1，免填金鑰。';
  } else if (provider === 'local') {
    baseUrlLabel.style.display = 'block';
    apiKeyLabel.style.display = 'block';
    apiKeyHelp.textContent = 'LM Studio / LocalAI 預設端點為 http://localhost:1234/v1。';
  } else if (provider === 'gemini') {
    baseUrlLabel.style.display = 'none';
    apiKeyLabel.style.display = 'block';
    apiKeyHelp.textContent = '請填寫 Google AI Studio API Key (推薦最新 gemini-3.6-flash 或 3.5 系列)。';
  } else if (provider === 'claude') {
    baseUrlLabel.style.display = 'none';
    apiKeyLabel.style.display = 'block';
    apiKeyHelp.textContent = '請填寫 Anthropic API Key (推薦最新 claude-sonnet-4-6 或 claude-opus-4-8)。';
  } else {
    // openai
    baseUrlLabel.style.display = 'none';
    apiKeyLabel.style.display = 'block';
    apiKeyHelp.textContent = '請填寫 OpenAI API Key (推薦 gpt-4o-mini 或旗艦 gpt-4o)。';
  }

  // 動態填裝模型列舉選單
  const models = PROVIDER_MODELS[provider] || PROVIDER_MODELS.gemini;
  modelSelect.innerHTML = '';
  let matchFound = false;

  models.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.label;
    if (preferredModel && m.value === preferredModel) {
      opt.selected = true;
      matchFound = true;
    }
    modelSelect.appendChild(opt);
  });

  if (!matchFound && preferredModel && preferredModel !== '__custom__') {
    modelSelect.value = '__custom__';
    customLabel.style.display = 'block';
    customInput.value = preferredModel;
  } else if (modelSelect.value === '__custom__') {
    customLabel.style.display = 'block';
    customInput.value = preferredModel || '';
  } else {
    customLabel.style.display = 'none';
  }
}

// ==========================================
// 8. 啟動 AI 比較分析 (Execute Comparison)
// ==========================================
async function startComparison() {
  const selectedIds = Array.from(State.selectedPropertyIds);
  if (selectedIds.length < 2 || selectedIds.length > 3) {
    alert('請勾選 2 至 3 間物件進行橫向比較！');
    return;
  }

  const allProps = PropertyStore.getAll();
  const selectedProps = allProps.filter((p) => selectedIds.includes(p.id));
  const household = HouseholdStore.get();
  const settings = SettingsStore.get();

  // 資安檢查：非本地模型時檢查 API Key
  if (['openai', 'gemini', 'claude'].includes(settings.provider) && !settings.apiKey) {
    alert(`您選擇了「${settings.provider}」，但尚未填寫 API Key！請先至「AI 設定」填寫。`);
    openSettingsDialog();
    return;
  }

  switchView('compare');

  const loading = document.getElementById('compare-loading');
  const errorBox = document.getElementById('compare-error');
  const content = document.getElementById('compare-content');

  loading.style.display = 'block';
  errorBox.style.display = 'none';
  content.style.display = 'none';

  try {
    const response = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        household,
        properties: selectedProps,
        provider: settings.provider,
        model: settings.model,
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        enableWebSearch: settings.enableWebSearch,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || '比較分析失敗');
    }

    State.lastComparisonResult = data;
    State.lastComparisonContext = {
      properties: selectedProps,
      household,
      provider: settings.provider,
      model: settings.model,
    };
    State.viewingSavedReportId = null;

    const backBtnText = document.getElementById('compare-back-btn-text');
    if (backBtnText) backBtnText.textContent = '返回物件列表';

    const saveBtn = document.getElementById('save-compare-report-btn');
    const saveBtnText = document.getElementById('save-report-btn-text');
    if (saveBtn) {
      saveBtn.classList.remove('btn-saved-success');
      if (saveBtnText) saveBtnText.textContent = '儲存分析結果';
    }

    renderComparisonResult(data, selectedProps);

    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (err) {
    loading.style.display = 'none';
    errorBox.style.display = 'flex';
    document.getElementById('error-message').textContent = err.message;
  }
}

function getRecLevelBadge(level) {
  if (!level) return '';
  let cls = 'consider';
  if (level.includes('強力推薦')) cls = 'strongly';
  else if (level.includes('附條件')) cls = 'conditional';
  else if (level.includes('不建議')) cls = 'not_rec';
  else if (level.includes('排除') || level.includes('Reject')) cls = 'reject';
  return `<span class="rec-level-badge ${cls}">${escapeHtml(level)}</span>`;
}

function getEvidenceStatusBadge(status) {
  const map = {
    verified: { label: '已查證 (Verified)', cls: 'verified' },
    reported: { label: '口頭陳述 (Reported)', cls: 'reported' },
    observed: { label: '現場觀察 (Observed)', cls: 'observed' },
    estimated: { label: '合理推估 (Estimated)', cls: 'estimated' },
    unknown: { label: '尚待查證 (Unknown)', cls: 'unknown' },
  };
  const item = map[status] || { label: status, cls: 'unknown' };
  return `<span class="badge-status ${item.cls}">${item.label}</span>`;
}

function getConfidenceBadge(conf) {
  const map = {
    high: { label: '高信心', cls: 'high' },
    medium: { label: '中信心', cls: 'medium' },
    low: { label: '低信心', cls: 'low' },
  };
  const item = map[conf] || { label: conf, cls: 'medium' };
  return `<span class="badge-conf ${item.cls}">● ${item.label}</span>`;
}

function getCrossCheckItemClass(status) {
  if (status.includes('證實屬實')) return 'confirmed';
  if (status.includes('部分證實')) return 'partly';
  if (status.includes('尚待查證')) return 'unverified';
  return 'contradicted';
}

function renderComparisonResult(data, selectedProps) {
  // ① 先講結論與客觀推薦等級 (Hero Rankings)
  const rankingsTbody = document.getElementById('rankings-tbody');
  const scorecards = data.objectiveScorecard || [];
  const recs = data.objectiveRecommendation || [];

  rankingsTbody.innerHTML = (data.conclusionFirst?.rankings || [])
    .map((r, idx) => {
      const matchSc = scorecards.find((s) => s.propertyName === r.propertyName);
      const matchRec = recs.find((rec) => rec.propertyName === r.propertyName);
      const gateStatus = matchSc?.riskGateStatus || '通過 (Clear)';
      const gateCls = gateStatus.includes('未通過') ? 'blocked' : (gateStatus.includes('條件式') ? 'conditional' : 'clear');

      return `
        <tr>
          <td><span class="rank-badge rank-${idx + 1}">#${idx + 1}</span></td>
          <td><strong>${escapeHtml(r.propertyName)}</strong></td>
          <td><span class="rank-score-pill">${Number(r.overallScore || 0).toFixed(1)} / 10</span></td>
          <td>${getRecLevelBadge(matchRec?.recommendationLevel)}</td>
          <td><span class="risk-gate-tag ${gateCls}">${escapeHtml(gateStatus)}</span></td>
          <td>${escapeHtml(r.verdict)}</td>
        </tr>
      `;
    })
    .join('');

  document.getElementById('caveat-text').textContent = data.conclusionFirst?.caveat || '無額外但書。';

  // ② 事實與證據狀態查核表 (Facts & Evidence Audit)
  const evidenceGrid = document.getElementById('evidence-grid');
  if (evidenceGrid) {
    evidenceGrid.innerHTML = (data.factsAndEvidence || [])
      .map(
        (fe) => `
      <article class="evidence-card">
        <h3 class="evidence-card-title">${escapeHtml(fe.propertyName)}</h3>
        <table class="evidence-table">
          <thead>
            <tr>
              <th style="width: 28%;">檢核項目</th>
              <th style="width: 42%;">事實內容</th>
              <th style="width: 30%;">證據狀態 / 信心</th>
            </tr>
          </thead>
          <tbody>
            ${(fe.items || [])
              .map(
                (it) => `
              <tr>
                <td><strong>${escapeHtml(it.item)}</strong></td>
                <td>${escapeHtml(it.finding)}</td>
                <td>
                  ${getEvidenceStatusBadge(it.status)}
                  <div style="margin-top: 2px;">${getConfidenceBadge(it.confidence)}</div>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </article>
    `
      )
      .join('');
  }

  // ③ 成本與價值量化 (Financial Cost & Market Conclusion)
  const costTbody = document.getElementById('cost-tbody');
  const costAndValues = data.costAndValue || [];
  const costProps = data.costComparison?.properties || [];

  costTbody.innerHTML = costProps
    .map((c) => {
      const matchCv = costAndValues.find((cv) => cv.propertyName === c.propertyName);
      return `
      <tr>
        <td><strong>${escapeHtml(c.propertyName)}</strong></td>
        <td>${escapeHtml(matchCv?.monthlyAllInCost || c.originalMonthlyCost + ' 元/月')}</td>
        <td>${escapeHtml(matchCv?.annualAllInCost || '依月成本推算')}</td>
        <td>${escapeHtml(matchCv?.unitCostCalculation || '依坪數計算')}</td>
        <td><strong style="color:var(--accent-emerald)">${escapeHtml(c.estimatedSubsidizedCost)}</strong></td>
        <td style="font-size:12px; color:var(--text-secondary);">${escapeHtml(matchCv?.marketConclusion || c.note || '')}</td>
      </tr>
    `;
    })
    .join('');

  document.getElementById('cost-insight-text').textContent = data.costComparison?.insight || '';

  // ④ 四面向獨立客觀 SWOT (4-Quadrant Independent SWOT)
  const swotCardsGrid = document.getElementById('swot-cards-grid');
  if (swotCardsGrid) {
    const dimMeta = [
      { key: 'transport', title: '交通動線與通勤實測' },
      { key: 'school', title: '學區就讀資格與名額' },
      { key: 'spaceAndCondition', title: '空間格局與屋況硬體' },
      { key: 'neighbourhood', title: '周邊生活機能與環境氛圍' },
    ];

    swotCardsGrid.innerHTML = (data.independentSWOT || [])
      .map(
        (sw) => `
      <article class="swot-card">
        <div class="swot-card-header">
          <h3>${escapeHtml(sw.rankLabel || sw.propertyName)}</h3>
          <span class="subtle" style="font-size: 12px;">四面向獨立客觀推演</span>
        </div>
        <div class="swot-dim-container">
          ${dimMeta
            .map((dm) => {
              const d = sw[dm.key] || {};
              return `
            <div class="swot-dim-box">
              <div class="swot-dim-header">
                <span class="swot-dim-title">${dm.title}</span>
                <span class="swot-dim-score">${Number(d.score || 0).toFixed(1)} / 10</span>
              </div>
              <div class="swot-quadrants">
                <div class="quadrant-box strengths">
                  <strong>[S] 已知優勢</strong>
                  <ul>${(d.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('') || '<li>無顯著優勢</li>'}</ul>
                </div>
                <div class="quadrant-box weaknesses">
                  <strong>[W] 既有限制</strong>
                  <ul>${(d.weaknesses || []).map((w) => `<li>${escapeHtml(w)}</li>`).join('') || '<li>無顯著限制</li>'}</ul>
                </div>
                <div class="quadrant-box opportunities">
                  <strong>[O] 潛在機會</strong>
                  <ul>${(d.opportunities || []).map((o) => `<li>${escapeHtml(o)}</li>`).join('') || '<li>無特定機會</li>'}</ul>
                </div>
                <div class="quadrant-box threats">
                  <strong>[T] 外部威脅</strong>
                  <ul>${(d.threats || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('') || '<li>無特定威脅</li>'}</ul>
                </div>
              </div>
              ${d.keyInsight ? `<div class="swot-insight-footer"><strong>關鍵洞察：</strong>${escapeHtml(d.keyInsight)}</div>` : ''}
            </div>
          `;
            })
            .join('')}
        </div>
      </article>
    `
      )
      .join('');
  }

  // ⑤ 客觀評分卡 7 維度 (7-Dimension Scorecard)
  const scorecardGrid = document.getElementById('scorecard-grid');
  if (scorecardGrid) {
    scorecardGrid.innerHTML = (data.objectiveScorecard || [])
      .map((sc) => {
        const gateStatus = sc.riskGateStatus || '通過 (Clear)';
        const gateCls = gateStatus.includes('未通過') ? 'blocked' : (gateStatus.includes('條件式') ? 'conditional' : 'clear');
        return `
      <article class="scorecard-card">
        <div class="scorecard-header">
          <h3>${escapeHtml(sc.propertyName)}</h3>
          <span class="scorecard-total-badge">${Number(sc.weightedTotalScore || 0).toFixed(1)} 總分</span>
        </div>
        <div class="scorecard-dims-list">
          ${(sc.dimensions || [])
            .map(
              (dim) => `
            <div class="scorecard-dim-row">
              <div class="scorecard-dim-meta">
                <span>${escapeHtml(dim.dimensionName)} <small style="color:var(--text-muted);">(${escapeHtml(dim.weight || '')})</small></span>
                <span style="font-family:'DM Mono', monospace; color:var(--accent-emerald);">${Number(dim.score || 0).toFixed(1)}</span>
              </div>
              <div class="scorecard-dim-bar-wrap">
                <div class="scorecard-dim-bar-fill" style="width: ${Math.min(100, Math.max(0, (dim.score || 0) * 10))}%;"></div>
              </div>
              <p class="scorecard-dim-rationale">${escapeHtml(dim.rationale)}</p>
            </div>
          `
            )
            .join('')}
        </div>
        <div class="scorecard-footer-gate">
          <span><strong>風險閘門狀態：</strong></span>
          <span class="risk-gate-tag ${gateCls}">${escapeHtml(gateStatus)}</span>
        </div>
      </article>
    `;
      })
      .join('');
  }

  // ⑥ 結構化風險分級評估 (4-Tier Risk Assessment)
  const risksGrid = document.getElementById('risks-grid');
  if (risksGrid) {
    risksGrid.innerHTML = (data.riskAssessment || [])
      .map(
        (r) => `
      <article class="risk-card">
        <h3 class="risk-card-title">${escapeHtml(r.propertyName)}</h3>
        <div class="responsibility-box">
          <strong>維修責任歸屬：</strong>${escapeHtml(r.maintenanceResponsibility || '依合約約定')}
        </div>

        <p class="risk-sub-heading">結構化風險評估清單：</p>
        <div class="risk-items-container">
          ${(r.risks || [])
            .map(
              (rk) => `
            <div class="risk-detail-box">
              <div class="risk-detail-header">
                <strong>${escapeHtml(rk.riskName)}</strong>
                <span class="risk-grade-badge ${escapeHtml(rk.grade)}">${escapeHtml(rk.grade)}</span>
              </div>
              <div class="risk-detail-body">
                <div>• <strong>證據依據：</strong>${escapeHtml(rk.evidence)}</div>
                <div>• <strong>潛在後果：</strong>${escapeHtml(rk.consequence)}</div>
                <div>• <strong>緩解方案 / 責任方：</strong>${escapeHtml(rk.mitigation)} (${escapeHtml(rk.responsibleParty)})</div>
                <div style="color:#a22d22; margin-top:2px;">• <strong>決策影響：</strong>${escapeHtml(rk.decisionImpact)}</div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>

        <p class="risk-sub-heading" style="margin-top:12px;">隱性維修成本試算：</p>
        <p style="font-size: 12.5px; color: #4b625b;">${escapeHtml(r.hiddenCostEstimate)}</p>

        <div class="risk-verdict-quote">
          <strong>綜合風險判斷：</strong>${escapeHtml(r.riskVerdict)}
        </div>
      </article>
    `
      )
      .join('');
  }

  // ⑦ 主客觀交叉比對驗證 (Resident Cross-Check Matrix)
  const crosscheckGrid = document.getElementById('crosscheck-grid');
  if (crosscheckGrid) {
    crosscheckGrid.innerHTML = (data.residentCrossCheck || [])
      .map(
        (rc) => `
      <article class="crosscheck-card">
        <h3 class="crosscheck-card-title">${escapeHtml(rc.propertyName)}</h3>
        <div class="crosscheck-list">
          ${(rc.checks || [])
            .map((ck) => {
              const itemCls = getCrossCheckItemClass(ck.resultStatus);
              return `
              <div class="crosscheck-item ${itemCls}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="color:var(--primary-dark); font-size:13.5px;">"${escapeHtml(ck.residentItem)}"</strong>
                  <span class="crosscheck-status-tag ${itemCls}">${escapeHtml(ck.resultStatus)}</span>
                </div>
                <p style="font-size:12.5px; color:var(--text-secondary); margin: 6px 0 2px;">
                  <strong>客觀事實依據：</strong>${escapeHtml(ck.objectiveEvidence)}
                </p>
                <p style="font-size:12px; color:#2e4d43; margin:0;">
                  <strong>決策含義：</strong>${escapeHtml(ck.decisionImplication)}
                </p>
              </div>
            `;
            })
            .join('')}
        </div>
      </article>
    `
      )
      .join('');
  }

  // ⑧ 真正的核心問題 (The Real Question)
  const realQ = data.theRealQuestion || {};
  document.getElementById('reframing-quote').textContent = realQ.reframing || '決策的關鍵在於家庭生活方式的抉擇。';

  document.getElementById('option-a-label').textContent = realQ.optionA?.label || '方案 A';
  document.getElementById('option-a-desc').textContent = realQ.optionA?.description || '';
  document.getElementById('option-a-props').innerHTML = (realQ.optionA?.relevantProperties || [])
    .map((p) => `<span class="prop-tag">${escapeHtml(p)}</span>`)
    .join('');

  document.getElementById('option-b-label').textContent = realQ.optionB?.label || '方案 B';
  document.getElementById('option-b-desc').textContent = realQ.optionB?.description || '';
  document.getElementById('option-b-props').innerHTML = (realQ.optionB?.relevantProperties || [])
    .map((p) => `<span class="prop-tag">${escapeHtml(p)}</span>`)
    .join('');

  // ⑨ 情境優先級排名 (Scenario Rankings)
  const scenariosList = document.getElementById('scenarios-list');
  scenariosList.innerHTML = (data.scenarioRankings || [])
    .map(
      (sr) => `
    <div class="scenario-row">
      <strong>${escapeHtml(sr.scenario)}</strong>
      <span class="scenario-ranking-text">${escapeHtml(sr.ranking)}</span>
    </div>
  `
    )
    .join('');

  // ⑩ 條件式排名反轉 (Rank Reversals)
  const reversalsGrid = document.getElementById('reversals-grid');
  reversalsGrid.innerHTML = (data.rankReversals || [])
    .map(
      (rr) => `
    <article class="reversal-card">
      <div class="reversal-cond">觸發條件：${escapeHtml(rr.condition)}</div>
      <div class="reversal-ranks">
        ${escapeHtml(rr.currentRank)} 
        <svg class="icon-svg sm" viewBox="0 0 24 24" style="margin: 0 4px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        <span style="color:var(--accent-coral)">${escapeHtml(rr.reversedRank)}</span>
      </div>
      <p class="reversal-reason">${escapeHtml(rr.reasoning)}</p>
    </article>
  `
    )
    .join('');

  // ⑪ 家庭決策綜合與實地查核行動清單 (Decision Synthesis & Checklist)
  const synth = data.decisionSynthesis || {};
  const bestFitEl = document.getElementById('synthesis-best-fit');
  if (bestFitEl) bestFitEl.textContent = synth.bestFitFor || '綜合考量通勤與空間需求的家庭。';

  const tradeoffsList = document.getElementById('synthesis-tradeoffs-list');
  if (tradeoffsList) {
    tradeoffsList.innerHTML = (synth.consciousTradeoffs || [])
      .map((t) => `<li>${escapeHtml(t)}</li>`)
      .join('');
  }

  const negList = document.getElementById('synthesis-negotiation-list');
  if (negList) {
    negList.innerHTML = (synth.negotiationPoints || [])
      .map((n) => `<li>${escapeHtml(n)}</li>`)
      .join('');
  }

  const checksList = document.getElementById('checks-list');
  checksList.innerHTML = (synth.criticalChecks || [])
    .map(
      (ck, i) => `
    <li class="checklist-todo-item">
      <div class="todo-checkbox-wrapper">
        <input type="checkbox" id="check-${i}" class="todo-checkbox" />
      </div>
      <label for="check-${i}" class="todo-content">
        <div class="todo-header-line">
          <span class="todo-prop-tag">${escapeHtml(ck.propertyName || '看房重點')}</span>
          <span class="todo-title">${escapeHtml(ck.checkItem)}</span>
        </div>
        ${ck.reason ? `<p class="todo-reason"><strong>核對原因：</strong>${escapeHtml(ck.reason)}</p>` : ''}
      </label>
    </li>
  `
    )
    .join('');

  document.getElementById('final-recommendation-text').textContent = synth.finalRecommendation || '';

  // ⑫ 主觀附錄 (純本地對照)
  const subjMatrix = document.getElementById('subjective-matrix');
  subjMatrix.innerHTML = selectedProps
    .map((p) => {
      const subj = p.subjective || {};
      const asp = subj.aspects || {};
      return `
      <article class="subj-matrix-card">
        <h3>${escapeHtml(p.name)}</h3>
        <p><strong>直覺喜好：</strong>${renderStarsSvg(subj.overallRating || 0)} (${subj.overallRating || 0}/5)</p>
        <p style="margin: 6px 0;"><strong>最終決策：</strong><span class="decision-badge ${escapeHtml(subj.decision || '')}">${escapeHtml(subj.decision || '尚未決定')}</span></p>
        
        <div style="margin: 12px 0; font-size: 13px;">
          <p style="color:#1e6a47"><strong>[ 最愛亮點 ]</strong> ${escapeHtml(subj.highlightPros || '無')}</p>
          <p style="color:#9e3427; margin-top:4px;"><strong>[ 最大雷點 ]</strong> ${escapeHtml(subj.dealBreakerCons || '無')}</p>
        </div>

        <div style="font-size: 12px; color: #577069; border-top: 1px dashed #d5ded8; padding-top: 8px;">
          <p>• 交通隨筆：${escapeHtml(asp.transportation?.now || '無')}</p>
          <p>• 學區隨筆：${escapeHtml(asp.school?.now || '無')}</p>
          <p>• 屋況隨筆：${escapeHtml(asp.condition?.now || '無')}</p>
        </div>
      </article>
    `;
    })
    .join('');

  // 公開查核來源
  const sourcesSection = document.getElementById('sources-section');
  const sourcesList = document.getElementById('sources-list');
  if (data._verifiedSources && data._verifiedSources.length > 0) {
    sourcesSection.style.display = 'block';
    sourcesList.innerHTML = data._verifiedSources
      .map(
        (s) => `
      <li style="font-size: 12px; color: #49635b; margin-bottom: 6px;">
        <strong>[${escapeHtml(s.property)} · ${escapeHtml(s.topic)}]</strong> ${escapeHtml(s.findings)}
      </li>
    `
      )
      .join('');
  } else {
    sourcesSection.style.display = 'none';
  }
}

function loadSampleData() {
  PropertyStore.saveAll(DEFAULT_PROPERTIES);
  HouseholdStore.save(DEFAULT_HOUSEHOLD);
}

// ==========================================
// 8.5 歷史報告管理 (Report History Management)
// ==========================================
function saveCurrentComparisonReport() {
  if (!State.lastComparisonResult) {
    alert('目前尚無可儲存的分析結果！');
    return;
  }

  const saveBtn = document.getElementById('save-compare-report-btn');
  const saveBtnText = document.getElementById('save-report-btn-text');

  const reportId = State.viewingSavedReportId || ('report-' + Date.now());
  const reportData = {
    id: reportId,
    createdAt: new Date().toISOString(),
    properties: State.lastComparisonContext?.properties || [],
    household: State.lastComparisonContext?.household || null,
    provider: State.lastComparisonContext?.provider || '',
    model: State.lastComparisonContext?.model || '',
    result: State.lastComparisonResult,
  };

  ReportStore.save(reportData);
  State.viewingSavedReportId = reportId;

  if (saveBtn) {
    saveBtn.classList.add('btn-saved-success');
    if (saveBtnText) saveBtnText.textContent = '已儲存分析結果！';
  }
}

function renderReportList() {
  const container = document.getElementById('reports-grid');
  const emptyState = document.getElementById('reports-empty-state');
  const totalStats = document.getElementById('stat-total-reports');
  const reports = ReportStore.getAll();

  if (totalStats) totalStats.textContent = reports.length;

  if (reports.length === 0) {
    if (container) {
      container.innerHTML = '';
      container.style.display = 'none';
    }
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (container) container.style.display = 'grid';

  container.innerHTML = reports
    .map((r) => {
      const dateStr = new Date(r.createdAt).toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      const topRanking = r.result?.conclusionFirst?.rankings?.[0] || {};
      const winnerName = topRanking.propertyName || r.properties?.[0]?.name || '物件比對';
      const winnerScore = topRanking.overallScore ? `${Number(topRanking.overallScore).toFixed(1)} 分` : '';
      const verdict = topRanking.verdict || '';
      const realQuestion = r.result?.theRealQuestion?.reframing || '';

      const propTags = (r.properties || [])
        .map(
          (p) => `<span class="report-prop-tag">
            <svg class="icon-svg sm" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            ${escapeHtml(p.name)}
          </span>`
        )
        .join('');

      return `
        <article class="report-card" data-report-id="${escapeHtml(r.id)}">
          <div class="report-card-top">
            <span class="report-date">
              <svg class="icon-svg sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${escapeHtml(dateStr)}
            </span>
            <span class="report-badge ${escapeHtml(r.provider || '')}">
              ${escapeHtml(r.model || r.provider || 'AI')}
            </span>
          </div>

          <div class="report-props-strip">
            ${propTags}
          </div>

          <div class="report-summary-box">
            <div class="report-top-rank">
              <span class="report-rank-badge">#1 首選</span>
              <strong class="report-winner-name">${escapeHtml(winnerName)}</strong>
              ${winnerScore ? `<span class="report-winner-score">${escapeHtml(winnerScore)}</span>` : ''}
            </div>
            ${verdict ? `<p class="report-verdict-text">${escapeHtml(verdict)}</p>` : ''}
            ${realQuestion ? `<p class="report-question-snippet"><strong>核心卡點：</strong>${escapeHtml(realQuestion)}</p>` : ''}
          </div>

          <div class="report-card-actions">
            <button class="primary-button view-report-btn" data-id="${escapeHtml(r.id)}">
              <svg class="icon-svg sm" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              檢視完整報告
            </button>
            <button class="outline-button print-report-btn" data-id="${escapeHtml(r.id)}" title="列印或下載 PDF">
              <svg class="icon-svg sm" viewBox="0 0 24 24"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            </button>
            <button class="outline-button delete-btn delete-report-btn" data-id="${escapeHtml(r.id)}" title="刪除此報告">
              <svg class="icon-svg sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

function loadSavedReport(reportId) {
  const report = ReportStore.getById(reportId);
  if (!report || !report.result) {
    alert('找不到該筆報告資料！');
    return;
  }

  State.lastComparisonResult = report.result;
  State.lastComparisonContext = {
    properties: report.properties,
    household: report.household,
    provider: report.provider,
    model: report.model,
  };
  State.viewingSavedReportId = reportId;

  switchView('compare');

  const loading = document.getElementById('compare-loading');
  const errorBox = document.getElementById('compare-error');
  const content = document.getElementById('compare-content');
  const backBtnText = document.getElementById('compare-back-btn-text');
  const saveBtn = document.getElementById('save-compare-report-btn');
  const saveBtnText = document.getElementById('save-report-btn-text');

  loading.style.display = 'none';
  errorBox.style.display = 'none';
  content.style.display = 'block';

  if (backBtnText) backBtnText.textContent = '返回歷史報告';
  if (saveBtn) {
    saveBtn.classList.add('btn-saved-success');
    if (saveBtnText) saveBtnText.textContent = '已儲存分析結果';
  }

  renderComparisonResult(report.result, report.properties || []);
}

// ==========================================
// 9. 事件監聽器與初始化 (Init)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // 導航按鈕
  document.getElementById('nav-home-btn')?.addEventListener('click', () => switchView('home'));
  document.getElementById('nav-list-btn')?.addEventListener('click', () => switchView('list'));
  document.getElementById('nav-reports-btn')?.addEventListener('click', () => switchView('reports'));
  document.getElementById('nav-brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('home');
  });
  document.getElementById('home-brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('home');
  });
  document.getElementById('nav-household-btn')?.addEventListener('click', openHouseholdDialog);
  document.getElementById('nav-settings-btn')?.addEventListener('click', openSettingsDialog);
  document.getElementById('banner-household-btn')?.addEventListener('click', openHouseholdDialog);

  // 首頁專屬浮動列按鈕
  document.getElementById('home-nav-household-btn')?.addEventListener('click', openHouseholdDialog);
  document.getElementById('home-nav-settings-btn')?.addEventListener('click', openSettingsDialog);
  document.getElementById('home-top-enter-btn')?.addEventListener('click', () => switchView('list'));

  // 首頁 CTA 按鈕
  document.getElementById('home-enter-btn')?.addEventListener('click', () => switchView('list'));
  document.getElementById('home-bottom-enter-btn')?.addEventListener('click', () => switchView('list'));
  document.getElementById('home-sample-btn')?.addEventListener('click', () => {
    loadSampleData();
    switchView('list');
  });

  // 報告空狀態跳轉按鈕
  document.getElementById('reports-empty-goto-list-btn')?.addEventListener('click', () => switchView('list'));

  // 頂部按鈕
  document.getElementById('top-add-btn')?.addEventListener('click', () => openPropertyDialog(null));
  document.getElementById('empty-add-btn')?.addEventListener('click', () => openPropertyDialog(null));
  document.getElementById('empty-sample-btn')?.addEventListener('click', () => {
    loadSampleData();
    renderPropertyList();
  });

  // Markdown 匯入
  const mdInput = document.getElementById('md-file-input');
  document.getElementById('top-import-btn')?.addEventListener('click', () => mdInput?.click());
  mdInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportMarkdown(file);
      e.target.value = '';
    }
  });

  // 比較操作
  document.getElementById('start-compare-btn')?.addEventListener('click', startComparison);
  document.getElementById('rerun-compare-btn')?.addEventListener('click', startComparison);
  document.getElementById('save-compare-report-btn')?.addEventListener('click', saveCurrentComparisonReport);
  document.getElementById('back-to-list-btn')?.addEventListener('click', () => {
    if (State.previousView === 'reports') {
      switchView('reports');
    } else {
      switchView('list');
    }
  });
  document.getElementById('clear-selected-btn')?.addEventListener('click', () => {
    State.selectedPropertyIds.clear();
    renderPropertyList();
  });
  document.getElementById('print-pdf-btn')?.addEventListener('click', () => window.print());
  document.getElementById('error-settings-btn')?.addEventListener('click', openSettingsDialog);

  // 歷史報告列表卡片事件委派 (View / PDF / Delete)
  document.getElementById('reports-grid')?.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.view-report-btn');
    if (viewBtn) {
      loadSavedReport(viewBtn.dataset.id);
      return;
    }
    const printBtn = e.target.closest('.print-report-btn');
    if (printBtn) {
      loadSavedReport(printBtn.dataset.id);
      setTimeout(() => window.print(), 350);
      return;
    }
    const delBtn = e.target.closest('.delete-report-btn');
    if (delBtn) {
      if (confirm('確定要刪除這筆歷史分析報告嗎？')) {
        ReportStore.delete(delBtn.dataset.id);
        renderReportList();
      }
      return;
    }
  });

  // 彈窗關閉按鈕
  document.getElementById('close-household-btn')?.addEventListener('click', () => document.getElementById('household-dialog')?.close());
  document.getElementById('close-property-btn')?.addEventListener('click', () => document.getElementById('property-dialog')?.close());
  document.getElementById('cancel-property-btn')?.addEventListener('click', () => document.getElementById('property-dialog')?.close());
  document.getElementById('close-settings-btn')?.addEventListener('click', () => document.getElementById('settings-dialog')?.close());

  // 家庭 Form 動態增加
  document.getElementById('add-member-btn')?.addEventListener('click', () => {
    const container = document.getElementById('members-container');
    const i = container.children.length;
    const div = document.createElement('div');
    div.className = 'dynamic-row member-row';
    div.innerHTML = `
      <input name="member_role_${i}" placeholder="稱謂 (如: 先生)" style="flex:1" required />
      <input name="member_age_${i}" type="number" placeholder="年齡" style="width:75px" min="0" max="120" />
      <input name="member_note_${i}" placeholder="身分/職業/就學" style="flex:2" />
      <button type="button" class="row-delete-btn" onclick="this.parentElement.remove()" title="刪除此列">
        <svg class="icon-svg sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
    container.appendChild(div);
  });

  document.getElementById('add-commute-btn')?.addEventListener('click', () => {
    const container = document.getElementById('commute-container');
    const i = container.children.length;
    const div = document.createElement('div');
    div.className = 'dynamic-row commute-row';
    div.innerHTML = `
      <input name="commute_who_${i}" placeholder="對象 (如: 太太)" style="width:90px" required />
      <input name="commute_loc_${i}" placeholder="工作/上學地點" style="flex:2" required />
      <button type="button" class="row-delete-btn" onclick="this.parentElement.remove()" title="刪除此列">
        <svg class="icon-svg sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
    container.appendChild(div);
  });

  document.getElementById('load-sample-household-btn')?.addEventListener('click', () => {
    HouseholdStore.save(DEFAULT_HOUSEHOLD);
    openHouseholdDialog();
  });

  // 家庭 Form Submit
  document.getElementById('household-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;

    const members = [];
    form.querySelectorAll('.member-row').forEach((row) => {
      const inputs = row.querySelectorAll('input');
      if (inputs[0]?.value.trim()) {
        members.push({
          role: inputs[0].value.trim(),
          age: parseInt(inputs[1]?.value) || 0,
          note: inputs[2]?.value.trim() || '',
        });
      }
    });

    const commute = [];
    form.querySelectorAll('.commute-row').forEach((row) => {
      const inputs = row.querySelectorAll('input');
      if (inputs[0]?.value.trim() && inputs[1]?.value.trim()) {
        commute.push({
          who: inputs[0].value.trim(),
          location: inputs[1].value.trim(),
        });
      }
    });

    const incomeEntries = [];
    if (form.income1.value) incomeEntries.push({ who: members[0]?.role || '主要收入 1', amount: Number(form.income1.value) });
    if (form.income2.value) incomeEntries.push({ who: members[1]?.role || '主要收入 2', amount: Number(form.income2.value) });

    const requirements = [];
    form.querySelectorAll('#requirements-checkboxes input[type="checkbox"]:checked').forEach((cb) => {
      requirements.push(cb.value);
    });

    const householdData = {
      members,
      commute,
      currentAddress: form.currentAddress.value.trim(),
      currentArea: form.currentArea.value.trim(),
      income: {
        entries: incomeEntries,
        other: form.incomeOther.value.trim(),
      },
      requirements,
    };

    HouseholdStore.save(householdData);
    document.getElementById('household-dialog')?.close();
    alert('家庭資料已儲存於本機！');
  });

  // 物件 Form 星級評分選擇
  document.querySelectorAll('#dialog-stars-picker .star-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.val);
      setStarRating(val);
    });
  });

  // 管理費模式切換顯示金額框
  document.getElementById('prop-mgmt-mode')?.addEventListener('change', (e) => {
    const wrap = document.getElementById('prop-mgmt-amount-wrap');
    if (wrap) {
      wrap.style.display = e.target.value === 'extra' ? 'flex' : 'none';
    }
  });

  // 物件 Form Submit
  document.getElementById('property-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;

    const id = form.id.value || null;
    const subjDecisionRadio = form.querySelector('input[name="subj_decision"]:checked');

    // 組裝結構化格局
    const rooms = form.layout_rooms.value.trim();
    const halls = form.layout_halls.value.trim();
    const baths = form.layout_baths.value.trim();
    const balconies = form.layout_balconies.value.trim();
    let layoutFormatted = [];
    if (rooms) layoutFormatted.push(`${rooms} 房`);
    if (halls) layoutFormatted.push(`${halls} 廳`);
    if (baths) layoutFormatted.push(`${baths} 衛`);
    if (balconies && balconies > 0) layoutFormatted.push(`${balconies} 陽台`);
    const layoutStr = layoutFormatted.join(' ') || '未提供';

    // 組裝結構化樓層
    const fCur = form.floor_current.value.trim();
    const fTot = form.floor_total.value.trim();
    const floorStr = fCur && fTot ? `${fCur} / ${fTot} 樓` : fCur ? `${fCur} 樓` : '';

    // 組裝結構化屋齡
    const ageNum = form.age_num.value.trim();
    const ageStr = ageNum === '0' ? '新成屋' : ageNum ? `約 ${ageNum} 年` : '';

    // 組裝結構化管理費
    const mgmtMode = form.mgmt_mode.value;
    const mgmtAmt = form.mgmt_amount.value.trim();
    let mgmtFeeStr = '包含於租金';
    if (mgmtMode === 'extra') {
      mgmtFeeStr = mgmtAmt ? `另計 ${mgmtAmt} 元/月` : '另計';
    } else if (mgmtMode === 'none') {
      mgmtFeeStr = '無管理費';
    }

    const prop = {
      id: id || 'prop-' + Date.now(),
      name: form.name.value.trim(),
      type: form.type.value,
      rent: Number(form.rent.value) || 0,
      size: form.size_num.value ? `${form.size_num.value} 坪` : '',
      layout: layoutStr,
      floor: floorStr,
      age: ageStr,
      costs: {
        managementFee: mgmtFeeStr,
        parkingFee: form.parkingFee.value,
        subsidy: form.subsidy.value.trim() || '待確認',
      },
      address: form.address.value.trim(),
      leaseTerms: form.leaseTerms.value.trim(),
      amenities: form.amenities.value.trim(),
      trafficAndSchool: form.trafficAndSchool.value.trim(),
      url: form.url.value.trim(),
      subjective: {
        overallRating: parseInt(form.subj_rating.value) || 0,
        decision: subjDecisionRadio ? subjDecisionRadio.value : '',
        highlightPros: form.subj_pros.value.trim(),
        dealBreakerCons: form.subj_cons.value.trim(),
        aspects: {
          transportation: {
            rating: form.subj_trans_rating.value,
            now: form.subj_trans_now.value.trim(),
            future: form.subj_trans_future.value.trim(),
          },
          school: {
            rating: form.subj_school_rating.value,
            now: form.subj_school_now.value.trim(),
            future: form.subj_school_future.value.trim(),
          },
          condition: {
            rating: form.subj_cond_rating.value,
            now: form.subj_cond_now.value.trim(),
            future: form.subj_cond_future.value.trim(),
          },
          neighborhood: {
            rating: form.subj_neigh_rating.value,
            now: form.subj_neigh_now.value.trim(),
            future: form.subj_neigh_future.value.trim(),
          },
        },
        familyNotes: form.subj_family.value.trim(),
      },
    };

    PropertyStore.save(prop);
    document.getElementById('property-dialog')?.close();
    renderPropertyList();
  });

  // AI 設定 Provider 變更監聽
  document.getElementById('setting-provider')?.addEventListener('change', (e) => {
    updateProviderFormDisplay(e.target.value);
  });

  // AI 設定 Model Select 變更監聽 (切換自訂模型輸入框)
  document.getElementById('setting-model-select')?.addEventListener('change', (e) => {
    const customLabel = document.getElementById('setting-model-custom-label');
    const customInput = document.getElementById('setting-model-custom');
    if (e.target.value === '__custom__') {
      customLabel.style.display = 'block';
      customInput.focus();
    } else {
      customLabel.style.display = 'none';
    }
  });

  // AI 設定 Form Submit
  document.getElementById('settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const modelValue = form.modelSelect.value === '__custom__' ? form.modelCustom.value.trim() : form.modelSelect.value;

    SettingsStore.save({
      provider: form.provider.value,
      model: modelValue,
      baseUrl: form.baseUrl.value.trim(),
      enableWebSearch: form.enableWebSearch.checked,
      apiKey: form.apiKey.value.trim(),
    });

    const statusSpan = document.getElementById('settings-save-status');
    if (statusSpan) {
      statusSpan.textContent = '設定已儲存於本機！';
      setTimeout(() => (statusSpan.textContent = ''), 2000);
    }
    document.getElementById('settings-dialog')?.close();
  });

  // 清除全部資料
  document.getElementById('clear-all-data-btn')?.addEventListener('click', () => {
    if (confirm('確定要清除所有本機儲存的看房資料、家庭設定與 API Key 嗎？此操作將完全清空所有物件與家庭資料，無法還原。')) {
      SettingsStore.clearAll();
      State.selectedPropertyIds.clear();
      State.lastComparisonResult = null;

      // 清空設定表單輸入
      const settingsForm = document.getElementById('settings-form');
      if (settingsForm) {
        settingsForm.apiKey.value = '';
        settingsForm.baseUrl.value = '';
      }

      document.getElementById('settings-dialog')?.close();
      renderPropertyList();
      alert('所有本機物件、家庭資料與設定已完全清空！');
    }
  });

  // 初始渲染為全螢幕專屬首頁
  switchView('home');
});
