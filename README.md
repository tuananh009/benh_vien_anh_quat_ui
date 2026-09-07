# Bản mẫu giao diện

21 màn hình HTML tĩnh của **Trung tâm điều hành số Bệnh viện Đa khoa Anh Quất**,
dựng để bệnh viện xem và góp ý trước khi lập trình phần mềm thật.

Repo này **chỉ chứa bản mẫu giao diện** — không có mã nguồn máy chủ, không có lược đồ cơ sở
dữ liệu, không có tài liệu đặc tả. Những thứ đó nằm ở repo riêng tư của dự án.

Mở `index.html` là vào thẳng màn **Quản lý người dùng** — đúng như hệ thống thật khi
người quản trị đăng nhập. Danh sách đầy đủ các màn hình ở `screens.html`,
hoặc bấm *Tất cả màn hình* ở cuối menu bên.

Không có bước build, không có phụ thuộc ngoài. Mở `index.html` bằng trình duyệt là chạy.

---

## Xem thử

```bash
# Cách 1 — mở trực tiếp
open index.html

# Cách 2 — chạy máy chủ tĩnh, xem được từ điện thoại trong cùng mạng Wi-Fi
python3 -m http.server 8080
# rồi mở http://<địa-chỉ-IP-máy>:8080 trên điện thoại
```

Để xem bố cục điện thoại trên máy tính: thu hẹp cửa sổ trình duyệt dưới 768px,
hoặc bật chế độ thiết bị di động trong công cụ nhà phát triển.

---

## Cấu trúc

```
├── index.html            MH-A08  Quản lý người dùng — trang vào đầu tiên
├── screens.html          mục lục toàn bộ màn hình
├── assets/
│   ├── app.css           toàn bộ token màu, chữ, và thư viện component
│   └── app.js            khung ứng dụng dùng chung + tương tác
│
├── login.html            MH-A01  Đăng nhập
├── two-factor.html       MH-A01  Xác thực hai lớp
├── activate.html         MH-A02  Kích hoạt tài khoản
├── change-password.html  MH-A02  Đổi mật khẩu lần đầu
├── devices.html          MH-A02  Thiết bị của tôi
│
├── my-tasks.html         MH-A05  Việc của tôi ★
├── task-detail.html      MH-A06  Chi tiết nhiệm vụ
├── tasks.html            MH-A04  Danh sách nhiệm vụ — 5 cách xem
├── task-create.html      MH-A07  Giao việc
├── task-split.html       MH-B04  Chia việc ★
├── shift-handover.html   MH-B07  Việc tồn cuối ca
├── notifications.html    MH-A12  Thông báo
│
├── unit-dashboard.html   MH-B02  Bảng điều khiển đơn vị
├── exec-dashboard.html   MH-B01  Bảng điều khiển Ban Giám đốc
├── task-report.html      MH-B08  Báo cáo nhiệm vụ
│
├── user-import.html      MH-A09  Nhập tài khoản từ Excel
├── org-units.html        MH-A10  Cơ cấu tổ chức
├── task-templates.html   MH-B06  Danh mục công việc chuẩn
└── audit-log.html        MH-A11  Nhật ký hệ thống
```

Tên tệp bằng tiếng Anh theo quy ước đặt tên của dự án — mọi chữ hiển thị trên màn hình
là tiếng Việt. URL công khai sẽ có dạng `…/my-tasks.html`; đường dẫn tiếng Việt trong
sitemap (`/nhiem-vu/cua-toi`) là việc của React Router ở `apps/fe`, không áp dụng cho tệp tĩnh.

---

## Khung ứng dụng nằm trong `app.js`

Thanh trên, menu bên và thanh điều hướng đáy được sinh ra một lần trong `assets/app.js`,
rồi chèn vào từng màn hình. Thêm một mục menu thì sửa một chỗ, không phải sửa 15 tệp.

Mỗi màn hình khai báo bằng thuộc tính trên thẻ `<body>`:

```html
<body data-screen="my-tasks" data-role="cbnv" data-unread="3">
  <div class="app">
    <div data-shell="topbar"></div>
    <div class="shell">
      <div data-shell="sidebar"></div>
      <main class="main"><div class="page"> … </div></main>
    </div>
    <div data-shell="bottomnav"></div>
  </div>
```

| Thuộc tính | Ý nghĩa |
|---|---|
| `data-screen` | Mã màn hình trong `SCREENS` — quyết định mục menu nào đang sáng |
| `data-role` | `cbnv` · `manager` · `board` · `admin` — quyết định menu nào hiện ra và logo dẫn về đâu |
| `data-unread` | Số trên chuông thông báo |

Thanh điều hướng đáy **chỉ hiện với `data-role="cbnv"`**, đúng theo sitemap: các vai trò khác
có quá nhiều mục để nhét vừa ba ô.

Logo trên thanh trên dẫn về "nhà" của từng vai trò: `cbnv` → Việc của tôi ·
`manager` → Bảng điều khiển đơn vị · `board` → Bảng điều khiển Ban Giám đốc ·
`admin` → Quản lý người dùng. Đây chính là bộ định tuyến `/trang-chu` theo vai trò trong sitemap.

---

## Đã theo đúng những gì trong tài liệu thiết kế

| Ràng buộc | Nguồn |
|---|---|
| Màu hành động là xanh `#0069AD`, không dùng cam `#ED3E0F` | `30-Nhan-dien-thuong-hieu.md` mục 2 |
| Nút ≥ 44px, chữ trong ô nhập ≥ 16px | `00-Quy-uoc-va-Component.md` mục 2.1–2.2 |
| Trạng thái và quá hạn là **hai huy hiệu tách rời** | mục 2.5–2.6 · `A-TASK-02` |
| P1/P2 nền đặc, P3/P4 viền | mục 2.7 |
| Nhóm rỗng ẩn hoàn toàn, không hiện "(0)" | mục 3.5 |
| Bảng trên điện thoại chuyển thành thẻ, không cuộn ngang | mục 2.9 |
| Đủ năm trạng thái màn hình | mục 7 — xem `my-tasks.html`, có nút chuyển giữa bốn trạng thái |
| Bảng điều khiển quản lý theo ngoại lệ, khối rỗng ẩn hoàn toàn | `05-MH-B02` mục 1.1 · `06-MH-B01` mục 1.1 |
| Tám khối bảng điều khiển đơn vị đúng thứ tự cố định 1 → 8 | `05-MH-B02` mục 3 |
| P1 trên bảng BGĐ không thu gọn, hiện đã leo thang tới ai | `06-MH-B01` mục 3.1 |
| Chia việc: mẫu tự điền nhưng mọi trường đều sửa được | `B-MASTER-02` |
| Người đang nghỉ phép hiện mờ kèm chú thích, không bị ẩn | `00-Quy-uoc` mục 2.3 |
| Bàn giao cuối ca: việc chưa có người nhận tiếp hiện nền đỏ | `B-ESC-03` |
| Mẫu công việc đang được dùng thì khoá sửa, phải tạo phiên bản mới | `B-MASTER-03` |
| SLA tính bằng giờ liên tục, không có "ngày làm việc" | `B-MASTER-01` · `A-LAP-03` |
| Số liệu báo cáo là tham chiếu, không tự quy đổi thành điểm thi đua | `D-SOLIEU-03` |
| Thêm/sửa của quản trị mở panel trượt từ phải | `13-Man-hinh-quan-tri.md` mục 1 |
| Màn hình quản trị chỉ dùng máy tính, điện thoại hiện thông báo | `13-Man-hinh-quan-tri.md` mục 11 |
| Hạn gốc không đổi, hiện cạnh hạn hiện tại | `A-TASK-03` — xem `task-detail.html` |
| Không hiển thị mật khẩu ở bất kỳ đâu, chỉ có mã kích hoạt | `13-Man-hinh-quan-tri.md` mục 2.5 |
| Tôn trọng `prefers-reduced-motion` | `00-Quy-uoc-va-Component.md` mục 5 |

---

## Giới hạn của bản mẫu

- **Dữ liệu là dữ liệu giả**, viết thẳng trong HTML. Không có API, không lưu gì cả.
- Nút bấm chạy hiệu ứng chờ rồi hiện thông báo — không thay đổi dữ liệu.
- Cây đơn vị chưa kéo thả được; bảng chưa sắp xếp được khi bấm tiêu đề cột.
- Ở màn Chia việc, chọn mẫu chưa thực sự tự điền lại các trường bên dưới.
- Chưa có màn hình Phần B2, C, D, E, G — xem mục *Chưa dựng* ở `screens.html`.
- Logo là hình vẽ tạm bằng SVG. Cần bản logo gốc của bệnh viện để thay.

---

## Đưa lên GitHub Pages

`index.html` nằm ngay gốc repo nên không cần workflow gì cả:

1. Tạo repo **public** trên GitHub rồi đẩy nhánh `main` lên.
2. Vào **Settings → Pages → Source**, chọn **Deploy from a branch**.
3. Chọn nhánh `main`, thư mục `/ (root)`, bấm **Save**.
4. Đợi 1–2 phút, GitHub hiện địa chỉ trang ở ngay mục đó.

Địa chỉ: `https://<tài-khoản>.github.io/<tên-repo>/` — vào thẳng màn Quản lý người dùng.

Mỗi lần đẩy commit mới lên `main` là trang tự cập nhật. Tệp `.nojekyll` giữ cho GitHub
không chạy Jekyll xử lý lại các tệp tĩnh.

> ⚠️ **Repo phải là public.** GitHub Pages trên repo riêng tư cần gói Pro/Team trở lên,
> và kể cả khi đó thì **trang vẫn công khai** — repo riêng tư không làm trang riêng tư.
> Chỉ Enterprise Cloud mới giới hạn được người xem.
>
> Bản mẫu này không chứa dữ liệu người bệnh, nhưng có cơ cấu tổ chức bệnh viện và số điện
> thoại phòng ban lấy từ tài liệu. Nếu bệnh viện không muốn công khai, dùng Netlify hoặc
> Cloudflare Pages — hai dịch vụ đó đặt được mật khẩu cho trang xem thử.
