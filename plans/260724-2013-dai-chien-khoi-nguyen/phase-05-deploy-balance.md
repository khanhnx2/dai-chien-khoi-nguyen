---
phase: 5
title: Deploy & Balance
status: completed
priority: P2
effort: 0.5-1d
dependencies:
  - 4
---

# Phase 5: Deploy & Balance

## Overview
Đưa game lên GitHub Pages bằng GitHub Actions, kiểm thử cross-browser + mobile, và tinh chỉnh cân bằng (kéo–búa–bao, kinh tế, độ khó AI) cho vui và công bằng.

## Requirements
- Functional: mỗi lần push → tự build & deploy lên Pages; link chơi được trên máy tính lẫn điện thoại.
- Non-functional: tải nhanh, không lỗi console, cân bằng không có chiến thuật "imba".

## Architecture
- `.github/workflows/deploy-pages.yml`: checkout → setup node → `npm ci` → `npm run build` → upload `dist/` → `actions/deploy-pages`.
- Bật GitHub Pages (source = GitHub Actions) trong settings repo.
- Kiểm tra `base` path khớp tên repo.
- Cân bằng: chỉnh số trong `game-config.ts` dựa trên chơi thử.

## Related Code Files
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `vite.config.ts` (xác nhận `base`), `game-config.ts` (tinh chỉnh số)
- Modify: `README.md` (link chơi, hướng dẫn build/deploy)

## Implementation Steps
1. Viết workflow deploy Pages (permissions `pages: write`, `id-token: write`).
2. Push, bật Pages source = Actions, xác nhận deploy thành công.
3. Mở link trên Chrome/Safari/Firefox + điện thoại; sửa lỗi asset path / responsive nếu có.
4. Chơi thử nhiều ván: chỉnh giá lính/khắc chế/income/cooldown/độ khó AI trong config.
5. Kiểm tra console không lỗi, fps ổn khi đông lính.
6. Cập nhật README: link chơi + cách chạy local.

## Success Criteria
- [ ] Push → Actions build & deploy Pages tự động, không lỗi
- [ ] Link Pages chơi được trọn ván trên desktop + mobile
- [ ] Không lỗi console; asset load đúng qua `base` path
- [ ] Không có lính/chiến thuật thắng tuyệt đối (kéo–búa–bao cân)
- [ ] AI 3 mức tạo trải nghiệm khác biệt hợp lý
- [ ] README có link chơi + hướng dẫn

## Risk Assessment
- `base` path sai → Pages trắng trang. Mitigation: test ngay sau deploy đầu, đối chiếu tên repo.
- Cân bằng khó hội tụ. Mitigation: chỉ chỉnh config, ghi lại mốc số đã thử.
- Mobile touch/scale lỗi. Mitigation: Phaser scale FIT + test thật trên điện thoại.
