const propertyDialog = document.querySelector('#property-dialog');
const settingsDialog = document.querySelector('#settings-dialog');
const objectiveForm = document.querySelector('#objective-form');
const settingsForm = document.querySelector('#settings-form');
const apiState = document.querySelector('#api-state');
const analysisStatus = document.querySelector('#analysis-status');
document.querySelectorAll('.dialog-close').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelector('#edit-property').addEventListener('click', () => propertyDialog.showModal());
document.querySelector('#open-settings').addEventListener('click', () => settingsDialog.showModal());

function formObject(form) { return Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()])); }
function updateApiState() { const configured = Boolean(sessionStorage.getItem('openai-api-key')); apiState.textContent = configured ? '● API Key 已設定（本次瀏覽）' : '○ 尚未設定 API Key'; apiState.classList.toggle('ready', configured); }
objectiveForm.addEventListener('submit', (event) => { event.preventDefault(); localStorage.setItem('objective-property', JSON.stringify(formObject(objectiveForm))); propertyDialog.close(); analysisStatus.textContent = '已儲存客觀資料；可使用 AI 重新分析。'; });
settingsForm.addEventListener('submit', (event) => { event.preventDefault(); const settings = formObject(settingsForm); sessionStorage.setItem('openai-api-key', settings.apiKey); sessionStorage.setItem('openai-model', settings.model); settingsForm.elements.apiKey.value = ''; settingsDialog.close(); updateApiState(); analysisStatus.textContent = 'API Key 已設定於本次瀏覽器工作階段。'; });

const savedObjective = localStorage.getItem('objective-property');
if (savedObjective) Object.entries(JSON.parse(savedObjective)).forEach(([key, value]) => { if (objectiveForm.elements[key]) objectiveForm.elements[key].value = value; });
settingsForm.elements.model.value = sessionStorage.getItem('openai-model') || 'gpt-5.4-nano';
updateApiState();
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }
function confidenceLabel(value) { return { confirmed: 'CONFIRMED・已知', likely: 'LIKELY・高度可能', possible: 'POSSIBLE・合理可能', speculative: 'SPECULATIVE・資訊不足' }[value] || value; }
function renderList(items) { return items.map((item) => `<li>${escapeHtml(item)}</li>`).join(''); }
function renderAnalysis(analysis) {
  document.querySelector('.score-orb span').textContent = Number(analysis.overallScore).toFixed(1); document.querySelector('.hero-stat strong').textContent = analysis.recommendation; document.querySelector('.updated').textContent = '剛剛完成 AI 分析';
  document.querySelector('.summary-card p').innerHTML = escapeHtml(analysis.summary).replace(/\n/g, '<br>'); document.querySelector('.tradeoff > p:not(.eyebrow)').textContent = analysis.tradeoff;
  document.querySelector('.finding.positive ul').innerHTML = renderList(analysis.strengths); document.querySelector('.finding.negative ul').innerHTML = renderList(analysis.weaknesses);
  const cards = [...document.querySelectorAll('.score-card')]; analysis.dimensions.slice(0, 4).forEach((dimension, index) => { if (!cards[index]) return; cards[index].querySelector('.score-value').textContent = Number(dimension.score).toFixed(1); cards[index].querySelector('h3').textContent = dimension.name; cards[index].querySelector('p').textContent = dimension.comment; cards[index].querySelector('.meter b').style.width = `${Math.max(0, Math.min(10, dimension.score)) * 10}%`; });
  const futureCards = document.querySelectorAll('.future-cards article'); const opportunity = analysis.opportunities[0]; const threat = analysis.threats[0]; if (opportunity) { futureCards[0].querySelector('p').textContent = opportunity.text; futureCards[0].querySelector('.confidence').textContent = confidenceLabel(opportunity.confidence); } if (threat) { futureCards[1].querySelector('p').textContent = threat.text; futureCards[1].querySelector('.confidence').textContent = confidenceLabel(threat.confidence); }
  const fits = document.querySelectorAll('.fit-grid article'); fits[0].querySelector('p').textContent = analysis.suitableFor.join('、'); fits[1].querySelector('p').textContent = analysis.notSuitableFor.join('、'); const checks = analysis.nextChecks.length ? `建議先確認：${analysis.nextChecks.join('、')}` : ''; document.querySelector('.plain-language').innerHTML = `<span>AI 結論</span>${escapeHtml(analysis.conclusion)}${checks ? `<br><small>${escapeHtml(checks)}</small>` : ''}`;
}
document.querySelector('#run-analysis').addEventListener('click', async () => {
  const apiKey = sessionStorage.getItem('openai-api-key'); if (!apiKey) { settingsDialog.showModal(); analysisStatus.textContent = '請先填入你的 OpenAI API Key。'; return; }
  const button = document.querySelector('#run-analysis'); button.disabled = true; button.textContent = '正在進行客觀分析…'; analysisStatus.textContent = '僅傳送客觀物件欄位；不包含「我的感受」與最終決策。';
  try { const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, model: sessionStorage.getItem('openai-model') || 'gpt-5.4-nano', objective: formObject(objectiveForm) }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || '無法完成分析。'); renderAnalysis(payload.analysis); analysisStatus.textContent = '分析完成。結果已更新，請繼續保留你的主觀判斷。'; document.querySelector('.hero').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (error) { analysisStatus.textContent = `分析未完成：${error.message}`; } finally { button.disabled = false; button.textContent = '用 AI 重新分析'; }
});
let rating = 0; const heartButton = document.querySelector('#heart-rating'); const ratingLabel = document.querySelector('#rating-label'); function setRating(next) { rating = next; heartButton.textContent = `${'♥ '.repeat(rating)}${'♡ '.repeat(5 - rating)}`.trim(); ratingLabel.textContent = rating ? `我的主觀喜好：${rating} / 5` : '尚未評分'; localStorage.setItem('qinghai-rating', rating); }
heartButton.addEventListener('click', () => setRating(rating === 5 ? 0 : rating + 1)); const note = document.querySelector('#personal-note'); note.value = localStorage.getItem('qinghai-note') || ''; setRating(Number(localStorage.getItem('qinghai-rating') || 0)); document.querySelector('#save-note').addEventListener('click', () => { localStorage.setItem('qinghai-note', note.value); const status = document.querySelector('#save-status'); status.textContent = '已儲存在此裝置'; window.setTimeout(() => status.textContent = '', 2600); });
document.querySelectorAll('#decision-options button').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('#decision-options button').forEach((item) => item.classList.remove('selected')); button.classList.add('selected'); localStorage.setItem('qinghai-decision', button.dataset.choice); })); const savedDecision = localStorage.getItem('qinghai-decision'); if (savedDecision) document.querySelector(`[data-choice="${savedDecision}"]`)?.classList.add('selected');
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
