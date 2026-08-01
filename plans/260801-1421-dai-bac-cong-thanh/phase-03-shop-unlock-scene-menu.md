---
phase: 3
title: Shop unlock scene & menu
status: completed
priority: P1
effort: 1.5h
dependencies:
  - 1
---

# Phase 3: Shop unlock scene & menu

## Overview
Shop riêng cho đại bác: mở khoá 240 xu + 2 hàng nâng cấp, kèm nút vào shop ở menu chính.

## Requirements
- Functional: `cannon-shop.ts` (unlock/gating); scene `'cannon'` hiển thị stats + nút mở khoá → sau khi mở hiện 2 hàng nâng cấp; nút menu mở scene.
- Non-functional: tái dùng `ui-kit`/`upgrade-row`/`meta-upgrades`; `menu-scene.ts` giữ ≤200 dòng (đã đúng 200 → BẮT BUỘC tách nút ra module riêng).

## Architecture
- `cannon-shop.ts` mirror `titan-shop.ts` nhưng đơn giản hơn (không có tham số phe):
  - `isCannonUnlocked(): boolean` — `getLevel(CANNON_UNLOCK.id) >= 1`.
  - `unlockCannon(): boolean` — `buyUpgrade(CANNON_UNLOCK)`.
  - `usableCannon(stage: number): boolean` — `isCannonUnlocked() && stage >= CANNON_MIN_STAGE`. **Đây là điểm gating DUY NHẤT** cho cả 2 điều kiện; battle-scene chỉ gọi hàm này.
- `cannon-shop-scene.ts` mirror `titan-shop-scene.ts`, KHÁC: không có `init(data)` theo id (chỉ 1 đại bác duy nhất).
  - Chưa mở khoá: dòng mô tả + nút "🔓 Mở khoá Đại bác · 240 🪙" (disable nếu thiếu xu).
  - Đã mở khoá: dòng nhắc điều kiện màn ≥40 + 2 `buildUpgradeRow` cho `CANNON_UPGRADES`.
- Stats panel: `buildStatsPanel` hiện tra `GROUP_UNIT[group]` (map group→UnitType) rồi mới tới nhánh `'Thành'`/mặc định. Cannon KHÔNG phải unit → cần nhánh riêng. Thêm case `group === 'Đại bác'` trong `statsLines` trả về 2 dòng đọc từ `computePlayerMods()`:
  `💥 Sát thương {Math.round(CANNON_DAMAGE * mods.cannonDmg)}  ·  🎯 Tầm {CANNON_RANGE}` và `⏱️ Nhịp bắn {(CANNON_COOLDOWN_MS*mods.cannonCd/1000).toFixed(1)}s  ·  🔓 Từ màn {CANNON_MIN_STAGE}`.
- Nút menu: file riêng `src/ui/cannon-shop-button.ts` mirror `reset-progress-button.ts`, đặt cột trái dưới nút "Chơi lại từ đầu" (y≈196) — menu-scene chỉ thêm 1 dòng gọi.

## Related Code Files
- Create: `src/systems/cannon-shop.ts`
- Create: `src/scenes/cannon-shop-scene.ts`
- Create: `src/ui/cannon-shop-button.ts`
- Modify: `src/ui/upgrade-row.ts` (nhánh statsLines cho nhóm 'Đại bác')
- Modify: `src/scenes/menu-scene.ts` (1 dòng gọi nút)
- Modify: `src/main.ts` (đăng ký scene)

## Implementation Steps
1. `cannon-shop.ts`: 3 hàm như trên (import `CANNON_UNLOCK`, `CANNON_MIN_STAGE`, `buyUpgrade`, `getLevel`).
2. `upgrade-row.ts` `statsLines`: thêm nhánh `if (group === 'Đại bác') return [...]` TRƯỚC nhánh `'Thành'`.
3. `cannon-shop-scene.ts`: scene key `'cannon'`; tiêu đề "💣 ĐẠI BÁC"; `buildStatsPanel(this, content, 'Đại bác', 172)`; nút "◀ Về menu"; nhánh unlock/upgrade như Architecture; mỗi lần mua gọi `this.rebuild()`.
4. `main.ts`: import + thêm `CannonShopScene` vào mảng `scene`.
5. `cannon-shop-button.ts`: `buildCannonShopButton(scene)` — clayButton nhỏ (150×30, fontSize 11), label `💣 Đại bác`, `onClick: () => scene.scene.start('cannon')`.
6. `menu-scene.ts`: import + gọi `buildCannonShopButton(this)` ngay sau `buildResetProgressButton(this)`.

## Success Criteria
- [ ] Menu có nút "💣 Đại bác" → mở scene shop, hiện stats đúng (1000 dmg / 400 tầm / 5.0s / từ màn 40).
- [ ] Mua 240 xu → `isCannonUnlocked()` true (persist localStorage), scene chuyển sang hiện 2 hàng nâng cấp.
- [ ] Mua nâng cấp Sát thương → dòng stats cập nhật (1000 → 1060 ở cấp 1).
- [ ] `usableCannon(39)===false` dù đã unlock; `usableCannon(40)===true`; chưa unlock → false ở mọi màn.
- [ ] `menu-scene.ts` ≤200 dòng; `npm run build` xanh.

## Risk Assessment
- `statsLines` hiện fallback về nhánh income nếu group lạ → nếu quên thêm nhánh 'Đại bác', panel hiện sai (thu nhập) mà KHÔNG lỗi build. Mitigation: success criteria kiểm nội dung panel bằng mắt ở phase 5.
- Quên đăng ký scene ở `main.ts` → `scene.start('cannon')` im lặng không làm gì. Mitigation: bước 4 riêng + kiểm ở phase 5.
- Menu cột trái đang có 4 nút (Nâng cấp, hero, titan, reset) → thêm nút thứ 5 có thể chật. Mitigation: kiểm layout bằng screenshot ở phase 5, chỉnh y nếu đè.
