(function () {
  const API_URL = '/api/submit';

  function toNum(v, fallback = 0) {
    const n = Number(String(v ?? '').replace('%', '').replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : fallback;
  }
  function toProgressNum(v) {
    const raw = String(v ?? '').trim();
    if (!raw) return 0;
    const hasPercent = raw.includes('%');
    const n = toNum(raw, 0);
    if (hasPercent) return n;
    return n > 0 && n <= 1 ? n * 100 : n;
  }

  function parseDate(v) {
    const d = new Date(v || '');
    return isNaN(d.getTime()) ? null : d;
  }

  function isSameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  async function post(payload) {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return await r.json();
  }

  function fillHeaderUser() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (!user) return;
      const nameEl = document.getElementById('userNameText');
      const deptEl = document.getElementById('userDeptText');
      if (nameEl) nameEl.innerText = user.name || nameEl.innerText;
      if (deptEl) deptEl.innerText = user.department || deptEl.innerText;
    } catch (_) {}
  }

  function replaceLeadingValue(el, valueText) {
    if (!el) return;
    const html = el.innerHTML;
    if (!html) return;
    const replaced = html.replace(/^[\s\S]*?(?=<span|$)/, valueText + ' ');
    if (replaced !== html) {
      el.innerHTML = replaced;
    } else {
      el.textContent = valueText;
    }
  }

  function applyKpiCards(stats) {
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach(card => {
      const label = card.querySelector('p.text-xs, p.text-\[11px\], p.text-\[10px\]');
      const valueEl = card.querySelector('p.text-2xl, p.text-3xl, p.text-xl');
      if (!label || !valueEl) return;
      const t = (label.textContent || '').toLowerCase();

      if (/บุคลากร|ผู้เรียน|ครู.*ทั้งหมด|ลงทะเบียน|total/.test(t) && /ทั้งหมด|total|ลงทะเบียน/.test(t)) {
        replaceLeadingValue(valueEl, String(stats.totalUsers));
      } else if (/บทเรียน|คอร์ส|lessons|courses/.test(t)) {
        replaceLeadingValue(valueEl, String(stats.totalLessons));
      } else if (/ความคืบหน้า|อัตราเรียนจบ|completion|progress/.test(t)) {
        replaceLeadingValue(valueEl, String(stats.avgProgress) + '%');
      } else if (/post.?test|หลังเรียน/.test(t)) {
        replaceLeadingValue(valueEl, String(stats.avgPost) + '%');
      } else if (/pre.?test|ก่อนเรียน/.test(t)) {
        replaceLeadingValue(valueEl, String(stats.avgPre) + '%');
      } else if (/วันนี้|today|requests/.test(t)) {
        replaceLeadingValue(valueEl, String(stats.todayLogin));
      }
    });
  }

  function applySmallTable(users) {
    const table = document.querySelector('tbody');
    if (!table) return;
    const firstRow = table.querySelector('tr');
    if (!firstRow) return;
    const headerText = (table.closest('table')?.querySelector('thead')?.textContent || '').toLowerCase();
    if (!/ผู้รับการประเมิน|รายชื่อ|บุคลากร|ชื่อ|username|หน่วยงาน/.test(headerText)) return;

    const top = users.slice(0, 5);
    if (!top.length) return;

    const cols = (table.closest('table')?.querySelectorAll('thead th') || []).length || 5;
    const rows = top.map(u => {
      const name = u.name || '-';
      const dept = u.department || '-';
      const pre = toNum(u.preScore);
      const post = toNum(u.postScore);
      const prog = String(Math.round(toProgressNum(u.progress))) + '%';
      const login = u.lastLogin || '-';

      if (cols >= 6) {
        return `<tr class="hover:bg-slate-50 transition"><td class="p-3 font-bold text-slate-800">${name}</td><td class="p-3 text-slate-500">${dept}</td><td class="p-3 text-center">${pre}</td><td class="p-3 text-center">${post}</td><td class="p-3 text-center">${prog}</td><td class="p-3 text-right">${login}</td></tr>`;
      }
      return `<tr class="hover:bg-slate-50 transition"><td class="p-3 font-bold text-slate-800">${name}</td><td class="p-3">${dept}</td><td class="p-3 text-center">${prog}</td><td class="p-3 text-center">${post}</td><td class="p-3 text-right">${login}</td></tr>`;
    }).join('');

    table.innerHTML = rows;
  }

  async function init() {
    fillHeaderUser();

    if (!/admin-/.test(location.pathname)) return;

    try {
      const [uRes, lRes] = await Promise.all([post({ action: 'getUsers' }), post({ action: 'getLessons' })]);
      const users = Array.isArray(uRes.users) ? uRes.users : [];
      const lessons = Array.isArray(lRes.lessons) ? lRes.lessons : [];

      const totalUsers = users.length;
      const totalLessons = lessons.length;
      const avgProgress = totalUsers ? Math.round(users.reduce((s, u) => s + toProgressNum(u.progress), 0) / totalUsers) : 0;
      const avgPre = totalUsers ? Math.round((users.reduce((s, u) => s + toNum(u.preScore), 0) / (totalUsers * 5)) * 100) : 0;
      const avgPost = totalUsers ? Math.round((users.reduce((s, u) => s + toNum(u.postScore), 0) / (totalUsers * 5)) * 100) : 0;
      const now = new Date();
      const todayLogin = users.filter(u => isSameDay(parseDate(u.lastLogin), now)).length;

      const stats = { totalUsers, totalLessons, avgProgress, avgPre, avgPost, todayLogin };
      window.adminLiveData = { users, lessons, stats };

      applyKpiCards(stats);
      applySmallTable(users);

      document.dispatchEvent(new CustomEvent('admin-live-ready', { detail: window.adminLiveData }));
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
