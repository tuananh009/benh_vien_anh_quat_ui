/* =============================================================
   Part E — roster components mounted from data-roster="…" attributes.
   Needs assets/roster.js and assets/app.js loaded first.
   ============================================================= */
(function () {
  'use strict';

  var R = window.Roster;
  var CODES = ['S', 'C', 'Đ', '24'];
  var KEY_TO_CODE = { s: 'S', c: 'C', d: 'Đ', 'đ': 'Đ', '2': '24' };

  function esc(value) {
    return String(value).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }
  function toast(msg, kind) { if (window.prototype) window.prototype.toast(msg, kind); }
  function chip(code) { return '<span class="shift-chip" data-code="' + esc(code) + '">' + esc(code) + '</span>'; }
  function all(sel, rootEl) { return Array.prototype.slice.call((rootEl || document).querySelectorAll(sel)); }
  function gridFor(el) { return el.dataset.source === 'base' ? R.BASE : R.APPROVED; }
  function openOverlay(id) { var o = document.getElementById(id); if (o) o.classList.add('is-open'); }
  function storage(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (err) { return null; }
    return null;
  }

  /* ---------- 1. Matrix editor — MH-E02, also read-only on MH-E01 ---------- */
  function Matrix(host) {
    this.host = host;
    this.source = host.dataset.source || 'approved';
    this.grid = R.cloneGrid(this.source === 'base' ? R.BASE : R.APPROVED);
    this.editable = host.dataset.mode === 'edit';
    this.showSwaps = this.source !== 'base';
    this.undo = [];
    this.active = { row: 0, day: 1 };
    this.clipboard = null;
    this.drag = null;
    this.listeners = [];

    host.classList.add('roster-scroll');
    host.tabIndex = 0;
    host.setAttribute('aria-label', 'Bảng lịch trực tháng ' + R.MONTH + '/' + R.YEAR + '. Dùng phím mũi tên để di chuyển, gõ S, C, D để gán ca.');
    host.innerHTML = '<table class="roster" role="grid"></table>' +
      '<div class="roster-picker" hidden></div><div class="roster-trace" hidden></div>';
    this.table = host.querySelector('table');
    this.picker = host.querySelector('.roster-picker');
    this.trace = host.querySelector('.roster-trace');
    this.bind();
    this.render();
  }

  Matrix.prototype.setMode = function (opts) {
    if (opts.source && opts.source !== this.source) {
      this.source = opts.source;
      this.grid = R.cloneGrid(opts.source === 'base' ? R.BASE : R.APPROVED);
      this.undo = [];
    }
    if (opts.editable !== undefined) this.editable = opts.editable;
    this.showSwaps = this.source !== 'base';
    this.hidePopups();
    this.render();
  };

  Matrix.prototype.onChange = function (fn) { this.listeners.push(fn); fn(this.result, this); };

  Matrix.prototype.render = function () {
    var self = this, grid = this.grid, result = R.evaluate(grid);
    this.result = result;
    var html = '<thead><tr><th class="roster__name" scope="col">Nhân sự · ' + R.STAFF.length + ' người</th>' +
      '<th class="roster__prev" scope="col" title="Ca đêm cuối tháng trước — chỉ đọc">31<span>T8</span></th>';
    for (var d = 1; d <= R.DAYS; d++) {
      html += '<th scope="col" class="' + (R.isWeekend(d) ? 'is-weekend' : '') + '">' + d + '<span>' + R.dowLabel(d) + '</span></th>';
    }
    html += '<th class="roster__tot roster__tot--1" scope="col">S</th><th class="roster__tot roster__tot--2" scope="col">C</th>' +
      '<th class="roster__tot roster__tot--3" scope="col">Đ</th><th class="roster__tot roster__tot--4" scope="col">24</th>' +
      '<th class="roster__tot roster__tot--5" scope="col" title="Tổng số ca">Σ</th></tr></thead><tbody>';

    R.STAFF.forEach(function (p, r) {
      var leaves = R.LEAVE.filter(function (l) { return l.person === p.id; });
      var leaveNote = leaves.length
        ? '<span class="roster__name-leave" title="' + esc(leaves.map(function (l) { return l.type + ' ' + R.dayLabel(l.from) + '–' + R.dayLabel(l.to); }).join(' · ')) + '" aria-label="Có nghỉ phép đã duyệt">🌴</span>'
        : '';
      html += '<tr><th class="roster__name" scope="row" title="' + esc(p.label) + '">' + esc(p.label) + leaveNote + '</th>';
      var prev = grid[p.id][0];
      html += '<td class="roster__prev' + (prev ? ' has-shift' : '') + '" title="' + (prev ? esc('Ca ' + R.SHIFTS[prev].name + ' 31/08') : '') + '">' + esc(prev) + '</td>';
      for (var day = 1; day <= R.DAYS; day++) {
        var code = grid[p.id][day];
        var cls = ['cell'];
        var attrs = ' data-row="' + r + '" data-day="' + day + '" role="gridcell"';
        var text = code;
        var title = '';
        if (R.isWeekend(day)) cls.push('is-weekend');
        if (R.leaveOn(p.id, day)) {
          cls.push('is-leave'); text = 'P'; attrs += ' data-code="P"';
          title = 'Nghỉ phép đã duyệt — không gán được ca';
        } else if (code) {
          attrs += ' data-code="' + esc(code) + '"';
          title = R.SHIFTS[code].name + ' ' + R.shiftHours(code);
        } else if (R.otherUnitOn(p.id, day)) {
          var ext = R.otherUnitOn(p.id, day);
          cls.push('is-ext'); text = '↗';
          title = ext.label + ' ở ' + ext.unit;
        }
        if (result.flags[p.id] && result.flags[p.id][day]) cls.push('is-warn');
        if (self.showSwaps && code && R.swapAt(p.id, day)) cls.push('is-swap');
        if (r === self.active.row && day === self.active.day) { cls.push('is-active'); attrs += ' aria-selected="true"'; }
        html += '<td class="' + cls.join(' ') + '"' + attrs + (title ? ' title="' + esc(title) + '"' : '') + '>' + esc(text) + '</td>';
      }
      var t = result.totals[p.id];
      html += '<td class="roster__tot roster__tot--1">' + t.S + '</td><td class="roster__tot roster__tot--2">' + t.C + '</td>' +
        '<td class="roster__tot roster__tot--3">' + t['Đ'] + '</td><td class="roster__tot roster__tot--4">' + t['24'] + '</td>' +
        '<td class="roster__tot roster__tot--5' + (t.all > R.LIMITS.maxPerMonth ? ' is-over' : '') + '"' +
        (t.all > R.LIMITS.maxPerMonth ? ' title="Vượt tối đa ' + R.LIMITS.maxPerMonth + ' ca/tháng"' : '') + '>' + t.all + '</td></tr>';
    });

    html += '</tbody><tfoot>';
    R.COVERAGE.forEach(function (code) {
      html += '<tr><th class="roster__name" scope="row">Đủ người ca ' + R.SHIFTS[code].name + '</th><td class="roster__prev"></td>';
      for (var day = 1; day <= R.DAYS; day++) {
        var cov = result.coverage[day][code];
        if (cov.issues.length) {
          html += '<td class="check--warn" title="' + esc(cov.issues.map(function (i) { return i.text; }).join('\n')) + '">⚠</td>';
        } else {
          html += '<td class="check--ok" title="' + esc('Ngày ' + day + ' · ca ' + R.SHIFTS[code].name + ': ' + cov.count + '/' + cov.min + ' người') + '">✓</td>';
        }
      }
      html += '<td class="roster__tot roster__tot--1"></td><td class="roster__tot roster__tot--2"></td><td class="roster__tot roster__tot--3"></td><td class="roster__tot roster__tot--4"></td><td class="roster__tot roster__tot--5"></td></tr>';
    });
    html += '</tfoot>';

    this.table.innerHTML = html;
    this.table.classList.toggle('is-readonly', !this.editable);
    this.listeners.forEach(function (fn) { fn(result, self); });
  };

  Matrix.prototype.cellAt = function (row, day) {
    return this.table.querySelector('td.cell[data-row="' + row + '"][data-day="' + day + '"]');
  };

  Matrix.prototype.move = function (row, day) {
    row = Math.max(0, Math.min(R.STAFF.length - 1, row));
    day = Math.max(1, Math.min(R.DAYS, day));
    var old = this.cellAt(this.active.row, this.active.day);
    if (old) { old.classList.remove('is-active'); old.removeAttribute('aria-selected'); }
    this.active = { row: row, day: day };
    var cell = this.cellAt(row, day);
    if (cell) {
      cell.classList.add('is-active');
      cell.setAttribute('aria-selected', 'true');
      this.scrollIntoView(cell);
    }
  };

  Matrix.prototype.scrollIntoView = function (cell) {
    var host = this.host;
    var nameW = 220, totW = 200;
    var left = cell.offsetLeft, right = left + cell.offsetWidth;
    if (left - nameW < host.scrollLeft) host.scrollLeft = left - nameW - 8;
    else if (right + totW > host.scrollLeft + host.clientWidth) host.scrollLeft = right + totW - host.clientWidth + 8;
  };

  Matrix.prototype.shake = function (row, day) {
    var cell = this.cellAt(row, day);
    if (!cell) return;
    cell.classList.remove('is-shake');
    void cell.offsetWidth;
    cell.classList.add('is-shake');
  };

  Matrix.prototype.apply = function (changes, label) {
    var self = this, applied = [], blocked = [];
    changes.forEach(function (c) {
      var pid = R.STAFF[c.row].id;
      if (self.grid[pid][c.day] === c.code) return;
      var block = R.hardBlock(self.grid, pid, c.day, c.code);
      if (block) { blocked.push({ change: c, block: block }); return; }
      applied.push({ row: c.row, day: c.day, before: self.grid[pid][c.day], after: c.code });
      self.grid[pid][c.day] = c.code;
    });
    if (applied.length) {
      this.undo.push(applied);
      if (this.undo.length > 200) this.undo.shift();
    }
    this.render();
    blocked.forEach(function (b) { self.shake(b.change.row, b.change.day); });
    if (blocked.length === 1 && changes.length === 1) toast(blocked[0].block.message, 'error');
    else if (blocked.length) toast(label + ': bỏ qua ' + blocked.length + ' ô bị chặn (nghỉ phép đã duyệt hoặc trùng giờ)', 'error');
    if (applied.length) markDirty();
    return applied.length;
  };

  Matrix.prototype.assignActive = function (code) {
    if (!this.editable) { toast('Lịch đang khoá — mọi thay đổi phải qua quy trình đổi trực', 'info'); return; }
    var a = this.active;
    var ok = this.apply([{ row: a.row, day: a.day, code: code }], 'Gán ca');
    var cell = this.cellAt(a.row, a.day);
    if (cell) cell.classList.add('is-active');
    if (ok && code && a.day < R.DAYS) this.move(a.row, a.day + 1);
  };

  Matrix.prototype.undoLast = function () {
    var batch = this.undo.pop();
    if (!batch) { toast('Không còn thao tác để hoàn tác', 'info'); return; }
    var self = this;
    batch.forEach(function (c) { self.grid[R.STAFF[c.row].id][c.day] = c.before; });
    this.render();
    var first = batch[0];
    this.move(first.row, first.day);
    toast('Đã hoàn tác ' + batch.length + ' ô', 'info');
    markDirty();
  };

  Matrix.prototype.jumpTo = function (personId, day) {
    var row = 0;
    R.STAFF.forEach(function (p, i) { if (p.id === personId) row = i; });
    this.move(row, day);
    var cell = this.cellAt(row, day);
    if (!cell) return;
    this.host.focus({ preventScroll: true });
    this.host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    cell.classList.remove('is-flash');
    void cell.offsetWidth;
    cell.classList.add('is-flash');
  };

  Matrix.prototype.hidePopups = function () {
    this.picker.hidden = true;
    this.trace.hidden = true;
  };

  Matrix.prototype.placePopup = function (el, cell) {
    el.hidden = false;
    var top = cell.offsetTop + cell.offsetHeight + 4;
    var left = cell.offsetLeft - 8;
    var maxLeft = this.host.scrollLeft + this.host.clientWidth - el.offsetWidth - 8;
    el.style.left = Math.max(this.host.scrollLeft + 8, Math.min(left, maxLeft)) + 'px';
    if (top + el.offsetHeight > this.table.offsetHeight) top = cell.offsetTop - el.offsetHeight - 4;
    el.style.top = top + 'px';
  };

  Matrix.prototype.openPicker = function (cell) {
    this.trace.hidden = true;
    this.picker.innerHTML = CODES.map(function (c) {
      return '<button type="button" data-pick="' + c + '" data-code="' + c + '" title="' + esc(R.SHIFTS[c].name + ' ' + R.shiftHours(c)) + '">' + c + '</button>';
    }).join('') + '<button type="button" data-pick="" title="Xoá ca (Delete)">Xoá</button>';
    this.placePopup(this.picker, cell);
  };

  Matrix.prototype.openTrace = function (cell) {
    this.picker.hidden = true;
    var p = R.STAFF[+cell.dataset.row], day = +cell.dataset.day;
    var s = R.swapAt(p.id, day);
    if (!s) { this.trace.hidden = true; return; }
    this.trace.innerHTML =
      '<div style="font-weight:600;margin-bottom:4px">Đổi trực: ' + esc(R.personById(s.from).label) + ' → ' + esc(p.label) + '</div>' +
      '<div>' + chip(s.code) + ' ' + esc(R.SHIFTS[s.code].name + ' · ' + R.dayLong(day) + ' · ' + R.shiftHours(s.code)) + '</div>' +
      '<div style="margin-top:8px">Lý do: ' + esc(s.reason) + '</div>' +
      '<div class="text-muted">Người nhận thay đồng ý ' + esc(s.accepted) + '</div>' +
      '<div class="text-muted">Duyệt bởi ' + esc(s.approver) + ' · ' + esc(s.approved) + '</div>';
    this.placePopup(this.trace, cell);
  };

  Matrix.prototype.bind = function () {
    var self = this, host = this.host;

    host.addEventListener('mousedown', function (e) {
      if (e.target.closest('.roster-picker, .roster-trace')) return;
      var cell = e.target.closest('td.cell');
      if (!cell) return;
      e.preventDefault();
      host.focus({ preventScroll: true });
      var row = +cell.dataset.row, day = +cell.dataset.day;
      self.move(row, day);
      var code = self.grid[R.STAFF[row].id][day];
      self.drag = { row: row, from: day, to: day, code: code };
    });

    host.addEventListener('mouseover', function (e) {
      if (!self.drag || !self.editable || !self.drag.code) return;
      var cell = e.target.closest('td.cell');
      if (!cell || +cell.dataset.row !== self.drag.row) return;
      self.drag.to = +cell.dataset.day;
      var lo = Math.min(self.drag.from, self.drag.to), hi = Math.max(self.drag.from, self.drag.to);
      all('td.cell[data-row="' + self.drag.row + '"]', self.table).forEach(function (c) {
        var d = +c.dataset.day;
        c.classList.toggle('is-drag', d >= lo && d <= hi);
      });
    });

    document.addEventListener('mouseup', function (e) {
      var drag = self.drag;
      self.drag = null;
      if (!drag) return;
      if (drag.to !== drag.from && self.editable && drag.code) {
        var lo = Math.min(drag.from, drag.to), hi = Math.max(drag.from, drag.to), changes = [];
        for (var d = lo; d <= hi; d++) changes.push({ row: drag.row, day: d, code: drag.code });
        var n = self.apply(changes, 'Kéo gán ca');
        self.move(drag.row, drag.to);
        if (n) toast('Đã gán ca ' + R.SHIFTS[drag.code].name + ' cho ' + n + ' ngày', 'info');
        return;
      }
      var cell = e.target.closest && e.target.closest('td.cell');
      if (!cell || !host.contains(cell)) return;
      if (self.editable && !cell.classList.contains('is-leave')) self.openPicker(cell);
      else if (cell.classList.contains('is-swap')) self.openTrace(cell);
      else if (cell.classList.contains('is-leave')) toast('Nghỉ phép đã duyệt — không gán được ca', 'info');
      else self.hidePopups();
    });

    this.picker.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pick]');
      if (!b) return;
      self.picker.hidden = true;
      self.assignActive(b.dataset.pick);
      host.focus({ preventScroll: true });
    });

    document.addEventListener('mousedown', function (e) {
      if (!host.contains(e.target)) self.hidePopups();
    });

    host.addEventListener('keydown', function (e) {
      var a = self.active, key = e.key;
      var ctrl = e.ctrlKey || e.metaKey;
      var lower = key.length === 1 ? key.toLowerCase() : key;

      if (ctrl && lower === 'z') { e.preventDefault(); if (self.editable) self.undoLast(); return; }
      if (ctrl && lower === 's') { e.preventDefault(); if (self.editable) saveNow(); return; }
      if (ctrl && lower === 'c') {
        e.preventDefault();
        self.clipboard = self.grid[R.STAFF[a.row].id].slice();
        toast('Đã sao chép hàng ' + R.STAFF[a.row].label, 'info');
        return;
      }
      if (ctrl && lower === 'v') {
        e.preventDefault();
        if (!self.editable || !self.clipboard) return;
        var changes = [];
        for (var d = 1; d <= R.DAYS; d++) changes.push({ row: a.row, day: d, code: self.clipboard[d] });
        var n = self.apply(changes, 'Dán hàng');
        self.move(a.row, a.day);
        toast('Đã dán ' + n + ' ô vào hàng ' + R.STAFF[a.row].label, 'info');
        return;
      }
      if (ctrl || e.altKey) return;

      var moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0], Enter: [1, 0] };
      if (moves[key]) {
        e.preventDefault();
        self.hidePopups();
        self.move(a.row + moves[key][0], a.day + moves[key][1]);
        return;
      }
      if (key === 'Tab') {
        if ((e.shiftKey && a.day === 1) || (!e.shiftKey && a.day === R.DAYS)) return;
        e.preventDefault();
        self.move(a.row, a.day + (e.shiftKey ? -1 : 1));
        return;
      }
      if (key === 'Escape') { self.hidePopups(); return; }
      if (key === 'Delete' || key === 'Backspace') { e.preventDefault(); self.hidePopups(); self.assignActive(''); return; }
      if (KEY_TO_CODE[lower]) { e.preventDefault(); self.hidePopups(); self.assignActive(KEY_TO_CODE[lower]); }
    });
  };

  /* ---------- 2. Save indicator ---------- */
  var dirty = false;
  function clock() { var n = new Date(); return (n.getHours() < 10 ? '0' : '') + n.getHours() + ':' + (n.getMinutes() < 10 ? '0' : '') + n.getMinutes(); }
  function setSaveLabel(text) { all('[data-roster="autosave"]').forEach(function (el) { el.textContent = text; }); }
  function markDirty() { dirty = true; setSaveLabel('Có thay đổi chưa lưu · tự lưu sau 30 giây'); }
  function saveNow() {
    setSaveLabel('Đang lưu…');
    setTimeout(function () { dirty = false; setSaveLabel('Đã lưu nháp lúc ' + clock()); toast('Đã lưu nháp lịch trực'); }, 500);
  }
  setInterval(function () {
    if (!dirty) return;
    setSaveLabel('Đang tự lưu…');
    setTimeout(function () { dirty = false; setSaveLabel('Đã tự lưu lúc ' + clock()); }, 500);
  }, 30000);

  /* ---------- 3. Warning panel under the matrix ---------- */
  function mountWarnings(el, matrix) {
    var key = 'roster-warnings-collapsed';
    if (storage(key) === '1') el.classList.add('is-collapsed');
    el.classList.add('warn-panel');

    matrix.onChange(function (result) {
      var ws = result.warnings;
      if (!ws.length) {
        el.innerHTML = '<div class="card" style="padding:12px 16px"><div class="warn-panel__head is-clear">✅ Không có cảnh báo</div></div>';
        return;
      }
      el.innerHTML = '<button class="warn-panel__head" type="button" data-warn-toggle aria-expanded="' + !el.classList.contains('is-collapsed') + '">' +
        '⚠️ ' + ws.length + ' cảnh báo <span class="text-muted" style="text-transform:none;letter-spacing:0;font-weight:400">· vẫn lưu và gửi duyệt được, kèm lý do</span>' +
        '<span class="group__caret" aria-hidden="true" style="margin-left:auto">▾</span></button>' +
        '<div class="warn-panel__body card" style="padding:0">' +
        ws.map(function (w) {
          return '<div class="warn-row"><span class="warn-row__kind">' + esc(R.WARNING_GROUPS[w.type]) + '</span>' +
            '<span class="warn-row__text">' + esc(w.text) + '</span>' +
            '<button class="btn btn--small btn--quiet" type="button" data-jump="' + w.person + ':' + w.day + '">tới ô →</button></div>';
        }).join('') + '</div>';
    });

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-warn-toggle]')) {
        var collapsed = el.classList.toggle('is-collapsed');
        storage(key, collapsed ? '1' : '0');
        e.target.closest('[data-warn-toggle]').setAttribute('aria-expanded', String(!collapsed));
        return;
      }
      var jump = e.target.closest('[data-jump]');
      if (jump) {
        var parts = jump.dataset.jump.split(':');
        matrix.jumpTo(parts[0], +parts[1]);
      }
    });
  }

  /* ---------- 4. MH-E02 lifecycle — prototype state switcher and dialogs ---------- */
  function mountLifecycle(matrix) {
    var modes = {
      draft:    { source: 'base',     editable: true,  area: true },
      pending:  { source: 'base',     editable: false, area: true },
      approved: { source: 'approved', editable: false, area: true },
      empty:    { area: false }, noconfig: { area: false }, loading: { area: false }
    };

    function setState(name) {
      var m = modes[name];
      if (!m) return;
      all('[data-roster-area]').forEach(function (el) { el.hidden = !m.area; });
      if (m.area) matrix.setMode({ source: m.source, editable: m.editable });
    }

    document.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tabs="state"] [data-action="tab"]');
      if (tab) setState(tab.dataset.tab);

      if (e.target.closest('[data-target="submit-dialog"]')) renderSubmit(matrix);

      var go = e.target.closest('[data-roster-goto]');
      if (go) {
        var btn = document.querySelector('[data-tabs="state"] [data-tab="' + go.dataset.rosterGoto + '"]');
        var ok = true;
        if (go.dataset.requireReason) {
          ok = requireFields(document.getElementById(go.dataset.requireReason));
        }
        if (!ok) return;
        all('.overlay.is-open').forEach(function (o) { o.classList.remove('is-open'); });
        if (btn) btn.click();
        if (go.dataset.rosterToast) toast(go.dataset.rosterToast, go.dataset.rosterToastKind);
        if (go.dataset.rosterJump === 'first' && matrix.result.warnings.length) {
          var w = matrix.result.warnings[0];
          setTimeout(function () { matrix.jumpTo(w.person, w.day); }, 50);
        }
      }
    });

    var start = document.querySelector('[data-tabs="state"] .is-active');
    setState(start ? start.dataset.tab : 'draft');
  }

  function requireFields(scope) {
    if (!scope) return true;
    var ok = true;
    all('textarea[required], input[required], select[required]', scope).forEach(function (input) {
      var field = input.closest('.field');
      var empty = !input.value.trim();
      if (field) {
        field.classList.toggle('has-error', empty);
        var hint = field.querySelector('.field__hint');
        if (hint) {
          if (!hint.dataset.original) hint.dataset.original = hint.textContent;
          hint.textContent = empty ? (input.dataset.errorText || 'Vui lòng nhập lý do') : hint.dataset.original;
        }
      }
      if (empty && ok) { input.focus(); ok = false; }
    });
    return ok;
  }

  function renderSubmit(matrix) {
    var host = document.querySelector('[data-roster="submit-body"]');
    if (!host) return;
    var ws = matrix.result.warnings;
    if (!ws.length) {
      host.innerHTML = '<div class="section-box section-box--ok">✅ Không có cảnh báo. Lịch sẽ được gửi tới Trưởng khoa duyệt.</div>';
      return;
    }
    var groups = {};
    ws.forEach(function (w) { (groups[w.type] = groups[w.type] || []).push(w); });
    host.innerHTML = '<p>⚠️ Còn <strong>' + ws.length + ' cảnh báo</strong> chưa xử lý. Vẫn gửi duyệt được — ghi lý do cho từng nhóm, người duyệt sẽ đọc lý do này.</p>' +
      Object.keys(groups).map(function (type) {
        var id = 'reason-' + type;
        return '<div class="field" style="padding-top:12px;border-top:1px solid var(--border)">' +
          '<div style="font-weight:600;margin-bottom:4px">' + esc(R.WARNING_GROUPS[type]) + ' (' + groups[type].length + ')</div>' +
          '<ul class="bullets text-meta" style="margin-bottom:8px">' + groups[type].map(function (w) { return '<li>' + esc(w.text) + '</li>'; }).join('') + '</ul>' +
          '<label class="field__label" for="' + id + '">Lý do giữ nguyên <span class="field__required">*</span></label>' +
          '<textarea class="textarea" id="' + id + '" rows="2" required style="min-height:64px" placeholder="Ví dụ: khoa thiếu nhân lực tuần này, đã báo cáo BGĐ"></textarea>' +
          '<div class="field__hint">Bắt buộc khi gửi duyệt còn cảnh báo</div></div>';
      }).join('');
  }

  /* ---------- 5. Day × shift list — MH-E01 ---------- */
  function mountDayList(el) {
    var grid = gridFor(el);
    var weeks = [[1, 6], [7, 13], [14, 20], [21, 27], [28, 30]];
    var current = 0;

    function render() {
      var range = weeks[current];
      var html = '<div class="row" style="margin-bottom:12px" role="group" aria-label="Chọn tuần">' + weeks.map(function (w, i) {
        return '<button class="btn btn--small' + (i === current ? ' btn--secondary is-active' : '') + '" type="button" data-week="' + i + '">' +
          R.dayLabel(w[0]) + ' – ' + R.dayLabel(w[1]) + '</button>';
      }).join('') + '</div><div class="day-list">';
      for (var d = range[0]; d <= range[1]; d++) {
        var cls = 'day-row' + (R.isWeekend(d) ? ' is-weekend' : '') + (d === R.NOW.day ? ' is-today' : '');
        html += '<div class="' + cls + '"><div class="day-row__date">' + R.dowLabel(d) + ' ' + R.dayLabel(d) +
          (d === R.NOW.day ? '<div class="text-meta">Hôm nay</div>' : '') + '</div>';
        R.COVERAGE.forEach(function (code) {
          var people = R.STAFF.filter(function (p) { return grid[p.id][d] === code; });
          html += '<div class="day-row__slot">' + chip(code) + '<div class="day-row__people">' +
            (people.length ? people.map(function (p) {
              var s = R.swapAt(p.id, d);
              return esc(p.label) + (s ? ' <span title="' + esc('Đổi trực từ ' + R.personById(s.from).label + ' · duyệt ' + s.approved) + '" style="color:var(--brand-orange)">●</span>' : '');
            }).join('<br>') : '<span class="text-muted">Chưa có người</span>') + '</div></div>';
        });
        html += '</div>';
      }
      el.innerHTML = html + '</div>';
    }

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-week]');
      if (b) { current = +b.dataset.week; render(); }
    });
    render();
  }

  /* ---------- 6. Swap history table ---------- */
  function mountSwapHistory(el) {
    el.innerHTML = R.SWAPS.map(function (s) {
      return '<tr><td data-label="Ca">' + chip(s.code) + ' ' + esc(R.SHIFTS[s.code].name + ' · ' + R.dayLabel(s.day)) + '</td>' +
        '<td data-label="Người xin">' + esc(R.personById(s.from).label) + '</td>' +
        '<td data-label="Người nhận thay">' + esc(R.personById(s.to).label) + '</td>' +
        '<td data-label="Lý do">' + esc(s.reason) + '</td>' +
        '<td data-label="Đồng ý lúc">' + esc(s.accepted) + '</td>' +
        '<td data-label="Người duyệt">' + esc(s.approver) + '<div class="text-meta">' + esc(s.approved) + '</div></td></tr>';
    }).join('');
  }

  /* ---------- 7. Personal calendar — MH-E03 ---------- */
  function mountMyCalendar(el) {
    var pid = el.dataset.person;
    var grid = gridFor(el);
    var first = R.dow(1);
    var offset = first === 0 ? 6 : first - 1;
    var html = '<div class="cal" role="grid" aria-label="Lịch trực tháng ' + R.MONTH + '/' + R.YEAR + '">' +
      ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(function (d) { return '<div class="cal__dow" role="columnheader">' + d + '</div>'; }).join('');
    for (var i = 0; i < offset; i++) html += '<div class="cal__day is-blank" aria-hidden="true"></div>';
    for (var d = 1; d <= R.DAYS; d++) {
      var code = grid[pid][d];
      var leave = R.leaveOn(pid, d);
      var cls = 'cal__day' + (R.isWeekend(d) ? ' is-weekend' : '') + (d === R.NOW.day ? ' is-today' : '') + (code && R.swapAt(pid, d) ? ' is-swap' : '');
      var label = R.dayLong(d) + ': ' + (leave ? 'nghỉ phép' : code ? 'ca ' + R.SHIFTS[code].name : 'không có ca');
      html += '<button class="' + cls + '" type="button" data-cal-day="' + d + '" aria-label="' + esc(label) + '">' +
        '<span class="cal__num">' + d + '</span>' + (leave ? chip('P') : code ? chip(code) : '') + '</button>';
    }
    el.innerHTML = html + '</div>';

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cal-day]');
      if (!b) return;
      var day = +b.dataset.calDay, code = grid[pid][day];
      var body = document.querySelector('[data-roster="day-detail"]');
      var title = document.querySelector('[data-roster="day-detail-title"]');
      if (!body) return;
      title.textContent = R.dayLong(day);
      if (R.leaveOn(pid, day)) {
        body.innerHTML = '<p>' + chip('P') + ' Nghỉ phép đã duyệt (' + esc(R.leaveOn(pid, day).type) + ')</p>';
      } else if (!code) {
        body.innerHTML = '<p class="text-muted">Anh/chị không có ca trực ngày này.</p>';
      } else {
        var crew = R.STAFF.filter(function (p) { return p.id !== pid && grid[p.id][day] === code; });
        var s = R.swapAt(pid, day);
        var past = R.minutesUntil(day, code) <= 0;
        body.innerHTML = '<div class="row" style="margin-bottom:12px">' + chip(code) +
          '<strong>Trực ' + esc(R.SHIFTS[code].name.toLowerCase()) + '</strong><span class="text-muted">' + esc(R.shiftHours(code)) + '</span></div>' +
          '<div class="text-label">Cùng ca</div><ul class="bullets" style="margin-bottom:12px">' +
          (crew.length ? crew.map(function (p) { return '<li>' + esc(p.label) + '</li>'; }).join('') : '<li class="text-muted">Chỉ có anh/chị</li>') + '</ul>' +
          (s ? '<div class="section-box section-box--info" style="margin-bottom:12px">● Nhận đổi trực từ ' + esc(R.personById(s.from).label) +
            '<div class="text-meta">Lý do: ' + esc(s.reason) + ' · Duyệt bởi ' + esc(s.approver) + ' · ' + esc(s.approved) + '</div></div>' : '') +
          (past
            ? '<p class="text-meta">Ca đã bắt đầu hoặc đã qua — không xin đổi được.</p>'
            : '<a class="btn btn--secondary btn--block" href="shift-swap.html?day=' + day + '">Xin đổi ca này</a>');
      }
      openOverlay('day-detail');
    });
  }

  function mountMyTotals(el) {
    var pid = el.dataset.person, grid = gridFor(el);
    var t = { S: 0, C: 0, 'Đ': 0, '24': 0 }, n = 0;
    for (var d = 1; d <= R.DAYS; d++) { var c = grid[pid][d]; if (c) { t[c]++; n++; } }
    el.textContent = 'Tổng ' + n + ' ca: ' + CODES.filter(function (c) { return t[c]; }).map(function (c) {
      return t[c] + ' ca ' + R.SHIFTS[c].name.toLowerCase();
    }).join(' · ');
  }

  /* ---------- 8. Leave impact — MH-E05 cards and the MH-E04 form ---------- */
  function impactHtml(pid, from, to) {
    var list = R.shiftsInRange(R.APPROVED, pid, from, to);
    if (!list.length) return { html: '<div class="section-box section-box--ok">✓ Không ảnh hưởng lịch trực</div>', count: 0, short: 0 };
    var short = 0;
    var items = list.map(function (s) {
      var isShort = s.left < s.min;
      if (isShort) short++;
      return '<li><span class="impact__what">' + chip(s.code) + ' ' + esc(R.dayLabel(s.day) + ' · ca ' + R.SHIFTS[s.code].name.toLowerCase()) + '</span>' +
        '<span class="impact__left ' + (isShort ? 'is-short' : 'is-ok') + '">còn ' + s.left + '/' + s.min + ' người ' + (isShort ? '⚠️' : '✓') + '</span></li>';
    }).join('');
    return { html: items, count: list.length, short: short };
  }

  function mountImpact(el) {
    var r = impactHtml(el.dataset.person, +el.dataset.from, +el.dataset.to);
    if (!r.count) { el.outerHTML = r.html; return; }
    el.innerHTML = '<div class="section-box__title" style="color:#9A3412">⚠️ Ảnh hưởng tới lịch trực</div>' +
      '<p style="margin-bottom:4px">Duyệt đơn này sẽ gỡ <strong>' + r.count + ' ca</strong> khỏi lịch:</p>' +
      '<ul class="impact">' + r.html + '</ul>' +
      (r.short ? '<p style="margin:8px 0 0"><strong>' + r.short + ' ca sẽ thiếu người</strong>, đầu mối nhận thông báo cần xếp lại.</p>'
               : '<p style="margin:8px 0 0">Các ca vẫn đủ người sau khi gỡ.</p>');
    el.classList.add('section-box', 'section-box--warn');
  }

  function mountLeaveForm(form) {
    var pid = form.dataset.person;
    var today = new Date(R.YEAR, R.MONTH - 1, R.NOW.day);
    var existing = [{ from: new Date(R.YEAR, 8, 13), to: new Date(R.YEAR, 8, 14), label: '13–14/09 · Phép năm · đang chờ duyệt' }];
    var type = form.querySelector('#leave-type');
    var fromEl = form.querySelector('#leave-from');
    var toEl = form.querySelector('#leave-to');
    var half = form.querySelector('#leave-half');
    var reason = form.querySelector('#leave-reason');
    var out = form.querySelector('[data-roster="leave-impact"]');
    var days = form.querySelector('[data-roster="leave-days"]');
    var alertEl = form.querySelector('[data-roster="leave-alert"]');

    function parse(v) { var p = (v || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }

    function check() {
      var from = parse(fromEl.value), to = parse(toEl.value);
      var needReason = type.value === 'Việc riêng' || type.value === 'Không lương';
      form.querySelector('[data-reason-star]').hidden = !needReason;
      reason.required = needReason;
      half.closest('.checkbox').style.display = from && to && +from === +to ? '' : 'none';
      if (!(from && to && +from === +to)) half.checked = false;

      var problems = { block: null, warn: null };
      if (!from || !to || to < from) {
        days.textContent = '';
        out.innerHTML = '';
        problems.block = from && to ? 'Ngày kết thúc phải sau ngày bắt đầu' : null;
      } else {
        var n = Math.round((to - from) / 86400000) + 1;
        days.textContent = '→ ' + (half.checked ? '0,5' : n) + ' ngày';
        existing.forEach(function (x) {
          if (from <= x.to && to >= x.from) problems.block = 'Trùng với đơn nghỉ ' + x.label + ' — không gửi được đơn trùng ngày';
        });
        if (from < today) {
          if (type.value !== 'Ốm') problems.block = problems.block || 'Chỉ đăng ký nghỉ cho ngày đã qua với loại Ốm';
          else problems.warn = 'Đăng ký nghỉ ốm cho ngày đã qua — người duyệt sẽ thấy ghi chú này';
        }
        var inMonth = from.getMonth() === R.MONTH - 1 || to.getMonth() === R.MONTH - 1;
        if (inMonth) {
          var a = from.getMonth() === R.MONTH - 1 ? from.getDate() : 1;
          var b = to.getMonth() === R.MONTH - 1 ? to.getDate() : R.DAYS;
          var list = R.shiftsInRange(R.APPROVED, pid, a, b);
          out.innerHTML = list.length
            ? '<div class="section-box section-box--warn"><div class="section-box__title" style="color:#9A3412">⚠️ Anh/chị có ' + list.length + ' ca trực trong khoảng ngày này</div>' +
              '<ul class="impact">' + list.map(function (s) {
                return '<li><span class="impact__what">' + chip(s.code) + ' ' + esc(R.dayLong(s.day) + ' · ca ' + R.SHIFTS[s.code].name.toLowerCase()) + '</span></li>';
              }).join('') + '</ul><p style="margin:8px 0 0">Vẫn gửi được. Nếu được duyệt, các ca này sẽ được gỡ và đầu mối xếp lại.</p></div>'
            : '<div class="section-box section-box--ok">✓ Không có ca trực trong khoảng ngày này</div>';
        } else {
          out.innerHTML = '';
        }
      }
      alertEl.innerHTML = problems.block
        ? '<div class="section-box" style="background:var(--danger-bg);border:1px solid #FECACA;color:#991B1B">🚫 ' + esc(problems.block) + '</div>'
        : problems.warn ? '<div class="section-box section-box--warn">⚠️ ' + esc(problems.warn) + '</div>' : '';
      return problems;
    }

    ['change', 'input'].forEach(function (evt) { form.addEventListener(evt, check); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var problems = check();
      if (problems.block) { alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (!requireFields(form)) return;
      var btn = form.querySelector('[type="submit"]');
      btn.classList.add('is-busy');
      setTimeout(function () {
        btn.classList.remove('is-busy');
        toast('Đã gửi đơn nghỉ · ĐD trưởng Bùi Thị Tố Hoa sẽ duyệt');
      }, 700);
    });
    check();
  }

  /* ---------- 9. Swap — MH-E06 ---------- */
  function mountSwapForm(el) {
    var pid = el.dataset.person;
    var grid = R.APPROVED;
    var select = el.querySelector('#swap-shift');
    var listHost = el.querySelector('[data-roster="swap-candidates"]');
    var timeHost = el.querySelector('[data-roster="swap-time"]');
    var search = el.querySelector('#swap-search');
    var qsDay = +(new URLSearchParams(window.location.search).get('day') || 0);
    var def = +(el.dataset.day || 0);

    var mine = [];
    for (var d = 1; d <= R.DAYS; d++) if (grid[pid][d]) mine.push(d);
    select.innerHTML = mine.map(function (d) {
      var code = grid[pid][d], left = R.minutesUntil(d, code);
      var txt = R.SHIFTS[code].name + ' · ' + R.dayLong(d) + ' · ' + R.shiftHours(code) + (left <= 0 ? ' (đã bắt đầu)' : '');
      return '<option value="' + d + '"' + (left <= 0 ? ' disabled' : '') + '>' + esc(txt) + '</option>';
    }).join('');
    var pickDay = mine.indexOf(qsDay) !== -1 && R.minutesUntil(qsDay, grid[pid][qsDay]) > 0 ? qsDay : def;
    if (pickDay) select.value = String(pickDay);

    function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }

    function render() {
      var day = +select.value, code = grid[pid][day];
      var left = R.minutesUntil(day, code);
      timeHost.innerHTML = left > 0 && left <= 240
        ? '<div class="section-box section-box--warn">⏱ Ca này bắt đầu sau <strong>' + Math.floor(left / 60) + ' giờ ' + (left % 60) + ' phút</strong>. ' +
          'Quy trình 3 bước có thể không kịp — <strong>cần báo trực tiếp cho ĐD trưởng Bùi Thị Tố Hoa</strong> (máy lẻ 214). Nếu chưa duyệt xong trước giờ vào ca, yêu cầu tự huỷ và lịch giữ nguyên.</div>'
        : '';
      var c = R.candidates(grid, pid, day, code);
      var q = search ? norm(search.value.trim()) : '';
      var rows = c.shown.filter(function (s) {
        return !q || norm(s.person.label + ' ' + R.TITLE_LABEL[s.person.title]).indexOf(q) !== -1;
      });
      var hiddenTotal = c.hidden.busy + c.hidden.leave;
      listHost.innerHTML = '<div class="pick-list" role="radiogroup" aria-label="Người nhận thay">' + (rows.length ? rows.map(function (s, i) {
        return '<label class="pick-row' + (s.dim ? ' is-dim' : '') + '">' +
          '<input type="radio" name="swap-to" value="' + s.person.id + '"' + (i === 0 && !q ? ' checked' : '') + '>' +
          '<span class="pick-row__main"><span class="pick-row__name">' + esc(s.person.label) + '</span>' +
          '<span class="pick-row__meta"> · ' + s.total + ' ca/tháng</span>' +
          s.warns.map(function (w) { return '<div class="pick-row__warn">⚠️ ' + esc(w) + '</div>'; }).join('') +
          '</span></label>';
      }).join('') : '<div class="state" style="padding:24px">Không tìm thấy người phù hợp</div>') + '</div>' +
        '<p class="field__hint">Không hiện ' + hiddenTotal + ' người: ' +
        [c.hidden.busy ? c.hidden.busy + ' người đã có ca trùng giờ' : '', c.hidden.leave ? c.hidden.leave + ' người nghỉ phép đã duyệt' : '']
          .filter(Boolean).join(' · ') +
        (hiddenTotal ? ' · ' : '') + 'người khoa khác (chưa bật đổi trực liên khoa).</p>';
    }

    select.addEventListener('change', render);
    if (search) search.addEventListener('input', render);
    render();
  }

  function mountSwapOutcome(el) {
    var d = el.dataset, o = R.swapOutcome(R.APPROVED, d.from, d.to, +d.day, d.code);
    var from = R.personById(d.from), to = R.personById(d.to);
    var enough = o.crew >= o.min;
    var titleOk = !o.missing.length;
    el.innerHTML = '<table class="compare"><tbody>' +
      '<tr><td>' + esc(from.label) + '</td><td>' + o.fromBefore + ' ca → ' + o.fromAfter + ' ca</td></tr>' +
      '<tr><td>' + esc(to.label) + '</td><td' + (o.overMax ? ' style="color:#9A3412;font-weight:600"' : '') + '>' + o.toBefore + ' ca → ' + o.toAfter + ' ca' + (o.overMax ? ' ⚠️' : '') + '</td></tr>' +
      '<tr><td>Ca ' + esc(R.SHIFTS[d.code].name.toLowerCase()) + ' sau khi đổi</td><td style="color:' + (enough && titleOk ? 'var(--success)' : '#9A3412') + ';font-weight:600">' +
      (enough ? 'đủ ' + o.crew + '/' + o.min + ' người' : 'chỉ ' + o.crew + '/' + o.min + ' người') +
      (titleOk ? ' · đủ chức danh ✓' : ' · không có ' + esc(o.missing.join(', ')) + ' ⚠️') + '</td></tr>' +
      '</tbody></table>';
  }

  /* ---------- 10. Statistics — MH-E07 ---------- */
  function mountStats(el) {
    var rows = R.stats(R.APPROVED);
    var filter = document.getElementById(el.dataset.filter || '');
    function render() {
      var title = filter ? filter.value : '';
      var shown = rows.filter(function (r) { return !title || r.person.title === title; });
      var sum = { S: 0, C: 0, 'Đ': 0, '24': 0, total: 0, nights: 0, weekend: 0, received: 0, given: 0, coef: 0 };
      el.innerHTML = shown.map(function (r) {
        Object.keys(sum).forEach(function (k) { sum[k] += r[k]; });
        var leave = Object.keys(r.leave).map(function (k) { return k + ' ' + r.leave[k]; }).join(' · ');
        var over = r.total > R.LIMITS.maxPerMonth;
        return '<tr><td data-label="Họ tên">' + esc(r.person.label) + '<div class="text-meta">' + esc(R.TITLE_LABEL[r.person.title]) + '</div></td>' +
          '<td data-label="Sáng" class="table__num">' + r.S + '</td>' +
          '<td data-label="Chiều" class="table__num">' + r.C + '</td>' +
          '<td data-label="Đêm" class="table__num">' + r['Đ'] + '</td>' +
          '<td data-label="24 giờ" class="table__num">' + r['24'] + '</td>' +
          '<td data-label="Tổng ca" class="table__num" style="font-weight:600' + (over ? ';background:#FEF08A' : '') + '">' + r.total + '</td>' +
          '<td data-label="Ca đêm" class="table__num">' + r.nights + '</td>' +
          '<td data-label="Cuối tuần" class="table__num">' + r.weekend + '</td>' +
          '<td data-label="Nhận thêm" class="table__num">' + (r.received ? '+' + r.received : '0') + '</td>' +
          '<td data-label="Chuyển đi" class="table__num">' + (r.given ? '−' + r.given : '0') + '</td>' +
          '<td data-label="Quy đổi hệ số" class="table__num">' + r.coef.toFixed(1).replace('.', ',') + '</td>' +
          '<td data-label="Nghỉ đã duyệt">' + (leave ? esc(leave) + ' ngày' : '<span class="text-muted">—</span>') + '</td></tr>';
      }).join('') +
        '<tr style="background:var(--bg-alt);font-weight:600"><td data-label="Tổng">Tổng · ' + shown.length + ' người</td>' +
        ['S', 'C', 'Đ', '24', 'total', 'nights', 'weekend', 'received', 'given'].map(function (k) { return '<td class="table__num" data-label="">' + sum[k] + '</td>'; }).join('') +
        '<td class="table__num" data-label="Quy đổi hệ số">' + sum.coef.toFixed(1).replace('.', ',') + '</td><td data-label=""></td></tr>';
    }
    if (filter) filter.addEventListener('change', render);
    render();
  }

  /* ---------- 11. Wall print — E-XUAT-01, day × shift ---------- */
  function mountPrint(el) {
    var grid = R.APPROVED;
    function half(from, to) {
      var html = '<table class="print-table"><thead><tr><th>Ngày</th>' +
        R.COVERAGE.map(function (c) { return '<th>Ca ' + esc(R.SHIFTS[c].name) + '<span>' + esc(R.shiftHours(c)) + '</span></th>'; }).join('') +
        '</tr></thead><tbody>';
      for (var d = from; d <= to; d++) {
        html += '<tr class="' + (R.isWeekend(d) ? 'is-weekend' : '') + '"><th>' + d + ' <span>' + R.dowLabel(d) + '</span></th>' +
          R.COVERAGE.map(function (c) {
            return '<td>' + R.STAFF.filter(function (p) { return grid[p.id][d] === c; }).map(function (p) { return esc(p.label); }).join('<br>') + '</td>';
          }).join('') + '</tr>';
      }
      return html + '</tbody></table>';
    }
    el.innerHTML = half(1, 15) + half(16, R.DAYS);
  }

  /* ---------- Mount ---------- */
  function mount() {
    var matrixHost = document.querySelector('[data-roster="matrix"]');
    var matrix = matrixHost ? new Matrix(matrixHost) : null;
    if (matrix) {
      window.RosterMatrix = matrix;
      all('[data-roster="warnings"]').forEach(function (el) { mountWarnings(el, matrix); });
      if (document.querySelector('[data-tabs="state"]')) mountLifecycle(matrix);
    }
    all('[data-roster="day-list"]').forEach(mountDayList);
    all('[data-roster="swap-history"]').forEach(mountSwapHistory);
    all('[data-roster="my-calendar"]').forEach(mountMyCalendar);
    all('[data-roster="my-totals"]').forEach(mountMyTotals);
    all('[data-roster="impact"]').forEach(mountImpact);
    all('[data-roster="leave-form"]').forEach(mountLeaveForm);
    all('[data-roster="swap-form"]').forEach(mountSwapForm);
    all('[data-roster="swap-outcome"]').forEach(mountSwapOutcome);
    all('[data-roster="stats"]').forEach(mountStats);
    all('[data-roster="print"]').forEach(mountPrint);

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-require-scope]');
      if (!b) return;
      if (!requireFields(document.getElementById(b.dataset.requireScope))) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }
      var overlay = b.closest('.overlay');
      setTimeout(function () { if (overlay) overlay.classList.remove('is-open'); }, 750);
    }, true);

    all('[data-roster-now]').forEach(function (el) { el.textContent = R.NOW.label; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
