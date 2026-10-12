/* =============================================================
   MH-C03 — Chủ trì phiên giao ban (bản đầu tiên, đơn giản).

   Cột trái: bảy khối số liệu đã chụp lúc mở phiên + điểm danh.
   Cột phải: biên bản (nội dung, tồn tại, ý kiến đơn vị, kết luận chỉ đạo).

   Có: "Ghi vào tồn tại", "Đưa vào kết luận kỳ này", Enter thêm kết luận,
       "Tạo nhiệm vụ" (Cấp 1 / Cấp 2), tự lưu mỗi 10 giây.
   Chưa có (sẽ bổ sung dần): nháp / kết thúc / khoá, mở khoá, tạo hàng loạt,
       sửa điểm danh kèm lý do, mất mạng, phân quyền xem.
   Dữ liệu là giả, tải lại trang là về ban đầu. ?type=unit mở phiên khoa/phòng.
   ============================================================= */
(function () {
  'use strict';

  var D = window.MEETING;
  var esc = D.escapeHtml;
  var type = new URLSearchParams(window.location.search).get('type') === 'unit' ? 'unit' : 'hospital';
  var sess = D.SESSIONS[type];
  var seed = sess.seeds.live;
  var uid = 0;

  document.body.dataset.role = type === 'unit' ? 'manager' : 'board';
  document.body.classList.add('meeting-mode', 'sidebar-collapsed');

  function $(id) { return document.getElementById(id); }
  function toast(message, kind) { window.prototype.toast(message, kind); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function nowHM() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function unitName(code) { return D.UNIT_BY_CODE[code] ? D.UNIT_BY_CODE[code].name : ''; }

  // Quá hạn · khẩn P1/P2 · bị trả lại gộp thành một khối "Việc cần xử lý".
  // Một việc có thể thuộc nhiều nhóm (vừa quá hạn vừa P2): chỉ đếm một lần, gắn nhiều nhãn.
  function mergeBlocks(list) {
    var byCode = {}, tasks = [];
    function add(it, tag) {
      if (!byCode[it.code]) { byCode[it.code] = { it: it, tags: [] }; tasks.push(byCode[it.code]); }
      byCode[it.code].tags.push(tag);
    }
    list.forEach(function (b) {
      if (b.id === 3) b.items.forEach(function (it) { add(it, { k: 'od', text: 'quá hạn ' + it.overdueDays + ' ngày' }); });
      if (b.id === 4) b.items.forEach(function (it) { add(it, { k: 'ug', text: 'khẩn ' + it.level }); });
      if (b.id === 5) b.items.forEach(function (it) { add(it, { k: 'rj', text: 'bị trả lại' }); });
    });
    var merged = { id: 3, icon: '🔴', title: 'Việc cần xử lý', tone: 'danger', open: true, kind: 'merged', tasks: tasks };
    var out = [], placed = false;
    list.forEach(function (b) {
      if (b.id === 3 || b.id === 4 || b.id === 5) { if (!placed && tasks.length) out.push(merged); placed = true; }
      else out.push(b);
    });
    return out;
  }
  var BLOCKS = mergeBlocks(sess.blocks);

  /* ---------- Model ---------- */
  var M = {
    backlog: seed.backlog,
    content: seed.content,
    opinions: JSON.parse(JSON.stringify(seed.opinions)),
    concl: seed.concl.map(function (c) { var x = JSON.parse(JSON.stringify(c)); x.id = 'c' + (++uid); return x; }),
    absent: JSON.parse(JSON.stringify(sess.absentSeed)),
    collapsed: {},
    noted: {},
    carried: {},
    dirty: false,
    savedAt: nowHM()
  };
  BLOCKS.forEach(function (b) { M.collapsed[b.id] = !b.open; });

  /* =============================================================
     Cột trái
     ============================================================= */
  function blockCount(b) {
    if (b.kind === 'merged') return b.tasks.length;
    if (b.kind === 'staff') return b.night.length + b.short.length;   // nghỉ phép đã nằm ở Điểm danh
    if (b.totals) return Object.keys(b.totals).reduce(function (n, k) { return n + b.totals[k]; }, 0);
    return b.items.length;
  }

  function badge(level) { return '<span class="badge badge--' + level.toLowerCase() + '">' + level + '</span>'; }

  function noteButton(key, text) {
    if (M.noted[key]) return '<button class="btn btn--quiet btn--small" type="button" disabled>✓ Đã ghi</button>';
    return '<button class="btn btn--secondary btn--small" type="button" data-act="note" data-key="' + esc(key) +
      '" data-text="' + esc(text) + '">Ghi vào tồn tại</button>';
  }

  // Mỗi việc một dòng: tên việc · (đơn vị/người) · quá hạn. Chỉ một nút hành động.
  function rowHtml(b, it) {
    var title = esc(it.title), meta, acts;
    if (it.kind === 'target') {
      meta = unitName(it.unit) + ' · đạt ' + it.actual + '%, cần đạt ' + it.plan + '%';
      acts = noteButton('t' + it.unit + it.title, 'Chỉ tiêu "' + it.title + '" (' + unitName(it.unit) + ') chậm tiến độ: đạt ' + it.actual + '%, cần đạt ' + it.plan + '%');
    } else {
      meta = (sess.unit ? it.who : unitName(it.unit)) + (it.overdueDays ? ' · quá hạn ' + it.overdueDays + ' ngày' : '');
      title = '<a href="task-detail.html?from=meeting" target="_blank" rel="noopener">' + title + '</a>';
      if (it.kind === 'directive') {
        acts = M.carried[it.id]
          ? '<button class="btn btn--quiet btn--small" type="button" disabled>✓ Đã đưa vào kết luận</button>'
          : '<button class="btn btn--secondary btn--small" type="button" data-act="carry" data-id="' + esc(it.id) + '">Đưa vào kết luận kỳ này</button>';
      } else {
        acts = noteButton('r' + it.code + b.id, it.code + ' · ' + it.title + (sess.unit ? '' : ' (' + unitName(it.unit) + ')') + (it.overdueDays ? ' — quá hạn ' + it.overdueDays + ' ngày' : ''));
      }
    }
    return '<div class="mt-row"><div class="mt-row__main"><span class="mt-row__title">' + title + '</span>' +
      '<span class="mt-row__meta">' + esc(meta) + '</span></div><div class="mt-row__acts">' + acts + '</div></div>';
  }

  var PHRASE = { od: 'việc quá hạn', ug: 'việc khẩn P1/P2', rj: 'việc bị trả lại' };
  function tagCount(entries, kind) {
    return entries.filter(function (e) { return e.tags.some(function (t) { return t.k === kind; }); }).length;
  }

  // Toàn viện: mỗi đơn vị một dòng (tên · số việc · "Ghi vào tồn tại"). Khoa/phòng: mỗi việc một dòng.
  function mergedHtml(b) {
    if (sess.unit) {
      return b.tasks.map(function (e) {
        var tags = e.tags.map(function (t) { return t.text; }).join(' · ');
        return '<div class="mt-row"><div class="mt-row__main"><span class="mt-row__title"><a href="task-detail.html?from=meeting" target="_blank" rel="noopener">' + esc(e.it.title) + '</a></span>' +
          '<span class="mt-row__meta">' + esc(e.it.who + ' · ' + tags) + '</span></div><div class="mt-row__acts">' +
          noteButton('r' + e.it.code, e.it.code + ' · ' + e.it.title + ' — ' + tags) + '</div></div>';
      }).join('');
    }
    return D.UNITS.map(function (u) {
      var list = b.tasks.filter(function (e) { return e.it.unit === u.code; });
      if (!list.length) return '';
      var parts = ['od', 'ug', 'rj'].map(function (k) { return { k: k, n: tagCount(list, k) }; }).filter(function (x) { return x.n; });
      var detail = parts.map(function (x) { return x.n + ' ' + PHRASE[x.k].replace('việc ', ''); }).join(' · ');
      var note = u.name + ': ' + parts.map(function (x) { return x.n + ' ' + PHRASE[x.k]; }).join(', ');
      return '<div class="mt-row"><div class="mt-row__main"><span class="mt-row__title">' + esc(u.name) + '</span>' +
        '<span class="mt-row__meta">' + esc(detail) + '</span></div>' +
        '<strong style="font-size:20px">' + list.length + '</strong>' + noteButton('u' + u.code, note) + '</div>';
    }).join('');
  }

  function itemsHtml(b) {
    if (b.kind === 'merged') return mergedHtml(b);
    return b.items.map(function (it) { return rowHtml(b, it); }).join('');
  }

  function staffHtml(b) {
    var out = '';
    if (b.night.length) out += '<div class="mt-sub">Trực đêm qua</div>' + b.night.map(function (n) {
      return '<p class="mt-people">' + (sess.unit ? '' : '<strong>' + esc(unitName(n.unit)) + ':</strong> ') + esc(n.text) + '</p>';
    }).join('');
    if (b.short.length) out += '<div class="mt-sub">Ca hôm nay thiếu người</div>' + b.short.map(function (s, i) {
      return '<div class="mt-warnline"><span>⚠️ ' + esc(s.text) + '</span>' + noteButton('s' + i, s.note) + '</div>';
    }).join('');
    return out;
  }

  function blockHtml(b) {
    var collapsed = M.collapsed[b.id];
    return '<section class="mt-block mt-block--' + b.tone + (collapsed ? ' is-collapsed' : '') + '">' +
      '<button class="mt-block__head" type="button" data-act="toggle-block" data-id="' + b.id + '" aria-expanded="' + !collapsed + '">' +
        '<span aria-hidden="true">' + b.icon + '</span><span>' + esc(b.title) + '</span>' +
        (b.kind === 'staff' ? '' : '<span class="mt-block__count">(' + blockCount(b) + ')</span>') +
        '<span class="group__caret" aria-hidden="true">▾</span></button>' +
      '<div class="mt-block__body">' + (b.kind === 'staff' ? staffHtml(b) : itemsHtml(b)) + '</div></section>';
  }

  // Điểm danh: mặc định tất cả có mặt, chỉ tích người vắng.
  // Điểm danh: mặc định tất cả có mặt, chỉ tích người vắng.
  function attendanceHtml() {
    var absent = sess.people.filter(function (p) { return M.absent[p.id]; });
    var html = '<section class="mt-att"><h2 class="mt-att__sum">✅ Có mặt ' + (sess.people.length - absent.length) + '/' + sess.people.length + '</h2>' +
      (absent.length ? '<p class="mt-att__none">Vắng: ' + absent.map(function (p) { return esc(p.name); }).join('; ') + '</p>' : '') +
      '<details><summary class="btn btn--secondary btn--small" style="display:inline-flex">Sửa điểm danh</summary><div style="margin-top:8px">';
    sess.people.forEach(function (p) {
      html += '<label class="checkbox"><input type="checkbox" data-act="absent" data-id="' + p.id + '"' + (M.absent[p.id] ? ' checked' : '') + '> ' + esc(p.name) + ' <span class="text-meta">(vắng)</span></label>';
    });
    return html + '</div></details></section>';
  }

  function renderLeft() {
    var html = '<h2 class="mt__col-title">Số liệu mở phiên</h2>';
    BLOCKS.forEach(function (b) { if (blockCount(b) > 0) html += blockHtml(b); });   // khối rỗng ẩn hẳn
    $('mt-left').innerHTML = html + attendanceHtml();
  }

  /* =============================================================
     Cột phải
     ============================================================= */
  function unitOptions(selected) {
    return '<option value="">— Chọn đơn vị —</option>' + D.UNITS.map(function (u) {
      return '<option value="' + u.code + '"' + (u.code === selected ? ' selected' : '') + '>' + esc(u.name) + '</option>';
    }).join('');
  }

  function conclHtml(c, i) {
    var unitField = sess.unit
      ? ''
      : '<div class="field"><label class="field__label">Đơn vị chịu trách nhiệm</label><select class="select" data-f="c-unit" data-id="' + c.id + '"' + (c.task ? ' disabled' : '') + '>' + unitOptions(c.unit) + '</select></div>';
    var staff = (D.STAFF_BY_UNIT[c.unit] || []);
    var who = '<option value="">' + (sess.unit ? '— Chọn người thực hiện —' : 'Đầu mối đơn vị (mặc định)') + '</option>' +
      staff.map(function (n) { return '<option' + (n === c.who ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
    var level = ['P1', 'P2', 'P3', 'P4'].map(function (p) { return '<option' + (p === c.level ? ' selected' : '') + '>' + p + '</option>'; }).join('');
    var dis = c.task ? ' disabled' : '';

    var foot;
    if (c.task) {
      var cap = c.task.cap === 2 ? 'Cấp 2 · giao ' + (c.who || 'đích danh') : 'Cấp 1 · giao đầu mối ' + unitName(c.unit);
      foot = '<div class="mt-concl__state"><a class="btn btn--secondary btn--small" href="task-detail.html?from=meeting" target="_blank" rel="noopener">✅ ' + esc(c.task.code) + ' →</a>' +
        '<span class="badge badge--not-accepted">Chưa tiếp nhận</span><span class="chip">' + esc(cap) + '</span></div>';
    } else {
      var miss = missingOf(c);
      foot = (c.text.trim() && miss.length ? '<span class="mt-concl__missing">Còn thiếu: ' + miss.join(', ') + '</span>' : '') +
        '<button class="btn btn--quiet btn--small" type="button" data-act="remove" data-id="' + c.id + '">✕ Xoá</button>' +
        '<button class="btn btn--secondary" type="button" data-act="create" data-id="' + c.id + '"' + (miss.length ? ' disabled' : '') + '>Tạo nhiệm vụ</button>';
    }

    return '<div class="mt-concl' + (c.task ? ' is-created' : '') + '" data-concl="' + c.id + '">' +
      '<div class="mt-concl__top"><span class="mt-concl__no">' + (i + 1) + '</span>' +
        '<textarea class="mt-textarea mt-textarea--one" rows="1" data-f="c-text" data-id="' + c.id + '" aria-label="Nội dung kết luận ' + (i + 1) + '"' +
        ' placeholder="Gõ nội dung chỉ đạo, nhấn Enter để thêm kết luận tiếp theo"' + dis + '>' + esc(c.text) + '</textarea></div>' +
      (c.from ? '<div class="mt-concl__link">↺ Nhắc lại chỉ đạo ngày ' + esc(c.from.date) + ' · ' + esc(c.from.code) + '</div>' : '') +
      '<div class="mt-concl__fields">' + unitField +
        '<div class="field"><label class="field__label">Người thực hiện</label><select class="select" data-f="c-who" data-id="' + c.id + '"' + dis + (!sess.unit && !c.unit ? ' disabled' : '') + '>' + who + '</select></div>' +
        '<div class="field"><label class="field__label">Hạn hoàn thành</label><input class="input" type="date" data-f="c-due" data-id="' + c.id + '" value="' + esc(c.due) + '"' + dis + '></div>' +
        '<div class="field"><label class="field__label">Mức độ</label><select class="select" data-f="c-level" data-id="' + c.id + '"' + dis + '>' + level + '</select></div>' +
      '</div><div class="mt-concl__foot" data-foot="' + c.id + '">' + foot + '</div></div>';
  }

  function conclListHtml() {
    return M.concl.length ? M.concl.map(conclHtml).join('')
      : '<div class="mt-empty">Chưa có kết luận nào. Bấm “+ Thêm kết luận”, chi tiết điền sau khi họp cũng được.</div>';
  }

  function ta(field, value, attrs, one) {
    return '<textarea class="mt-textarea' + (one ? ' mt-textarea--one' : '') + '" data-f="' + field + '" ' + (attrs || '') + ' rows="' + (one ? 1 : 3) + '">' + esc(value) + '</textarea>';
  }

  function renderRight() {
    var html = '<div class="row row--between" style="margin-bottom:16px;align-items:baseline"><h2 class="mt__col-title" style="margin:0">Biên bản</h2>' +
      '<span class="mt-saved" id="mt-saved" aria-live="polite"></span></div>' +
      '<div class="mt-field"><div class="mt-field__head"><label class="mt-field__label" for="f-content">Nội dung</label></div>' + ta('content', M.content, 'id="f-content"') + '</div>' +
      '<div class="mt-field"><div class="mt-field__head"><label class="mt-field__label" for="f-backlog">Tồn tại</label></div>' + ta('backlog', M.backlog, 'id="f-backlog"') + '</div>';

    if (!sess.unit) {
      html += '<div class="mt-field"><div class="mt-field__head"><h3 class="mt-field__label">Ý kiến các đơn vị</h3>' +
        '<span class="mt-field__hint">Để trống nếu không có ý kiến</span></div>' +
        D.UNITS.map(function (u) {
          var op = M.opinions[u.code] || { who: '', text: '' };
          return '<div class="mt-opinion"><div class="mt-opinion__unit"><span>' + esc(u.name) + '</span></div>' +
            ta('op-text', op.text, 'data-unit="' + u.code + '" placeholder="Ý kiến (để trống nếu không có)"', true) + '</div>';
        }).join('') + '</div>';
    }

    html += '<div class="mt-field"><div class="mt-field__head"><h3 class="mt-field__label">Kết luận chỉ đạo</h3>' +
      '<span class="mt-field__hint">Mỗi kết luận một dòng · Enter để thêm dòng tiếp theo</span></div>' +
      '<div id="concl-list">' + conclListHtml() + '</div>' +
      '<button class="btn btn--quiet mt-add" type="button" data-act="add">+ Thêm kết luận</button></div>';
    $('mt-right').innerHTML = html;
    autosizeAll();
    updateSaved();
  }

  /* ---------- Kết luận ---------- */
  function conclById(id) { return M.concl.filter(function (c) { return c.id === id; })[0]; }
  function missingOf(c) {
    var m = [];
    if (!c.text.trim()) m.push('nội dung');
    if (sess.unit) { if (!c.who) m.push('người thực hiện'); } else if (!c.unit) m.push('đơn vị');
    if (!c.due) m.push('hạn');
    return m;
  }
  function newConcl(extra) {
    var c = { id: 'c' + (++uid), text: '', unit: sess.unit || '', who: '', due: '', level: 'P3', from: null, task: null };
    for (var k in extra) c[k] = extra[k];
    return c;
  }
  function rerenderConcl(focusId) {
    $('concl-list').innerHTML = conclListHtml();
    autosizeAll();
    var el = focusId && document.querySelector('[data-f="c-text"][data-id="' + focusId + '"]');
    if (el) el.focus();
  }
  function refreshFoots() {
    M.concl.forEach(function (c) {
      var foot = document.querySelector('[data-foot="' + c.id + '"]');
      if (foot && !c.task) {
        var miss = missingOf(c);
        foot.innerHTML = (c.text.trim() && miss.length ? '<span class="mt-concl__missing">Còn thiếu: ' + miss.join(', ') + '</span>' : '') +
          '<button class="btn btn--quiet btn--small" type="button" data-act="remove" data-id="' + c.id + '">✕ Xoá</button>' +
          '<button class="btn btn--secondary" type="button" data-act="create" data-id="' + c.id + '"' + (miss.length ? ' disabled' : '') + '>Tạo nhiệm vụ</button>';
      }
    });
  }

  /* ---------- Ô nhập tự giãn, tự lưu ---------- */
  function autosize(el) { el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; }
  function autosizeAll() { var l = document.querySelectorAll('.mt-textarea'); for (var i = 0; i < l.length; i++) autosize(l[i]); }
  function updateSaved() {
    var el = $('mt-saved');
    if (el) el.textContent = M.dirty ? 'Đang soạn…' : 'Đã lưu lúc ' + M.savedAt + ' ✓';
  }
  function markDirty() { M.dirty = true; updateSaved(); }
  window.setInterval(function () {
    if (!M.dirty) return;
    M.dirty = false; M.savedAt = nowHM(); updateSaved();
  }, 10000);

  /* =============================================================
     Sự kiện
     ============================================================= */
  document.addEventListener('click', function (event) {
    var t = event.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');

    if (act === 'toggle-block') {
      M.collapsed[id] = !M.collapsed[id];
      t.closest('.mt-block').classList.toggle('is-collapsed', M.collapsed[id]);
      t.setAttribute('aria-expanded', String(!M.collapsed[id]));
    }
    if (act === 'note') {
      event.preventDefault();   // nút nằm trong <summary>, không để nó mở/đóng đơn vị
      M.noted[t.getAttribute('data-key')] = true;
      M.backlog = (M.backlog && !/\n$/.test(M.backlog) ? M.backlog + '\n' : M.backlog) + '• ' + t.getAttribute('data-text');
      $('f-backlog').value = M.backlog;
      autosize($('f-backlog'));
      t.className = 'btn btn--quiet btn--small'; t.disabled = true; t.textContent = '✓ Đã ghi';
      markDirty();
      toast('Đã chép sang ô Tồn tại', 'info');
    }
    if (act === 'carry') {
      var d = null;
      sess.blocks.forEach(function (b) { (b.items || []).forEach(function (it) { if (it.id === id) d = it; }); });
      if (!d) return;
      M.carried[id] = true;
      M.concl.push(newConcl({ text: d.title, unit: sess.unit || d.unit, who: sess.unit ? d.who : '', level: d.level, from: { date: d.from, code: d.code } }));
      t.className = 'btn btn--quiet btn--small'; t.disabled = true; t.textContent = '✓ Đã đưa vào kết luận';
      rerenderConcl();
      markDirty();
      toast('Đã tạo kết luận nhắc lại. Điền hạn mới ở cột bên phải.', 'info');
    }
    if (act === 'add') { var c = newConcl({}); M.concl.push(c); rerenderConcl(c.id); }
    if (act === 'remove') { M.concl = M.concl.filter(function (x) { return x.id !== id; }); rerenderConcl(); markDirty(); }
    if (act === 'create') {
      var k = conclById(id);
      if (!k || missingOf(k).length) return;
      var code = (k.unit || 'GB') + '-' + (130 + M.concl.filter(function (x) { return x.task; }).length + 4);
      k.task = { code: code, cap: (sess.unit || k.who) ? 2 : 1 };
      rerenderConcl();
      toast('Đã tạo nhiệm vụ ' + code);
    }
  });

  document.addEventListener('input', function (event) {
    var el = event.target, f = el.getAttribute && el.getAttribute('data-f'), id = el.getAttribute && el.getAttribute('data-id');
    if (!f) return;
    if (el.classList.contains('mt-textarea')) autosize(el);
    if (f === 'content') M.content = el.value;
    else if (f === 'backlog') M.backlog = el.value;
    else if (f === 'op-who' || f === 'op-text') {
      var u = el.getAttribute('data-unit');
      M.opinions[u] = M.opinions[u] || { who: '', text: '' };
      M.opinions[u][f === 'op-who' ? 'who' : 'text'] = el.value;
    }
    else if (f === 'c-text') { conclById(id).text = el.value; refreshFoots(); }
    else if (f === 'c-due') { conclById(id).due = el.value; refreshFoots(); }
    else return;
    markDirty();
  });

  document.addEventListener('change', function (event) {
    var el = event.target, f = el.getAttribute && el.getAttribute('data-f'), id = el.getAttribute && el.getAttribute('data-id');
    if (f === 'c-unit') { var c = conclById(id); c.unit = el.value; c.who = ''; rerenderConcl(); markDirty(); }
    else if (f === 'c-who') { conclById(id).who = el.value; refreshFoots(); markDirty(); }
    else if (f === 'c-level') { conclById(id).level = el.value; markDirty(); }
    else if (el.getAttribute && el.getAttribute('data-act') === 'absent') {
      var pid = el.getAttribute('data-id');
      if (el.checked) M.absent[pid] = { reason: 'Lý do khác' }; else delete M.absent[pid];
      var open = document.querySelector('.mt-att details').open;
      renderLeft();
      document.querySelector('.mt-att details').open = open;
      markDirty();
    }
  });

  // Enter thêm kết luận tiếp theo (bỏ qua khi đang gõ Telex/VNI); Backspace ở dòng trống thì xoá dòng.
  document.addEventListener('keydown', function (event) {
    var el = event.target;
    if (!el.getAttribute || el.getAttribute('data-f') !== 'c-text') return;
    if (event.isComposing || event.keyCode === 229) return;
    var id = el.getAttribute('data-id');
    var at = M.concl.indexOf(conclById(id));
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!el.value.trim()) return;
      var next = newConcl({});
      M.concl.splice(at + 1, 0, next);
      rerenderConcl(next.id);
      markDirty();
    } else if (event.key === 'Backspace' && !el.value && M.concl.length > 1) {
      event.preventDefault();
      M.concl.splice(at, 1);
      rerenderConcl(M.concl[Math.max(0, at - 1)].id);
      markDirty();
    }
  });

  /* ---------- Khởi tạo ---------- */
  $('mt-title').textContent = sess.typeLabel + (sess.unit ? ' · ' + sess.unitName : '') + ' · ' + sess.dateLabel + ' · 07:15';
  $('mt-people').innerHTML = 'Chủ trì: <strong>' + esc(sess.chair) + '</strong> &nbsp;·&nbsp; Ghi biên bản: <strong>' + esc(sess.recorder) + '</strong>';
  $(type === 'unit' ? 'sw-unit' : 'sw-hospital').classList.add('is-active');
  $(type === 'unit' ? 'sw-unit' : 'sw-hospital').setAttribute('aria-current', 'page');
  $('mt-end').addEventListener('click', function () { toast('Đã kết thúc giao ban (bản mẫu chưa khoá biên bản)', 'info'); });
  document.title = $('mt-title').textContent + ' · Trung tâm điều hành số Bệnh viện Anh Quất';
  renderLeft();
  renderRight();
})();
