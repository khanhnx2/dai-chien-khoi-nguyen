---
phase: 1
title: Setup & Scaffold
status: completed
priority: P1
effort: 3-4h
dependencies: []
---

# Phase 1: Setup & Scaffold

## Overview
Dựng khung project Vite + Phaser 3 + TypeScript, cấu hình sẵn cho GitHub Pages, tạo khung scene và file config trung tâm. Kết thúc phase: mở trình duyệt thấy màn hình trống Phaser chạy được, build ra `dist/` OK.

## Requirements
- Functional: `npm run dev` chạy game rỗng; `npm run build` xuất `dist/` tĩnh.
- Non-functional: cấu trúc thư mục rõ, mỗi file < 200 dòng, TS strict.

## Architecture
```
src/
  main.ts                 # khởi tạo Phaser.Game
  config/game-config.ts   # HẰNG SỐ gameplay (HP, giá lính, cooldown...) — nguồn chân lý cân bằng
  scenes/
    boot-scene.ts         # load tối thiểu → sang Preload
    preload-scene.ts      # nạp asset (P1: chưa có, để trống)
    menu-scene.ts         # màn chọn phe Khôi/Nguyên (P1: nút placeholder)
    battle-scene.ts       # màn chơi chính (P1: nền trống)
index.html
vite.config.ts            # base path cho Pages
```
- Phaser game config: `type: AUTO`, `scale.mode: FIT`, `backgroundColor`, danh sách scene.
- `game-config.ts` là chỗ DUY NHẤT chứa số liệu — mọi phase sau đọc từ đây (DRY).

## Related Code Files
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `src/main.ts`, `src/config/game-config.ts`
- Create: `src/scenes/{boot,preload,menu,battle}-scene.ts`
- Create: `.gitignore`, `README.md`

## Implementation Steps
1. `npm init` + cài `phaser`, `vite`, `typescript` (devDeps: `@types/...` nếu cần).
2. `tsconfig.json`: `strict: true`, `target ES2020`, `moduleResolution bundler`.
3. `vite.config.ts`: đặt `base: '/dai-chien-khoi-nguyen/'` (project page) — comment rõ đổi sang `'/'` nếu dùng custom domain/user page.
4. `index.html`: 1 `<div id="game">` + `<script type="module" src="/src/main.ts">`.
5. `main.ts`: tạo `Phaser.Game` với 4 scene, scale FIT, kích thước gốc (vd 960×540).
6. Viết 4 scene khung: Boot→Preload→Menu→Battle (Menu có 2 nút text "Khôi"/"Nguyên" placeholder chuyển sang Battle).
7. `game-config.ts`: khai báo struct rỗng có comment cho các nhóm số (bases, gold, units, roof-attacks) — điền dần ở phase sau.
8. `npm run dev` kiểm tra chạy; `npm run build` kiểm tra ra `dist/`.

## Success Criteria
- [ ] `npm run dev` mở game, chuyển được Menu → Battle bằng nút placeholder
- [ ] `npm run build` xuất `dist/` không lỗi TS
- [ ] `game-config.ts` tồn tại, có nhóm hằng số + comment
- [ ] `vite.config.ts` có `base` đúng cho Pages
- [ ] Không file `.ts` nào > 200 dòng

## Risk Assessment
- Sai `base` path → trang trắng trên Pages. Mitigation: comment rõ + test ở P5.
- Phiên bản Phaser/Vite lệch → lỗi build. Mitigation: pin version trong `package.json`.
