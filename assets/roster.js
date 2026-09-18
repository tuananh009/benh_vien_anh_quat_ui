/* =============================================================
   Part E — duty roster data and rules, shared by every roster screen
   (MH-E01, E02, E03, E04, E07 and the wall print), so the numbers on
   each screen agree with one another.
   ============================================================= */
(function (root) {
  'use strict';

  /* ---------- 1. Reference data ---------- */
  var YEAR = 2026, MONTH = 9, DAYS = 30;
  var UNIT = 'Khoa Nội – Nhi – Da liễu – HSCC';

  var SHIFTS = {
    S:  { code: 'S',  key: 'S',  name: 'Sáng',      start: 7 * 60,  minutes: 6 * 60,  overnight: false, min: 2, need: { DD: 1 },        coef: 1.0 },
    C:  { code: 'C',  key: 'C',  name: 'Chiều',     start: 13 * 60, minutes: 6 * 60,  overnight: false, min: 1, need: { DD: 1 },        coef: 1.0 },
    'Đ':{ code: 'Đ',  key: 'D',  name: 'Đêm',       start: 19 * 60, minutes: 12 * 60, overnight: true,  min: 2, need: { BS: 1, DD: 1 }, coef: 1.5 },
    '24':{ code: '24', key: '24', name: '24 giờ',   start: 7 * 60,  minutes: 24 * 60, overnight: true,  min: 1, need: { BS: 1 },        coef: 2.0 }
  };
  var COVERAGE = ['S', 'C', 'Đ'];
  var TITLE_LABEL = { BS: 'Bác sĩ', DD: 'Điều dưỡng', YS: 'Y sĩ' };

  var LIMITS = { maxPerMonth: 12, maxNights: 2, maxGap: 4 };

  var STAFF = [
    { id: 'an',    title: 'BS', name: 'Nguyễn Văn An' },
    { id: 'binh',  title: 'BS', name: 'Trần Thị Bình' },
    { id: 'cuong', title: 'BS', name: 'Lê Quang Cường' },
    { id: 'duc',   title: 'BS', name: 'Đỗ Minh Đức' },
    { id: 'lan',   title: 'DD', name: 'Nguyễn Thị Lan' },
    { id: 'chung', title: 'DD', name: 'Lê Văn Chung' },
    { id: 'dung',  title: 'DD', name: 'Phạm Thị Dung' },
    { id: 'em',    title: 'DD', name: 'Hoàng Văn Em' },
    { id: 'giang', title: 'DD', name: 'Vũ Thị Giang' },
    { id: 'ha',    title: 'DD', name: 'Trịnh Thu Hà' },
    { id: 'khanh', title: 'DD', name: 'Đinh Thị Khánh' },
    { id: 'long',  title: 'DD', name: 'Ngô Văn Long' },
    { id: 'my',    title: 'DD', name: 'Lý Thị Mỹ' },
    { id: 'nga',   title: 'DD', name: 'Tạ Thị Nga' },
    { id: 'duy',   title: 'YS', name: 'Phạm Văn Duy' }
  ];
  STAFF.forEach(function (p) { p.label = (p.title === 'DD' ? 'ĐD' : p.title) + ' ' + p.name; });

  var LEAVE = [
    { person: 'dung', from: 1,  to: 3,  type: 'Phép năm' },
    { person: 'long', from: 21, to: 22, type: 'Ốm' }
  ];

  var OTHER_UNIT = [
    { person: 'duc', day: 15, start: 7 * 60, minutes: 12 * 60, unit: 'Khoa Cấp cứu', label: 'Trực ngày 07:00–19:00' }
  ];

  var PREV_NIGHT = { duc: 'Đ', chung: 'Đ' };

  var PINNED = [
    { person: 'an',    day: 6, code: 'Đ' },
    { person: 'an',    day: 7, code: 'Đ' },
    { person: 'an',    day: 8, code: 'Đ' },
    { person: 'chung', day: 1, code: 'S' }
  ];

  var APPROVAL = { by: 'TK Trần Văn Xuân', maker: 'ĐD trưởng Bùi Thị Tố Hoa', at: '28/08/2026 16:05' };

  var NOW = { day: 1, minute: 15 * 60 + 30, label: 'Thứ Ba, 01/09/2026 · 15:30' };

  /* ---------- 2. Calendar helpers ---------- */
  function dow(day) { return new Date(YEAR, MONTH - 1, day).getDay(); }
  function dowLabel(day) { var d = dow(day); return d === 0 ? 'CN' : 'T' + (d + 1); }
  function isWeekend(day) { var d = dow(day); return d === 0 || d === 6; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayLabel(day) { return day === 0 ? '31/08' : pad(day) + '/' + pad(MONTH); }
  var DOW_LONG = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function dayLong(day) { return DOW_LONG[day === 0 ? 1 : dow(day)] + ' ' + dayLabel(day); }
  function hhmm(min) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function shiftHours(code) { var s = SHIFTS[code]; return hhmm(s.start) + ' – ' + hhmm(s.start + s.minutes); }

  function personById(id) {
    for (var i = 0; i < STAFF.length; i++) if (STAFF[i].id === id) return STAFF[i];
    return null;
  }
  function leaveOn(personId, day) {
    for (var i = 0; i < LEAVE.length; i++) {
      var l = LEAVE[i];
      if (l.person === personId && day >= l.from && day <= l.to) return l;
    }
    return null;
  }
  function otherUnitOn(personId, day) {
    for (var i = 0; i < OTHER_UNIT.length; i++) {
      if (OTHER_UNIT[i].person === personId && OTHER_UNIT[i].day === day) return OTHER_UNIT[i];
    }
    return null;
  }
  function counts(title, need) { return title === need || (need === 'DD' && title === 'DD'); }

  function interval(day, code) {
    var s = SHIFTS[code];
    var start = (day - 1) * 1440 + s.start;
    return { start: start, end: start + s.minutes };
  }

  /* ---------- 3. Grid ---------- */
  function emptyGrid() {
    var g = {};
    STAFF.forEach(function (p) {
      g[p.id] = [];
      for (var d = 0; d <= DAYS; d++) g[p.id][d] = '';
      g[p.id][0] = PREV_NIGHT[p.id] || '';
    });
    return g;
  }

  function cloneGrid(grid) {
    var g = {};
    Object.keys(grid).forEach(function (k) { g[k] = grid[k].slice(); });
    return g;
  }

  // Hard blocks — the only two cases the system refuses (E-CHECK-01).
  function hardBlock(grid, personId, day, code) {
    if (!code) return null;
    var leave = leaveOn(personId, day);
    if (leave) return { kind: 'leave', message: 'Không gán được: ' + personById(personId).label + ' đã được duyệt nghỉ (' + leave.type + ') ngày ' + dayLabel(day) };

    var mine = interval(day, code);
    for (var d = day - 1; d <= day + 1; d++) {
      if (d < 0 || d > DAYS || d === day) continue;
      var other = grid[personId][d];
      if (!other) continue;
      var iv = interval(d, other);
      if (mine.start < iv.end && iv.start < mine.end) {
        return { kind: 'overlap', message: 'Trùng giờ với ca ' + SHIFTS[other].name + ' ' + dayLabel(d) + ' (' + shiftHours(other) + ')' };
      }
    }
    var ext = otherUnitOn(personId, day);
    if (ext) {
      var es = (day - 1) * 1440 + ext.start;
      if (mine.start < es + ext.minutes && es < mine.end) {
        return { kind: 'overlap', message: 'Trùng giờ: ' + personById(personId).label + ' đã có ca ' + ext.label + ' ở ' + ext.unit + ' ngày ' + dayLabel(day) };
      }
    }
    return null;
  }

  function nightRun(grid, personId, day) {
    var row = grid[personId], n = 0;
    for (var d = day; d >= 0 && row[d] && SHIFTS[row[d]].overnight; d--) n++;
    return n;
  }

  function total(grid, personId) {
    var n = 0;
    for (var d = 1; d <= DAYS; d++) if (grid[personId][d]) n++;
    return n;
  }

  // Deterministic fill so the demo month looks like a real, mostly balanced roster.
  function generate() {
    var g = emptyGrid();
    PINNED.forEach(function (p) { g[p.person][p.day] = p.code; });

    function restOk(pid, day, code) {
      var prev = g[pid][day - 1];
      if (prev && SHIFTS[prev].overnight) return false;
      var next = day < DAYS ? g[pid][day + 1] : '';
      if (next && SHIFTS[code].overnight) return false;
      if (SHIFTS[code].overnight && nightRun(g, pid, day - 1) >= LIMITS.maxNights) return false;
      return !hardBlock(g, pid, day, code);
    }

    function pick(day, code, filter) {
      var best = null, bestScore = Infinity;
      STAFF.forEach(function (p, i) {
        if (!filter(p) || g[p.id][day] || !restOk(p.id, day, code)) return;
        var same = g[p.id].filter(function (c) { return c === code; }).length;
        var score = total(g, p.id) * 100 + same * 40 + ((i * 7 + day * 3) % STAFF.length);
        if (score < bestScore) { bestScore = score; best = p; }
      });
      if (best) g[best.id][day] = code;
      return best;
    }

    function staffed(day, code) {
      return STAFF.filter(function (p) { return g[p.id][day] === code; });
    }

    for (var day = 1; day <= DAYS; day++) {
      var night = staffed(day, 'Đ');
      if (!night.some(function (p) { return p.title === 'BS'; })) pick(day, 'Đ', function (p) { return p.title === 'BS'; });
      if (!night.some(function (p) { return p.title === 'DD'; })) pick(day, 'Đ', function (p) { return p.title === 'DD'; });

      var morning = staffed(day, 'S');
      if (!morning.some(function (p) { return p.title === 'DD'; })) pick(day, 'S', function (p) { return p.title === 'DD'; });
      while (staffed(day, 'S').length < SHIFTS.S.min) {
        if (!pick(day, 'S', function (p) { return p.title !== 'BS'; })) break;
      }
      if (!staffed(day, 'C').some(function (p) { return p.title === 'DD'; })) pick(day, 'C', function (p) { return p.title === 'DD'; });
    }

    // Deliberate gaps so the demo shows each kind of soft warning.
    var s4 = staffed(4, 'S');
    if (s4.length > 1) g[s4[s4.length - 1].id][4] = '';
    var d10 = staffed(10, 'Đ').filter(function (p) { return p.title === 'BS'; });
    if (d10.length) {
      g[d10[0].id][10] = '';
      pick(10, 'Đ', function (p) { return p.title !== 'BS'; });
    }
    return g;
  }

  /* ---------- 4. Soft warnings — E-CHECK-02 ---------- */
  function evaluate(grid) {
    var result = { totals: {}, coverage: {}, flags: {}, warnings: [] };

    STAFF.forEach(function (p) {
      var t = { S: 0, C: 0, 'Đ': 0, '24': 0, all: 0 };
      for (var d = 1; d <= DAYS; d++) { var c = grid[p.id][d]; if (c) { t[c]++; t.all++; } }
      result.totals[p.id] = t;
    });

    for (var day = 1; day <= DAYS; day++) {
      result.coverage[day] = {};
      COVERAGE.forEach(function (code) {
        var people = STAFF.filter(function (p) { var c = grid[p.id][day]; return c === code || c === '24'; });
        var issues = [];
        if (people.length < SHIFTS[code].min) {
          issues.push({ type: 'short', text: 'Ngày ' + day + ' · ca ' + SHIFTS[code].name + ' chỉ có ' + people.length + ' người (tối thiểu ' + SHIFTS[code].min + ')' });
        }
        Object.keys(SHIFTS[code].need).forEach(function (title) {
          if (!people.some(function (p) { return counts(p.title, title); })) {
            issues.push({ type: 'title', text: 'Ngày ' + day + ' · ca ' + SHIFTS[code].name + ' không có ' + TITLE_LABEL[title].toLowerCase() });
          }
        });
        result.coverage[day][code] = { count: people.length, min: SHIFTS[code].min, issues: issues };
        var target = people[0] ? people[0].id : STAFF[0].id;
        issues.forEach(function (i) { result.warnings.push({ type: i.type, text: i.text, person: target, day: day, code: code }); });
      });
    }

    STAFF.forEach(function (p) {
      var row = grid[p.id];
      for (var d = 1; d <= DAYS; d++) {
        var prev = row[d - 1], cur = row[d];
        if (prev && cur) {
          var a = interval(d - 1, prev), b = interval(d, cur);
          if (a.end === b.start) {
            flag(result, p.id, d - 1); flag(result, p.id, d);
            result.warnings.push({ type: 'back', person: p.id, day: d,
              text: p.label + ' trực 2 ca liên tiếp không nghỉ: ' + SHIFTS[prev].name + ' ' + dayLabel(d - 1) + ' → ' + SHIFTS[cur].name + ' ' + dayLabel(d) });
          }
        }
      }
      var run = [];
      for (var e = 0; e <= DAYS + 1; e++) {
        var night = e <= DAYS && row[e] && SHIFTS[row[e]].overnight;
        if (night) { run.push(e); continue; }
        if (run.length > LIMITS.maxNights) {
          run.forEach(function (x) { flag(result, p.id, x); });
          result.warnings.push({ type: 'nights', person: p.id, day: run[0] || 1,
            text: p.label + ' trực đêm ' + run.length + ' ngày liên tiếp (' + run.map(function (x) { return x === 0 ? '31/8' : x; }).join(', ') + ') — tối đa ' + LIMITS.maxNights });
        }
        run = [];
      }
      if (result.totals[p.id].all > LIMITS.maxPerMonth) {
        result.warnings.push({ type: 'max', person: p.id, day: firstShift(row),
          text: p.label + ' có ' + result.totals[p.id].all + ' ca trong tháng — vượt tối đa ' + LIMITS.maxPerMonth });
      }
    });

    [['BS'], ['DD', 'YS']].forEach(function (group) {
      var members = STAFF.filter(function (p) { return group.indexOf(p.title) !== -1 && !LEAVE.some(function (l) { return l.person === p.id && l.to - l.from > 7; }); });
      if (members.length < 2) return;
      var sorted = members.slice().sort(function (a, b) { return result.totals[a.id].all - result.totals[b.id].all; });
      var lo = sorted[0], hi = sorted[sorted.length - 1];
      var gap = result.totals[hi.id].all - result.totals[lo.id].all;
      if (gap > LIMITS.maxGap) {
        result.warnings.push({ type: 'gap', person: lo.id, day: firstShift(grid[lo.id]),
          text: 'Chênh lệch số ca nhóm ' + TITLE_LABEL[group[0]].toLowerCase() + ': ' + hi.label + ' ' + result.totals[hi.id].all + ' ca, ' + lo.label + ' ' + result.totals[lo.id].all + ' ca (chênh ' + gap + ', cho phép ' + LIMITS.maxGap + ')' });
      }
    });

    return result;
  }

  function flag(result, pid, day) { (result.flags[pid] = result.flags[pid] || {})[day] = true; }
  function firstShift(row) { for (var d = 1; d <= DAYS; d++) if (row[d]) return d; return 1; }

  var WARNING_GROUPS = {
    short:  'Ca thiếu người',
    title:  'Ca thiếu chức danh bắt buộc',
    back:   'Trực 2 ca liên tiếp không nghỉ',
    nights: 'Trực đêm quá số ngày liên tiếp',
    max:    'Vượt số ca tối đa trong tháng',
    gap:    'Chênh lệch số ca giữa các thành viên'
  };

  /* ---------- 5. Approved month — swaps applied ---------- */
  var BASE = generate();

  function findSwap(grid) {
    var picks = [];
    [[4, 'Đ'], [12, 'S'], [19, 'Đ']].forEach(function (want) {
      var day = want[0], code = want[1];
      var from = STAFF.filter(function (p) { return p.title !== 'BS' && p.id !== 'lan' && grid[p.id][day] === code; })[0];
      if (!from) return;
      var to = STAFF.filter(function (p) {
        return p.title === from.title && p.id !== 'lan' && !grid[p.id][day] && !hardBlock(grid, p.id, day, code) &&
          !grid[p.id][day - 1] && !(day < DAYS && grid[p.id][day + 1]) &&
          !picks.some(function (x) { return x.to === p.id || x.from === p.id; });
      })[0];
      if (to) picks.push({ day: day, code: code, from: from.id, to: to.id });
    });
    return picks;
  }

  var SWAP_META = [
    { reason: 'Việc gia đình',             accepted: '29/08 10:12', approver: 'ĐD trưởng Bùi Thị Tố Hoa', approved: '29/08 14:30' },
    { reason: 'Đưa con đi khám',           accepted: '30/08 08:05', approver: 'ĐD trưởng Bùi Thị Tố Hoa', approved: '30/08 09:40' },
    { reason: 'Tham dự lớp tập huấn KSNK', accepted: '30/08 20:47', approver: 'ĐD trưởng Bùi Thị Tố Hoa', approved: '31/08 07:55' }
  ];

  var SWAPS = findSwap(BASE).map(function (s, i) {
    var m = SWAP_META[i];
    return { day: s.day, code: s.code, from: s.from, to: s.to, reason: m.reason, accepted: m.accepted, approver: m.approver, approved: m.approved };
  });

  var APPROVED = cloneGrid(BASE);
  SWAPS.forEach(function (s) { APPROVED[s.from][s.day] = ''; APPROVED[s.to][s.day] = s.code; });

  function swapAt(personId, day) {
    for (var i = 0; i < SWAPS.length; i++) if (SWAPS[i].to === personId && SWAPS[i].day === day) return SWAPS[i];
    return null;
  }

  /* ---------- 6. Statistics — E-TK-01 ---------- */
  function stats(grid) {
    return STAFF.map(function (p) {
      var row = { person: p, S: 0, C: 0, 'Đ': 0, '24': 0, total: 0, nights: 0, weekend: 0, received: 0, given: 0, coef: 0, leave: {} };
      for (var d = 1; d <= DAYS; d++) {
        var c = grid[p.id][d];
        if (!c) continue;
        row[c]++; row.total++;
        if (SHIFTS[c].overnight) row.nights++;
        if (isWeekend(d)) row.weekend++;
        row.coef += SHIFTS[c].coef;
      }
      SWAPS.forEach(function (s) { if (s.to === p.id) row.received++; if (s.from === p.id) row.given++; });
      LEAVE.forEach(function (l) { if (l.person === p.id) row.leave[l.type] = (row.leave[l.type] || 0) + (l.to - l.from + 1); });
      return row;
    });
  }

  function shiftsInRange(grid, personId, from, to) {
    var out = [];
    for (var d = Math.max(1, from); d <= Math.min(DAYS, to); d++) {
      var c = grid[personId][d];
      if (!c) continue;
      var others = STAFF.filter(function (p) { return p.id !== personId && grid[p.id][d] === c; });
      out.push({ day: d, code: c, left: others.length, min: SHIFTS[c].min, others: others });
    }
    return out;
  }

  /* ---------- 7. Swap candidates — E-DOI, filtered while choosing ---------- */
  function minutesUntil(day, code) {
    return interval(day, code).start - ((NOW.day - 1) * 1440 + NOW.minute);
  }

  function candidates(grid, personId, day, code) {
    var shift = SHIFTS[code];
    var crew = STAFF.filter(function (p) { return p.id !== personId && grid[p.id][day] === code; });
    var hidden = { busy: 0, leave: 0 };
    var shown = [];

    STAFF.forEach(function (p) {
      if (p.id === personId) return;
      if (leaveOn(p.id, day)) { hidden.leave++; return; }
      if (grid[p.id][day] || hardBlock(grid, p.id, day, code)) { hidden.busy++; return; }

      var trial = cloneGrid(grid);
      trial[personId][day] = '';
      trial[p.id][day] = code;

      var warns = [], dim = false;
      Object.keys(shift.need).forEach(function (title) {
        var covered = crew.some(function (c) { return counts(c.title, title); });
        if (!covered && !counts(p.title, title)) {
          dim = true;
          warns.push('Không phải ' + TITLE_LABEL[title].toLowerCase() + ' — ca ' + shift.name + ' sẽ thiếu ' + TITLE_LABEL[title].toLowerCase());
        }
      });
      var after = total(trial, p.id);
      if (after > LIMITS.maxPerMonth) warns.push('Nhận thêm thành ' + after + ' ca — vượt tối đa ' + LIMITS.maxPerMonth);
      [day - 1, day + 1].forEach(function (d) {
        if (d < 0 || d > DAYS || !trial[p.id][d]) return;
        var a = d < day ? interval(d, trial[p.id][d]) : interval(day, code);
        var b = d < day ? interval(day, code) : interval(d, trial[p.id][d]);
        if (a.end === b.start) warns.push('Liền ca ' + SHIFTS[trial[p.id][d]].name + ' ' + dayLabel(d) + ', không nghỉ giữa hai ca');
      });
      if (shift.overnight) {
        var run = 1;
        for (var x = day - 1; x >= 0 && trial[p.id][x] && SHIFTS[trial[p.id][x]].overnight; x--) run++;
        for (var y = day + 1; y <= DAYS && trial[p.id][y] && SHIFTS[trial[p.id][y]].overnight; y++) run++;
        if (run > LIMITS.maxNights) warns.push('Thành ' + run + ' đêm liên tiếp — tối đa ' + LIMITS.maxNights);
      }
      shown.push({ person: p, total: total(grid, p.id), after: after, warns: warns, dim: dim });
    });

    shown.sort(function (a, b) {
      if (a.dim !== b.dim) return a.dim ? 1 : -1;
      if (a.warns.length !== b.warns.length) return a.warns.length - b.warns.length;
      return a.total - b.total;
    });
    return { shown: shown, hidden: hidden, crew: crew };
  }

  function swapOutcome(grid, fromId, toId, day, code) {
    var trial = cloneGrid(grid);
    trial[fromId][day] = '';
    trial[toId][day] = code;
    var crew = STAFF.filter(function (p) { return trial[p.id][day] === code; });
    var missing = Object.keys(SHIFTS[code].need).filter(function (title) {
      return !crew.some(function (p) { return counts(p.title, title); });
    });
    return {
      fromBefore: total(grid, fromId), fromAfter: total(trial, fromId),
      toBefore: total(grid, toId), toAfter: total(trial, toId),
      crew: crew.length, min: SHIFTS[code].min,
      missing: missing.map(function (t) { return TITLE_LABEL[t].toLowerCase(); }),
      overMax: total(trial, toId) > LIMITS.maxPerMonth
    };
  }

  var api = {
    YEAR: YEAR, MONTH: MONTH, DAYS: DAYS, UNIT: UNIT, SHIFTS: SHIFTS, COVERAGE: COVERAGE, LIMITS: LIMITS,
    STAFF: STAFF, LEAVE: LEAVE, OTHER_UNIT: OTHER_UNIT, SWAPS: SWAPS, APPROVAL: APPROVAL, WARNING_GROUPS: WARNING_GROUPS,
    NOW: NOW, TITLE_LABEL: TITLE_LABEL,
    BASE: BASE, APPROVED: APPROVED,
    minutesUntil: minutesUntil, candidates: candidates, swapOutcome: swapOutcome, total: total,
    dow: dow, dowLabel: dowLabel, isWeekend: isWeekend, dayLabel: dayLabel, dayLong: dayLong, shiftHours: shiftHours,
    personById: personById, leaveOn: leaveOn, otherUnitOn: otherUnitOn, swapAt: swapAt,
    cloneGrid: cloneGrid, hardBlock: hardBlock, evaluate: evaluate, stats: stats, shiftsInRange: shiftsInRange
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Roster = api;
})(this);
