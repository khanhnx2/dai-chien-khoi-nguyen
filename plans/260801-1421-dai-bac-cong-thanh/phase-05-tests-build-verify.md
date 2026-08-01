---
phase: 5
title: Tests & build verify
status: completed
priority: P2
effort: 1h
dependencies:
  - 4
---

# Phase 5: Tests & build verify

## Overview
Test mô phỏng cho gating + bắn + nâng cấp đại bác, verify build/test và kiểm UI bằng mắt.

## Requirements
- Functional: cover 3 nhóm — gating (`usableCannon`), hành vi bắn (nhịp/tầm/sát thương), fold nâng cấp vào mods.
- Non-functional: theo pattern `check()` + Phaser stub sẵn có; không browser cho phần logic.

## Architecture
- Dùng `Cannon` thật + `Unit`/`Projectile` thật với stub scene (`makeGO()` đã chainable đủ: `setOrigin`/`setDisplaySize`/`setVisible`...).
- Test bắn: gọi `cannon.update(now, units, projectiles)` trực tiếp rồi kiểm `projectiles.length` + `projectiles[0].damage`; sau đó `updateProjectiles` để xác nhận lính trúng đúng damage.
- Test gating dùng `buyUpgrade(CANNON_UNLOCK)` để mở khoá trong bộ nhớ (localStorage fallback đã có trong meta-upgrades).

## Related Code Files
- Modify: `test/simulation.test.ts`

## Implementation Steps
1. Import `Cannon`, `usableCannon`, `CANNON_UNLOCK`, `CANNON_DAMAGE`, `CANNON_COOLDOWN_MS`, `CANNON_RANGE`, `CANNON_MIN_STAGE`, `CANNON_UPGRADES`.
2. Check `đại bác: gating theo unlock + màn`:
   - Trạng thái sạch (`resetMetaProgress()`): `usableCannon(99)===false`.
   - `addCoins(999)` + `buyUpgrade(CANNON_UNLOCK)` → `usableCannon(39)===false`, `usableCannon(40)===true`.
3. Check `đại bác: bắn 1 viên/5s, 1000 dmg, tầm 400`:
   - Cannon Khôi; lính Nguyên trong tầm (vd x = frontX + 300) và 1 lính ngoài tầm (x = frontX + 500).
   - `update(now=1000)` → `projectiles.length===1`, `damage===CANNON_DAMAGE`.
   - `update(now=3000)` (chưa đủ 5s) → vẫn 1 đạn.
   - `update(now=6100)` → 2 đạn.
   - Chạy `updateProjectiles` tới khi đạn trúng → lính gần mất đúng 1000 máu; lính ngoài tầm nguyên vẹn.
4. Check `đại bác: mods dmg/cd áp đúng`:
   - `new Cannon(scene, Side.Khoi, 2, 0.5)` → đạn `damage===2000`; sau khi bắn ở `now=1000`, `update(now=3600)` (2500ms < 2600ms? — dùng mốc rõ ràng: cd hiệu dụng 2500ms nên `update(3400)` chưa bắn, `update(3600)` bắn) → xác nhận nhịp rút ngắn theo `cdMult`.
5. Check `đại bác: nâng cấp fold vào computePlayerMods`:
   - `resetMetaProgress()` → `computePlayerMods().cannonDmg===1`.
   - Mua `CANNON_UPGRADES[0]` → `.cannonDmg > 1`; mua `CANNON_UPGRADES[1]` → `.cannonCd < 1`.
6. Chạy `npm test` (tất cả xanh, gồm test cũ `nóc thành: tự bắn hạ lính địch` để chắc refactor không vỡ) + `npm run build`.
7. Kiểm UI bằng mắt (dev server): menu có nút 💣 không đè nút khác → shop hiện stats đúng → mua unlock → vào trận màn 40 thấy cannon sau thành + đạn bay.

## Success Criteria
- [ ] 4 check mới pass; toàn bộ test cũ vẫn pass (đặc biệt test nóc thành sau refactor targeting).
- [ ] `npm run build` xanh.
- [ ] Screenshot: menu (nút không đè), shop (stats đúng), trận màn 40 (cannon hiện + bắn).

## Risk Assessment
- Test nhịp bắn dễ off-by-one quanh mốc cooldown → chọn mốc thời gian cách xa ranh giới (3000 vs 6100 thay vì 5999/6001).
- Trạng thái meta-upgrades là singleton toàn cục giữa các check → BẮT BUỘC `resetMetaProgress()` đầu mỗi check liên quan để không phụ thuộc thứ tự chạy (test 46 hiện có cũng dùng pattern này).
- Verify UI cần dev server; các lần trước renderer từng kẹt do HMR churn → restart server sạch trước khi chụp.
