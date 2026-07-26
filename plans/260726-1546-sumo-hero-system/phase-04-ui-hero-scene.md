---
phase: 4
title: UI — Hero scene (Quán Phở Anh Khôi)
status: completed
priority: P2
effort: 3h
dependencies:
  - 1
  - 2
---

# Phase 4: UI — Hero scene (Quán Phở Anh Khôi)

## Overview
Scene mới "Quán Phở Anh Khôi": avatar Sumo + chỉ số hiện tại + nút Mở khoá (hoặc "Đã sở hữu") + 4 hàng nâng cấp ×2 (tiêu xu) + nút về menu.

## Requirements
- Functional: hiện Sumo, chỉ số hiệu dụng (đã fold HERO_UPGRADES), mua unlock + 4 nâng cấp, cập nhật tức thì sau mua, về menu.
- Non-functional: tái dùng `clayButton`, `theme`, mẫu `statsLines`/`buildRow` từ `upgrade-scene.ts` (DRY) — cân nhắc tách helper dùng chung; giữ scene < 200 dòng.

## Architecture
- `HeroScene extends Phaser.Scene` (key `'hero'`), theme giống `UpgradeScene`.
- Layout: tiêu đề "🍜 QUÁN PHỞ ANH KHÔI", xu góc phải, avatar `SUMO_FACE_KEY` + tên "Sumo", panel "Chỉ số hiện tại" (tái dùng logic `statsLines('Sumo', computePlayerMods())` — nếu tách helper chung thì import; nếu không, viết gọn tại chỗ), rồi:
  - Nếu chưa unlock: nút lớn "Mở khoá · {SUMO_UNLOCK_COST} 🪙" (đủ xu → xanh) → `unlockHero`. 4 hàng nâng cấp mờ/disabled.
  - Nếu unlocked: badge "✓ Đã sở hữu" + 4 hàng nâng cấp (`HERO_UPGRADES`) như `buildRow` (cấp/giá/TỐI ĐA), mua qua `buyHeroUpgrade`.
- Sau mỗi mua: `refreshCoins()` + dựng lại nội dung (cập nhật chỉ số + giá + trạng thái unlock) — mẫu như `upgrade-scene` đã làm.
- **DRY note:** `statsLines` + `buildRow` hiện private trong `upgrade-scene.ts`. Ưu tiên tách sang `src/ui/upgrade-row.ts` dùng chung. Nếu chi phí tách > lợi ích (KISS), chấp nhận sao chép có kiểm soát + ghi chú. Quyết định lúc code.

## Related Code Files
- Create: `src/scenes/hero-scene.ts`
- (Tùy chọn) Create: `src/ui/upgrade-row.ts` (helper dùng chung nếu tách)
- Modify: `src/scenes/upgrade-scene.ts` (nếu tách helper)
- Read: `src/systems/hero-shop.ts`, `src/systems/meta-upgrades.ts` (`computePlayerMods`)

## Implementation Steps
1. (UI-heavy, ít test tự động) — nếu tách `upgrade-row.ts`, thêm test nhẹ cho hàm thuần `statsLines('Sumo', mods)` trả đúng chuỗi (máu/sức mạnh… theo mods). Non-UI logic test được; render kiểm thủ công.
2. Viết `HeroScene`: build tiêu đề/xu/avatar/panel chỉ số.
3. Nhánh unlock vs owned (nút mở khoá / 4 hàng nâng cấp).
4. Wire mua → hero-shop → refresh.
5. Nút "◀ Về menu" → `scene.start('menu')`.
6. Đăng ký scene ở Phase 5 (`main.ts`). Verify render ở Phase 6.

## Success Criteria
- [ ] Scene 'hero' mở được, hiện avatar + chỉ số Sumo đúng.
- [ ] Chưa unlock: chỉ mua được mở khoá; sau mở khoá hiện 4 nâng cấp.
- [ ] Mua nâng cấp → chỉ số + giá + xu cập nhật ngay.
- [ ] Build sạch; scene < 200 dòng.

## Risk Assessment
- **Trùng lặp code với upgrade-scene:** giải quyết bằng tách `upgrade-row.ts` (ưu tiên) — giảm nợ kỹ thuật.
- **Avatar photo lệch tỉ lệ:** dùng `setDisplaySize` cố định như Father.
- **Chật màn (avatar + panel + 5 nút):** GAME_HEIGHT 540 — bố trí như `upgrade-scene`, kiểm ở Phase 6.
