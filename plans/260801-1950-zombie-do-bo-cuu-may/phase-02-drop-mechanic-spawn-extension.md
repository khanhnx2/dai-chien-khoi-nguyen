---
phase: 2
title: Drop mechanic & spawn extension
status: completed
priority: P1
effort: 1.5h
dependencies:
  - 1
---

# Phase 2: Drop mechanic & spawn extension

## Overview
Vẽ hiệu ứng dù khi unit rơi + mở rộng `SpawnManager` để đẻ tại toạ độ X tuyệt đối tuỳ ý (không chỉ offset quanh thành) kèm cờ `drop`.

## Requirements
- Functional: khi `Unit` tạo với `drop=true`, hiện thêm 1 dù đơn giản phía trên, tween rơi cùng unit rồi biến mất khi chạm đất; `SpawnManager` có cách đẻ tại X tuyệt đối bất kỳ (cho vị trí ngẫu nhiên nửa sân).
- Non-functional: tái dùng animation `drop` đã có trong `Unit` ctor (không viết lại); không phá hành vi `trySpawnTitan`/`forceSpawn` hiện tại.

## Architecture
- `Unit` ctor hiện có `drop` param → khi true, mọi part (disc/icon/hpBar/hpText/aura) dời lên cao rồi tween xuống (`DROP_HEIGHT=260`). Thêm 1 GameObject dù (Phaser graphics: hình vòm + 3 dây) vào cùng danh sách `parts` được tween, và `onComplete` của phần cuối cùng huỷ dù (dù chỉ tồn tại lúc đang rơi).
  - Dù KHÔNG dùng cho titan (rơi từ trời không có dù) — chỉ thêm khi `type === UnitType.Zombie` (hoặc tham số riêng `hasParachute`). Đơn giản nhất: derive từ `titanDefByType(type)` đã dùng để phân biệt titan; zombie check `type === UnitType.Zombie`.
- `SpawnManager`: thêm phương thức mới `forceSpawnAt(side, type, units, absoluteX, drop=false)` — mirror `forceSpawn` nhưng nhận X tuyệt đối thay vì offset quanh `spawnX(side)`. KHÔNG sửa `forceSpawn` cũ (tránh đổi contract chỗ khác đang dùng nó — reinforcements.ts gọi `forceSpawn` với offset, giữ nguyên).

## Related Code Files
- Modify: `src/entities/unit.ts`
- Modify: `src/systems/spawn.ts`

## Implementation Steps
1. `unit.ts`: trong khối `if (drop) { ... }`, nếu `type === UnitType.Zombie`, thêm dù:
   ```ts
   let parachute: Phaser.GameObjects.Arc | undefined;
   if (type === UnitType.Zombie) {
     parachute = scene.add.arc(startX, y - 30, 16, 200, 340, false, 0xf1f5f9).setOrigin(0.5); // vòm dù đơn giản
   }
   const parts = [...existing, ...(parachute ? [parachute] : [])];
   // sau tween drop hoàn tất (dùng onComplete của 1 part hoặc setTimeout theo duration 420ms):
   scene.time.delayedCall(420, () => parachute?.destroy());
   ```
   (Chi tiết hình dù linh hoạt lúc code — chỉ cần đơn giản, không cần đẹp; ưu tiên không phá layout hiện có.)
2. `spawn.ts`: thêm method
   ```ts
   /** Đẻ tại toạ độ X TUYỆT ĐỐI (không quanh thành) — dùng cho đổ bộ ngẫu nhiên. Bỏ qua vàng/cap/hồi chiêu như forceSpawn. */
   forceSpawnAt(side: Side, type: UnitType, units: Unit[], absoluteX: number, drop = false): Unit {
     const m = this.mods[side];
     const unit = new Unit(this.scene, side, type, absoluteX, m.unitHp[type], m.unitDmg[type], drop);
     units.push(unit);
     return unit;
   }
   ```

## Success Criteria
- [ ] Zombie tạo với `drop=true` hiện dù, dù biến mất sau khi rơi xong; titan/lính thường không bị ảnh hưởng (không có dù).
- [ ] `forceSpawnAt` đẻ đúng tại toạ độ X truyền vào (không cộng offset quanh thành).
- [ ] `forceSpawn`/`trySpawnTitan` cũ không đổi hành vi (test cũ vẫn xanh).
- [ ] `npm run build` xanh.

## Risk Assessment
- Thêm GameObject dù vào mảng `parts` tween chung có thể làm lệch nếu dù cần vị trí Y khác các part khác — tính offset Y riêng cho dù (vd cao hơn đầu unit ~20-30px) trước khi đưa vào tween.
- `scene` có thể null trong test (stub) — `parachute` chỉ tạo khi `scene` truthy, theo pattern `if (drop)` đã có sẵn (chỉ chạy khi `scene` tồn tại).
