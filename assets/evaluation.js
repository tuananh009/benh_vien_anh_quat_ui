/* =============================================================
   Part D — monthly emulation scoring.

   One scoring screen, built from form configuration: the 17 personal forms
   share one frame (40·20·15·15·10), the 15 unit forms share another
   (30·20·15·15·20), only the criterion wording differs. Adding a form is
   adding a record to FORMS, not writing a new screen.

   Every Part D screen reads the same period (08/2026) and the same Khoa Nội
   staff, so scores, warnings and counts agree between screens.
   Components mount from data-eval="…" attributes. Needs assets/app.js first.
   ============================================================= */
(function () {
  'use strict';

  /* ---------- 1. Period and rules ---------- */
  var PERIOD = { label: 'Tháng 08/2026', short: '08/2026', quarter: 'Quý III/2026' };

  // Doc D §3 — the hospital's own deadline table. Each period can change these.
  var STEPS = [
    { who: 'Cá nhân / khoa phòng',            due: '02/09', what: 'Tự chấm, ghi minh chứng, điểm cộng/trừ, tự nhận xét', out: 'Phiếu tự chấm' },
    { who: 'Trưởng khoa/phòng',               due: '03/09', what: 'Rà soát công việc, minh chứng, họp thống nhất nếu cần', out: 'Phiếu đã xác nhận' },
    { who: 'Phòng Tổ chức – Hành chính',      due: '04/09', what: 'Đối chiếu chấm công, nghỉ phép, kỷ luật, phản ánh hành chính', out: 'Bảng đối chiếu HC' },
    { who: 'KHTH · Tài chính · ĐD/KSNK · CNTT', due: '04/09', what: 'Số liệu chuyên môn, hồ sơ, BHYT, chăm sóc, dữ liệu hệ thống', out: 'Bảng minh chứng liên phòng' },
    { who: 'Hội đồng thi đua / Lãnh đạo',     due: '05/09', what: 'Xét duyệt điểm, xếp loại, thưởng / không xét thưởng / chấn chỉnh', out: 'Biên bản xét duyệt' },
    { who: 'Các đơn vị',                      due: 'Sau phê duyệt', what: 'Công bố, tiếp nhận kiến nghị, lưu hồ sơ, cải tiến', out: 'Thông báo kết quả' }
  ];

  var GAP_LIMIT = 15;  // doc D §6, adjustable (Q48)

  var GRADES = {
    person: [
      { code: 'A', min: 90, name: 'Hoàn thành xuất sắc nhiệm vụ', meaning: 'Thưởng cao nhất, ưu tiên xét danh hiệu' },
      { code: 'B', min: 80, name: 'Hoàn thành tốt nhiệm vụ', meaning: 'Được xét thưởng' },
      { code: 'C', min: 65, name: 'Hoàn thành nhiệm vụ', meaning: 'Có thưởng khuyến khích, cần cải thiện' },
      { code: 'D', min: 50, name: 'Không hoàn thành nhiệm vụ – cảnh báo quản trị', meaning: 'Không thưởng · chấn chỉnh, theo dõi tháng sau' },
      { code: 'E', min: 0,  name: 'Không hoàn thành / không xét thi đua', meaning: 'Không thưởng · xem xét trách nhiệm, đào tạo lại' }
    ],
    // The unit thresholds are not in the documents yet — same cut-offs as personal, to confirm.
    unit: [
      { code: 'XS',  min: 90, name: 'Xuất sắc' },
      { code: 'T',   min: 80, name: 'Tốt' },
      { code: 'HT',  min: 65, name: 'Hoàn thành' },
      { code: 'KHT', min: 0,  name: 'Không hoàn thành' }
    ]
  };

  /* ---------- 2. Form configuration ---------- */
  // Groups II, III and V are worded the same on every personal form.
  var P_II = { title: 'II. Chấp hành quy chế, kỷ luật lao động, trực, giao ban', max: 20, items: [
    { t: 'Đi làm đúng giờ; không đi muộn, về sớm, bỏ vị trí làm việc', max: 5 },
    { t: 'Tham gia trực/ca làm việc, nhận bàn giao và bàn giao đầy đủ', max: 5, figs: ['shifts'] },
    { t: 'Thực hiện nghiêm quy chế bệnh viện, quy chế khoa/phòng, phân công nhiệm vụ', max: 5 },
    { t: 'Không có phản ánh vi phạm, không bị nhắc nhở/lập biên bản trong tháng', max: 5 }
  ] };
  var P_III = { title: 'III. Thái độ phục vụ, giao tiếp, phối hợp', max: 15, items: [
    { t: 'Giao tiếp, ứng xử chuẩn mực với người bệnh/người nhà/người sử dụng dịch vụ', max: 5 },
    { t: 'Phối hợp đúng mực với đồng nghiệp và các khoa/phòng liên quan', max: 5 },
    { t: 'Không có phản ánh tiêu cực hoặc khiếu nại có cơ sở trong tháng', max: 5 }
  ] };
  var P_V = { title: 'V. Hoạt động chung, đào tạo, cải tiến chất lượng', max: 10, items: [
    { t: 'Tham gia họp khoa/phòng, giao ban, sinh hoạt nội bộ theo phân công', max: 2, figs: ['meetings'] },
    { t: 'Tham gia đào tạo, tập huấn, cập nhật quy trình/chuyên môn', max: 2 },
    { t: 'Tham gia 5S, vệ sinh, phong trào, hoạt động chung của bệnh viện', max: 2 },
    { t: 'Có đề xuất/sáng kiến/cải tiến hoặc tham gia cải tiến chất lượng', max: 2 },
    { t: 'Chấp hành báo cáo, khắc phục tồn tại tháng trước và hỗ trợ nhiệm vụ đột xuất', max: 2 }
  ] };

  var FORM_01A_GROUPS = [
    { title: 'I. Chuyên môn, nghiệp vụ / nhiệm vụ chức năng', max: 40, items: [
      { t: 'Khám bệnh, chẩn đoán, điều trị đúng quy trình chuyên môn, đúng phạm vi hành nghề', max: 15, figs: ['done', 'ontime', 'returned'] },
      { t: 'Không để xảy ra sai sót chuyên môn do nguyên nhân chủ quan; chủ động phòng ngừa sự cố', max: 10 },
      { t: 'Thực hiện trực, hội chẩn, chuyển khoa/chuyển viện, bàn giao người bệnh đầy đủ', max: 5 },
      { t: 'Chỉ định thuốc, cận lâm sàng, dịch vụ kỹ thuật hợp lý, phù hợp chẩn đoán và BHYT', max: 5 },
      { t: 'Tham gia sinh hoạt chuyên môn, đào tạo, cập nhật kiến thức, cải tiến chất lượng', max: 5 }
    ] },
    P_II, P_III,
    { title: 'IV. Hồ sơ, quy trình, báo cáo, BHYT, dữ liệu và bảo mật thông tin', max: 15, items: [
      { t: 'Hoàn thành bệnh án, phiếu khám, chỉ định, đơn thuốc, tờ điều trị đúng thời gian', max: 5, figs: ['overdue'] },
      { t: 'Ghi chép, ký xác nhận, cập nhật HIS/EMR đầy đủ, trung thực, truy xuất được', max: 5 },
      { t: 'Phối hợp giải trình BHYT, thanh toán, chuyển tuyến, trả kết quả và báo cáo liên quan', max: 5 }
    ] },
    P_V
  ];

  var U_GROUPS = [
    { title: 'I. Thực hiện chỉ tiêu, nhiệm vụ được giao', max: 30, items: [
      { t: 'Hoàn thành chỉ tiêu chuyên môn/kế hoạch tháng/chỉ tiêu hỗ trợ được giao', max: 10, figs: ['unitTasks'] },
      { t: 'Hoàn thành chỉ tiêu thu dung, dịch vụ, doanh thu hoặc nhiệm vụ trọng tâm theo đơn vị', max: 10, figs: ['target'] },
      { t: 'Thực hiện tốt nhiệm vụ đột xuất, kết luận giao ban, nhiệm vụ do Ban Giám đốc giao', max: 10, figs: ['bgd'] }
    ] },
    { title: 'II. Chất lượng, an toàn, kiểm soát rủi ro', max: 20, items: [
      { t: 'Không để xảy ra sai sót chuyên môn/sự cố nghiêm trọng do nguyên nhân chủ quan', max: 10 },
      { t: 'Thực hiện đúng quy trình chuyên môn, kỹ thuật, kiểm soát rủi ro, an toàn thiết bị', max: 5 },
      { t: 'Bảo đảm an toàn người bệnh, KSNK, chất lượng phục vụ, phòng ngừa nguy cơ', max: 5 }
    ] },
    { title: 'III. Quản lý nhân sự, kỷ luật, nề nếp làm việc', max: 15, items: [
      { t: 'Chấp hành giờ giấc, trực, giao ban, phân công nhiệm vụ, lịch báo cáo', max: 5, figs: ['unitMeet'] },
      { t: 'Không có nhân viên vi phạm kỷ luật nghiêm trọng trong tháng', max: 5 },
      { t: 'Đoàn kết nội bộ, phối hợp tốt giữa các vị trí/đơn vị', max: 5 }
    ] },
    { title: 'IV. Hồ sơ, báo cáo, BHYT, dữ liệu, bảo mật thông tin và phối hợp công việc', max: 15, items: [
      { t: 'Hồ sơ chuyên môn/sổ sách/báo cáo đầy đủ, đúng hạn, đúng quy định', max: 5 },
      { t: 'Báo cáo tháng đúng hạn, số liệu chính xác, không bị nhắc nhiều lần', max: 5 },
      { t: 'Phối hợp tốt trong giải trình BHYT, thanh toán, dữ liệu HIS/EMR và hồ sơ điện tử', max: 5 }
    ] },
    { title: 'V. Cải tiến, văn hóa bệnh viện, hình ảnh đơn vị', max: 20, items: [
      { t: 'Không có phản ánh tiêu cực nghiêm trọng từ người bệnh/người nhà/đơn vị phối hợp', max: 5 },
      { t: 'Thực hiện giao tiếp ứng xử, văn hóa bệnh viện, 5S, hình ảnh đơn vị', max: 5 },
      { t: 'Có sáng kiến/cải tiến, đào tạo nội bộ, sinh hoạt chuyên môn và khắc phục tồn tại', max: 10 }
    ] }
  ];
  var U_BASIS = 'Mẫu này dùng để đánh giá tập thể theo tháng/quý, đồng thời là căn cứ đánh giá trách nhiệm quản lý và phân bổ thưởng tập thể.';

  var FORMS = {
    '01A': {
      code: '01A', kind: 'person', title: 'Bác sĩ', version: 1,
      name: 'Phiếu đánh giá, xếp loại thi đua hằng tháng – Bác sĩ',
      basis: 'Căn cứ quan hệ nhân quả: Quy chế làm việc quy định bác sĩ phải khám, chẩn đoán, chỉ định, điều trị, hội chẩn, trực và hoàn thiện hồ sơ đúng phạm vi hành nghề. Phiếu này đo kết quả để xét thi đua và tiền thưởng.',
      flow: 'Tự chấm → trưởng khoa/phòng xác nhận → lãnh đạo xét duyệt',
      groups: FORM_01A_GROUPS
    },
    '01B': {
      code: '01B', kind: 'person', title: 'Điều dưỡng/Hộ sinh', version: 1,
      name: 'Phiếu đánh giá, xếp loại thi đua hằng tháng – Điều dưỡng/Hộ sinh',
      basis: 'Căn cứ quan hệ nhân quả: Quy chế làm việc và quy định phân công nhiệm vụ giao điều dưỡng/hộ sinh chăm sóc, thực hiện y lệnh, bàn giao, KSNK, giáo dục sức khỏe và hồ sơ điều dưỡng. Phiếu này là căn cứ đánh giá chất lượng chăm sóc hằng tháng.',
      flow: 'Tự chấm → trưởng khoa/phòng xác nhận → lãnh đạo xét duyệt',
      groups: [
        { title: 'I. Chuyên môn, nghiệp vụ / nhiệm vụ chức năng', max: 40, items: [
          { t: 'Thực hiện chăm sóc người bệnh/hộ sinh đúng phân cấp, đúng quy trình, an toàn', max: 12, figs: ['done', 'ontime', 'returned'] },
          { t: 'Thực hiện y lệnh chính xác, đúng người, đúng thuốc/dịch, đúng thời gian, đúng đường dùng', max: 10 },
          { t: 'Theo dõi, nhận định, phát hiện bất thường và báo bác sĩ/điều dưỡng trưởng kịp thời', max: 6 },
          { t: 'Tuân thủ kiểm soát nhiễm khuẩn, vệ sinh tay, an toàn người bệnh, phòng té ngã/loét ép', max: 6 },
          { t: 'Giáo dục sức khỏe, phổ biến nội quy, hướng dẫn người bệnh và người nhà', max: 6 }
        ] },
        P_II, P_III,
        { title: 'IV. Hồ sơ, quy trình, báo cáo, BHYT, dữ liệu và bảo mật thông tin', max: 15, items: [
          { t: 'Hoàn thành phiếu chăm sóc, phiếu truyền dịch, phiếu theo dõi và sổ bàn giao đúng thời gian', max: 5, figs: ['overdue'] },
          { t: 'Ghi chép, ký xác nhận, cập nhật hồ sơ điều dưỡng đầy đủ, trung thực', max: 5 },
          { t: 'Phối hợp thanh toán, BHYT, chuyển khoa, ra viện, bàn giao thuốc/vật tư/tài sản', max: 5 }
        ] },
        P_V
      ]
    },
    // The wording of 01C has not been received yet; the prototype borrows 01A's.
    '01C': {
      code: '01C', kind: 'person', title: 'Y sỹ đa khoa', version: 1, borrowed: '01A',
      name: 'Phiếu đánh giá, xếp loại thi đua hằng tháng – Y sỹ đa khoa',
      basis: '(Chưa nhận được câu chữ Mẫu 01C — bản mẫu tạm hiện tiêu chí Mẫu 01A.)',
      flow: 'Tự chấm → quản lý trực tiếp xác nhận → lãnh đạo xét duyệt',
      groups: FORM_01A_GROUPS
    },
    '02A': {
      code: '02A', kind: 'unit', title: 'Phòng Tài chính kế toán', version: 1,
      name: 'Phiếu đánh giá, xếp loại tập thể Phòng Tài chính kế toán', basis: U_BASIS,
      flow: 'Đơn vị tự chấm → lãnh đạo bệnh viện chấm nếu thấy chưa đúng',
      focus: ['Kiểm soát thu - chi, viện phí, BHYT, công nợ, chứng từ và chống thất thu.',
              'Đối soát số liệu đúng hạn, không để sai lệch kéo dài, không gây ách tắc thanh toán.'],
      groups: U_GROUPS
    },
    '02B': {
      code: '02B', kind: 'unit', title: 'Phòng Tổ chức – Hành chính', version: 1,
      name: 'Phiếu đánh giá, xếp loại tập thể Phòng Tổ chức – Hành chính', basis: U_BASIS,
      flow: 'Đơn vị tự chấm → lãnh đạo bệnh viện chấm nếu thấy chưa đúng',
      focus: ['Bảo đảm nhân sự, chấm công, văn thư, lưu trữ, hậu cần, cơ sở vật chất, điều kiện làm việc.',
              'Xử lý hậu cần, văn thư, sửa chữa, điều xe, bảo vệ, vệ sinh kịp thời.'],
      groups: U_GROUPS
    },
    '02K': {
      code: '02K', kind: 'unit', title: 'Khoa Nội – Nhi – Da liễu – Hồi sức cấp cứu', version: 1,
      name: 'Phiếu đánh giá, xếp loại tập thể Khoa Nội – Nhi – Da liễu – Hồi sức cấp cứu', basis: U_BASIS,
      flow: 'Khoa tự chấm → lãnh đạo bệnh viện chấm nếu thấy chưa đúng',
      focus: null,
      groups: U_GROUPS
    }
  };

  // The full catalogue of doc D §1 — code, name, who confirms.
  var FORM_INDEX = [
    ['01A', 'Bác sĩ', 'Trưởng khoa/phòng xác nhận'], ['01B', 'Điều dưỡng/hộ sinh', 'Trưởng khoa/phòng xác nhận'],
    ['01C', 'Y sỹ đa khoa', 'Quản lý trực tiếp xác nhận'], ['01D', 'Y sỹ y học cổ truyền', 'Quản lý trực tiếp xác nhận'],
    ['01E', 'KTV phục hồi chức năng', 'Trưởng khoa/phòng xác nhận'], ['01F', 'KTV gây mê hồi sức', 'Trưởng khoa/phòng xác nhận'],
    ['01G', 'KTV chẩn đoán hình ảnh', 'Trưởng khoa/phòng xác nhận'], ['01H', 'KTV xét nghiệm', 'Trưởng khoa/phòng xác nhận'],
    ['01I', 'Dược sĩ', 'Quản lý trực tiếp/trưởng khoa xác nhận'], ['01K', 'Nhân viên trang thiết bị y tế', 'Quản lý trực tiếp/trưởng khoa xác nhận'],
    ['01L', 'Kế toán/thu ngân/tài chính', 'Trưởng phòng xác nhận'], ['01M', 'Kế hoạch tổng hợp/QLCL', 'Trưởng phòng xác nhận'],
    ['01N', 'Tổ chức – hành chính', 'Trưởng phòng xác nhận'], ['01O', 'Công nghệ thông tin', 'Trưởng phòng xác nhận'],
    ['01P', 'Bảo vệ', 'Tổ trưởng/phụ trách xác nhận'], ['01Q', 'Bộ phận vệ sinh', 'Tổ trưởng/phụ trách xác nhận'],
    ['01R', 'Lái xe', 'Tổ trưởng/phụ trách xác nhận'],
    ['02A', 'Phòng Tài chính kế toán'], ['02B', 'Phòng Tổ chức – Hành chính'], ['02C', 'Phòng Công nghệ thông tin'],
    ['02D', 'Phòng Kế hoạch tổng hợp'], ['02E', 'Bộ phận bảo vệ'], ['02F', 'Bộ phận vệ sinh'], ['02G', 'Bộ phận lái xe'],
    ['02H', 'Khoa Dược – Vật tư – TTBYT'], ['02I', 'Khoa Khám bệnh'], ['02K', 'Khoa Nội – Nhi – Da liễu – HSCC'],
    ['02L', 'Phòng/Đơn nguyên Thận nhân tạo'], ['02M', 'Khoa Ngoại – Sản – Phẫu thuật – GMHS'],
    ['02N', 'Khoa YHCT – Phục hồi chức năng'], ['02O', 'Khoa Cận lâm sàng – Thăm dò chức năng'], ['02P', 'Khoa Liên chuyên khoa']
  ];

  /* ---------- 3. Khoa Nội, period 08/2026 ---------- */
  var UNIT = 'Khoa Nội – Nhi – Da liễu – HSCC';
  var HEAD = 'TK Trần Văn Xuân';

  // self / mgr: total of the five groups. scored03: manager had scored by 03/09 10:00.
  // At the council (05/09) every form of the unit has been scored and cross-checked.
  var STAFF = [
    { id: 'xuan',  label: 'BS Trần Văn Xuân',      title: 'Bác sĩ',     post: 'Trưởng khoa', form: '01A', nv: 'NV0112', self: 92, mgr: 90, scorer: 'PGĐ Nguyễn Anh Tuấn', byBoard: true },
    { id: 'binh',  label: 'BS Trần Thị Bình',      title: 'Bác sĩ',     post: 'Phó khoa',    form: '01A', nv: 'NV0135', self: 90, mgr: 88, scored03: true },
    { id: 'an',    label: 'BS Nguyễn Văn An',      title: 'Bác sĩ',     form: '01A', nv: 'NV0148', self: 88, mgr: 86, scored03: true,
      bonus: { self: 2, mgr: 2, note: 'Sáng kiến bảng bàn giao SBAR cho người bệnh nặng — Hội đồng KHKT xác nhận 20/08' } },
    { id: 'cuong', label: 'BS Lê Quang Cường',     title: 'Bác sĩ',     form: '01A', nv: 'NV0161', self: 85, mgr: 84 },
    { id: 'duc',   label: 'BS Đỗ Minh Đức',        title: 'Bác sĩ',     form: '01A', nv: 'NV0177', self: 87, mgr: 86, also: 'Khoa Cấp cứu' },
    { id: 'hoa',   label: 'ĐD trưởng Bùi Thị Tố Hoa', title: 'Điều dưỡng', post: 'Điều dưỡng trưởng', form: '01B', nv: 'NV0203', self: 91, mgr: 90, scored03: true },
    { id: 'lan',   label: 'ĐD Nguyễn Thị Lan',     title: 'Điều dưỡng', form: '01B', nv: 'NV0214', self: 88, mgr: 87.5 },
    { id: 'chung', label: 'ĐD Lê Văn Chung',       title: 'Điều dưỡng', form: '01B', nv: 'NV0219', self: 82, mgr: 80 },
    { id: 'dung',  label: 'ĐD Phạm Thị Dung',      title: 'Điều dưỡng', form: '01B', nv: 'NV0226', self: 80, mgr: 81, scored03: true },
    { id: 'em',    label: 'ĐD Hoàng Văn Em',       title: 'Điều dưỡng', form: '01B', nv: 'NV0231', self: 93, mgr: 75, scored03: true,
      mgrNote: 'Đi muộn nhiều lần trong tháng; có 1 phản ánh của người nhà buồng 6 về thái độ (18/08), đã xác minh.' },
    { id: 'giang', label: 'ĐD Vũ Thị Giang',       title: 'Điều dưỡng', form: '01B', nv: 'NV0238', self: null, mgr: 78 },
    { id: 'ha',    label: 'ĐD Trịnh Thu Hà',       title: 'Điều dưỡng', form: '01B', nv: 'NV0242', self: 86, mgr: 85 },
    { id: 'khanh', label: 'ĐD Đinh Thị Khánh',     title: 'Điều dưỡng', form: '01B', nv: 'NV0247', self: 84, mgr: 82 },
    { id: 'long',  label: 'ĐD Ngô Văn Long',       title: 'Điều dưỡng', form: '01B', nv: 'NV0251', self: null, mgr: 79 },
    { id: 'my',    label: 'ĐD Lý Thị Mỹ',          title: 'Điều dưỡng', form: '01B', nv: 'NV0256', self: 79, mgr: 76 },
    { id: 'nga',   label: 'ĐD Tạ Thị Nga',         title: 'Điều dưỡng', form: '01B', nv: 'NV0263', self: 83, mgr: 81 },
    { id: 'duy',   label: 'YS Phạm Văn Duy',       title: 'Y sỹ đa khoa', form: '01C', nv: 'NV0270', self: 78, mgr: 72, scored03: true }
  ];
  STAFF.forEach(function (p, i) {
    p.seed = i * 5 + 3;
    p.scorer = p.scorer || HEAD;
    p.bonus = p.bonus || { self: 0, mgr: 0 };
    p.penalty = p.penalty || { self: 0, mgr: 0 };
    p.given = p.label.split(' ').pop();
  });

  // The unit form of Khoa Nội, scored by the head (self) and the board (official).
  var UNIT_FORM = { id: 'khoa', label: UNIT, form: '02K', self: 90, mgr: 88, seed: 11, scorer: 'PGĐ Nguyễn Anh Tuấn', byBoard: true,
    bonus: { self: 0, mgr: 0 }, penalty: { self: 0, mgr: 0 }, head: HEAD, staffCount: 17 };

  // Cross-check by Phòng TCHC (step 3) — never changes a score, only flags.
  var CROSS = {
    lan:   { leave: '07/08 · phép năm' },
    dung:  { leave: '10–12/08 · phép năm' },
    long:  { leave: '21–22/08 · ốm, có giấy' },
    duc:   { note: '2 ngày làm tại Khoa Cấp cứu (kiêm nhiệm), đã tính công' },
    em:    { late: 4, complaint: 1, issue: 'Đi muộn 4 lần (05, 12, 19, 26/08) · 1 phản ánh của người nhà ngày 18/08' },
    giang: { absent: 1, issue: 'Nghỉ không phép 14/08 — chưa có đơn bổ sung' }
  };

  // Hospital view for the council — 15 units, 186 personal forms. Counts are A, B, C, D, E.
  var UNITS = [
    { code: '02A', name: 'Phòng Tài chính kế toán',               n: 8,  dist: [1, 5, 2, 0, 0], approved: true,  unitSelf: 92, unitMgr: 91 },
    { code: '02B', name: 'Phòng Tổ chức – Hành chính',            n: 9,  dist: [1, 6, 2, 0, 0], approved: true,  unitSelf: 88, unitMgr: 88 },
    { code: '02C', name: 'Phòng Công nghệ thông tin',             n: 4,  dist: [1, 2, 1, 0, 0], approved: true,  unitSelf: 86, unitMgr: 84 },
    { code: '02D', name: 'Phòng Kế hoạch tổng hợp',               n: 7,  dist: [1, 4, 2, 0, 0], approved: true,  unitSelf: 87, unitMgr: 86 },
    { code: '02E', name: 'Bộ phận bảo vệ',                        n: 8,  dist: [0, 4, 3, 1, 0], approved: true,  unitSelf: 82, unitMgr: 78, gaps: 1 },
    { code: '02F', name: 'Bộ phận vệ sinh',                       n: 12, dist: [1, 6, 4, 1, 0], approved: true,  unitSelf: 81, unitMgr: 80 },
    { code: '02G', name: 'Bộ phận lái xe',                        n: 5,  dist: [0, 3, 2, 0, 0], approved: true,  unitSelf: 83, unitMgr: 82 },
    { code: '02H', name: 'Khoa Dược – Vật tư – TTBYT',            n: 11, dist: [2, 6, 3, 0, 0], approved: true,  unitSelf: 88, unitMgr: 87 },
    { code: '02I', name: 'Khoa Khám bệnh',                        n: 18, dist: [2, 10, 5, 1, 0], unitSelf: 86, unitMgr: 85, gaps: 2, late: 1 },
    { code: '02K', name: 'Khoa Nội – Nhi – Da liễu – HSCC',       n: 17, dist: null, unitSelf: 90, unitMgr: 88, here: true },
    { code: '02L', name: 'Phòng/Đơn nguyên Thận nhân tạo',        n: 10, dist: [1, 6, 3, 0, 0], approved: true,  unitSelf: 93, unitMgr: 92 },
    { code: '02M', name: 'Khoa Ngoại – Sản – Phẫu thuật – GMHS',  n: 26, dist: [3, 14, 7, 1, 1], unitSelf: 85, unitMgr: 83, gaps: 3, late: 2, issues: 1, excluded: 1 },
    { code: '02N', name: 'Khoa YHCT – Phục hồi chức năng',        n: 14, dist: [2, 8, 4, 0, 0], unitSelf: 82, unitMgr: 81, late: 1 },
    { code: '02O', name: 'Khoa Cận lâm sàng – Thăm dò chức năng', n: 15, dist: [2, 9, 4, 0, 0], unitSelf: 87, unitMgr: 86, gaps: 1 },
    { code: '02P', name: 'Khoa Liên chuyên khoa',                 n: 22, dist: [2, 12, 7, 1, 0], unitSelf: 72, unitMgr: 64, gaps: 1, issues: 1 }
  ];

  /* ---------- 4. Numbers ---------- */
  // Scores live as integers of half points: 0,5 steps add up with no float drift.
  function half(n) { return Math.round(n * 2); }
  function parseHalf(str) {
    var s = String(str).trim().replace(',', '.');
    if (s === '') return null;
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    var v = Number(s) * 2;
    return Math.abs(v - Math.round(v)) > 1e-9 ? NaN : Math.round(v);
  }
  function fmt(h) {
    if (h === null || h === undefined || isNaN(h)) return '—';
    var whole = Math.floor(Math.abs(h) / 2), rest = Math.abs(h) % 2;
    return (h < 0 ? '−' : '') + whole + (rest ? ',5' : '');
  }
  function fmtNum(n) { return n === null || n === undefined ? '—' : fmt(half(n)); }
  function pct(a, b) { return b ? (Math.round(a / b * 1000) / 10).toString().replace('.', ',') + '%' : '—'; }

  function gradeOf(kind, h, excluded) {
    if (h === null || isNaN(h)) return null;
    var table = GRADES[kind];
    if (kind === 'person' && excluded) return table[table.length - 1];
    for (var i = 0; i < table.length; i++) {
      if (h >= table[i].min * 2) {
        if (kind === 'unit' && excluded && table[i].code === 'XS') return table[1];
        return table[i];
      }
    }
    return table[table.length - 1];
  }
  function gradeBadge(g, big) {
    if (!g) return '<span class="grade grade--none' + (big ? ' grade--lg' : '') + '">—</span>';
    return '<span class="grade grade--' + g.code + (big ? ' grade--lg' : '') + '" title="' + esc(g.name) + '">' + esc(g.code) + '</span>';
  }

  function flatten(form) {
    var out = [];
    form.groups.forEach(function (g, gi) {
      g.items.forEach(function (c, ci) { out.push({ g: gi, i: ci, t: c.t, max: c.max, figs: c.figs || [] }); });
    });
    return out;
  }

  // Deterministic per-criterion scores that add up to a given total — stands in
  // for what each scorer typed. Never below half the criterion maximum.
  function spread(form, total, seed) {
    var crits = flatten(form);
    var vals = crits.map(function (c) { return c.max * 2; });
    var deficit = half(100 - total);
    var i = seed % crits.length, guard = 0;
    while (deficit > 0 && guard < 2000) {
      var floor = crits[i].max;
      var step = Math.min(deficit, (seed + i) % 3 === 0 ? 2 : 1);
      if (vals[i] - step >= floor) { vals[i] -= step; deficit -= step; }
      i = (i + 7) % crits.length; guard++;
    }
    return vals;
  }

  /* ---------- 5. Reference figures (doc D §5) ---------- */
  var TASK_TITLES = ['Bàn giao ca trực', 'Kiểm kê thuốc theo tủ trực', 'Đối chiếu thẻ kho', 'Rà soát phiếu chăm sóc cấp 1',
    'Kiểm tra máy thở buồng 4', 'Cập nhật bảng theo dõi nguy cơ té ngã', 'Chuẩn bị xe cấp cứu', 'Tập huấn vệ sinh tay',
    'Kiểm tra hạn dùng thuốc tủ trực', 'Giáo dục sức khỏe người bệnh đái tháo đường', 'Báo cáo giường bệnh tuần', 'Hoàn thiện hồ sơ ra viện'];

  function figuresFor(p) {
    if (p.id === 'khoa') {
      return { unitTasks: { done: 412, ontime: 389 }, target: { pct: 92 }, bgd: { done: 14, of: 16 }, unitMeet: { absent: 3, of: 22 } };
    }
    if (p.id === 'lan') {
      return { done: 24, ontime: 21, overdue: 3, returned: 1, shifts: 8, nights: 5, meetings: 22, absent: 2 };
    }
    var s = p.seed;
    var done = 14 + (s * 7) % 12;
    var overdue = p.id === 'em' ? 4 : (s % 4);
    return { done: done, ontime: done - overdue, overdue: overdue, returned: s % 2, shifts: 6 + s % 4,
      nights: 2 + s % 3, meetings: 22, absent: p.id === 'em' ? 3 : s % 3 };
  }

  var FIG = {
    done:     { src: 'Phần B', text: function (f) { return 'Hoàn thành <strong>' + f.done + '</strong> nhiệm vụ trong tháng'; } },
    ontime:   { src: 'Phần B', text: function (f) { return 'Đúng hạn <strong>' + f.ontime + '/' + f.done + '</strong> — ' + pct(f.ontime, f.done); } },
    returned: { src: 'Phần B', text: function (f) { return '<strong>' + f.returned + '</strong> nhiệm vụ bị trả lại'; } },
    overdue:  { src: 'Phần B', text: function (f) { return '<strong>' + f.overdue + '</strong> nhiệm vụ quá hạn'; } },
    shifts:   { src: 'Phần E', text: function (f) { return '<strong>' + f.shifts + '</strong> ca trực, trong đó ' + f.nights + ' ca đêm'; } },
    meetings: { src: 'Phần C', text: function (f) { return 'Vắng <strong>' + f.absent + '/' + f.meetings + '</strong> buổi giao ban'; } },
    unitTasks:{ src: 'Phần B', text: function (f) { return 'Khoa hoàn thành <strong>' + f.unitTasks.done + '</strong> nhiệm vụ, đúng hạn ' + f.unitTasks.ontime + '/' + f.unitTasks.done + ' — ' + pct(f.unitTasks.ontime, f.unitTasks.done); } },
    target:   { src: 'Phần G', text: function (f) { return 'Đơn vị đạt <strong>' + f.target.pct + '%</strong> chỉ tiêu doanh thu'; } },
    bgd:      { src: 'Phần B', text: function (f) { return 'Hoàn thành <strong>' + f.bgd.done + '/' + f.bgd.of + '</strong> nhiệm vụ do Ban Giám đốc giao'; } },
    unitMeet: { src: 'Phần C', text: function (f) { return 'Khoa vắng <strong>' + f.unitMeet.absent + '/' + f.unitMeet.of + '</strong> lượt giao ban viện'; } }
  };

  function figureItems(p, key) {
    var f = figuresFor(p);
    var code = function (n) { return 'NOI-0' + (180 + n); };
    if (p.id === 'lan' && (key === 'overdue' || key === 'returned' || key === 'done' || key === 'ontime')) {
      var late = [
        { c: 'NOI-0187', t: 'Hoàn thiện hồ sơ 12 ca ra viện', d: 'Hạn 08/08 17:00 · xong 10/08 09:20 · trễ 1 ngày 16 giờ', why: 'Ghi chú trên nhiệm vụ: chờ BS ký tóm tắt bệnh án 4 ca' },
        { c: 'NOI-0203', t: 'Kiểm kê thuốc tủ trực buồng 2', d: 'Hạn 15/08 12:00 · xong 17/08 10:05 · trễ 1 ngày 22 giờ', why: 'Ghi chú trên nhiệm vụ: chờ Khoa Dược cấp bổ sung 3 thuốc thiếu' },
        { c: 'NOI-0231', t: 'Cập nhật bảng theo dõi nguy cơ té ngã', d: 'Hạn 27/08 12:00 · xong 27/08 18:40 · trễ 6 giờ 40 phút', why: 'Ghi chú trên nhiệm vụ: tiếp nhận 2 ca cấp cứu cùng lúc' }
      ];
      var back = [{ c: 'NOI-0195', t: 'Báo cáo giường bệnh tuần 2', d: 'Trả lại 12/08 bởi ĐD trưởng Bùi Thị Tố Hoa: “Thiếu số liệu buồng 3” · nộp lại 13/08, đạt', why: '' }];
      if (key === 'overdue') return { head: 'Nhiệm vụ quá hạn trong tháng', rows: late, kind: 'task' };
      if (key === 'returned') return { head: 'Nhiệm vụ bị trả lại', rows: back, kind: 'task' };
      var all = late.concat(back);
      for (var i = all.length; i < f.done; i++) {
        all.push({ c: code(i + 20), t: TASK_TITLES[i % TASK_TITLES.length], d: 'Hoàn thành đúng hạn · ' + pad(1 + (i * 3) % 31) + '/08', why: '' });
      }
      return { head: 'Nhiệm vụ hoàn thành trong tháng', rows: all, kind: 'task' };
    }
    if (key === 'shifts') {
      var days = p.id === 'lan' ? [['02/08', 'Đ'], ['05/08', 'S'], ['09/08', 'Đ'], ['13/08', 'Đ'], ['18/08', 'C'], ['21/08', 'Đ'], ['26/08', 'S'], ['29/08', 'Đ']] : null;
      if (!days) {
        days = [];
        for (var k = 0; k < f.shifts; k++) days.push([pad(2 + k * 4) + '/08', k < f.nights ? 'Đ' : (k % 2 ? 'S' : 'C')]);
      }
      return { head: 'Ca trực tháng 08/2026', rows: days.map(function (d) { return { shift: d[1], d: d[0] }; }), kind: 'shift' };
    }
    if (key === 'meetings') {
      var miss = p.id === 'lan'
        ? [{ t: '07/08 · giao ban khoa', d: 'Nghỉ phép năm đã duyệt' }, { t: '22/08 · giao ban khoa', d: 'Nghỉ bù sau ca trực đêm 21/08' }]
        : [];
      for (var m = miss.length; m < f.absent; m++) miss.push({ t: pad(4 + m * 9) + '/08 · giao ban khoa', d: 'Không có lý do ghi nhận' });
      return { head: 'Buổi giao ban vắng mặt', rows: miss, kind: 'plain', foot: (f.meetings - f.absent) + ' buổi có mặt' };
    }
    if (key === 'unitTasks' || key === 'bgd') {
      return { head: key === 'bgd' ? 'Nhiệm vụ do Ban Giám đốc giao' : 'Nhiệm vụ của khoa', kind: 'plain', rows: [
        { t: 'BGĐ-0412 · Rà soát quy trình tiếp nhận người bệnh nặng', d: 'Hoàn thành 12/08' },
        { t: 'BGĐ-0420 · Kiểm tra cơ số thuốc cấp cứu toàn khoa', d: 'Hoàn thành 18/08' },
        { t: 'BGĐ-0431 · Báo cáo nhiễm khuẩn bệnh viện quý II', d: 'Quá hạn — chờ số liệu Khoa Cận lâm sàng' },
        { t: 'BGĐ-0437 · Triển khai bệnh án điện tử buồng 5–6', d: 'Đang làm — dời hạn theo kết luận giao ban 25/08' }
      ], foot: 'Danh sách đầy đủ ở Báo cáo nhiệm vụ (MH-B08)' };
    }
    if (key === 'target') {
      return { head: 'Chỉ tiêu tháng 08/2026', kind: 'plain', rows: [
        { t: 'Doanh thu dịch vụ', d: '92% kế hoạch' }, { t: 'Công suất giường', d: '96%' }, { t: 'Số lượt điều trị nội trú', d: '104% kế hoạch' }
      ], foot: 'Phần G chưa đặc tả — số liệu minh hoạ' };
    }
    if (key === 'unitMeet') {
      return { head: 'Lượt vắng giao ban viện', kind: 'plain', rows: [
        { t: '06/08', d: 'Trưởng khoa đi hội chẩn liên viện' }, { t: '13/08', d: 'Phó khoa trực cấp cứu' }, { t: '27/08', d: 'Không cử người dự thay' }
      ] };
    }
    // Generic list for the other people
    var rows = [];
    var count = key === 'overdue' ? f.overdue : key === 'returned' ? f.returned : f.done;
    for (var j = 0; j < count; j++) {
      rows.push({ c: code(j + p.seed), t: TASK_TITLES[(j + p.seed) % TASK_TITLES.length],
        d: key === 'overdue' ? 'Trễ ' + (j + 1) * 5 + ' giờ' : key === 'returned' ? 'Trả lại, nộp lại đạt' : (j < f.ontime ? 'Đúng hạn' : 'Quá hạn'), why: '' });
    }
    return { head: key === 'overdue' ? 'Nhiệm vụ quá hạn' : key === 'returned' ? 'Nhiệm vụ bị trả lại' : 'Nhiệm vụ hoàn thành trong tháng', rows: rows, kind: 'task' };
  }

  /* ---------- 6. Helpers ---------- */
  function esc(value) {
    return String(value).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function toast(msg, kind) { if (window.prototype) window.prototype.toast(msg, kind); }
  function params() {
    var out = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var parts = kv.split('=');
      out[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
    });
    return out;
  }
  function personById(id) {
    if (id === 'khoa') return UNIT_FORM;
    for (var i = 0; i < STAFF.length; i++) if (STAFF[i].id === id) return STAFF[i];
    return null;
  }
  function byGivenName(a, b) {
    return a.given.localeCompare(b.given, 'vi') || a.label.localeCompare(b.label, 'vi');
  }
  function formUrl(id, mode) { return 'evaluation-form.html?nguoi=' + id + '&vai=' + mode; }

  /* ---------- 7. Scoring screen — MH-D02 ---------- */
  var MODES = {
    self:    { label: 'Tự chấm',          step: 'Bước 1 · tự chấm',            back: ['my-evaluations.html', 'Phiếu thi đua của tôi'] },
    manager: { label: 'Quản lý chấm',     step: 'Bước 2 · quản lý trực tiếp chấm', back: ['evaluation-unit.html', 'Chấm phiếu ' + UNIT] },
    council: { label: 'Hội đồng xét duyệt', step: 'Bước 5 · Hội đồng xét duyệt', back: ['evaluation-council.html', 'Xét duyệt thi đua toàn viện'] },
    locked:  { label: 'Đã chốt',          step: 'Kỳ đã chốt',                  back: ['my-evaluations.html', 'Phiếu thi đua của tôi'] }
  };

  function roleFor(person, mode) {
    if (mode === 'council') return 'board';
    if (mode === 'manager') return person.byBoard ? 'board' : 'manager';
    if (mode === 'self') return (person.id === 'khoa' || person.id === 'xuan') ? 'manager' : 'cbnv';
    return 'cbnv';
  }

  function FormScreen(host) {
    var q = params();
    this.host = host;
    this.person = personById(q.nguoi || 'lan') || personById('lan');
    this.mode = MODES[q.vai] ? q.vai : 'manager';
    this.form = FORMS[this.person.form];
    this.kind = this.form.kind;
    this.crits = flatten(this.form);
    this.figs = figuresFor(this.person);
    this.adjusting = false;

    var p = this.person, n = this.crits.length;
    var lateSelf = p.self === null;
    // Self column: what the person typed. In "self" mode Lan's draft still has three gaps.
    this.self = lateSelf ? blank(n) : spread(this.form, p.self, p.seed);
    if (this.mode === 'self' && p.id === 'lan') { this.self[13] = null; this.self[17] = null; this.self[19] = null; }
    // Official column: never pre-filled while the manager is scoring (doc D §5).
    this.mgr = (this.mode === 'council' || this.mode === 'locked') ? spread(this.form, p.mgr, p.seed + 7) : blank(n);
    this.bonus = { self: half(p.bonus.self), mgr: this.mode === 'manager' ? null : half(p.bonus.mgr) };
    this.penalty = { self: half(p.penalty.self), mgr: this.mode === 'manager' ? null : half(p.penalty.mgr) };
    this.evidence = { self: p.bonus.self ? p.bonus.note : '', mgr: this.mode === 'manager' ? '' : (p.bonus.note || '') };
    this.excluded = false;
    this.lateSelf = lateSelf;

    document.body.dataset.role = roleFor(p, this.mode);
    document.body.dataset.screen = 'evaluation-form';
    document.title = p.label + ' · Mẫu ' + this.form.code + ' · Bệnh viện Anh Quất';
    this.render();
    this.bind();
    this.update();
  }
  function blank(n) { var a = []; for (var i = 0; i < n; i++) a.push(null); return a; }

  FormScreen.prototype.editable = function (col) {
    if (this.mode === 'self') return col === 'self' && !this.lateSelf;
    if (this.mode === 'manager') return col === 'mgr';
    if (this.mode === 'council') return col === 'mgr' && this.adjusting;
    return false;
  };

  FormScreen.prototype.render = function () {
    var self = this, p = this.person, f = this.form, mode = this.mode, M = MODES[mode];
    var oneCol = mode === 'self';
    var isUnit = this.kind === 'unit';
    var html = '';

    // Head
    html += '<div class="page__head"><div class="page__head-text">' +
      '<a class="text-meta" href="' + M.back[0] + '">← ' + esc(M.back[1]) + '</a>' +
      '<h1 class="page-title" style="margin-top:4px">' + esc(p.label) + '</h1>' +
      '<div class="badge-row" style="margin-top:8px">' + this.statusBadges() + '</div>' +
      '</div></div>';

    // Prototype switcher — not part of the product
    html += '<div class="proto-note"><span aria-hidden="true">🧪</span><div style="flex:1;min-width:0">' +
      '<div style="margin-bottom:6px"><strong>Bản mẫu</strong> — một màn chấm duy nhất, dựng theo cấu hình mẫu phiếu. Xem ở bước:</div>' +
      '<div class="row" style="margin-bottom:8px">' + Object.keys(MODES).map(function (k) {
        return '<a class="btn btn--small ' + (k === mode ? 'is-active' : 'btn--secondary') + '" href="' + formUrl(p.id, k) + '">' + MODES[k].label + '</a>';
      }).join('') + '</div>' +
      '<div class="row">' + [['lan', 'ĐD Lan · 01B'], ['em', 'ĐD Em · lệch 18 điểm'], ['giang', 'ĐD Giang · không tự chấm'], ['duy', 'YS Duy · 01C'], ['xuan', 'TK Xuân · BGĐ chấm'], ['khoa', 'Tập thể Khoa Nội · 02K']].map(function (x) {
        return '<a class="btn btn--small ' + (x[0] === p.id ? 'is-active' : 'btn--quiet') + '" href="' + formUrl(x[0], mode) + '">' + x[1] + '</a>';
      }).join('') + '</div></div></div>';

    html += this.banners();

    html += '<div class="eval-layout' + (oneCol ? ' eval--one-col' : '') + '" data-form-root>';
    html += '<div class="eval-main">';

    // General information, laid out like the paper form
    html += '<section class="card sheet-head">' +
      '<span class="sheet-head__code">Mẫu ' + f.code + (f.version > 1 ? ' · phiên bản ' + f.version : '') + '</span>' +
      '<h2 class="section-title">' + esc(f.name) + '</h2>' +
      '<p class="sheet-head__basis">' + esc(f.basis) + '</p>' +
      '<dl class="dl grid grid--2" style="gap:0 24px;margin-top:16px">' + this.infoRows() + '</dl></section>';

    html += '<div class="figure-card" style="margin-bottom:16px">📷 ' + this.snapshotText() + '</div>';

    // Groups I–V
    f.groups.forEach(function (g, gi) {
      html += '<section class="crit-group" data-group="' + gi + '">' +
        '<header class="crit-group__head"><h3 class="crit-group__title">' + esc(g.title) + '</h3>' +
        '<span class="crit-group__max">' + g.max + ' điểm</span></header>' +
        '<div class="crit crit--head" aria-hidden="true"><span class="crit__no">STT</span><span class="crit__body crit__text">Tiêu chí đánh giá</span>' +
        '<span class="crit__max">Tối đa</span>' +
        '<span class="crit__score" data-col="self">Tự chấm' + (oneCol ? '' : '<br><span class="text-faint" style="font-weight:400">tham khảo</span>') + '</span>' +
        '<span class="crit__score col-official" data-col="mgr">QL/HĐ chấm<br><span style="font-weight:400">★ chính thức</span></span></div>';
      self.crits.forEach(function (c, idx) {
        if (c.g !== gi) return;
        html += '<div class="crit" data-crit="' + idx + '">' +
          '<span class="crit__no">' + (c.i + 1) + '</span>' +
          '<div class="crit__body"><div class="crit__text">' + esc(c.t) + '</div>' + self.figureCard(c) + '</div>' +
          '<div class="crit__max"><span class="crit__lbl">Tối đa</span>' + c.max + '</div>' +
          self.scoreCell('self', idx, c.max) + self.scoreCell('mgr', idx, c.max) +
          '<div class="crit__err" data-err hidden></div>' +
          '</div>';
      });
      html += '<div class="crit crit--sum"><span class="crit__no"></span><div class="crit__body crit__text">Tổng điểm nhóm</div>' +
        '<div class="crit__max"><span class="crit__lbl">Tối đa</span>' + g.max + '</div>' +
        '<div class="crit__score" data-col="self"><span class="crit__lbl">Tự chấm</span><span class="score-ro" data-sum="self-' + gi + '">—</span></div>' +
        '<div class="crit__score col-official" data-col="mgr"><span class="crit__lbl">QL/HĐ</span><span class="score-ro" data-sum="mgr-' + gi + '">—</span></div></div>';
      html += '</section>';
    });

    if (isUnit) {
      html += '<div class="card" style="margin-top:16px"><div class="text-label" style="margin-bottom:8px">Trọng tâm theo đơn vị</div>' +
        (f.focus ? '<ul class="bullets">' + f.focus.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'
                 : '<p class="text-meta" style="margin:0">Tài liệu chưa có phần trọng tâm của Mẫu 02K — bệnh viện bổ sung ở màn Cấu hình mẫu phiếu, không cần sửa phần mềm.</p>') +
        '</div>';
    }

    // Section VI
    html += '<section class="crit-group" style="margin-top:16px">' +
      '<header class="crit-group__head"><h3 class="crit-group__title">VI. Điểm thưởng – điểm trừ – tổng hợp xếp loại</h3></header>' +
      this.tallyRow('total', 'Tổng điểm 05 nhóm tiêu chí', 'Phiếu chấm chi tiết') +
      this.tallyRow('bonus', isUnit ? 'Điểm thưởng / điểm cộng nổi bật' : 'Điểm thưởng', 'Vượt chỉ tiêu / khen ngợi / sáng kiến có xác minh') +
      this.tallyRow('penalty', isUnit ? 'Điểm trừ / vi phạm cần lưu ý' : 'Điểm trừ', 'Biên bản / kiểm tra / đối chiếu minh chứng') +
      this.tallyRow('final', 'Tổng điểm cuối tháng', 'Tổng điểm + thưởng − trừ. Có thể vượt 100, không âm.') +
      this.tallyRow('grade', 'Xếp loại đề xuất', 'Theo bảng quy đổi của Bệnh viện') +
      this.exclusionRow() +
      '</section>';

    if (isUnit) {
      html += '<div class="card" style="margin-top:16px"><div class="field" style="margin:0">' +
        '<label class="field__label" for="fix-next">Nhiệm vụ khắc phục tháng sau</label>' +
        '<textarea class="textarea" id="fix-next"' + (mode === 'locked' ? ' disabled' : '') + '>' + (mode === 'self' ? '' : 'Hoàn thành báo cáo nhiễm khuẩn quý II trước 10/09; cử người dự thay khi trưởng khoa vắng giao ban viện.') + '</textarea>' +
        '<div class="field__hint">Kết luận giao ban / Hội đồng</div></div></div>';
    }

    // Section VII
    html += '<section style="margin-top:24px"><h3 class="section-title" style="margin-bottom:12px">VII. Nhận xét và chữ ký</h3><div class="sig-grid">' +
      this.signature(isUnit ? 'Trưởng khoa/phòng/bộ phận' : 'Người tự chấm', 'self') +
      this.signature(isUnit ? 'Phòng TCHC/KHTH đối chiếu' : 'Quản lý trực tiếp / Trưởng khoa phòng', 'mgr') +
      this.signature('Lãnh đạo / Hội đồng thi đua', 'council') +
      '</div></section>';

    // Sticky bar for phone and tablet
    html += '<div class="eval-bar"><div class="eval-bar__total"><span class="text-meta" data-bar-label></span><br>' +
      '<strong data-bar-total>—</strong> <span data-bar-grade></span></div>' + this.primaryButton(true) + '</div>';

    html += '</div>';  // .eval-main

    // Summary aside
    html += '<aside class="eval-aside">' + this.summary() + '</aside>';
    html += '</div>';

    this.host.innerHTML = html;
  };

  FormScreen.prototype.statusBadges = function () {
    var p = this.person, m = this.mode;
    var b = '<span class="chip">Mẫu ' + this.form.code + '</span><span class="chip">' + PERIOD.label + '</span>';
    if (m === 'self') b += this.lateSelf ? '<span class="badge badge--late">Quá hạn tự chấm 02/09</span>' : '<span class="badge badge--not-accepted">Chưa gửi · bản nháp</span>';
    if (m === 'manager') b += this.lateSelf ? '<span class="badge badge--not-accepted">Chưa chấm</span><span class="badge badge--late">Không tự chấm đúng hạn</span>' : '<span class="badge badge--accepted">Đã tự chấm</span>';
    if (m === 'council') b += '<span class="badge badge--checked">Đã đối chiếu</span>';
    if (m === 'locked') b += '<span class="badge badge--done">✓ Đã duyệt · đã chốt</span>';
    return b;
  };

  FormScreen.prototype.banners = function () {
    var p = this.person, m = this.mode, out = '';
    if (m === 'self' && !this.lateSelf) {
      out += '<div class="section-box section-box--info" style="margin-bottom:16px">Bạn tự chấm trước <strong>23:59 ngày 02/09</strong>. ' +
        'Điểm chính thức là cột của quản lý trực tiếp / Hội đồng — điểm tự chấm dùng để đối chiếu, không vào công thức.</div>';
    }
    if (m === 'self' && this.lateSelf) {
      out += '<div class="section-box section-box--warn" style="margin-bottom:16px">Đã quá hạn tự chấm (02/09). Phiếu không tự chuyển bước — quản lý trực tiếp vẫn chấm, cột tự chấm để trống kèm ghi chú “không tự chấm đúng hạn”.</div>';
    }
    if (m === 'manager') {
      out += '<div class="section-box section-box--info" style="margin-bottom:16px">Bạn chấm cột <strong>QL/HĐ</strong> — đây là điểm chính thức. ' +
        'Số liệu xám dưới mỗi tiêu chí là căn cứ để kiểm chứng, <strong>hệ thống không chấm thay và không gợi ý điểm</strong>.' +
        (p.byBoard ? ' Phiếu của ' + (p.id === 'khoa' ? 'tập thể khoa' : 'trưởng khoa') + ' do lãnh đạo bệnh viện chấm — không ai tự duyệt phiếu của mình.' : '') + '</div>';
      if (this.lateSelf) out += '<div class="section-box section-box--warn" style="margin-bottom:16px">⏰ <strong>Không tự chấm đúng hạn</strong> — cột tự chấm để trống. Bạn vẫn chấm bình thường.</div>';
    }
    if (m === 'council') {
      var cross = CROSS[p.id];
      if (cross && cross.issue) out += '<div class="section-box section-box--warn" style="margin-bottom:16px"><div class="section-box__title">Đối chiếu của Phòng TCHC (04/09)</div>' + esc(cross.issue) + '</div>';
      else if (p.id !== 'khoa') out += '<div class="section-box section-box--ok" style="margin-bottom:16px">Phòng TCHC đã đối chiếu chấm công, nghỉ phép, kỷ luật (04/09): khớp' + (cross && cross.note ? ' · ' + esc(cross.note) : '') + '.</div>';
      if (this.lateSelf) out += '<div class="section-box section-box--warn" style="margin-bottom:16px">⏰ Không tự chấm đúng hạn — cột tự chấm trống.</div>';
    }
    if (m === 'locked') {
      out += '<div class="strip strip--approved"><span class="strip__text">🔒 Kỳ ' + PERIOD.short + ' đã chốt ngày 06/09/2026. Khoá toàn bộ — chỉ xem và xuất biểu mẫu.</span>' +
        '<button class="btn btn--small btn--secondary" type="button" onclick="window.print()">In phiếu</button>' +
        '<button class="btn btn--small btn--secondary" type="button" data-action="toast" data-toast="Đã xuất Mau01B_NguyenThiLan_08-2026.pdf" data-toast-kind="info">Xuất PDF</button></div>';
    }
    if (this.form.borrowed) out += '<div class="proto-note">📄 Câu chữ Mẫu ' + this.form.code + ' chưa có trong tài liệu nhận được — bản mẫu tạm hiện tiêu chí Mẫu ' + this.form.borrowed + '. Khi có, chỉ cần nhập ở màn Cấu hình mẫu phiếu.</div>';
    return out;
  };

  FormScreen.prototype.infoRows = function () {
    var p = this.person, m = this.mode;
    var selfDate = this.lateSelf ? '<span class="text-muted">Không tự chấm đúng hạn</span>' : (m === 'self' ? '<span class="text-muted">Chưa gửi</span>' : '01/09/2026');
    var reviewDate = (m === 'council') ? '<span class="text-muted">Đang xét duyệt</span>' : (m === 'locked' ? '05/09/2026' : '<span class="text-muted">—</span>');
    var row = function (k, v) { return '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>'; };
    if (this.kind === 'unit') {
      return row('Tên khoa/phòng/bộ phận', esc(p.label)) + row('Tháng/Năm', PERIOD.short) +
        row('Người phụ trách', esc(p.head)) + row('Quý', PERIOD.quarter) +
        row('Tổng số nhân sự', p.staffCount + ' người') + row('Ngày tự chấm', m === 'self' ? '<span class="text-muted">Chưa gửi</span>' : '02/09/2026') +
        row('Chỉ tiêu trọng tâm tháng', 'Giảm tỷ lệ hồ sơ bệnh án nộp muộn dưới 5%') + row('Ngày xét duyệt', reviewDate);
    }
    return row('Họ và tên', esc(p.label.replace(/^(BS|ĐD trưởng|ĐD|YS) /, ''))) + row('Tháng/Năm', PERIOD.short) +
      row('Chức danh', esc(p.title) + (p.post ? ' · ' + esc(p.post) : '')) +
      row('Khoa/Phòng', esc(UNIT) + (p.also ? '<div class="text-meta">Kiêm ' + esc(p.also) + ' · phiếu chấm tại đơn vị chính</div>' : '')) +
      row('Người quản lý trực tiếp', esc(p.scorer)) + row('Mã NV', p.nv) +
      row('Ngày tự chấm', selfDate) + row('Ngày xét duyệt', reviewDate);
  };

  FormScreen.prototype.snapshotText = function () {
    var at = this.mode === 'self' ? '01/09/2026 21:10, lúc bạn mở phiếu tự chấm' : '03/09/2026 08:12, lúc quản lý bắt đầu chấm';
    return 'Số liệu tháng ' + PERIOD.short + ' được <strong>chụp lại lúc ' + at + '</strong>. Mở lại phiếu sau này vẫn thấy đúng các con số này — phiếu thi đua là hồ sơ lưu trữ.';
  };

  FormScreen.prototype.figureCard = function (c) {
    if (!c.figs.length) return '';
    var f = this.figs, pid = this.person.id;
    return '<div class="fig" aria-label="Số liệu tham chiếu">' + c.figs.map(function (k) {
      var def = FIG[k];
      return '<div class="fig__row"><span class="fig__text">' + def.text(f) + '</span>' +
        '<span class="fig__src">' + def.src + '</span>' +
        '<button class="fig__view" type="button" data-fig="' + k + '" data-person="' + pid + '">Xem</button></div>';
    }).join('') + '</div>';
  };

  FormScreen.prototype.scoreCell = function (col, idx, max) {
    var val = this[col][idx];
    var lbl = col === 'self' ? 'Tự chấm' : 'QL/HĐ ★';
    var cls = 'crit__score' + (col === 'mgr' ? ' col-official' : '');
    if (this.editable(col)) {
      return '<div class="' + cls + '" data-col="' + col + '"><label class="crit__lbl" for="s-' + col + '-' + idx + '">' + lbl + '</label>' +
        '<input class="score-input' + (col === 'mgr' ? ' score-input--official' : '') + '" id="s-' + col + '-' + idx + '" data-score="' + col + '" data-idx="' + idx + '" data-max="' + max + '"' +
        ' inputmode="decimal" autocomplete="off" placeholder="0–' + max + '" value="' + (val === null ? '' : fmt(val)) + '"' +
        ' aria-label="' + lbl + ', tối đa ' + max + ' điểm"></div>';
    }
    return '<div class="' + cls + '" data-col="' + col + '"><span class="crit__lbl">' + lbl + '</span>' +
      '<span class="score-ro' + (val === null ? ' is-empty' : '') + '" data-ro="' + col + '-' + idx + '">' + fmt(val) + '</span></div>';
  };

  FormScreen.prototype.tallyRow = function (key, label, hint) {
    var self = this;
    function cell(col) {
      var cls = 'crit__score' + (col === 'mgr' ? ' col-official' : '');
      var lbl = col === 'self' ? 'Tự chấm' : 'QL/HĐ ★';
      if ((key === 'bonus' || key === 'penalty') && self.editable(col)) {
        var v = self[key][col];
        return '<div class="' + cls + '" data-col="' + col + '"><label class="crit__lbl" for="t-' + key + '-' + col + '">' + lbl + '</label>' +
          '<input class="score-input" id="t-' + key + '-' + col + '" data-tally="' + key + '" data-col="' + col + '" inputmode="decimal" autocomplete="off" placeholder="0" value="' + (v ? fmt(v) : '') + '"></div>';
      }
      return '<div class="' + cls + '" data-col="' + col + '"><span class="crit__lbl">' + lbl + '</span><span class="score-ro" data-t="' + key + '-' + col + '">—</span></div>';
    }
    var body = '<div class="crit__text"><strong>' + label + '</strong><div class="text-meta">' + hint + '</div></div>';
    if (key === 'bonus') {
      var editCol = this.editable('mgr') ? 'mgr' : (this.editable('self') ? 'self' : null);
      if (editCol) {
        body += '<div class="field" style="margin:8px 0 0"><label class="sr-only" for="ev-' + editCol + '">Minh chứng điểm thưởng</label>' +
          '<input class="input" id="ev-' + editCol + '" data-evidence="' + editCol + '" placeholder="Minh chứng: nội dung, người/đơn vị xác nhận" value="' + esc(this.evidence[editCol] || '') + '">' +
          '<div class="field__hint">Bắt buộc khi có điểm thưởng · <button class="fig__view" type="button" data-action="toast" data-toast="Bản mẫu: chưa tải tệp lên được" data-toast-kind="info">📎 Đính kèm</button></div></div>';
      } else if (this.evidence.mgr || this.evidence.self) {
        body += '<div class="fig">📎 ' + esc(this.evidence.mgr || this.evidence.self) + '</div>';
      }
    }
    if (key === 'penalty' && (this.editable('mgr') || this.editable('self'))) {
      var col2 = this.editable('mgr') ? 'mgr' : 'self';
      body += '<div class="field" style="margin:8px 0 0"><label class="sr-only" for="pv-' + col2 + '">Minh chứng điểm trừ</label>' +
        '<input class="input" id="pv-' + col2 + '" data-pen-evidence="' + col2 + '" placeholder="Biên bản / kiểm tra / đối chiếu"><div class="field__hint">Bắt buộc khi có điểm trừ</div></div>';
    }
    return '<div class="crit' + (key === 'final' ? ' crit--sum' : '') + '" data-tally-row="' + key + '"><span class="crit__no"></span>' +
      '<div class="crit__body">' + body + '</div><div class="crit__max"></div>' + cell('self') + cell('mgr') + '</div>';
  };

  FormScreen.prototype.exclusionRow = function () {
    var isUnit = this.kind === 'unit';
    var label = isUnit ? 'Trường hợp không xét xuất sắc / không xét thưởng' : 'Trường hợp không xét thưởng / loại trừ';
    var editable = this.editable('mgr');
    var body = '<div class="crit__text"><strong>' + label + '</strong><div class="text-meta">' +
      (isUnit ? 'Chọn “Có” thì không xếp loại Xuất sắc.' : 'Chọn “Có” thì xếp loại E — không xét thi đua, dù điểm cao.') + ' Nêu rõ lý do và minh chứng.</div></div>';
    if (this.mode === 'self') return '';
    if (editable) {
      body += '<div class="seg" style="margin-top:8px" role="radiogroup" aria-label="' + label + '">' +
        '<label><input type="radio" name="excl" value="0" checked><span>Không</span></label>' +
        '<label class="seg--warn"><input type="radio" name="excl" value="1"><span>Có</span></label></div>' +
        '<div class="field" data-excl-reason hidden style="margin:8px 0 0"><label class="sr-only" for="excl-reason">Lý do</label>' +
        '<textarea class="textarea" id="excl-reason" placeholder="Lý do và minh chứng"></textarea><div class="field__hint">Bắt buộc khi chọn “Có”</div></div>';
    } else {
      body += '<div style="margin-top:6px">Không</div>';
    }
    return '<div class="crit"><span class="crit__no"></span><div class="crit__body" style="grid-column:2 / -1">' + body + '</div></div>';
  };

  FormScreen.prototype.signature = function (role, who) {
    var m = this.mode, p = this.person;
    var state = { self: m !== 'self' && !this.lateSelf, mgr: m === 'council' || m === 'locked', council: m === 'locked' };
    var editing = (who === 'self' && m === 'self' && !this.lateSelf) || (who === 'mgr' && m === 'manager') || (who === 'council' && m === 'council');
    var names = { self: this.kind === 'unit' ? p.head : p.label, mgr: this.kind === 'unit' ? 'TP TCHC Nguyễn Thị Hạnh' : p.scorer, council: 'PGĐ Nguyễn Anh Tuấn' };
    var text = {
      self: this.lateSelf ? '' : 'Tháng này tôi hoàn thành các nhiệm vụ được giao; còn 3 việc trễ hạn do chờ phối hợp.',
      mgr: p.mgrNote || 'Hoàn thành tốt công việc chuyên môn. Cần chú ý hoàn thiện hồ sơ đúng hạn.',
      council: 'Thống nhất xếp loại theo đề xuất.'
    };
    var inner = '<div class="sig__role">' + role + '</div>';
    if (editing) {
      inner += '<label class="sr-only" for="note-' + who + '">Nhận xét</label><textarea class="textarea" id="note-' + who + '" style="min-height:72px" placeholder="Nhận xét (không bắt buộc)"></textarea>' +
        '<div class="sig__mark is-pending">Xác nhận điện tử khi bấm gửi</div>';
    } else if (who === 'mgr' && this.kind === 'unit' && (m === 'council' || m === 'locked')) {
      inner += '<div>Đối chiếu chấm công, kỷ luật của khoa: khớp.</div><div class="sig__mark">✓ ' + esc(names.mgr) + ' · 04/09 15:20</div>';
    } else if (state[who]) {
      inner += '<div>' + esc(text[who]) + '</div><div class="sig__mark">✓ ' + esc(names[who]) + ' · ' + { self: '01/09 21:14', mgr: '03/09 16:40', council: '05/09 10:15' }[who] + '</div>';
    } else if (who === 'self' && this.lateSelf) {
      inner += '<div class="text-muted">Không tự chấm đúng hạn</div>';
    } else {
      inner += '<div class="sig__mark is-pending">Chưa đến bước này</div>';
    }
    return '<div class="sig">' + inner + '</div>';
  };

  FormScreen.prototype.primaryButton = function (compact) {
    var m = this.mode;
    var label = { self: 'Gửi phiếu tự chấm', manager: 'Xác nhận điểm', council: 'Duyệt phiếu', locked: '' }[m];
    if (!label || (m === 'self' && this.lateSelf)) return '';
    return '<button class="btn btn--primary' + (compact ? '' : ' btn--block') + '" type="button" data-submit>' + label + '</button>';
  };

  FormScreen.prototype.summary = function () {
    var m = this.mode, isUnit = this.kind === 'unit';
    var official = m === 'self' ? 'Điểm tự chấm của bạn' : 'Điểm chính thức · cột QL/HĐ';
    var html = '<div class="card">' +
      '<div class="text-label">' + official + '</div>' +
      '<div class="score-sum__big"><span class="score-sum__value" data-sum-final>—</span><span class="score-sum__of">/ 100</span></div>' +
      '<div class="score-sum__grade"><span data-sum-grade></span><span data-sum-grade-name class="text-meta"></span></div>' +
      '<div class="text-meta" data-sum-progress-text></div><div class="score-sum__progress"><span data-sum-progress style="width:0"></span></div>' +
      '<table class="compare" style="margin-top:12px"><tbody>' +
      '<tr><td>Tổng 5 nhóm</td><td data-sum-t>—</td></tr>' +
      '<tr><td>Điểm thưởng</td><td data-sum-b>—</td></tr>' +
      '<tr><td>Điểm trừ</td><td data-sum-p>—</td></tr>' +
      '</tbody></table>';
    if (m !== 'self') {
      html += '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">' +
        '<div class="text-meta">Tự chấm (tham khảo, không vào công thức)</div>' +
        '<div style="margin-top:4px"><strong data-sum-self>—</strong> <span data-sum-self-grade></span></div>' +
        '<div class="text-meta" data-sum-gap style="margin-top:4px"></div></div>' +
        '<div class="section-box section-box--warn" data-gap-warn hidden style="margin-top:12px"></div>';
    }
    if (m === 'council') {
      var table = GRADES[isUnit ? 'unit' : 'person'];
      html += '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">' +
        '<div class="field__label">Xếp loại Hội đồng duyệt</div>' +
        '<div class="seg" role="radiogroup" aria-label="Xếp loại Hội đồng duyệt" data-decision>' + table.map(function (g) {
          return '<label title="' + esc(g.name) + '"><input type="radio" name="decision" value="' + g.code + '"><span>' + g.code + '</span></label>';
        }).join('') + '</div>' +
        '<div class="text-meta" data-decision-hint style="margin-top:8px"></div>' +
        '<div class="field" data-decision-reason hidden style="margin:8px 0 0"><label class="sr-only" for="decision-reason">Lý do điều chỉnh</label>' +
        '<textarea class="textarea" id="decision-reason" placeholder="Lý do Hội đồng xếp loại khác đề xuất"></textarea><div class="field__hint">Bắt buộc · ghi vào biên bản xét duyệt</div></div>' +
        '<button class="btn btn--small btn--quiet" type="button" data-adjust style="margin-top:8px;padding-left:0">✎ Hội đồng chấm lại cột chính thức</button>' +
        '</div>';
    }
    var btn = this.primaryButton(false);
    if (btn) {
      html += '<div class="stack" style="margin-top:16px">' + btn +
        (m === 'council'
          ? '<button class="btn btn--quiet btn--block" type="button" data-action="open-overlay" data-target="return-dialog">Trả lại quản lý chấm lại</button>'
          : '<button class="btn btn--secondary btn--block" type="button" data-action="toast" data-toast="Đã lưu nháp · chưa gửi">Lưu nháp</button>') +
        '</div>';
    }
    if (m === 'manager') html += '<p class="text-meta" style="margin:12px 0 0">Hạn chấm: 03/09. Sau khi xác nhận vẫn sửa được đến hạn; phiếu chuyển Phòng TCHC đối chiếu.</p>';
    html += '</div>';

    html += '<details class="card" style="margin-top:12px"><summary style="cursor:pointer;font-weight:500;min-height:28px">Bảng quy đổi xếp loại</summary>' +
      '<table class="compare" style="margin-top:8px"><tbody>' + GRADES[isUnit ? 'unit' : 'person'].map(function (g, i, arr) {
        var range = i === 0 ? '≥ ' + g.min : (g.min === 0 ? '< ' + arr[i - 1].min : g.min + ' – ' + (arr[i - 1].min - 1));
        return '<tr><td>' + gradeBadge(g) + ' ' + esc(g.name) + '</td><td>' + range + '</td></tr>';
      }).join('') + '</tbody></table>' +
      (isUnit ? '<p class="text-meta" style="margin:8px 0 0">Ngưỡng điểm tập thể chưa có trong tài liệu — tạm dùng như cá nhân, chờ bệnh viện xác nhận.</p>'
              : '<p class="text-meta" style="margin:8px 0 0">A cần ≥ 90 <strong>và</strong> không thuộc diện loại trừ.</p>') + '</details>';
    return html;
  };

  /* ---- live calculation ---- */
  FormScreen.prototype.columnTotals = function (col) {
    var vals = this[col], form = this.form, crits = this.crits;
    var groups = form.groups.map(function () { return 0; });
    var filled = 0;
    vals.forEach(function (v, i) { if (v !== null && !isNaN(v)) { groups[crits[i].g] += v; filled++; } });
    var total = groups.reduce(function (a, b) { return a + b; }, 0);
    var complete = filled === crits.length;
    var b = this.bonus[col] || 0, pnl = this.penalty[col] || 0;
    var final = Math.max(0, total + b - pnl);
    var excluded = col === 'mgr' && this.excluded;
    return { groups: groups, total: total, filled: filled, complete: complete, bonus: b, penalty: pnl, final: final,
      grade: complete ? gradeOf(this.kind, final, excluded) : null, empty: filled === 0 };
  };

  FormScreen.prototype.update = function () {
    var root = this.host, self = this;
    var mode = this.mode;
    var t = { self: this.columnTotals('self'), mgr: this.columnTotals('mgr') };

    ['self', 'mgr'].forEach(function (col) {
      t[col].groups.forEach(function (sum, gi) {
        var el = root.querySelector('[data-sum="' + col + '-' + gi + '"]');
        if (el) el.textContent = t[col].empty ? '—' : fmt(sum);
      });
      var set = function (key, val) { var el = root.querySelector('[data-t="' + key + '-' + col + '"]'); if (el) el.innerHTML = val; };
      set('total', t[col].empty ? '—' : fmt(t[col].total) + '<span class="text-faint">/100</span>');
      set('bonus', t[col].bonus ? '+' + fmt(t[col].bonus) : '0');
      set('penalty', t[col].penalty ? '−' + fmt(t[col].penalty) : '0');
      set('final', t[col].empty ? '—' : fmt(t[col].final));
      set('grade', gradeBadge(t[col].grade));
      if (col === 'self' && self.lateSelf) { set('total', '—'); set('bonus', '—'); set('penalty', '—'); set('final', '—'); set('grade', gradeBadge(null)); }
    });

    var off = mode === 'self' ? t.self : t.mgr;
    var q = function (sel) { return root.querySelector(sel); };
    q('[data-sum-final]').textContent = off.empty ? '—' : fmt(off.final);
    q('[data-sum-grade]').innerHTML = gradeBadge(off.grade, true);
    q('[data-sum-grade-name]').textContent = off.grade ? off.grade.name : (off.empty ? 'Chưa chấm' : 'Chưa đủ tiêu chí để xếp loại');
    q('[data-sum-progress-text]').textContent = 'Đã chấm ' + off.filled + '/' + this.crits.length + ' tiêu chí';
    q('[data-sum-progress]').style.width = (off.filled / this.crits.length * 100) + '%';
    q('[data-sum-t]').textContent = off.empty ? '—' : fmt(off.total);
    q('[data-sum-b]').textContent = off.bonus ? '+' + fmt(off.bonus) : '0';
    q('[data-sum-p]').textContent = off.penalty ? '−' + fmt(off.penalty) : '0';

    q('[data-bar-label]').textContent = mode === 'self' ? 'Tự chấm · ' + off.filled + '/' + this.crits.length + ' tiêu chí' : 'Chính thức · ' + off.filled + '/' + this.crits.length + ' tiêu chí';
    q('[data-bar-total]').textContent = off.empty ? '—' : fmt(off.final);
    q('[data-bar-grade]').innerHTML = gradeBadge(off.grade);

    if (mode !== 'self') {
      q('[data-sum-self]').textContent = this.lateSelf ? 'Không tự chấm đúng hạn' : fmt(t.self.final);
      q('[data-sum-self-grade]').innerHTML = this.lateSelf ? '' : gradeBadge(t.self.grade);
      var gapEl = q('[data-sum-gap]'), warn = q('[data-gap-warn]');
      if (!this.lateSelf && t.mgr.complete) {
        var gap = Math.abs(t.self.final - t.mgr.final);
        gapEl.textContent = 'Chênh lệch với cột chính thức: ' + fmt(gap) + ' điểm';
        warn.hidden = gap <= GAP_LIMIT * 2;
        warn.innerHTML = '⚠️ Tự chấm và QL chấm lệch <strong>' + fmt(gap) + ' điểm</strong> (ngưỡng ' + GAP_LIMIT + '). Hội đồng sẽ được nhắc xem kỹ — không chặn gửi.';
      } else {
        gapEl.textContent = this.lateSelf ? '' : 'Chênh lệch hiện khi cột chính thức chấm đủ';
        warn.hidden = true;
      }
    }

    if (mode === 'council') {
      var hint = q('[data-decision-hint]');
      var picked = root.querySelector('input[name="decision"]:checked');
      if (!picked && t.mgr.grade) {
        var def = root.querySelector('input[name="decision"][value="' + t.mgr.grade.code + '"]');
        if (def) def.checked = true;
        picked = def;
      }
      var differs = picked && t.mgr.grade && picked.value !== t.mgr.grade.code;
      hint.innerHTML = 'Đề xuất theo bảng quy đổi: ' + gradeBadge(t.mgr.grade) + (differs ? ' · <strong style="color:#9A3412">Hội đồng chọn khác đề xuất</strong>' : '');
      q('[data-decision-reason]').hidden = !differs;
    }
    this.totals = t;
  };

  FormScreen.prototype.bind = function () {
    var self = this, root = this.host;

    root.addEventListener('input', function (e) {
      var el = e.target;
      if (el.dataset.score) {
        var col = el.dataset.score, idx = +el.dataset.idx, max = +el.dataset.max;
        var v = parseHalf(el.value);
        var row = el.closest('.crit'), err = row.querySelector('[data-err]');
        var msg = '';
        if (v !== null && isNaN(v)) msg = 'Chỉ nhập số, bước 0,5 điểm (ví dụ 4 hoặc 4,5).';
        else if (v !== null && v > max * 2) msg = 'Tối đa ' + max + ' điểm.';
        el.classList.toggle('is-error', !!msg);
        el.classList.remove('is-missing');
        row.classList.toggle('has-error', !!msg);
        err.hidden = !msg; err.textContent = msg;
        self[col][idx] = msg ? null : v;
        self.update();
      }
      if (el.dataset.tally) {
        var tv = parseHalf(el.value);
        var bad = tv !== null && isNaN(tv);
        el.classList.toggle('is-error', bad);
        self[el.dataset.tally][el.dataset.col] = bad ? null : tv;
        self.update();
      }
      if (el.dataset.evidence !== undefined) self.evidence[el.dataset.evidence] = el.value;
    });

    root.addEventListener('change', function (e) {
      if (e.target.name === 'excl') {
        self.excluded = e.target.value === '1';
        root.querySelector('[data-excl-reason]').hidden = !self.excluded;
        self.update();
      }
      if (e.target.name === 'decision') self.update();
    });

    root.addEventListener('click', function (e) {
      var fig = e.target.closest('[data-fig]');
      if (fig) { openFigure(personById(fig.dataset.person), fig.dataset.fig); return; }
      if (e.target.closest('[data-adjust]')) {
        self.adjusting = true;
        var keep = self.mgr.slice();
        self.render(); self.mgr = keep; self.update();
        toast('Cột chính thức đã mở để Hội đồng chấm lại · mọi thay đổi ghi nhật ký', 'info');
        return;
      }
      var submit = e.target.closest('[data-submit]');
      if (submit) self.submit(submit);
    });
  };

  FormScreen.prototype.submit = function (btn) {
    var root = this.host, mode = this.mode;
    var col = mode === 'self' ? 'self' : 'mgr';
    var missing = [];
    if (mode !== 'council' || this.adjusting) {
      this[col].forEach(function (v, i) { if (v === null) missing.push(i); });
    }
    all('.score-input.is-missing', root).forEach(function (el) { el.classList.remove('is-missing'); });
    if (missing.length) {
      missing.forEach(function (i) {
        var input = root.querySelector('[data-score="' + col + '"][data-idx="' + i + '"]');
        if (input) input.classList.add('is-missing');
      });
      var first = root.querySelector('.score-input.is-missing');
      if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); first.focus({ preventScroll: true }); }
      toast('Còn ' + missing.length + ' tiêu chí chưa chấm — đã đánh dấu viền cam', 'error');
      return;
    }
    if (root.querySelector('.score-input.is-error')) { toast('Có ô điểm chưa hợp lệ', 'error'); return; }
    if ((this.bonus[col] || 0) > 0 && !(this.evidence[col] || '').trim()) {
      var ev = root.querySelector('[data-evidence="' + col + '"]');
      if (ev) { ev.closest('.field').classList.add('has-error'); ev.focus(); }
      toast('Điểm thưởng cần ghi minh chứng', 'error'); return;
    }
    var pen = root.querySelector('[data-pen-evidence="' + col + '"]');
    if ((this.penalty[col] || 0) > 0 && pen && !pen.value.trim()) {
      pen.closest('.field').classList.add('has-error'); pen.focus();
      toast('Điểm trừ cần ghi minh chứng', 'error'); return;
    }
    if (this.excluded) {
      var r = root.querySelector('#excl-reason');
      if (r && !r.value.trim()) { r.closest('.field').classList.add('has-error'); r.focus(); toast('Ghi lý do loại trừ', 'error'); return; }
    }
    var reason = root.querySelector('[data-decision-reason]');
    if (reason && !reason.hidden && !root.querySelector('#decision-reason').value.trim()) {
      reason.classList.add('has-error'); root.querySelector('#decision-reason').focus();
      toast('Ghi lý do khi xếp loại khác đề xuất', 'error'); return;
    }

    var t = this.totals[col];
    var msg = {
      self: 'Đã gửi phiếu tự chấm · ' + fmt(t.final) + ' điểm · chờ ' + this.person.scorer + ' chấm',
      manager: 'Đã xác nhận · ' + fmt(t.final) + ' điểm, đề xuất ' + (t.grade ? t.grade.code : '') + ' · chuyển Phòng TCHC đối chiếu',
      council: 'Đã duyệt phiếu ' + this.person.label
    }[mode];
    var next = { self: 'my-evaluations.html', manager: 'evaluation-unit.html', council: 'evaluation-council.html' }[mode];
    all('[data-submit]', root).forEach(function (b) { b.classList.add('is-busy'); });
    setTimeout(function () {
      all('[data-submit]', root).forEach(function (b) { b.classList.remove('is-busy'); });
      toast(msg);
      setTimeout(function () { location.href = next; }, 900);
    }, 700);
  };

  /* ---- figure detail panel ---- */
  function ensureFigurePanel() {
    var el = document.getElementById('fig-panel');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'fig-panel';
    el.innerHTML = '<div class="panel" role="dialog" aria-modal="true" aria-labelledby="fig-title">' +
      '<div class="panel__head"><h2 class="dialog__title" id="fig-title"></h2>' +
      '<button class="icon-btn" type="button" data-action="close-overlay" aria-label="Đóng">✕</button></div>' +
      '<div class="panel__body" data-fig-body></div>' +
      '<div class="panel__foot"><button class="btn btn--secondary" type="button" data-action="close-overlay">Đóng</button></div></div>';
    document.body.appendChild(el);
    return el;
  }

  function openFigure(person, key) {
    var panel = ensureFigurePanel();
    var data = figureItems(person, key);
    var def = FIG[key];
    panel.querySelector('#fig-title').textContent = data.head;
    var body = '<div class="figure-card" style="margin-bottom:16px">' + def.text(figuresFor(person)) + ' · nguồn ' + def.src +
      '<br>Chụp lúc 03/09/2026 08:12 · ' + esc(person.label) + '</div>';
    if (data.kind === 'shift') {
      body += '<ul class="impact">' + data.rows.map(function (r) {
        return '<li><span class="shift-chip" data-code="' + esc(r.shift) + '">' + esc(r.shift) + '</span><span class="impact__what">' + r.d + '</span></li>';
      }).join('') + '</ul>';
    } else if (data.kind === 'task') {
      body += '<ul class="impact">' + data.rows.map(function (r) {
        return '<li style="display:block"><div><a href="task-detail.html">' + esc(r.c) + '</a> · ' + esc(r.t) + '</div>' +
          '<div class="text-meta">' + esc(r.d) + '</div>' + (r.why ? '<div class="text-meta" style="color:var(--text)">💬 ' + esc(r.why) + '</div>' : '') + '</li>';
      }).join('') + '</ul>';
    } else {
      body += '<ul class="impact">' + data.rows.map(function (r) {
        return '<li style="display:block"><div>' + esc(r.t) + '</div><div class="text-meta">' + esc(r.d) + '</div></li>';
      }).join('') + '</ul>';
    }
    if (data.foot) body += '<p class="text-meta" style="margin-top:12px">' + esc(data.foot) + '</p>';
    body += '<p class="text-meta" style="margin-top:16px">Con số chỉ là sự thật để kiểm chứng. Quá hạn có thể do chờ khoa khác, trực ít có thể do đơn vị không xếp — người chấm quyết định điểm.</p>';
    panel.querySelector('[data-fig-body]').innerHTML = body;
    panel.classList.add('is-open');
  }

  /* ---------- 8. Unit list — MH-D03 (03/09, manager scoring) ---------- */
  function unitStatus(p) {
    if (p.byBoard) return { key: 'self-done', badge: '<span class="badge badge--accepted">Đã tự chấm</span>', note: 'BGĐ chấm' };
    if (p.self === null) return { key: 'todo', late: true, badge: '<span class="badge badge--not-accepted">Chưa chấm</span> <span class="badge badge--late">Không tự chấm đúng hạn</span>' };
    if (p.scored03) return { key: 'done', badge: '<span class="badge badge--pending-review">QL đã chấm</span>' };
    return { key: 'todo', badge: '<span class="badge badge--accepted">Đã tự chấm</span>' };
  }

  function mountUnitTable(host) {
    var rows = STAFF.slice().sort(byGivenName);
    host.innerHTML = rows.map(function (p) {
      var st = unitStatus(p);
      var mgrFinal = p.scored03 ? half(p.mgr + p.bonus.mgr - p.penalty.mgr) : null;
      var selfFinal = p.self === null ? null : half(p.self + p.bonus.self - p.penalty.self);
      var gap = (mgrFinal !== null && selfFinal !== null) ? Math.abs(mgrFinal - selfFinal) : null;
      var action = p.byBoard
        ? '<a class="btn btn--small btn--quiet" href="' + formUrl(p.id, 'self') + '" title="Không ai tự duyệt phiếu của mình">Phiếu của tôi</a>'
        : '<a class="btn btn--small ' + (st.key === 'done' ? 'btn--secondary' : 'btn--primary') + '" href="' + formUrl(p.id, 'manager') + '">' + (st.key === 'done' ? 'Xem / sửa' : 'Chấm') + '</a>';
      return '<tr data-status="' + st.key + (st.late ? ' late' : '') + '"' + (gap !== null && gap > GAP_LIMIT * 2 ? ' class="is-flagged"' : '') + '>' +
        '<td data-label="Họ tên"><div style="font-weight:500">' + esc(p.label) + '</div><div class="text-meta">' + esc(p.title) + (p.post ? ' · ' + esc(p.post) : '') + (p.also ? ' · kiêm ' + esc(p.also) : '') + '</div></td>' +
        '<td data-label="Mẫu">' + p.form + '</td>' +
        '<td data-label="Người chấm">' + esc(p.scorer) + '</td>' +
        '<td data-label="Trạng thái"><div class="badge-row">' + st.badge + '</div></td>' +
        '<td data-label="Tự chấm" class="table__num">' + (selfFinal === null ? '<span class="text-faint">—</span>' : fmt(selfFinal)) + '</td>' +
        '<td data-label="QL chấm" class="table__num">' + (mgrFinal === null ? '<span class="text-faint">—</span>' : '<strong>' + fmt(mgrFinal) + '</strong> ' + gradeBadge(gradeOf('person', mgrFinal))) + '</td>' +
        '<td data-label="Chênh lệch" class="table__num">' + (gap === null ? '<span class="text-faint">—</span>' : (gap > GAP_LIMIT * 2 ? '<span class="badge badge--pending-review">⚠ ' + fmt(gap) + '</span>' : fmt(gap))) + '</td>' +
        '<td data-label="">' + action + '</td></tr>';
    }).join('');
  }

  /* ---------- 9. Council: one unit's people — MH-D05 (05/09) ---------- */
  function mountCouncilPeople(host) {
    var rows = STAFF.slice().sort(byGivenName);
    host.innerHTML = rows.map(function (p) {
      var mgrFinal = half(p.mgr + p.bonus.mgr - p.penalty.mgr);
      var selfFinal = p.self === null ? null : half(p.self + p.bonus.self - p.penalty.self);
      var g = gradeOf('person', mgrFinal);
      var gap = selfFinal === null ? null : Math.abs(mgrFinal - selfFinal);
      var flags = [];
      if (gap !== null && gap > GAP_LIMIT * 2) flags.push('<span class="badge badge--pending-review">⚠ Lệch ' + fmt(gap) + '</span>');
      if (p.self === null) flags.push('<span class="badge badge--late">Không tự chấm</span>');
      if (CROSS[p.id] && CROSS[p.id].issue) flags.push('<span class="badge badge--rejected">Cần giải trình</span>');
      if (p.byBoard) flags.push('<span class="chip">BGĐ chấm</span>');
      var flagged = flags.length && !p.byBoard;
      var options = GRADES.person.map(function (x) { return '<option' + (x.code === g.code ? ' selected' : '') + '>' + x.code + '</option>'; }).join('');
      return '<tr' + (flagged ? ' class="is-flagged" data-flagged' : '') + '>' +
        '<td data-label="Chọn"><input type="checkbox" class="checkbox-input" data-pick aria-label="Chọn phiếu ' + esc(p.label) + '" style="width:20px;height:20px;accent-color:var(--brand-blue-dark)"></td>' +
        '<td data-label="Họ tên"><a href="' + formUrl(p.id, 'council') + '" style="font-weight:500">' + esc(p.label) + '</a><div class="text-meta">' + esc(p.title) + (p.post ? ' · ' + esc(p.post) : '') + ' · ' + p.form + '</div></td>' +
        '<td data-label="Tự chấm" class="table__num">' + (selfFinal === null ? '<span class="text-faint">—</span>' : fmt(selfFinal)) + '</td>' +
        '<td data-label="Chính thức" class="table__num"><strong>' + fmt(mgrFinal) + '</strong></td>' +
        '<td data-label="Đề xuất">' + gradeBadge(g) + '</td>' +
        '<td data-label="HĐ duyệt"><label class="sr-only" for="hd-' + p.id + '">Xếp loại Hội đồng</label>' +
        '<select class="select" id="hd-' + p.id + '" data-decide data-suggest="' + g.code + '" data-name="' + esc(p.label) + '" style="width:auto;min-height:40px;padding:6px 10px">' + options + '</select></td>' +
        '<td data-label="Cần xem"><div class="badge-row">' + (flags.join('') || '<span class="text-faint">—</span>') + '</div></td>' +
        '</tr>';
    }).join('');
  }

  /* ---------- 10. Cross-check by Phòng TCHC — MH-D04 ---------- */
  function mountCrossTable(host) {
    var rows = STAFF.slice().sort(byGivenName);
    host.innerHTML = rows.map(function (p) {
      var c = CROSS[p.id] || {};
      var days = 26 - (c.absent || 0) - (c.leave ? (c.leave.indexOf('–') > 0 ? 3 : 1) : 0);
      if (p.id === 'long') days = 24;
      return '<tr' + (c.issue ? ' class="is-flagged"' : '') + '>' +
        '<td data-label="Họ tên"><div style="font-weight:500">' + esc(p.label) + '</div><div class="text-meta">' + p.nv + '</div></td>' +
        '<td data-label="Ngày công" class="table__num">' + days + '/26</td>' +
        '<td data-label="Đi muộn/về sớm" class="table__num">' + (c.late ? '<strong>' + c.late + ' lần</strong>' : '0') + '</td>' +
        '<td data-label="Nghỉ đã duyệt">' + (c.leave ? esc(c.leave) : '<span class="text-faint">—</span>') + '</td>' +
        '<td data-label="Nghỉ không phép" class="table__num">' + (c.absent ? '<strong>' + c.absent + ' ngày</strong>' : '0') + '</td>' +
        '<td data-label="Kỷ luật/biên bản" class="table__num">0</td>' +
        '<td data-label="Phản ánh HC" class="table__num">' + (c.complaint ? '<strong>' + c.complaint + '</strong>' : '0') + '</td>' +
        '<td data-label="Kết quả">' + (c.issue
          ? '<span class="badge badge--rejected">Cần giải trình</span><div class="text-meta" style="margin-top:4px;max-width:260px">' + esc(c.issue) + '</div>'
          : '<span class="badge badge--done">✓ Khớp</span>' + (c.note ? '<div class="text-meta" style="margin-top:4px;max-width:260px">' + esc(c.note) + '</div>' : '')) + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---------- 11. Hospital-wide numbers (council + Mẫu 03) ---------- */
  function unitDist(u) {
    if (u.dist) return u.dist;
    var d = [0, 0, 0, 0, 0], codes = ['A', 'B', 'C', 'D', 'E'];
    STAFF.forEach(function (p) {
      var g = gradeOf('person', half(p.mgr + p.bonus.mgr - p.penalty.mgr));
      d[codes.indexOf(g.code)]++;
    });
    return d;
  }
  function distBar(d) {
    var n = d.reduce(function (a, b) { return a + b; }, 0) || 1, codes = ['A', 'B', 'C', 'D', 'E'];
    return '<div class="dist" role="img" aria-label="' + codes.map(function (c, i) { return c + ' ' + d[i]; }).join(', ') + '">' +
      d.map(function (v, i) { return v ? '<span class="d-' + codes[i] + '" style="width:' + (v / n * 100) + '%"></span>' : ''; }).join('') + '</div>' +
      '<div class="dist-legend">' + d.map(function (v, i) { return v ? '<span><i class="d-' + codes[i] + '" style="background:' + ['#22C55E', '#3B82F6', '#94A3B8', '#F97316', '#DC2626'][i] + '"></i>' + codes[i] + ' ' + v + '</span>' : ''; }).join('') + '</div>';
  }

  function mountCouncilUnits(host) {
    host.innerHTML = UNITS.map(function (u) {
      var d = unitDist(u);
      var ug = gradeOf('unit', half(u.unitMgr));
      var warn = [];
      if (u.here) {
        warn.push('<span class="badge badge--pending-review">⚠ 1 lệch > 15</span>', '<span class="badge badge--late">2 không tự chấm</span>', '<span class="badge badge--rejected">2 cần giải trình</span>');
      } else {
        if (u.gaps) warn.push('<span class="badge badge--pending-review">⚠ ' + u.gaps + ' lệch > 15</span>');
        if (u.late) warn.push('<span class="badge badge--late">' + u.late + ' không tự chấm</span>');
        if (u.issues) warn.push('<span class="badge badge--rejected">' + u.issues + ' cần giải trình</span>');
        if (u.excluded) warn.push('<span class="badge badge--rejected">' + u.excluded + ' loại trừ</span>');
      }
      return '<tr' + (u.here ? ' style="background:var(--brand-blue-light)"' : '') + '>' +
        '<td data-label="Đơn vị"><div style="font-weight:500">' + esc(u.name) + '</div><div class="text-meta">' + u.n + ' phiếu cá nhân · Mẫu ' + u.code + '</div></td>' +
        '<td data-label="Trạng thái">' + (u.approved ? '<span class="badge badge--done">✓ Đã duyệt</span>' : '<span class="badge badge--checked">Chờ duyệt</span>') + '</td>' +
        '<td data-label="Phân bố đề xuất" style="min-width:200px">' + distBar(d) + '</td>' +
        '<td data-label="Tập thể"><span class="table__num">' + u.unitMgr + '</span> ' + gradeBadge(ug) + '</td>' +
        '<td data-label="Cần xem"><div class="badge-row">' + (warn.join('') || '<span class="text-faint">—</span>') + '</div></td>' +
        '<td data-label="">' + (u.here ? '<a class="btn btn--small btn--primary" href="#unit-review">Xét duyệt</a>'
          : '<a class="btn btn--small ' + (u.approved ? 'btn--quiet' : 'btn--secondary') + '" href="#unit-review" data-action="toast" data-toast="Bản mẫu chỉ dựng chi tiết Khoa Nội" data-toast-kind="info">' + (u.approved ? 'Xem' : 'Xét duyệt') + '</a>') + '</td>' +
        '</tr>';
    }).join('');
  }

  function mountUnitForms(host) {
    host.innerHTML = UNITS.map(function (u) {
      var g = gradeOf('unit', half(u.unitMgr)), sg = gradeOf('unit', half(u.unitSelf));
      return '<tr>' +
        '<td data-label="Mẫu">' + u.code + '</td>' +
        '<td data-label="Đơn vị">' + esc(u.name) + '</td>' +
        '<td data-label="Đơn vị tự chấm" class="table__num">' + u.unitSelf + ' ' + gradeBadge(sg) + '</td>' +
        '<td data-label="Lãnh đạo chấm" class="table__num"><strong>' + u.unitMgr + '</strong> ' + gradeBadge(g) + '</td>' +
        '<td data-label="Trạng thái">' + (u.approved ? '<span class="badge badge--done">✓ Đã duyệt</span>' : '<span class="badge badge--checked">Chờ duyệt</span>') + '</td>' +
        '<td data-label="">' + (u.here ? '<a class="btn btn--small btn--secondary" href="' + formUrl('khoa', 'council') + '">Mở phiếu</a>' : '<span class="text-faint">—</span>') + '</td></tr>';
    }).join('');
  }

  function hospitalTotals() {
    var person = [0, 0, 0, 0, 0], unit = { XS: 0, T: 0, HT: 0, KHT: 0 }, n = 0;
    UNITS.forEach(function (u) {
      unitDist(u).forEach(function (v, i) { person[i] += v; n += v; });
      unit[gradeOf('unit', half(u.unitMgr)).code]++;
    });
    return { person: person, people: n, unit: unit, units: UNITS.length };
  }

  function mountReportTables() {
    var t = hospitalTotals();
    all('[data-eval-num]').forEach(function (el) {
      var k = el.dataset.evalNum;
      if (k === 'people') el.textContent = t.people;
      if (k === 'units') el.textContent = t.units;
    });
    var ph = document.querySelector('[data-eval="report-person"]');
    if (ph) {
      ph.innerHTML = GRADES.person.map(function (g, i) {
        return '<tr><td data-label="Xếp loại">' + gradeBadge(g) + ' ' + esc(g.name) + '</td><td class="num" data-label="Số lượng">' + t.person[i] + '</td>' +
          '<td class="num" data-label="Tỷ lệ">' + pct(t.person[i], t.people) + '</td><td data-label="Ghi chú"><input class="input" style="min-height:40px;padding:6px 10px" aria-label="Ghi chú ' + g.code + '"></td></tr>';
      }).join('') + '<tr><td><strong>Tổng cộng</strong></td><td class="num"><strong>' + t.people + '</strong></td><td class="num"><strong>100%</strong></td><td></td></tr>';
    }
    var uh = document.querySelector('[data-eval="report-unit"]');
    if (uh) {
      var rows = [['XS', 'Xuất sắc'], ['T', 'Tốt'], ['HT', 'Hoàn thành'], ['KHT', 'Không hoàn thành / cần chấn chỉnh']];
      uh.innerHTML = rows.map(function (r) {
        return '<tr><td data-label="Xếp loại">' + gradeBadge({ code: r[0], name: r[1] }) + ' ' + r[1] + '</td><td class="num" data-label="Số lượng">' + t.unit[r[0]] + '</td>' +
          '<td class="num" data-label="Tỷ lệ">' + pct(t.unit[r[0]], t.units) + '</td><td data-label="Ghi chú">' + (r[0] === 'KHT' ? 'Khoa Liên chuyên khoa' : '') + '</td></tr>';
      }).join('') +
        '<tr><td data-label="Xếp loại">Không xét xuất sắc / không xét thưởng</td><td class="num" data-label="Số lượng">0</td><td class="num" data-label="Tỷ lệ">0%</td><td></td></tr>' +
        '<tr><td><strong>Tổng cộng</strong></td><td class="num"><strong>' + t.units + '</strong></td><td class="num"><strong>100%</strong></td><td></td></tr>';
    }
  }

  /* ---------- 12. Form configuration editor — MH-D10 ---------- */
  var FIG_CHOICES = [['', '— Không gắn số liệu —'], ['done', 'Số nhiệm vụ hoàn thành (B)'], ['ontime', 'Tỷ lệ đúng hạn (B)'],
    ['overdue', 'Số nhiệm vụ quá hạn (B)'], ['returned', 'Số nhiệm vụ bị trả lại (B)'], ['shifts', 'Số ca trực (E)'],
    ['meetings', 'Số buổi giao ban vắng (C)'], ['target', 'Tỷ lệ đạt chỉ tiêu (G)'], ['bgd', 'Nhiệm vụ BGĐ giao (B)']];

  function mountConfig(host) {
    var list = document.querySelector('[data-eval="form-list"]');
    var current = '01B';

    function renderList() {
      var groups = [['Phiếu cá nhân · 17 mẫu · khung 40 · 20 · 15 · 15 · 10', '01'], ['Phiếu tập thể · 15 mẫu · khung 30 · 20 · 15 · 15 · 20', '02']];
      list.innerHTML = groups.map(function (g) {
        return '<div class="nav__group-label" style="padding:12px 12px 4px">' + g[0] + '</div>' +
          FORM_INDEX.filter(function (f) { return f[0].indexOf(g[1]) === 0; }).map(function (f) {
            return '<a class="form-list__item' + (f[0] === current ? ' is-selected' : '') + '" data-pick-form="' + f[0] + '" href="#">' +
              '<span class="form-list__code">' + f[0] + '</span><span>' + esc(f[1]) + '</span></a>';
          }).join('');
      }).join('') +
        '<div class="nav__group-label" style="padding:12px 12px 4px">Không chấm điểm</div>' +
        '<a class="form-list__item" href="evaluation-report.html"><span class="form-list__code">03</span><span>Báo cáo tổng hợp kết quả thi đua tháng</span></a>' +
        '<a class="form-list__item" href="survey-results.html"><span class="form-list__code">04</span><span>Phiếu lấy ý kiến về công tác thi đua</span></a>' +
        '<div class="nav__group-label" style="padding:12px 12px 4px">Phiếu khác do bệnh viện tạo</div>' +
        '<a class="form-list__item" href="survey-results.html"><span class="form-list__code">K01</span><span>Nhân viên đánh giá lãnh đạo khoa (ẩn danh)</span></a>' +
        '<a class="form-list__item" href="survey-results.html"><span class="form-list__code">K02</span><span>Trưởng khoa đánh giá Ban Giám đốc (ẩn danh)</span></a>';
    }

    function render() {
      var form = FORMS[current];
      var meta = FORM_INDEX.filter(function (f) { return f[0] === current; })[0];
      var isUnit = current.indexOf('02') === 0;
      var placeholder = !form;
      if (!form) form = isUnit ? FORMS['02A'] : FORMS['01A'];
      var inUse = { '01A': 41, '01B': 96, '01C': 9, '02A': 1, '02B': 1, '02K': 1 }[current];
      var html = '<div class="row row--between" style="margin-bottom:16px;align-items:flex-start"><div>' +
        '<span class="sheet-head__code">Mẫu ' + current + ' · phiên bản 1</span>' +
        '<h2 class="section-title">' + (isUnit ? 'Phiếu chấm điểm xếp loại tập thể ' : 'Phiếu chấm điểm xếp loại ') + esc(meta[1]) + '</h2>' +
        '<div class="text-meta">' + (isUnit ? 'Gắn với đơn vị · ' + esc(meta[1]) : 'Gắn với chức danh · ' + esc(meta[1]) + ' · ' + esc(meta[2] || '')) + '</div></div>' +
        '<div class="badge-row">' + (inUse ? '<span class="badge badge--done">Đang dùng · ' + inUse + ' phiếu kỳ 08/2026</span><span class="badge badge--not-accepted">🔒 Sửa sẽ tạo phiên bản mới</span>' : '<span class="badge badge--not-accepted">Chưa dùng</span>') + '</div></div>';
      if (placeholder) html += '<div class="proto-note">📄 Câu chữ Mẫu ' + current + ' chưa có trong tài liệu — bản mẫu hiện tiêu chí của khung ' + (isUnit ? 'tập thể (02A)' : 'cá nhân (01A)') + ' để minh hoạ.</div>';
      html += '<div class="field"><label class="field__label" for="cfg-basis">Căn cứ / mục đích</label><textarea class="textarea" id="cfg-basis" style="min-height:72px">' + esc(form.basis) + '</textarea></div>';

      form.groups.forEach(function (g, gi) {
        html += '<section class="card" style="margin-bottom:12px" data-cfg-group="' + gi + '">' +
          '<div class="row" style="margin-bottom:8px"><label class="sr-only" for="g-title-' + gi + '">Tên nhóm</label>' +
          '<input class="input" id="g-title-' + gi + '" value="' + esc(g.title) + '" style="flex:1;min-width:220px;font-weight:600">' +
          '<label class="text-meta" for="g-max-' + gi + '">Tối đa</label><input class="input" id="g-max-' + gi + '" data-gmax inputmode="decimal" value="' + g.max + '" style="width:80px;text-align:right">' +
          '<span class="cfg-sum" data-gsum></span></div>' +
          '<div class="cfg-crit text-meta" style="font-weight:600"><span>#</span><span>Tiêu chí</span><span style="text-align:right">Điểm tối đa</span><span>Số liệu hiện dưới tiêu chí</span><span></span></div>' +
          g.items.map(function (c, ci) {
            var fig = (c.figs || [])[0] || '';
            return '<div class="cfg-crit"><span class="text-muted">' + (ci + 1) + '</span>' +
              '<label class="sr-only" for="c-' + gi + '-' + ci + '">Tiêu chí</label><input class="input" id="c-' + gi + '-' + ci + '" value="' + esc(c.t) + '">' +
              '<label class="sr-only" for="m-' + gi + '-' + ci + '">Điểm tối đa</label><input class="input" id="m-' + gi + '-' + ci + '" data-cmax inputmode="decimal" value="' + c.max + '" style="text-align:right">' +
              '<label class="sr-only" for="f-' + gi + '-' + ci + '">Số liệu</label><select class="select" id="f-' + gi + '-' + ci + '">' +
              FIG_CHOICES.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === fig ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
              '<button class="icon-btn" type="button" aria-label="Xoá tiêu chí" data-remove-crit>✕</button></div>';
          }).join('') +
          '<button class="btn btn--small btn--quiet" type="button" data-add-crit style="margin-top:8px">+ Thêm tiêu chí</button></section>';
      });

      if (isUnit) {
        html += '<div class="field"><label class="field__label" for="cfg-focus">Trọng tâm theo đơn vị <span class="text-muted">(mỗi dòng một ý)</span></label>' +
          '<textarea class="textarea" id="cfg-focus">' + esc((form.focus || []).join('\n')) + '</textarea></div>';
      }
      host.innerHTML = html;
      validate();
    }

    function validate() {
      var groupsOk = true, total = 0;
      all('[data-cfg-group]', host).forEach(function (sec) {
        var gmax = parseHalf(sec.querySelector('[data-gmax]').value);
        var sum = 0, bad = false;
        all('[data-cmax]', sec).forEach(function (inp) {
          var v = parseHalf(inp.value);
          var wrong = v === null || isNaN(v) || v <= 0;
          inp.style.borderColor = wrong ? 'var(--danger)' : '';
          if (wrong) bad = true; else sum += v;
        });
        var ok = !bad && gmax !== null && !isNaN(gmax) && sum === gmax;
        if (!ok) groupsOk = false;
        if (gmax !== null && !isNaN(gmax)) total += gmax;
        var tag = sec.querySelector('[data-gsum]');
        tag.className = 'cfg-sum ' + (ok ? 'is-ok' : 'is-bad');
        tag.textContent = (ok ? '✓ ' : '✕ ') + 'Tổng tiêu chí ' + fmt(sum) + '/' + fmt(gmax);
      });
      var allOk = groupsOk && total === 200;
      var status = document.querySelector('[data-eval="cfg-status"]');
      if (status) {
        status.className = 'section-box ' + (allOk ? 'section-box--ok' : 'section-box--warn');
        status.innerHTML = allOk
          ? '✓ Hợp lệ — tổng 5 nhóm = 100, mỗi nhóm bằng tổng các tiêu chí.'
          : '✕ Chưa lưu được — ' + (total !== 200 ? 'tổng 5 nhóm đang là <strong>' + fmt(total) + '</strong>, phải bằng 100' : 'có nhóm có tổng tiêu chí khác điểm tối đa của nhóm') + '.';
      }
      all('[data-eval="cfg-save"]').forEach(function (b) { b.disabled = !allOk; });
    }

    renderList();
    render();
    list.addEventListener('click', function (e) {
      var item = e.target.closest('[data-pick-form]');
      if (!item) return;
      e.preventDefault();
      current = item.dataset.pickForm;
      renderList(); render();
    });
    host.addEventListener('input', function (e) { if (e.target.matches('[data-gmax],[data-cmax]')) validate(); });
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-remove-crit]')) { e.target.closest('.cfg-crit').remove(); validate(); }
      var add = e.target.closest('[data-add-crit]');
      if (add) {
        var row = document.createElement('div');
        row.className = 'cfg-crit';
        row.innerHTML = '<span class="text-muted">+</span><input class="input" placeholder="Nội dung tiêu chí mới" aria-label="Tiêu chí mới">' +
          '<input class="input" data-cmax inputmode="decimal" placeholder="0" style="text-align:right" aria-label="Điểm tối đa">' +
          '<select class="select" aria-label="Số liệu">' + FIG_CHOICES.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select>' +
          '<button class="icon-btn" type="button" aria-label="Xoá tiêu chí" data-remove-crit>✕</button>';
        add.parentNode.insertBefore(row, add);
        row.querySelector('input').focus();
        validate();
      }
    });
  }

  /* ---------- 13. Generic bits ---------- */
  // Filter chips: <button data-eval-filter="todo" data-target="#tbody">
  document.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-eval-filter]');
    if (!chip) return;
    var group = chip.closest('[data-filter-group]');
    all('[data-eval-filter]', group).forEach(function (b) { b.classList.toggle('is-active', b === chip); });
    var key = chip.dataset.evalFilter;
    all('tr', document.querySelector(chip.dataset.target)).forEach(function (tr) {
      tr.hidden = key !== 'all' && (tr.dataset.status || '').split(' ').indexOf(key) < 0;
    });
  });

  // Council: changing a grade away from the suggestion asks for a reason.
  document.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-decide]');
    if (!sel) return;
    if (sel.value !== sel.dataset.suggest) {
      var dlg = document.getElementById('decide-dialog');
      if (dlg) {
        dlg.querySelector('[data-decide-text]').innerHTML = esc(sel.dataset.name) + ': đề xuất <strong>' + sel.dataset.suggest + '</strong> → Hội đồng chọn <strong>' + sel.value + '</strong>';
        dlg.classList.add('is-open');
      }
    }
  });

  // Council: select every row without a warning (flagged rows stay for a careful look).
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick-clean]');
    if (b) {
      var n = 0;
      all('[data-eval="council-people"] tr').forEach(function (tr) {
        var box = tr.querySelector('[data-pick]');
        box.checked = !tr.hasAttribute('data-flagged');
        if (box.checked) n++;
      });
      updatePicked();
      toast('Đã chọn ' + n + ' phiếu không có cảnh báo', 'info');
    }
  });
  document.addEventListener('change', function (e) { if (e.target.matches('[data-pick]')) updatePicked(); });
  function updatePicked() {
    var n = all('[data-pick]:checked').length;
    all('[data-picked-count]').forEach(function (el) { el.textContent = n; });
    all('[data-approve-picked]').forEach(function (b) {
      b.disabled = !n;
      b.dataset.toast = 'Đã duyệt ' + n + ' phiếu Khoa Nội · ghi vào biên bản xét duyệt';
    });
  }

  // Required fields inside a dialog — same behaviour as Part E.
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-require-scope]');
    if (!b) return;
    var scope = document.getElementById(b.dataset.requireScope);
    var ok = true;
    all('textarea[required], input[required], select[required]', scope).forEach(function (input) {
      var field = input.closest('.field');
      var empty = !input.value.trim();
      if (field) field.classList.toggle('has-error', empty);
      if (empty && ok) { input.focus(); ok = false; }
    });
    if (!ok) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    var overlay = b.closest('.overlay');
    setTimeout(function () { if (overlay) overlay.classList.remove('is-open'); }, 750);
  }, true);

  /* ---------- 14. Mount ---------- */
  var formHost = document.querySelector('[data-eval="form"]');
  // The role decides the side menu, so it is set before app.js draws the frame.
  if (formHost) {
    var q0 = params(), p0 = personById(q0.nguoi || 'lan') || personById('lan');
    document.body.dataset.role = roleFor(p0, MODES[q0.vai] ? q0.vai : 'manager');
  }

  function mount() {
    if (formHost) new FormScreen(formHost);
    all('[data-eval="unit-table"]').forEach(mountUnitTable);
    all('[data-eval="council-people"]').forEach(mountCouncilPeople);
    all('[data-eval="council-units"]').forEach(mountCouncilUnits);
    all('[data-eval="unit-forms"]').forEach(mountUnitForms);
    all('[data-eval="cross-table"]').forEach(mountCrossTable);
    all('[data-eval="cfg-editor"]').forEach(mountConfig);
    mountReportTables();
    updatePicked();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  window.Evaluation = { FORMS: FORMS, STAFF: STAFF, UNITS: UNITS, GRADES: GRADES, fmt: fmt, gradeOf: gradeOf };
})();
