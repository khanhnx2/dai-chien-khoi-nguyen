---
phase: 4
title: Battle wiring & gating
status: completed
priority: P1
effort: 30m
dependencies:
  - 2
  - 3
---

# Phase 4: Battle wiring & gating

## Overview
Gắn `Cannon` vào vòng đời trận đấu, chỉ khởi tạo khi đủ điều kiện (đã unlock + màn ≥40).

## Requirements
- Functional: cannon xuất hiện & bắn khi `usableCannon(stage)`; không tồn tại khi thiếu điều kiện; chỉ phe người chơi.
- Non-functional: `battle-scene.ts` chỉ thêm ~4 dòng; không đụng AI; không đổi thứ tự update hiện có.

## Architecture
- Field optional `private cannon?: Cannon;` — `undefined` khi không đủ điều kiện (rẻ hơn cờ boolean + luôn tồn tại).
- Khởi tạo trong `create()` sau khi đã có `mods`: chỉ khi `usableCannon(this.stage)`.
- `mods[this.playerSide].cannonDmg/cannonCd` — LƯU Ý dùng `playerSide` (không phải `Side.Khoi`), vì người chơi có thể cầm Nguyên.
- Gọi `this.cannon?.update(time, this.units, this.projectiles)` trong `update()`, đặt cạnh 2 dòng `this.roofs[...].update(...)` (TRƯỚC `updateProjectiles` để đạn vừa bắn được xử lý trong cùng frame — nhất quán với roof).
- KHÔNG cần dọn dẹp thủ công: Phaser tự huỷ display object khi scene restart, giống `RoofAttacker`.

## Related Code Files
- Modify: `src/scenes/battle-scene.ts`

## Implementation Steps
1. Import `Cannon` + `usableCannon`.
2. Thêm field `private cannon?: Cannon;`.
3. Trong `create()`, sau khi dựng `this.roofs`:
   ```ts
   // Đại bác: chỉ phe người chơi, cần đã mở khoá (xu) VÀ màn ≥ CANNON_MIN_STAGE.
   if (usableCannon(this.stage)) {
     const m = mods[this.playerSide];
     this.cannon = new Cannon(this, this.playerSide, m.cannonDmg, m.cannonCd);
   }
   ```
4. Trong `update()`, cạnh roof update: `this.cannon?.update(time, this.units, this.projectiles);`
5. `init()`: đặt `this.cannon = undefined;` để tránh giữ tham chiếu cũ khi restart scene (cùng chỗ reset `units`/`projectiles`/`gameOver`).

## Success Criteria
- [ ] Màn 40 + đã unlock: cannon hiện sau thành người chơi, tự bắn lính địch trong tầm.
- [ ] Màn 39 (đã unlock) hoặc chưa unlock: không có cannon, không có đạn cannon.
- [ ] Người chơi cầm Nguyên: cannon ở phía Nguyên, dùng mods đúng phe.
- [ ] Máy không bao giờ có cannon (không có code path nào tạo cannon cho `aiSide`).
- [ ] `npm run build` xanh; các hệ thống khác (tiếp viện/titan/roof) không đổi hành vi.

## Risk Assessment
- Dùng nhầm `Side.Khoi` thay `this.playerSide` → cannon sai phe khi người chơi cầm Nguyên. Mitigation: success criteria có case cầm Nguyên.
- Quên reset `this.cannon` trong `init()` → scene restart giữ instance cũ trỏ tới display object đã bị huỷ. Mitigation: bước 5.
