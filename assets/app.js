/* =============================================================
   Shared behaviour for the static HTML prototype.

   The application frame (top bar, side menu, bottom navigation) is defined
   here once and injected into every screen, so a menu entry is edited in a
   single place instead of fifteen files. Everything is inline — no fetch,
   no build step — so the pages work from file:// and from GitHub Pages alike.
   ============================================================= */
(function () {
  'use strict';

  /* ---------- Screen registry ---------- */
  // Every screen of the prototype. `id` is what a page declares in
  // <body data-screen="…">; `file` is what the links point at.
  var SCREENS = [
    { id: 'login',        code: 'MH-A01', file: 'login.html',            title: 'Đăng nhập',                group: 'auth',  device: '📱 💻' },
    { id: 'two-factor',   code: 'MH-A01', file: 'two-factor.html',       title: 'Xác thực hai lớp (2FA)',   group: 'auth',  device: '📱 💻' },
    { id: 'activate',     code: 'MH-A02', file: 'activate.html',         title: 'Kích hoạt tài khoản',      group: 'auth',  device: '📱 💻' },
    { id: 'password',     code: 'MH-A02', file: 'change-password.html',  title: 'Đổi mật khẩu lần đầu',     group: 'auth',  device: '📱 💻' },
    { id: 'devices',      code: 'MH-A02', file: 'devices.html',          title: 'Thiết bị của tôi',         group: 'auth',  device: '📱 💻' },

    { id: 'my-tasks',      code: 'MH-A05', file: 'my-tasks.html',        title: 'Việc của tôi',             group: 'work',  device: '📱' },
    { id: 'task-detail',   code: 'MH-A06', file: 'task-detail.html',     title: 'Chi tiết nhiệm vụ',        group: 'work',  device: '📱 💻' },
    { id: 'tasks',         code: 'MH-A04', file: 'tasks.html',           title: 'Danh sách nhiệm vụ',       group: 'work',  device: '💻' },
    { id: 'task-create',   code: 'MH-A07', file: 'task-create.html',     title: 'Giao việc',                group: 'work',  device: '💻 📱' },
    { id: 'task-split',    code: 'MH-B04', file: 'task-split.html',      title: 'Chia việc',                group: 'work',  device: '💻' },
    { id: 'shift-handover',code: 'MH-B07', file: 'shift-handover.html',  title: 'Việc tồn cuối ca',         group: 'work',  device: '📱 💻' },
    { id: 'notifications', code: 'MH-A12', file: 'notifications.html',   title: 'Thông báo',                group: 'work',  device: '📱 💻' },

    { id: 'unit-dashboard', code: 'MH-B02', file: 'unit-dashboard.html', title: 'Bảng điều khiển đơn vị',   group: 'manage', device: '💻 📱' },
    { id: 'exec-dashboard', code: 'MH-B01', file: 'exec-dashboard.html', title: 'Bảng điều khiển Ban Giám đốc', group: 'manage', device: '📱' },
    { id: 'task-report',    code: 'MH-B08', file: 'task-report.html',    title: 'Báo cáo nhiệm vụ',         group: 'manage', device: '💻' },

    { id: 'meetings',        code: 'MH-C01', file: 'meetings.html',         title: 'Danh sách phiên giao ban', group: 'meeting', device: '💻 📱' },
    { id: 'meeting-create',  code: 'MH-C02', file: 'meeting-create.html',   title: 'Tạo phiên giao ban',       group: 'meeting', device: '💻' },
    { id: 'meeting',         code: 'MH-C03', file: 'meeting.html',          title: 'Chủ trì phiên giao ban',   group: 'meeting', device: '💻' },
    { id: 'meeting-minutes', code: 'MH-C04', file: 'meeting-minutes.html',  title: 'Biên bản giao ban',        group: 'meeting', device: '💻' },
    { id: 'directives',      code: 'MH-C05', file: 'directives.html',       title: 'Theo dõi chỉ đạo',         group: 'meeting', device: '💻 📱' },
    { id: 'meeting-schedule',code: 'MH-C06', file: 'meeting-schedule.html', title: 'Lịch giao ban',            group: 'admin',   device: '💻' },

    { id: 'duty-roster',    code: 'MH-E01', file: 'duty-roster.html',    title: 'Lịch trực đơn vị',         group: 'duty', device: '💻' },
    { id: 'duty-schedule',  code: 'MH-E02', file: 'duty-schedule.html',  title: 'Xếp lịch trực',            group: 'duty', device: '💻' },
    { id: 'my-duty',        code: 'MH-E03', file: 'my-duty.html',        title: 'Lịch trực của tôi',        group: 'duty', device: '📱' },
    { id: 'leave-request',  code: 'MH-E04', file: 'leave-request.html',  title: 'Đăng ký nghỉ',             group: 'duty', device: '📱' },
    { id: 'leave-approval', code: 'MH-E05', file: 'leave-approval.html', title: 'Duyệt nghỉ',               group: 'duty', device: '📱 💻' },
    { id: 'shift-swap',     code: 'MH-E06', file: 'shift-swap.html',     title: 'Xin đổi ca trực',          group: 'duty', device: '📱' },
    { id: 'swap-approval',  code: 'MH-E06', file: 'swap-approval.html',  title: 'Duyệt đổi trực',           group: 'duty', device: '📱 💻' },
    { id: 'duty-stats',     code: 'MH-E07', file: 'duty-stats.html',     title: 'Thống kê ca trực',         group: 'duty', device: '💻' },
    { id: 'duty-print',     code: 'E-XUAT-01', file: 'duty-print.html',  title: 'In lịch dán bảng',         group: 'duty', device: '💻' },
    { id: 'shift-types',    code: 'MH-E08', file: 'shift-types.html',    title: 'Cấu hình ca trực',         group: 'admin', device: '💻' },

    { id: 'users',          code: 'MH-A08', file: 'index.html',          title: 'Quản lý người dùng',       group: 'admin', device: '💻' },
    { id: 'user-import',    code: 'MH-A09', file: 'user-import.html',    title: 'Nhập tài khoản từ Excel',  group: 'admin', device: '💻' },
    { id: 'org-units',      code: 'MH-A10', file: 'org-units.html',      title: 'Cơ cấu tổ chức',           group: 'admin', device: '💻' },
    { id: 'task-templates', code: 'MH-B06', file: 'task-templates.html', title: 'Danh mục công việc chuẩn', group: 'admin', device: '💻' },
    { id: 'audit-log',      code: 'MH-A11', file: 'audit-log.html',      title: 'Nhật ký hệ thống',         group: 'admin', device: '💻' }
  ];

  /* ---------- Menus per role ---------- */
  // Follows 31-Sitemap-va-Navigation.md section 3. A menu entry that has no
  // screen in the prototype yet points back at the index, so nothing dead-ends.
  var MENUS = {
    // ~80% of the users. Five entries, nothing more — see the sitemap note.
    cbnv: [
      { icon: '📋', label: 'Việc của tôi',          screen: 'my-tasks' },
      { icon: '📅', label: 'Lịch trực của tôi',     screen: 'my-duty' },
      { icon: '⭐', label: 'Phiếu thi đua của tôi', screen: null },
      { icon: '🔔', label: 'Thông báo',             screen: 'notifications' },
      { icon: '⚙️', label: 'Cài đặt',               screen: 'devices' }
    ],
    // DAU_MOI — the heaviest working group on the system.
    manager: [
      { icon: '🏠', label: 'Bảng điều khiển đơn vị', screen: 'unit-dashboard' },
      { icon: '📋', label: 'Nhiệm vụ đơn vị',        screen: 'tasks' },
      { icon: '🔀', label: 'Chia việc',              screen: 'task-split' },
      { icon: '🌙', label: 'Việc tồn cuối ca',       screen: 'shift-handover' },
      { icon: '📝', label: 'Việc của tôi',           screen: 'my-tasks' },
      { icon: '🗣', label: 'Giao ban',               screen: 'meetings' },
      { label: 'Tạo phiên',         screen: 'meeting-create', sub: true },
      { label: 'Theo dõi chỉ đạo',  screen: 'directives',     sub: true },
      { icon: '⭐', label: 'Thi đua',                screen: null },
      { icon: '📅', label: 'Lịch trực',              screen: 'duty-roster' },
      { label: 'Lập lịch',         screen: 'duty-schedule',  sub: true },
      { label: 'Duyệt nghỉ',       screen: 'leave-approval', sub: true },
      { label: 'Duyệt đổi trực',   screen: 'swap-approval',  sub: true },
      { label: 'Thống kê ca trực', screen: 'duty-stats',     sub: true },
      { label: 'Lịch của tôi',     screen: 'my-duty',        sub: true },
      { icon: '📊', label: 'Báo cáo nhiệm vụ',       screen: 'task-report' },
      { icon: '🔔', label: 'Thông báo',              screen: 'notifications' }
    ],
    // BGD / BGD_CTY — exception management across the whole hospital.
    board: [
      { icon: '🏠', label: 'Bảng điều khiển',    screen: 'exec-dashboard' },
      { icon: '📋', label: 'Nhiệm vụ toàn viện', screen: 'tasks' },
      { icon: '🗣', label: 'Giao ban',           screen: 'meetings' },
      { label: 'Tạo phiên',         screen: 'meeting-create', sub: true },
      { label: 'Theo dõi chỉ đạo',  screen: 'directives',     sub: true },
      { icon: '⭐', label: 'Thi đua',            screen: null },
      { icon: '📉', label: 'Chỉ tiêu',           screen: null },
      { icon: '📊', label: 'Báo cáo nhiệm vụ',   screen: 'task-report' },
      { icon: '🔔', label: 'Thông báo',          screen: 'notifications' }
    ],
    admin: [
      { icon: '👥', label: 'Người dùng',               screen: 'users' },
      { icon: '🏢', label: 'Cơ cấu tổ chức',           screen: 'org-units' },
      { icon: '📚', label: 'Danh mục công việc chuẩn', screen: 'task-templates' },
      { icon: '🕒', label: 'Ca trực',                  screen: 'shift-types' },
      { icon: '🗣', label: 'Lịch giao ban',            screen: 'meeting-schedule' },
      { icon: '📜', label: 'Nhật ký',                  screen: 'audit-log' },
      { icon: '🔔', label: 'Thông báo',                screen: 'notifications' }
    ]
  };

  var MENU_HEADINGS = { cbnv: '', manager: 'Điều hành đơn vị', board: 'Toàn viện', admin: 'Quản trị' };

  // Where the hospital logo in the top bar takes you: each role has its own home.
  var HOME_BY_ROLE = { cbnv: 'my-tasks', manager: 'unit-dashboard', board: 'exec-dashboard', admin: 'users' };

  // The bottom bar is CBNV-only. Other roles have too many entries for three slots.
  var BOTTOM_NAV = [
    { icon: '📋', label: 'Việc',    screen: 'my-tasks' },
    { icon: '📅', label: 'Trực',    screen: 'my-duty' },
    { icon: '⭐', label: 'Thi đua', screen: null }
  ];

  var NOTIFICATIONS = [
    { unread: true,  title: 'Nhiệm vụ mới: Kiểm tra máy thở buồng 4', meta: 'PGĐ Nguyễn Anh Tuấn · 5 phút',   screen: 'task-detail' },
    { unread: true,  title: 'Việc bị trả lại: Báo cáo giường bệnh',   meta: 'ĐD trưởng Bùi Thị Tố Hoa · 1 giờ', screen: 'task-detail' },
    { unread: false, title: 'Đổi trực đã được duyệt',                 meta: 'Hệ thống · 2 giờ trước',           screen: 'my-duty' },
    { unread: false, title: 'Có bình luận mới trên NOI-0142',         meta: 'ĐD Trần Văn B · Hôm qua',          screen: 'task-detail' },
    { unread: true,  title: 'Nhiệm vụ đã quá hạn: Hoàn thiện hồ sơ 12 ca ra viện', meta: 'Hệ thống · Hôm qua',  screen: 'task-detail' }
  ];

  var LOGO = '<svg class="topbar__logo" viewBox="0 0 40 40" aria-hidden="true">' +
    '<rect width="40" height="40" rx="10" fill="#ED3E0F"/>' +
    '<circle cx="20" cy="20" r="12" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>' +
    '<path d="M17 11h6v6h6v6h-6v6h-6v-6h-6v-6h6z" fill="#fff"/></svg>';

  function screenById(id) {
    for (var i = 0; i < SCREENS.length; i++) if (SCREENS[i].id === id) return SCREENS[i];
    return null;
  }

  function hrefFor(id) {
    var s = screenById(id);
    return s ? s.file : 'screens.html';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  /* ---------- Frame ---------- */
  function buildTopbar(current, role, unread) {
    var facility = role === 'cbnv'
      ? ''
      : '<button class="facility-select" type="button">Cơ sở 2 <span aria-hidden="true">▾</span></button>';

    return '' +
      '<header class="topbar">' +
        '<button class="icon-btn mobile-only" type="button" data-action="open-drawer" aria-label="Mở menu">☰</button>' +
        '<a class="topbar__brand" href="' + hrefFor(HOME_BY_ROLE[role] || 'my-tasks') + '">' + LOGO +
          '<span class="topbar__names">' +
            '<span class="topbar__title">Trung tâm điều hành số</span>' +
            '<span class="topbar__subtitle">Bệnh viện Anh Quất</span>' +
          '</span>' +
        '</a>' +
        '<span class="topbar__spacer"></span>' +
        '<div class="topbar__right">' +
          '<div class="dropdown">' +
            '<button class="icon-btn" type="button" data-action="toggle-notifications" aria-label="Thông báo" aria-expanded="false">🔔' +
              (unread ? '<span class="badge-count">' + unread + '</span>' : '') +
            '</button>' +
            buildNotificationMenu() +
          '</div>' +
          facility +
          '<a class="avatar" href="' + hrefFor('devices') + '" title="Nguyễn Thị Lan">NT</a>' +
        '</div>' +
      '</header>';
  }

  function buildNotificationMenu() {
    var items = NOTIFICATIONS.slice(0, 4).map(function (n) {
      return '<a class="notif' + (n.unread ? ' notif--unread' : '') + '" href="' + hrefFor(n.screen || 'notifications') + '">' +
        '<span class="notif__title">' + escapeHtml(n.title) + '</span>' +
        '<span class="notif__meta">' + escapeHtml(n.meta) + '</span></a>';
    }).join('');

    return '<div class="dropdown__menu" data-notifications hidden>' +
      '<div class="dropdown__head"><strong style="flex:1">Thông báo</strong>' +
        '<button class="btn btn--quiet btn--small" type="button" data-action="toast" data-toast="Đã đánh dấu tất cả là đã đọc">Đánh dấu đã đọc</button></div>' +
      items +
      '<div class="dropdown__foot"><a href="' + hrefFor('notifications') + '">Xem tất cả thông báo</a></div>' +
    '</div>';
  }

  function buildSidebar(current, role) {
    var menu = MENUS[role] || MENUS.manager;
    var heading = MENU_HEADINGS[role];

    var items = menu.map(function (entry) {
      var target = entry.screen ? hrefFor(entry.screen) : 'screens.html#chua-dung';
      var active = entry.screen === current ? ' is-active' : '';
      var soon = entry.screen ? '' : ' title="Màn hình này chưa có trong bản mẫu"';
      return '<a class="nav__item' + (entry.sub ? ' nav__sub' : '') + active + '" href="' + target + '"' + soon + '>' +
        (entry.sub ? '' : '<span class="nav__icon" aria-hidden="true">' + entry.icon + '</span>') +
        '<span class="nav__label">' + escapeHtml(entry.label) + (entry.screen ? '' : ' <span class="text-muted">·</span>') + '</span></a>';
    }).join('');

    return '<aside class="sidebar">' +
      '<nav class="nav" aria-label="Điều hướng chính">' +
        (heading ? '<span class="nav__group-label">' + escapeHtml(heading) + '</span>' : '') +
        items +
      '</nav>' +
      '<div class="sidebar__bottom nav">' +
        '<a class="nav__item" href="screens.html"><span class="nav__icon" aria-hidden="true">🗂</span><span class="nav__label">Tất cả màn hình</span></a>' +
        '<button class="nav__item desktop-only" type="button" data-action="toggle-sidebar">' +
          '<span class="nav__icon" aria-hidden="true">◀</span><span class="nav__label">Thu gọn</span></button>' +
      '</div>' +
    '</aside>';
  }

  function buildBottomNav(current) {
    var items = BOTTOM_NAV.map(function (entry) {
      var target = entry.screen ? hrefFor(entry.screen) : 'screens.html#chua-dung';
      var active = entry.screen === current ? ' is-active' : '';
      return '<a class="bottom-nav__item' + active + '" href="' + target + '">' +
        '<span aria-hidden="true">' + entry.icon + '</span><span>' + escapeHtml(entry.label) + '</span></a>';
    }).join('');
    return '<nav class="bottom-nav" aria-label="Điều hướng nhanh">' + items + '</nav>';
  }

  function mountFrame() {
    var body = document.body;
    var current = body.dataset.screen || '';
    var role = body.dataset.role || 'manager';
    var unread = body.dataset.unread || '3';

    var topbarSlot = document.querySelector('[data-shell="topbar"]');
    if (topbarSlot) topbarSlot.outerHTML = buildTopbar(current, role, unread);

    var sidebarSlot = document.querySelector('[data-shell="sidebar"]');
    if (sidebarSlot) sidebarSlot.outerHTML = buildSidebar(current, role);

    var bottomSlot = document.querySelector('[data-shell="bottomnav"]');
    if (bottomSlot) {
      // Bottom navigation is for CBNV only.
      if (role === 'cbnv') {
        bottomSlot.outerHTML = buildBottomNav(current);
        body.classList.add('has-bottom-nav');
      } else {
        bottomSlot.remove();
      }
    }

    if (!document.querySelector('.drawer-backdrop')) {
      var backdrop = document.createElement('div');
      backdrop.className = 'drawer-backdrop';
      backdrop.setAttribute('data-action', 'close-drawer');
      body.appendChild(backdrop);
    }

    // Tablet defaults to the 64px rail; the desktop choice is remembered.
    try {
      if (localStorage.getItem('sidebar-collapsed') === '1') body.classList.add('sidebar-collapsed');
    } catch (err) { /* private mode — the default layout is fine */ }

    var screen = screenById(current);
    if (screen && !document.title) document.title = screen.title;
  }

  /* ---------- Interactions ---------- */
  function toast(message, kind) {
    var host = document.querySelector('.toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'toast toast--' + (kind || 'success');
    el.setAttribute('role', 'status');
    el.textContent = message;
    host.appendChild(el);
    setTimeout(function () { el.remove(); }, 4000);
  }

  function closeAllDropdowns() {
    document.querySelectorAll('[data-notifications]').forEach(function (menu) {
      menu.hidden = true;
      var trigger = menu.parentNode.querySelector('[data-action="toggle-notifications"]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function openOverlay(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('is-open');
  }

  function closeOverlay(el) {
    var overlay = el.closest ? el.closest('.overlay') : null;
    if (overlay) overlay.classList.remove('is-open');
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-action]');

    if (!trigger || trigger.dataset.action !== 'toggle-notifications') {
      if (!event.target.closest('[data-notifications]')) closeAllDropdowns();
    }
    if (!trigger) return;

    var action = trigger.dataset.action;

    if (action === 'open-drawer')  { document.body.classList.add('drawer-open'); }
    if (action === 'close-drawer') { document.body.classList.remove('drawer-open'); }

    if (action === 'toggle-sidebar') {
      var collapsed = document.body.classList.toggle('sidebar-collapsed');
      try { localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0'); } catch (err) { /* ignore */ }
    }

    if (action === 'toggle-notifications') {
      event.preventDefault();
      var menu = trigger.parentNode.querySelector('[data-notifications]');
      var willOpen = menu.hidden;
      closeAllDropdowns();
      menu.hidden = !willOpen;
      trigger.setAttribute('aria-expanded', String(willOpen));
    }

    if (action === 'tab') {
      event.preventDefault();
      var group = trigger.closest('[data-tabs]');
      group.querySelectorAll('[data-action="tab"]').forEach(function (tab) {
        tab.classList.toggle('is-active', tab === trigger);
      });
      var panels = document.querySelectorAll('[data-tab-panel="' + group.dataset.tabs + '"]');
      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.tabName !== trigger.dataset.tab;
      });
    }

    if (action === 'toggle-group') {
      trigger.closest('.group').classList.toggle('is-collapsed');
    }

    if (action === 'open-overlay') {
      event.preventDefault();
      openOverlay(trigger.dataset.target);
    }
    if (action === 'close-overlay') {
      event.preventDefault();
      closeOverlay(trigger);
    }

    if (action === 'toggle-password') {
      var input = document.getElementById(trigger.dataset.target);
      if (input) {
        var showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        trigger.setAttribute('aria-label', showing ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
      }
    }

    if (action === 'toast') {
      event.preventDefault();
      toast(trigger.dataset.toast || 'Đã lưu', trigger.dataset.toastKind);
    }

    // Demo submit: show the busy state for a moment, then confirm and move on.
    if (action === 'demo-submit') {
      event.preventDefault();
      if (trigger.classList.contains('is-busy')) return;
      trigger.classList.add('is-busy');
      var label = trigger.dataset.busyLabel;
      var original = trigger.textContent;
      if (label) trigger.textContent = label;
      setTimeout(function () {
        trigger.classList.remove('is-busy');
        if (label) trigger.textContent = original;
        if (trigger.dataset.toast) toast(trigger.dataset.toast, trigger.dataset.toastKind);
        if (trigger.dataset.next) window.location.href = trigger.dataset.next;
      }, 700);
    }
  });

  // Clicking the backdrop of an overlay closes it.
  document.addEventListener('click', function (event) {
    if (event.target.classList && event.target.classList.contains('overlay')) {
      event.target.classList.remove('is-open');
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.body.classList.remove('drawer-open');
    closeAllDropdowns();
    document.querySelectorAll('.overlay.is-open').forEach(function (el) { el.classList.remove('is-open'); });
  });

  // One-time code: jump to the next box as digits are typed.
  document.addEventListener('input', function (event) {
    var input = event.target;
    if (!input.closest || !input.closest('.code-input')) return;
    if (input.value.length >= 1) {
      var next = input.nextElementSibling;
      if (next && next.tagName === 'INPUT') next.focus();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFrame);
  } else {
    mountFrame();
  }

  window.prototype = { screens: SCREENS, toast: toast };
})();
