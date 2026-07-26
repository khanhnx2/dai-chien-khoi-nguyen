---
phase: 6
title: Battle HUD Sumo gating + full verify
status: completed
priority: P2
effort: 2h
dependencies:
  - 1
  - 2
  - 3
  - 4
  - 5
---

# Phase 6: Battle HUD Sumo gating + full verify

## Overview
Nút đẻ Sumo trong trận **chỉ khi cầm Khôi + đã mở khoá**; wire spawn qua đường sẵn có; verify tổng thể end-to-end trong trình duyệt (charge/rút lui/hồi/sủa/UI).

## Requirements
- Functional: cầm Khôi + unlocked → có nút "Sumo · {giá}💰" (giá đã áp giảm giá); cầm Nguyên HOẶC chưa unlock → không có nút. Bấm → đẻ Sumo bằng vàng (hồi chiêu, cap 20 như troop).
- Non-functional: không đụng 4 nút troop hiện có / phe Nguyên.

## Architecture
- **Gating predicate thuần** (test được): `canUseHero(side, unlocked)` = `side === Side.Khoi && unlocked`. Đặt trong `hero-shop.ts`.
- `battle-hud.ts`: KHÔNG thêm Sumo vào `PLAYER_SPAWN_ORDER`. Sau vòng dựng 4 nút, nếu `canUseHero(playerSide, isHeroUnlocked('sumo'))` → dựng nút Sumo thứ 5 tại `x = 14 + 4*132 = 542` (còn chỗ trong 960), callback `cb.onSpawn(UnitType.Sumo)`. `update()` cập nhật giá/hồi chiêu như nút khác (chỉ khi nút tồn tại).
- `battle-scene.ts`: `onPlayerSpawn` đã generic (`spawn.trySpawn(playerSide, type, ...)`) → Sumo đi qua y hệt. Không cần sửa (spawn/combat/roof/projectile đã xử lý Sumo từ Phase 3). Xác nhận `updateBattle` gọi hero-behavior cho Sumo (Phase 3).
- Đảm bảo `spawnX(Khoi)` + spawn cost dùng `mods.unitCost[Sumo]` (đã có từ config).

## Related Code Files
- Modify: `src/systems/hero-shop.ts` (`canUseHero`)
- Modify: `src/ui/battle-hud.ts` (nút Sumo gated)
- Verify (đọc): `src/scenes/battle-scene.ts` (không cần sửa nếu spawn generic)
- Modify: `test/simulation.test.ts`

## Implementation Steps
1. **Test trước:** `canUseHero(Khoi, true)`===true; `(Khoi,false)`===false; `(Nguyen,true)`===false. `npm test` → RED.
2. `hero-shop.ts`: thêm `canUseHero`.
3. `battle-hud.ts`: dựng nút Sumo có điều kiện + cập nhật trong `update()` (guard tồn tại).
4. `npm run build` + `npm test` → GREEN.
5. **Verify trình duyệt (end-to-end)** — dùng preview + Browser pane:
   - Menu → "Quán Phở Anh Khôi" → mở khoá Sumo (nạp xu test) → chỉ số cập nhật.
   - Vào trận cầm **Khôi** → có nút Sumo → đẻ → quan sát: charge ×4 khi thấy địch, đánh nhịp nhanh, **nghe tiếng sủa** cách quãng, xuống 50% máu **chạy về hồi** rồi lao lại.
   - Vào trận cầm **Nguyên** → KHÔNG có nút Sumo.
   - Console không lỗi; dọn localStorage test về gốc sau khi verify.

## Success Criteria
- [ ] Test gating pass; toàn bộ suite pass.
- [ ] Khôi+unlocked thấy nút Sumo; Nguyên/chưa-unlock không thấy.
- [ ] E2E: charge/rút lui/hồi máu/sủa hoạt động đúng, không lỗi console.
- [ ] Build sạch; `battle-hud.ts` gọn.

## Risk Assessment
- **Nút thứ 5 tràn/đè special:** special ở `GAME_WIDTH-170`; nút Sumo ở x≈542 (mép ~600) — còn hở. Kiểm screenshot.
- **iOS/PWA:** không đổi scale; an toàn.
- **Cân bằng OP:** ghi nhận để tinh chỉnh số sau khi chơi thử (không chặn nghiệm thu chức năng).
