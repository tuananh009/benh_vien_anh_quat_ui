/* =============================================================
   Part C — briefing data shared by every briefing screen
   (MH-C01 … MH-C06), so the numbers on each screen agree with one another.

   Two sessions are modelled in full:
     · hospital — Giao ban toàn viện, Thứ Tư 26/08/2026 07:15, chaired by PGĐ Nguyễn Anh Tuấn
     · unit     — Giao ban Khoa Nội, Thứ Tư 26/08/2026 07:15 (same people as Part E)
   The seven blocks are a SNAPSHOT taken when the session was opened (C-SOLIEU-01):
   nothing here is recomputed when an old minute is opened.
   ============================================================= */
(function (root) {
  'use strict';

  /* ---------- Helpers ---------- */
  // Same idea as stripDiacritics() in the app: NFD does not split đ/Đ, handle them by hand.
  function normalize(value) {
    return String(value || '').toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  /* ---------- Units, in the fixed don_vi.thu_tu order ---------- */
  var UNITS = [
    { code: 'KB',    name: 'Khoa Khám bệnh',                 lead: 'TK Lê Văn Khải' },
    { code: 'NOI',   name: 'Khoa Nội – Nhi – Da liễu – HSCC', lead: 'ĐD trưởng Bùi Thị Tố Hoa' },
    { code: 'NGOAI', name: 'Khoa Ngoại – Sản – PT – GMHS',    lead: 'TK Phan Thế Vinh' },
    { code: 'YHCT',  name: 'Khoa YHCT – PHCN',               lead: 'TK Ngô Thị Bích' },
    { code: 'DUOC',  name: 'Khoa Dược',                      lead: 'TK Hồ Quang Minh' },
    { code: 'KHTH',  name: 'Phòng Kế hoạch tổng hợp',        lead: 'TP Nguyễn Hải Yến' },
    { code: 'TCHC',  name: 'Phòng Tổ chức – Hành chính',     lead: 'TP Đoàn Văn Sơn' },
    { code: 'CNTT',  name: 'Phòng Công nghệ thông tin',      lead: 'TP Trịnh Công Hậu' }
  ];
  var UNIT_BY_CODE = {};
  UNITS.forEach(function (u, i) { u.order = i + 1; UNIT_BY_CODE[u.code] = u; });

  // People a conclusion can be assigned to inside each unit (level-2 task).
  var STAFF_BY_UNIT = {
    KB:    ['BS Nguyễn Thị Hạnh', 'ĐD Trần Minh Tâm', 'ĐD Lê Thị Oanh'],
    NOI:   ['ĐD Lê Văn Chung', 'ĐD Vũ Thị Giang', 'ĐD Trịnh Thu Hà', 'BS Đỗ Minh Đức'],
    NGOAI: ['BS Hoàng Gia Bảo', 'ĐD Ngô Thị Thu', 'ĐD Phan Văn Lộc'],
    YHCT:  ['BS Dương Thị Lụa', 'KTV Lâm Văn Phúc'],
    DUOC:  ['DS Nguyễn Văn Quý', 'DS Lê Thị Ngân'],
    KHTH:  ['CV Trần Thị Mai', 'CV Phùng Đức Anh'],
    TCHC:  ['CV Đỗ Thị Hiền', 'NV Bùi Văn Tín'],
    CNTT:  ['KS Lý Quốc Việt', 'KS Cao Thị Trang']
  };

  /* ---------- Task status → badge (the shared label map) ---------- */
  var TASK_STATUS = {
    NOT_ACCEPTED:   { label: 'Chưa tiếp nhận', cls: 'not-accepted' },
    ACCEPTED:       { label: 'Đã tiếp nhận',   cls: 'accepted' },
    IN_PROGRESS:    { label: 'Đang làm',       cls: 'in-progress' },
    PENDING_REVIEW: { label: 'Chờ kiểm tra',   cls: 'pending-review' },
    DONE:           { label: 'Hoàn thành',     cls: 'done' },
    REJECTED:       { label: 'Không đạt',      cls: 'rejected' }
  };

  var ABSENCE_REASONS = ['Nghỉ phép', 'Trực ca', 'Công tác', 'Lý do khác'];

  /* =============================================================
     Hospital-wide session — Giao ban toàn viện
     ============================================================= */
  var HOSPITAL = {
    type: 'hospital',
    typeLabel: 'Giao ban toàn viện',
    code: 'GB-TV-BV-20260826',
    chair: 'PGĐ Nguyễn Anh Tuấn',
    recorder: 'CV Trần Thị Mai',
    dateLabel: 'Thứ Tư 26/08/2026',
    snapshotAt: '06:45 ngày 26/08/2026',
    unit: null,

    people: [
      { id: 'p1',  name: 'GĐ Vũ Đức Thành',            unit: 'Ban Giám đốc' },
      { id: 'p2',  name: 'PGĐ Nguyễn Anh Tuấn',        unit: 'Ban Giám đốc' },
      { id: 'p3',  name: 'PGĐ Đặng Thu Hương',         unit: 'Ban Giám đốc' },
      { id: 'p4',  name: 'TK Lê Văn Khải',             unit: 'Khoa Khám bệnh', onDuty: 'đang trực ca sáng' },
      { id: 'p5',  name: 'ĐD trưởng Bùi Thị Tố Hoa',   unit: 'Khoa Nội – Nhi – Da liễu – HSCC' },
      { id: 'p6',  name: 'TK Phan Thế Vinh',           unit: 'Khoa Ngoại – Sản – PT – GMHS' },
      { id: 'p7',  name: 'TK Ngô Thị Bích',            unit: 'Khoa YHCT – PHCN' },
      { id: 'p8',  name: 'TK Hồ Quang Minh',           unit: 'Khoa Dược' },
      { id: 'p9',  name: 'TP Nguyễn Hải Yến',          unit: 'Phòng Kế hoạch tổng hợp' },
      { id: 'p10', name: 'TP Đoàn Văn Sơn',            unit: 'Phòng Tổ chức – Hành chính' },
      { id: 'p11', name: 'TP Trịnh Công Hậu',          unit: 'Phòng Công nghệ thông tin' },
      { id: 'p12', name: 'TP Phạm Thị Duyên',          unit: 'Phòng Điều dưỡng', leave: 'Nghỉ phép 25–28/08 (đã duyệt)' },
      { id: 'p13', name: 'KTT Mai Văn Lợi',            unit: 'Phòng Tài chính – Kế toán' },
      { id: 'p14', name: 'TK Cao Thị Nhung',           unit: 'Khoa Cận lâm sàng' },
      { id: 'p15', name: 'TK Đinh Công Hiếu',          unit: 'Khoa Cấp cứu' },
      { id: 'p16', name: 'TP Võ Thị Hạnh',             unit: 'Phòng Vật tư – Thiết bị y tế' },
      { id: 'p17', name: 'TK Lâm Quốc Bảo',            unit: 'Khoa Dinh dưỡng' },
      { id: 'p18', name: 'TK Trương Văn Phát',         unit: 'Khoa Kiểm soát nhiễm khuẩn' }
    ],
    // Absent when the minutes open: approved leave is marked automatically (Part E),
    // the chair has already decided the person on duty counts as absent.
    absentSeed: {
      p12: { reason: 'Nghỉ phép', auto: true },
      p4:  { reason: 'Trực ca',   auto: false }
    },

    blocks: [
      {
        id: 1, icon: '📋', title: 'Chỉ đạo kỳ trước chưa hoàn thành', tone: 'info', open: true, group: 'unit',
        items: [
          { kind: 'directive', id: 'd1', code: 'NOI-0099', title: 'Rà soát lại quy trình bàn giao ca Khoa Nội', unit: 'NOI',
            who: 'ĐD trưởng Bùi Thị Tố Hoa', due: '25/08', level: 'P2', status: 'IN_PROGRESS', overdueDays: 1, from: '12/08/2026', concl: 'Giao ban toàn viện' },
          { kind: 'directive', id: 'd4', code: 'DUOC-0027', title: 'Rà soát danh mục thuốc hết hạn sử dụng', unit: 'DUOC',
            who: 'TK Hồ Quang Minh', due: '12/08', level: 'P2', status: 'IN_PROGRESS', overdueDays: 14, from: '05/08/2026', concl: 'Giao ban toàn viện', weeksAgo: 3 },
          { kind: 'directive', id: 'd2', code: 'DUOC-0030', title: 'Bổ sung cơ số thuốc cấp cứu tủ trực', unit: 'DUOC',
            who: 'TK Hồ Quang Minh', due: '28/08', level: 'P3', status: 'IN_PROGRESS', daysLeft: 2, from: '19/08/2026', concl: 'Giao ban toàn viện' },
          { kind: 'directive', id: 'd3', code: 'KHTH-0021', title: 'Báo cáo tình hình sử dụng giường tháng 8', unit: 'KHTH',
            who: 'TP Nguyễn Hải Yến', due: '24/08', level: 'P3', status: 'REJECTED', overdueDays: 2, why: 'Bị trả lại — thiếu số liệu Khoa Ngoại', from: '19/08/2026', concl: 'Giao ban toàn viện' }
        ]
      },
      {
        id: 3, icon: '🔴', title: 'Việc quá hạn', tone: 'danger', open: true, group: 'unit',
        items: [
          { kind: 'task', code: 'KB-0121', title: 'Cập nhật bảng giá dịch vụ khám theo quy định mới', unit: 'KB', who: 'TK Lê Văn Khải', due: '22/08', level: 'P3', status: 'IN_PROGRESS', overdueDays: 4 },
          { kind: 'task', code: 'KB-0124', title: 'Hoàn thiện sổ khám bệnh ngoại trú tuần 33', unit: 'KB', who: 'ĐD Trần Minh Tâm', due: '23/08', level: 'P3', status: 'IN_PROGRESS', overdueDays: 3 },
          { kind: 'task', code: 'KB-0127', title: 'Báo cáo thời gian chờ khám tháng 7', unit: 'KB', who: 'BS Nguyễn Thị Hạnh', due: '23/08', level: 'P3', status: 'ACCEPTED', overdueDays: 3 },
          { kind: 'task', code: 'KB-0129', title: 'Kiểm kê trang thiết bị phòng khám 3', unit: 'KB', who: 'ĐD Lê Thị Oanh', due: '24/08', level: 'P4', status: 'NOT_ACCEPTED', overdueDays: 2 },
          { kind: 'task', code: 'KB-0131', title: 'Nộp danh sách người bệnh chuyển tuyến', unit: 'KB', who: 'ĐD Trần Minh Tâm', due: '25/08', level: 'P3', status: 'IN_PROGRESS', overdueDays: 1 },
          { kind: 'task', code: 'NOI-0098', title: 'Hoàn thiện hồ sơ bệnh án 12 ca ra viện', unit: 'NOI', who: 'ĐD Lê Văn Chung', due: '25/08', level: 'P2', status: 'IN_PROGRESS', overdueDays: 1 },
          { kind: 'task', code: 'NOI-0092', title: 'Kiểm kê thuốc quý III', unit: 'NOI', who: 'ĐD Vũ Thị Giang', due: '24/08', level: 'P3', status: 'IN_PROGRESS', overdueDays: 2 },
          { kind: 'task', code: 'NGOAI-0067', title: 'Lập kế hoạch bảo trì máy gây mê', unit: 'NGOAI', who: 'BS Hoàng Gia Bảo', due: '24/08', level: 'P3', status: 'ACCEPTED', overdueDays: 2 },
          { kind: 'task', code: 'NGOAI-0069', title: 'Cập nhật hồ sơ phẫu thuật tồn', unit: 'NGOAI', who: 'ĐD Ngô Thị Thu', due: '25/08', level: 'P3', status: 'IN_PROGRESS', overdueDays: 1 },
          { kind: 'task', code: 'YHCT-0044', title: 'Thống kê lượt châm cứu tháng 7', unit: 'YHCT', who: 'KTV Lâm Văn Phúc', due: '21/08', level: 'P3', status: 'IN_PROGRESS', overdueDays: 5 },
          { kind: 'task', code: 'YHCT-0046', title: 'Kiểm tra vệ sinh buồng điện châm', unit: 'YHCT', who: 'BS Dương Thị Lụa', due: '24/08', level: 'P4', status: 'NOT_ACCEPTED', overdueDays: 2 },
          { kind: 'task', code: 'YHCT-0049', title: 'Nộp biên bản kiểm kê dược liệu', unit: 'YHCT', who: 'BS Dương Thị Lụa', due: '25/08', level: 'P3', status: 'IN_PROGRESS', overdueDays: 1 }
        ]
      },
      {
        id: 4, icon: '🚨', title: 'Việc khẩn P1/P2 đang mở', tone: 'danger', open: true, group: 'unit',
        items: [
          { kind: 'task', code: 'KB-0133', title: 'Xử lý sự cố mất kết nối HIS quầy tiếp đón', unit: 'KB', who: 'KS Lý Quốc Việt', due: '26/08', level: 'P2', status: 'NOT_ACCEPTED' },
          { kind: 'task', code: 'HSCC-0091', title: 'Kiểm tra máy thở buồng 4', unit: 'NOI', who: 'ĐD Lê Văn Chung', due: '26/08', level: 'P1', status: 'IN_PROGRESS' },
          { kind: 'task', code: 'NGOAI-0071', title: 'Sửa chữa đèn mổ phòng 2', unit: 'NGOAI', who: 'NV Bùi Văn Tín', due: '27/08', level: 'P2', status: 'IN_PROGRESS' }
        ]
      },
      {
        id: 5, icon: '↩️', title: 'Việc bị trả lại', tone: 'warning', open: false, group: 'unit',
        items: [
          { kind: 'task', code: 'KB-0118', title: 'Báo cáo công tác khám sức khoẻ lái xe', unit: 'KB', who: 'ĐD Lê Thị Oanh', due: '27/08', level: 'P3', status: 'REJECTED', why: 'Thiếu số liệu tuần 3' },
          { kind: 'task', code: 'NOI-0095', title: 'Cập nhật danh mục thuốc tủ trực', unit: 'NOI', who: 'ĐD Trịnh Thu Hà', due: '28/08', level: 'P3', status: 'REJECTED', why: 'Chưa có chữ ký trưởng khoa' }
        ]
      },
      {
        id: 6, icon: '👥', title: 'Nhân lực hôm nay', tone: 'info', open: true, group: null, kind: 'staff',
        night: [
          { unit: 'KB',    text: 'BS Nguyễn Thị Hạnh, ĐD Trần Minh Tâm' },
          { unit: 'NOI',   text: 'BS Đỗ Minh Đức, ĐD Lê Văn Chung' },
          { unit: 'NGOAI', text: 'BS Hoàng Gia Bảo, ĐD Ngô Thị Thu' }
        ],
        leave: [
          { text: 'TP Phạm Thị Duyên (Phòng Điều dưỡng) — nghỉ phép 25–28/08' },
          { text: 'ĐD Phan Văn Lộc (Khoa Ngoại – Sản – PT – GMHS) — nghỉ ốm 26–27/08' }
        ],
        short: [
          { text: 'Ca chiều Khoa Nội thiếu 1 người', note: 'Ca chiều Khoa Nội hôm nay thiếu 1 người' }
        ]
      },
      {
        id: 7, icon: '📉', title: 'Chỉ tiêu chậm tiến độ', tone: 'warning', open: false, group: 'unit',
        items: [
          { kind: 'target', unit: 'KB',    title: 'Lượt khám ngoại trú tháng 8',            actual: 71, plan: 85 },
          { kind: 'target', unit: 'NGOAI', title: 'Số ca phẫu thuật tháng 8',               actual: 68, plan: 85 },
          { kind: 'target', unit: 'YHCT',  title: 'Lượt điều trị phục hồi chức năng',       actual: 74, plan: 85 }
        ]
      }
    ],

    seeds: {
      live: {
        content: 'Giao ban đánh giá tình hình hoạt động ngày 25/08/2026.',
        backlog: '• Khoa Khám bệnh còn 5 việc quá hạn chưa xử lý',
        opinions: {
          KB:  { who: 'TK Lê Văn Khải', text: 'Đề nghị bổ sung 1 điều dưỡng quầy tiếp đón giờ cao điểm buổi sáng.' },
          NOI: { who: 'ĐD trưởng Bùi Thị Tố Hoa', text: '' }
        },
        concl: [
          { text: 'Khoa Khám bệnh rà soát và xử lý dứt điểm 5 việc quá hạn', unit: 'KB', who: '', due: '2026-08-28', level: 'P2' },
          { text: 'Khoa Dược bổ sung cơ số thuốc cấp cứu tủ trực', unit: 'DUOC', who: '', due: '2026-08-27', level: 'P2' },
          { text: 'Phòng Kế hoạch tổng hợp tổng hợp số liệu sử dụng giường tháng 8', unit: 'KHTH', who: '', due: '', level: 'P3' }
        ]
      }
    }
  };

  /* =============================================================
     Department session — Giao ban Khoa Nội (same people as Part E)
     ============================================================= */
  var UNIT_MEETING = {
    type: 'unit',
    typeLabel: 'Giao ban khoa/phòng',
    unitName: 'Khoa Nội – Nhi – Da liễu – HSCC',
    unitCode: 'NOI',
    code: 'GB-KP-NOI-20260826',
    chair: 'ĐD trưởng Bùi Thị Tố Hoa',
    recorder: 'ĐD Lý Thị Mỹ',
    dateLabel: 'Thứ Tư 26/08/2026',
    snapshotAt: '06:45 ngày 26/08/2026',
    unit: 'NOI',

    people: [
      { id: 'u0',  name: 'ĐD trưởng Bùi Thị Tố Hoa' },
      { id: 'an',    name: 'BS Nguyễn Văn An' },
      { id: 'binh',  name: 'BS Trần Thị Bình' },
      { id: 'cuong', name: 'BS Lê Quang Cường' },
      { id: 'duc',   name: 'BS Đỗ Minh Đức' },
      { id: 'lan',   name: 'ĐD Nguyễn Thị Lan' },
      { id: 'chung', name: 'ĐD Lê Văn Chung' },
      { id: 'dung',  name: 'ĐD Phạm Thị Dung', leave: 'Phép năm 25–28/08 (đã duyệt)' },
      { id: 'em',    name: 'ĐD Hoàng Văn Em', onDuty: 'đang trực ca sáng' },
      { id: 'giang', name: 'ĐD Vũ Thị Giang' },
      { id: 'ha',    name: 'ĐD Trịnh Thu Hà' },
      { id: 'khanh', name: 'ĐD Đinh Thị Khánh' },
      { id: 'long',  name: 'ĐD Ngô Văn Long' },
      { id: 'my',    name: 'ĐD Lý Thị Mỹ' },
      { id: 'nga',   name: 'ĐD Tạ Thị Nga' },
      { id: 'duy',   name: 'YS Phạm Văn Duy' }
    ],
    absentSeed: { dung: { reason: 'Nghỉ phép', auto: true } },

    blocks: [
      {
        id: 1, icon: '📋', title: 'Chỉ đạo kỳ trước chưa hoàn thành', tone: 'info', open: true, group: null,
        items: [
          { kind: 'directive', id: 'e3', code: 'NOI-0084', title: 'Cập nhật danh sách người bệnh nặng lên bảng trắng', unit: 'NOI',
            who: 'ĐD Trịnh Thu Hà', due: '12/08', level: 'P3', status: 'REJECTED', overdueDays: 14, why: 'Bị trả lại — chưa có ảnh chụp bảng', from: '05/08/2026', concl: 'Giao ban khoa/phòng', weeksAgo: 3 },
          { kind: 'directive', id: 'e1', code: 'NOI-0099', title: 'Rà soát lại quy trình bàn giao ca', unit: 'NOI',
            who: 'ĐD Lê Văn Chung', due: '25/08', level: 'P2', status: 'IN_PROGRESS', overdueDays: 1, from: '19/08/2026', concl: 'Giao ban khoa/phòng' },
          { kind: 'directive', id: 'e2', code: 'NOI-0107', title: 'Kiểm tra cơ số thuốc cấp cứu xe đẩy', unit: 'NOI',
            who: 'ĐD Vũ Thị Giang', due: '28/08', level: 'P3', status: 'IN_PROGRESS', daysLeft: 2, from: '19/08/2026', concl: 'Giao ban khoa/phòng' }
        ]
      },
      {
        id: 3, icon: '🔴', title: 'Việc quá hạn', tone: 'danger', open: true, group: null,
        items: [
          { kind: 'task', code: 'NOI-0098', title: 'Hoàn thiện hồ sơ bệnh án 12 ca ra viện', unit: 'NOI', who: 'ĐD Lê Văn Chung', due: '25/08', level: 'P2', status: 'IN_PROGRESS', overdueDays: 1 },
          { kind: 'task', code: 'NOI-0092', title: 'Kiểm kê thuốc quý III', unit: 'NOI', who: 'ĐD Vũ Thị Giang', due: '24/08', level: 'P3', status: 'IN_PROGRESS', overdueDays: 2 },
          { kind: 'task', code: 'NOI-TNT-0009', title: 'Vệ sinh khử khuẩn phòng chạy thận', unit: 'NOI', who: 'YS Phạm Văn Duy', due: '25/08', level: 'P3', status: 'ACCEPTED', overdueDays: 1 }
        ]
      },
      {
        id: 4, icon: '🚨', title: 'Việc khẩn P1/P2 đang mở', tone: 'danger', open: true, group: null,
        items: [
          { kind: 'task', code: 'HSCC-0091', title: 'Kiểm tra máy thở buồng 4', unit: 'NOI', who: 'ĐD Lê Văn Chung', due: '26/08', level: 'P1', status: 'IN_PROGRESS' },
          { kind: 'task', code: 'NOI-0098', title: 'Hoàn thiện hồ sơ bệnh án 12 ca ra viện', unit: 'NOI', who: 'ĐD Lê Văn Chung', due: '25/08', level: 'P2', status: 'IN_PROGRESS', overdueDays: 1 }
        ]
      },
      // Block 5 is empty on purpose: an empty block is not rendered at all (C-SOLIEU-02).
      { id: 5, icon: '↩️', title: 'Việc bị trả lại', tone: 'warning', open: false, group: null, items: [] },
      {
        id: 6, icon: '👥', title: 'Nhân lực hôm nay', tone: 'info', open: true, group: null, kind: 'staff',
        night: [{ unit: 'NOI', text: 'BS Đỗ Minh Đức, ĐD Lê Văn Chung' }],
        leave: [{ text: 'ĐD Phạm Thị Dung — phép năm 25–28/08' }],
        short: [{ text: 'Ca đêm hôm nay thiếu 1 bác sĩ', note: 'Ca đêm hôm nay (26/08) thiếu 1 bác sĩ' }]
      }
      // Block 7 (chỉ tiêu chậm tiến độ) exists only in the hospital-wide session.
    ],

    seeds: {
      live: {
        content: 'Giao ban đánh giá hoạt động ngày 25/08/2026.\n- Khoa có 48 người bệnh nội trú, 6 người bệnh nặng.',
        backlog: '• 3 việc quá hạn chưa xử lý',
        opinions: {},
        concl: [
          { text: 'Rà soát lại quy trình bàn giao ca, báo cáo trưởng khoa', unit: 'NOI', who: 'ĐD Lê Văn Chung', due: '2026-08-29', level: 'P2' },
          { text: 'Kiểm tra hạn dùng thuốc xe đẩy cấp cứu hằng tuần', unit: 'NOI', who: 'ĐD Vũ Thị Giang', due: '2026-09-02', level: 'P3' },
          { text: 'Cập nhật bảng theo dõi người bệnh nặng trước giờ bàn giao', unit: 'NOI', who: '', due: '', level: 'P3' }
        ]
      }
    }
  };

  root.MEETING = {
    UNITS: UNITS,
    UNIT_BY_CODE: UNIT_BY_CODE,
    STAFF_BY_UNIT: STAFF_BY_UNIT,
    TASK_STATUS: TASK_STATUS,
    ABSENCE_REASONS: ABSENCE_REASONS,
    SESSIONS: { hospital: HOSPITAL, unit: UNIT_MEETING },
    normalize: normalize,
    escapeHtml: escapeHtml
  };
})(window);
