# Đại chiến Khôi Nguyên

Game web thủ thành 2 bên (Age of War): **Quán Phở Anh Khôi** vs **Tạp hoá Thảo Nguyên**.
Người chơi chọn 1 phe, máy (AI) cầm phe còn lại. Phá thành địch = thắng.

**Stack:** Phaser 3 + TypeScript + Vite · **Deploy:** GitHub Pages.

## Chạy local

```bash
npm install
npm run dev      # mở game ở http://localhost:5173
npm run build    # kiểm tra type + build ra dist/
npm test         # chạy test mô phỏng logic (13 case)
```

## Cách chơi

- Chọn mức khó (Dễ / Thường / Khó) + chọn phe (Khôi hoặc Nguyên).
- Tiêu vàng đẻ 3 loại lính: 🥊 Bộ binh · 🏹 Cung thủ · 🛡️ Giáp binh (kéo–búa–bao).
- Nhân vật trên nóc thành tự bắn (Khôi ném trứng, Nguyên xịt nước); nút kỹ năng đặc biệt có hồi chiêu.
- Mua nâng cấp (thu nhập / máu thành / sức bắn). Phá thành địch = thắng.

## Cấu trúc

```
src/
  main.ts                 # khởi tạo Phaser.Game
  config/game-config.ts   # NGUỒN CHÂN LÝ mọi chỉ số gameplay (cân bằng ở đây)
  scenes/                 # boot → preload → menu → battle → result
  entities/               # base, unit, roof-attacker, projectile
  systems/                # economy, spawn, combat, projectile-system, upgrades, special-ability
  ai/                     # basic-ai (mức khó)
  ui/                     # battle-hud, upgrade-panel
  audio/                  # sound-manager (Web Audio, không cần file)
assets/characters/        # avatar thật (đã tách nền)
test/                     # simulation.test.ts (chạy bằng tsx)
```

## Deploy lên GitHub Pages

Đã có sẵn workflow `.github/workflows/deploy-pages.yml` (build + deploy mỗi lần push `main`).

1. Tạo repo GitHub **tên `dai-chien-khoi-nguyen`** (khớp `base` trong `vite.config.ts`).
2. Push code lên nhánh `main`.
3. Repo → **Settings → Pages → Build and deployment → Source = GitHub Actions**.
4. Push sẽ tự build & deploy; link chơi: `https://<user>.github.io/dai-chien-khoi-nguyen/`.

> Dùng custom domain / user page (`<user>.github.io`) thì đổi `base` trong `vite.config.ts` thành `'/'`.

## Cân bằng

Mọi chỉ số ở `src/config/game-config.ts` — chỉnh trực tiếp để cân bằng.
Đã kiểm bằng test: khắc chế kéo–búa–bao có hiệu lực, thành hạ được, **phe mạnh (Hard) thắng phe yếu (Easy)**.

> **Lưu ý cân bằng:** trận AI-vs-AI cùng mức "Thường" có thể **giằng co ở giữa sân** (2 tuyến quân cân bằng, không bên nào phá được thành). Người chơi thật phá thế bế tắc bằng kỹ năng (mưa trứng/xịt nước dọn tuyến), nâng cấp, và chọn lính khắc chế. Nếu muốn trận luôn có nhịp dứt điểm, có thể thêm cơ chế "tăng thu nhập theo thời gian" — hỏi trước khi thêm vì đây là quyết định thiết kế.

## Lộ trình

Xem [plans/260724-2013-dai-chien-khoi-nguyen/plan.md](plans/260724-2013-dai-chien-khoi-nguyen/plan.md).
