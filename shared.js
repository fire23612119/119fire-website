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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
