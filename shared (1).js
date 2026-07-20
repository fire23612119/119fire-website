/**
 * shared.js
 * 每個頁面在 <body> 最後 <script src="shared.js" data-page="about"></script> 引入
 * data-page 對應 nav 裡每個 <a> 的 data-page 屬性
 *
 * 功能：
 *  1. fetch nav.html 插入 <header> 位置（需頁面有 <div id="nav-placeholder">）
 *  2. fetch footer.html 插入 <footer> 位置（需頁面有 <div id="footer-placeholder">）
 *  3. 依 data-page 自動加 class="active" 到對應連結
 *  4. 漢堡選單開關
 *
 * ── 使用方式 ──
 * 在每個 HTML 的 <body> 裡：
 *   把 <header>...</header> 換成：  <div id="nav-placeholder"></div>
 *   把 <footer>...</footer> 換成：  <div id="footer-placeholder"></div>
 *   在 </body> 前加：               <script src="shared.js" data-page="about"></script>
 *
 * data-page 值：
 *   index | about | course-fire | course-security | course-inspector | register
 */

(function () {
  const scriptEl = document.currentScript;
  const currentPage = scriptEl ? scriptEl.getAttribute('data-page') : '';

  async function loadFragment(url, placeholderId) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      const html = await res.text();
      placeholder.outerHTML = html;
    } catch (e) {
      console.warn('[shared.js] 無法載入', url, e.message);
    }
  }

  function markActive() {
    if (!currentPage) return;
    document.querySelectorAll('[data-page]').forEach(link => {
      if (link.tagName === 'A') {
        link.classList.toggle('active', link.getAttribute('data-page') === currentPage);
      }
    });
  }

  function bindHamburger() {
    const btn = document.getElementById('nav-hamburger');
    const drawer = document.getElementById('nav-drawer');
    if (btn && drawer) {
      btn.addEventListener('click', () => drawer.classList.toggle('open'));
    }
  }

  async function init() {
    await loadFragment('nav.html', 'nav-placeholder');
    await loadFragment('footer.html', 'footer-placeholder');
    markActive();
    bindHamburger();
    initFaqBot();
  }

  // ============================================================
  // FAQ 小幫手：懸浮客服按鈕，自動讀取 faq.html 的問答內容當知識庫，
  // 用簡單的中文雙字比對做關鍵字配對，完全免費、不需要任何外部AI服務
  // ============================================================
  let faqKnowledgeBase = null; // [{question, answer, grams}]

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent.replace(/\s+/g, ' ').trim();
  }

  function toBigrams(str) {
    const clean = String(str || '').replace(/[\s\u3000-\u303F\uFF00-\uFFEF!-\/:-@\[-`{-~]/g, '');
    const grams = [];
    for (let i = 0; i < clean.length - 1; i++) grams.push(clean.substr(i, 2));
    return grams;
  }

  async function loadFaqKnowledgeBase() {
    if (faqKnowledgeBase) return faqKnowledgeBase;
    try {
      const res = await fetch('faq.html');
      if (!res.ok) throw new Error('faq.html 讀取失敗');
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const items = [];
      doc.querySelectorAll('details.qa').forEach(el => {
        const q = el.querySelector('summary');
        const a = el.querySelector('.a');
        if (!q || !a) return;
        const question = q.textContent.trim();
        const answer = stripHtml(a.innerHTML);
        items.push({
          question, answer,
          qGrams: toBigrams(question),
          aGrams: toBigrams(answer)
        });
      });
      faqKnowledgeBase = items;
    } catch (e) {
      console.warn('[FAQ小幫手] 知識庫載入失敗', e.message);
      faqKnowledgeBase = [];
    }
    return faqKnowledgeBase;
  }

  function scoreEntry(queryGrams, entry) {
    const qSet = new Set(entry.qGrams);
    const aSet = new Set(entry.aGrams);
    let score = 0;
    queryGrams.forEach(g => {
      if (qSet.has(g)) score += 2; // 問題文字比對到，權重較高
      else if (aSet.has(g)) score += 1; // 答案內文比對到，權重較低
    });
    return score;
  }

  async function findBestAnswer(query) {
    const kb = await loadFaqKnowledgeBase();
    if (!kb.length) return null;
    const queryGrams = toBigrams(query);
    if (!queryGrams.length) return null;

    let best = null, bestScore = 0;
    kb.forEach(entry => {
      const s = scoreEntry(queryGrams, entry);
      if (s > bestScore) { bestScore = s; best = entry; }
    });

    // 門檻：至少要有一定比例的字比對到，避免亂配對
    const minScore = Math.max(2, Math.ceil(queryGrams.length * 0.5));
    return bestScore >= minScore ? best : null;
  }

  const FAQ_QUICK_QUESTIONS = ['如何報名', '上課地點', '課程費用及匯款', '應攜帶物品', '證書效期', '候補機制'];
  const FAQ_FALLBACK =
    '不好意思，我目前只能回答網站常見問題頁面裡有的內容，這個問題我還答不出來。\n\n' +
    '建議您直接來電洽詢：\n(02) 2361-2119 ／ (05) 283-8119\n\n' +
    '或前往「常見問題」頁面查看完整內容。';

  function initFaqBot() {
    if (document.getElementById('faqbot-toggle')) return; // 避免重複初始化

    const style = document.createElement('style');
    style.textContent = `
      #faqbot-toggle {
        position: fixed; right: 20px; bottom: 20px; z-index: 999;
        width: 56px; height: 56px; border-radius: 50%;
        background: var(--teal-900, #0D373D);
        color: #fff; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 6px 20px rgba(13,55,61,.35);
        transition: transform .2s ease;
      }
      #faqbot-toggle:hover { transform: scale(1.06); }
      #faqbot-toggle svg { width: 26px; height: 26px; }
      #faqbot-panel {
        position: fixed; right: 20px; bottom: 88px; z-index: 999;
        width: 340px; max-width: calc(100vw - 40px);
        height: 460px; max-height: calc(100vh - 140px);
        background: #fff; border-radius: 16px;
        box-shadow: 0 12px 40px rgba(13,55,61,.25);
        display: none; flex-direction: column; overflow: hidden;
        font-family: 'Noto Sans TC', sans-serif;
      }
      #faqbot-panel.open { display: flex; }
      #faqbot-header {
        background: var(--teal-900, #0D373D); color: #fff;
        padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;
      }
      #faqbot-header strong { font-family: 'Noto Serif TC', serif; font-size: 15px; }
      #faqbot-header button {
        background: none; border: none; color: #fff; cursor: pointer;
        font-size: 20px; line-height: 1; opacity: .8;
      }
      #faqbot-header button:hover { opacity: 1; }
      #faqbot-quick {
        display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px;
        border-bottom: 1px solid #DEE7E8; background: #F6FAFA;
      }
      #faqbot-quick button {
        font-size: 12px; padding: 5px 10px; border-radius: 999px;
        border: 1px solid #2FB3C4; background: #fff; color: #134248;
        cursor: pointer; white-space: nowrap;
      }
      #faqbot-quick button:hover { background: #E3F5F7; }
      #faqbot-messages {
        flex: 1; overflow-y: auto; padding: 12px 14px;
        display: flex; flex-direction: column; gap: 10px;
      }
      .faqbot-msg { max-width: 85%; padding: 9px 12px; border-radius: 12px; font-size: 13px; line-height: 1.6; white-space: pre-line; }
      .faqbot-msg.bot { align-self: flex-start; background: #E3F5F7; color: #14272A; border-bottom-left-radius: 3px; }
      .faqbot-msg.user { align-self: flex-end; background: #0D373D; color: #fff; border-bottom-right-radius: 3px; }
      #faqbot-inputrow {
        display: flex; gap: 6px; padding: 10px 12px; border-top: 1px solid #DEE7E8;
      }
      #faqbot-input {
        flex: 1; border: 1px solid #DEE7E8; border-radius: 20px;
        padding: 8px 14px; font-size: 13px; outline: none;
        font-family: 'Noto Sans TC', sans-serif;
      }
      #faqbot-input:focus { border-color: #2FB3C4; }
      #faqbot-send {
        background: #0D373D; color: #fff; border: none; border-radius: 20px;
        padding: 0 16px; font-size: 13px; cursor: pointer;
      }
      #faqbot-send:hover { background: #134248; }
      @media (max-width: 420px) {
        #faqbot-panel { right: 10px; left: 10px; width: auto; bottom: 80px; }
        #faqbot-toggle { right: 14px; bottom: 14px; }
      }
    `;
    document.head.appendChild(style);

    const toggle = document.createElement('button');
    toggle.id = 'faqbot-toggle';
    toggle.setAttribute('aria-label', '開啟常見問題小幫手');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

    const panel = document.createElement('div');
    panel.id = 'faqbot-panel';
    panel.innerHTML = `
      <div id="faqbot-header">
        <strong>常見問題小幫手</strong>
        <button id="faqbot-close" aria-label="關閉">&times;</button>
      </div>
      <div id="faqbot-quick"></div>
      <div id="faqbot-messages"></div>
      <div id="faqbot-inputrow">
        <input id="faqbot-input" type="text" placeholder="輸入您的問題…" />
        <button id="faqbot-send">送出</button>
      </div>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(panel);

    const quickWrap = panel.querySelector('#faqbot-quick');
    FAQ_QUICK_QUESTIONS.forEach(q => {
      const btn = document.createElement('button');
      btn.textContent = q;
      btn.addEventListener('click', () => handleAsk(q));
      quickWrap.appendChild(btn);
    });

    const messages = panel.querySelector('#faqbot-messages');
    const input = panel.querySelector('#faqbot-input');
    const sendBtn = panel.querySelector('#faqbot-send');

    function addMessage(text, who) {
      const el = document.createElement('div');
      el.className = 'faqbot-msg ' + who;
      el.textContent = text;
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
    }

    async function handleAsk(text) {
      text = String(text || '').trim();
      if (!text) return;
      addMessage(text, 'user');
      input.value = '';
      const thinking = document.createElement('div');
      thinking.className = 'faqbot-msg bot';
      thinking.textContent = '查詢中…';
      messages.appendChild(thinking);
      messages.scrollTop = messages.scrollHeight;

      const best = await findBestAnswer(text);
      thinking.remove();
      addMessage(best ? best.answer : FAQ_FALLBACK, 'bot');
    }

    toggle.addEventListener('click', () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open') && !messages.childElementCount) {
        addMessage('您好！我是常見問題小幫手，您可以點選下方按鈕，或直接輸入問題（例如：如何報名、上課要帶什麼）。', 'bot');
      }
    });
    panel.querySelector('#faqbot-close').addEventListener('click', () => panel.classList.remove('open'));
    sendBtn.addEventListener('click', () => handleAsk(input.value));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') handleAsk(input.value); });

    loadFaqKnowledgeBase(); // 預先背景載入，使用者點開時就不用等待
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
