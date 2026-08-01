---
phase: 2
title: Cannon entity & shared targeting
status: completed
priority: P1
effort: 1.5h
dependencies:
  - 1
---

# Phase 2: Cannon entity & shared targeting

## Overview
Entity `Cannon` tự bắn theo nhịp (mirror `RoofAttacker`), kèm refactor nhỏ tách hàm tìm mục tiêu dùng chung (DRY).

## Requirements
- Functional: `Cannon` vẽ ở sau thành; mỗi `CANNON_COOLDOWN_MS × cdMult` bắn 1 đạn thẳng vào lính địch gần nhất trong `CANNON_RANGE`; damage = `CANNON_DAMAGE × dmgMult`.
- Non-functional: file < 80 dòng; `RoofAttacker` giữ nguyên hành vi sau refactor; stub-safe (scene có thể null trong test).

## Architecture
- **DRY refactor**: `RoofAttacker.nearestEnemyInRange` hiện là private method nhưng logic thuần hàm (point-based: lấy `x` + `range` + `side`, bỏ qua lính cùng phe/chết/`!isTargetable()`). Tách thành hàm export dùng chung, cả `RoofAttacker` + `Cannon` gọi lại.
  - Vị trí đề xuất: `src/entities/targeting.ts` (mới, ~15 dòng) — KHÔNG đặt trong `combat.ts` để tránh import vòng entity→system→entity.
  - Chữ ký: `nearestEnemyInRange(units: Unit[], side: Side, x: number, range: number): Unit | null`.
- `Cannon` mirror cấu trúc `RoofAttacker`: ctor nhận `(scene|null, side, dmgMult, cdMult)`, có `update(now, units, projectiles)`.
  - Khác `RoofAttacker`: KHÔNG nhận `upgrades` (cannon chỉ dùng mods vĩnh viễn, không có upgrade trong trận).
- Vị trí visual: `baseXOf(side) - directionOf(side) * (BASE.width/2 + CANNON_OFFSET)` với `CANNON_OFFSET ≈ 34` → Khôi ~x16, Nguyên ~x944 (canvas 960). Icon nhỏ (~28px) nên vừa mép.
- Đạn xuất phát từ `frontX` (mép TRƯỚC thành, giống `RoofAttacker`) để không bay xuyên qua khối thành.
- Đạn: `new Projectile(scene, side, 'straight', frontX, target.x, damage, 0, CANNON_PROJECTILE_SPEED, CANNON_PROJECTILE_COLOR)` — `aoeRadius=0`, `pierce` mặc định false → đơn mục tiêu, KHÔNG tương tác hào quang titan.

## Related Code Files
- Create: `src/entities/targeting.ts`
- Create: `src/entities/cannon.ts`
- Modify: `src/entities/roof-attacker.ts` (dùng helper chung thay method private)

## Implementation Steps
1. Tạo `src/entities/targeting.ts`: export `nearestEnemyInRange(units, side, x, range)` — copy nguyên logic từ `RoofAttacker.nearestEnemyInRange` (so sánh `Math.abs(u.x - x) <= bestD`, khởi tạo `bestD = range`).
2. `roof-attacker.ts`: xoá method private, import + gọi `nearestEnemyInRange(units, this.side, this.frontX, cfg.range)`. Hành vi KHÔNG đổi.
3. Tạo `src/entities/cannon.ts`:
   ```ts
   /** Đại bác sau thành người chơi: tự nhắm lính địch gần nhất trong tầm, bắn 1 viên/5s, 1000 dmg. */
   export class Cannon {
     private lastFireAt = 0;
     private readonly frontX: number;   // điểm đạn xuất phát (mép trước thành)
     private barrel?: Phaser.GameObjects.Text;   // emoji 💣 để nhún khi bắn
     constructor(scene: Phaser.Scene | null, side: Side, dmgMult = 1, cdMult = 1) { ... }
     update(now: number, units: Unit[], projectiles: Projectile[]): void { ... }
   }
   ```
   - Visual: `scene.add.rectangle(cannonX, LANE_Y - 14, 30, 20, SIDE_INFO[side].color)` + `scene.add.text(cannonX, LANE_Y - 30, '💣', {fontSize:'20px'}).setOrigin(0.5)`.
   - `update`: tìm target → nếu không có, return; nếu `now - lastFireAt < CANNON_COOLDOWN_MS * cdMult`, return; else bắn + `sound.play('magic')` + tween nhún nòng.
4. Kiểm `Sfx` union có `'magic'` (đã có, Father dùng) — tái dùng, không thêm SFX mới (YAGNI).

## Success Criteria
- [ ] `Cannon.update` bắn đúng nhịp: đạn đầu tiên ngay khi có target, đạn kế chỉ sau `5000 × cdMult` ms.
- [ ] Lính địch cách >400px không bị nhắm; lính cùng phe / đã chết / `!isTargetable()` bị bỏ qua.
- [ ] Đạn gây đúng `1000 × dmgMult` (verify ở phase 5 qua `updateProjectiles`).
- [ ] `RoofAttacker` không đổi hành vi (test cũ "nóc thành tự bắn hạ lính địch" vẫn xanh).
- [ ] `npm run build` xanh.

## Risk Assessment
- Refactor `RoofAttacker` chạm code đang chạy → rủi ro regression. Mitigation: logic copy nguyên văn, test cũ phủ sẵn (`nóc thành: tự bắn hạ lính địch trong tầm`).
- Import vòng nếu đặt helper trong `combat.ts` (system) vì entity không nên phụ thuộc system. Mitigation: đặt trong `entities/targeting.ts`.
- Vị trí sau thành sát mép canvas → có thể bị cắt trên màn hình hẹp. Mitigation: icon nhỏ, kiểm mắt ở phase 5.
