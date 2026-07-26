---
phase: 2
title: Assets cutout & preload
status: completed
priority: P1
effort: 45m
dependencies:
  - 1
---

# Phase 2: Assets cutout & preload

## Overview
Tách nền 2 avatar Desktop → cutout PNG vào assets/characters + nạp texture ở preload.

## Requirements
- Functional: `assets/characters/capibara-cutout.png` + `totoro-cutout.png` (nền trong suốt); nạp vào Phaser với `CAPIBARA_FACE_KEY`/`TOTORO_FACE_KEY`.
- Non-functional: file ảnh gọn (~vài trăm KB) để build nhẹ.

## Architecture
- Tách nền bằng công cụ có sẵn (rmbg AI hoặc imagemagick). Nguồn: `/Users/khanhnx/Desktop/capibara.png` (1MB), `/Users/khanhnx/Desktop/totoro.png` (400KB).
- Import qua Vite (`import xUrl from '../../assets/characters/x-cutout.png'`) như các avatar khác → đúng base path GitHub Pages.

## Related Code Files
- Create: `assets/characters/capibara-cutout.png`, `assets/characters/totoro-cutout.png`
- Modify: `src/scenes/preload-scene.ts`

## Implementation Steps
1. Tách nền (ưu tiên RMBG skill `media-processing`, fallback imagemagick fuzz). Kiểm mắt thường nền trong suốt, chủ thể nguyên vẹn.
   - Nếu nền phức tạp/không sạch → dùng `ai-multimodal`/rmbg; nếu vẫn xấu, báo user để cấp ảnh nền đơn giản.
2. Lưu vào `assets/characters/` đúng tên cutout. (Optional: giảm kích thước ~256px nếu ảnh quá lớn.)
3. `preload-scene.ts`: import 2 url + `this.load.image(CAPIBARA_FACE_KEY, capibaraUrl)` / `TOTORO_FACE_KEY`.

## Success Criteria
- [ ] 2 file cutout tồn tại, nền trong suốt.
- [ ] Preload nạp không lỗi (kiểm ở phase 6 / dev server: titan hiện ảnh, không phải ô trống/emoji).
- [ ] `npm run build` xanh (Vite resolve import ảnh).

## Risk Assessment
- Tách nền tự động có thể để viền/lỗ. Mitigation: kiểm bằng mắt; xấu thì chỉnh tay hoặc xin ảnh khác. Không chặn logic (emoji fallback vẫn chạy nếu thiếu key — nhưng mục tiêu là có ảnh).
