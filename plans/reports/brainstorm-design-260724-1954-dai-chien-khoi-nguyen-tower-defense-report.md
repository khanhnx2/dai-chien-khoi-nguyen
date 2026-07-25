# Brainstorm Design — Đại chiến Khôi Nguyên

Ngày: 2026-07-24 · Loại: game web thủ thành (Age of War) · Trạng thái: đã chốt, chờ lập kế hoạch

## 1. Problem statement

Làm game web "Đại chiến Khôi Nguyên": thủ thành 2 bên đối đầu (Age of War). 2 thành — phe **Khôi** và phe **Nguyên**. Người chơi chọn 1 phe, máy cầm phe còn lại. Cá nhân hóa theo người thật (tên/màu/avatar). Mục tiêu: bản đầy đủ, triển khai chia lát.

## 2. Requirements (chốt)

- **Expected output**: game chạy trên trình duyệt (Phaser 3 + TS + Vite). Chọn Khôi/Nguyên → chơi Age of War → thắng/thua rõ ràng.
- **Acceptance (lát 1)**: chọn phe; đẻ 3 loại lính bằng vàng; lính tự đi & đánh nhau; 2 thành có máu; AI cầm phe địch; máu thành về 0 → thắng/thua.
- **Scope out**: multiplayer online, tài khoản, thanh toán, app mobile native.
- **Constraints**: web/browser · Phaser 3 + TypeScript + Vite · chữ tiếng Việt · giao chia lát.
- **Touchpoints**: greenfield, chưa có file nào.

## 3. Cơ chế lõi (Age of War)

- 2 thành 2 đầu màn hình, mỗi thành có HP. Phá thành địch về 0 = thắng.
- **Vàng**: thu nhập nền theo thời gian + thưởng khi giết lính địch.
- **Đẻ lính**: trả vàng → lính spawn ở thành mình, tự đi về thành địch trên 1 lằn đất, gặp địch trong tầm thì đánh. Mỗi loại có cooldown.
- **Population cap** để chống spam.

### Ba loại lính (kéo–búa–bao)

| Lính | Vai trò | Khắc chế |
|------|---------|----------|
| 🗡️ Bộ binh | rẻ, cận chiến, cân bằng | thắng cung thủ |
| 🏹 Cung thủ | bắn xa, giòn | thắng giáp binh |
| 🛡️ Giáp binh | trâu, chậm, đắt | thắng bộ binh |

### Phòng thủ & nâng cấp
- Nhân vật trên nóc thành tự bắn địch tới gần + kỹ năng đặc biệt bấm tay (cooldown). Xem "Đặc tả 2 thành".
- Nâng cấp bằng vàng: máu thành, mở lính mạnh, thu nhập vàng, đòn tấn công nóc thành.

## 3b. Đặc tả 2 thành (chốt 2026-07-24)

Chủ đề: khu phố Việt — **Quán Phở Anh Khôi** vs **Tạp hoá Thảo Nguyên**. Nhân vật trên nóc thành = tháp phòng thủ + kỹ năng đặc biệt.

### 🍜 Thành Khôi — "Quán Phở Anh Khôi"
- Kiến trúc: mặt tiền quán phở, biển hiệu chữ **"Quán Phở Anh Khôi"** (khói/bát phở). Có thanh máu.
- Nhân vật nóc: Khôi (ảnh mặt thật đã tách nền) ghép thân hoạt hình (tạp dề đầu bếp), tay **ném trứng**.
- Đòn — ném trứng 🥚: đạn bay **vòng cung** (trọng lực), rơi **nổ bẹt AoE nhỏ** trúng nhóm địch, nhịp bắn chậm.

### 🏪 Thành Nguyên — "Tạp hoá Thảo Nguyên"
- Kiến trúc: mặt tiền tiệm tạp hoá, biển hiệu chữ **"Tạp hoá Thảo Nguyên"** (kệ hàng). Có thanh máu.
- Nhân vật nóc: Nguyên (ảnh mặt thật đã tách nền) ghép thân hoạt hình, tay cầm **súng nước**.
- Đòn — bắn súng nước 💧: tia **thẳng, nhanh**, trúng **1 mục tiêu**, nhịp bắn nhanh.

### Cơ chế nóc thành (đối xứng)
- **Tự bắn**: tự nhắm & bắn địch vào tầm.
- **Kỹ năng bấm tay** (cooldown): Khôi = **mưa trứng** (loạt trứng dội 1 vùng); Nguyên = **xịt nước mạnh** (tia lớn đẩy lùi + sát thương dải).
- Chỉ số (damage/tầm/nhịp/cooldown/AoE) để trong file config, cân bằng sau. Lưu ý: trứng (cung, AoE) vs nước (thẳng, đơn) tạo chất riêng — phải canh cân bằng.

### Avatar & pipeline asset
- Nguồn: `player-khoi.png`, `player-nguyen.png` (256×256, ảnh mặt thật, hiện ở `~/Desktop/geometry dash/assets/characters/`).
- Bước 1: **copy** vào `assets/characters/` trong project (bắt buộc cho web build — không dùng đường dẫn tuyệt đối).
- Bước 2: **tách nền** RMBG → `*-cutout.png`.
- Bước 3: **ghép thân hoạt hình** + animation tay ném/bắn (vẽ đơn giản hoặc ai-artist).

### Lính reskin theo chủ đề (lát đánh bóng)
- Phe Khôi: tô phở/ớt...; phe Nguyên: gói snack/chai nước... Reskin nhẹ 3 lính kéo–búa–bao, giữ nguyên cơ chế.

### AI
- Vòng lặp: tích vàng → chọn lính phản kèo kéo–búa–bao → đẻ → nâng cấp → dùng skill. Có 2–3 mức khó.

### Cá nhân hóa
- Màn chọn Khôi (vd xanh) vs Nguyên (vd đỏ): tên + màu phe + avatar trên thành. Máy cầm phe còn lại.

## 4. Approaches đã cân nhắc

| | Phaser 3 + TS *(CHỌN)* | Canvas thuần + TS |
|---|---|---|
| Ưu | Engine 2D sẵn sprite/anim/audio/scene → ra bản đầy đủ nhanh | Không phụ thuộc, nhẹ, kiểm soát 100% |
| Nhược | Học API, bundle nặng hơn | Tự code anim/audio/scene, tốn công |

→ Chọn **Phaser 3 + TypeScript + Vite** vì hợp mục tiêu bản đầy đủ.

Lối chơi đã cân nhắc: Age of War *(chọn)* vs TD cổ điển vs đấu thẻ Clash-Royale. Chọn Age of War vì khớp mô tả "2 thành 2 bên".

## 5. Chiến lược chia lát (vẫn đạt bản đầy đủ)

- **Lát 1 — Chơi được**: 2 thành + HP, 3 loại lính, vàng thu nhập nền, AI cơ bản, chọn phe, thắng/thua. Đồ họa khối/màu placeholder.
- **Lát 2 — Chiều sâu**: nâng cấp, tháp + kỹ năng đặc biệt, thưởng vàng khi giết, population cap, 2–3 mức AI.
- **Lát 3 — Đánh bóng**: sprite/animation, âm thanh, hiệu ứng, avatar cá nhân hóa Khôi/Nguyên, màn hình menu/kết quả.

## 6. Rủi ro & giảm thiểu

- **Sa lầy polish** → chia lát, lát 1 phải chơi được trước.
- **Cân bằng kéo–búa–bao** → để số liệu (máu/damage/giá/cooldown) trong 1 file config dễ chỉnh.
- **AI dở/quá khó** → tách logic AI riêng, thêm mức khó, test tay.
- **Vòng game (game loop) rối** → dùng scene + hệ thống update của Phaser, tách entity (thành/lính/đạn) rõ ràng.

## 7. Success metrics

- Chơi trọn 1 ván end-to-end không crash.
- 3 loại lính tạo được thế kéo–búa–bao rõ (không có 1 lính "imba").
- AI đủ sức tạo thách thức ở mức thường; người chơi thắng/thua tùy kỹ năng.

## 8. Next steps

- Lập kế hoạch chi tiết theo lát (đề xuất `/ck:plan`).
- Khởi tạo project Vite + Phaser 3 + TS ở lát 1.

## Deploy

- Mục tiêu: **GitHub Pages** (file tĩnh). Stack Phaser+Vite build ra `dist/` tĩnh → tương thích hoàn toàn (AI client-side, không backend).
- Cần: set `base: '/dai-chien-khoi-nguyen/'` trong `vite.config.ts` (project page); load asset theo base; deploy bằng GitHub Actions.
- Lưu điểm cao (nếu làm): dùng `localStorage`, không cần server.

## Unresolved questions

- Màu phe cho HP bar / tint lính: Khôi xanh dương, Nguyên đỏ? (mặc định, chỉnh sau)
- Ván chơi 1 lằn đất (1 lane) hay lính đi tự do trên nền đất rộng? (mặc định lát 1: 1 lane cho đơn giản)
- Có cần lưu điểm cao (localStorage) không? (mặc định: chưa, scope out)
- Thân hoạt hình cho Khôi/Nguyên: tự vẽ hay tạo bằng ai-artist? (quyết ở lát đánh bóng)
