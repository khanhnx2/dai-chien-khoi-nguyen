---
phase: 3
title: Sumo combat behavior + bark audio
status: completed
priority: P1
effort: 5h
dependencies:
  - 1
---

# Phase 3: Sumo combat behavior + bark audio

## Overview
Máy trạng thái Sumo (charge ×4 / rút lui ≤50% / hồi máu bất khả xâm ở hậu phương / lao lại) + bỏ qua Sumo đang hồi khi nhắm mục tiêu + tiếng sủa Web Audio tiết chế. Đây là pha lõi, rủi ro cao nhất.

## Requirements
- Functional: Sumo tự chạy state machine trong `updateBattle`; khi HEALING không bị lính/đạn/nóc thành nhắm; hồi đầy máu → lao lại; đánh phát `bark` (throttle 500ms).
- Non-functional: `combat.ts` giữ gọn (< 200 dòng) → tách `hero-behavior.ts`; test tất định không cần trình duyệt.

## Architecture
- **Unit state** (`unit.ts`): thêm field `private retreating = false` + getter, `heal(amount)`, `isTargetable()`. `isTargetable()` = false khi `retreating && đã-về-sau-Thành`. "Sau Thành" generic: `directionOf(side)*(x - baseXOf(side)) <= 0`.
- **hero-behavior.ts** (mới) — `updateSumo(unit, units, bases, economy?, dt, now)` chạy 1 frame cho 1 Sumo (thay logic mặc định):
  ```
  hpFrac = unit.hp / unit.maxHp
  if !retreating && hpFrac <= SUMO_RETREAT_HP_FRAC: retreating = true
  if retreating:
     if behindOwnBase(unit): unit.heal(maxHp * SUMO_HEAL_FRAC_PER_SEC * dt)
                             if unit.hp >= maxHp: retreating = false   // lao lại
     else: unit.moveBy(-directionOf(side) * speed * SUMO_RETREAT_SPEED_MULT * dt)  // chạy về, vẫn bị bắn
     return                       // không đánh khi rút
  // ADVANCE/ATTACK:
  nearest = nearestEnemyUnit(unit, units)  // dùng lại helper combat (chỉ đếm isTargetable)
  baseDist = |enemyBase.frontX - unit.x|
  in-attack-range & nearest → đánh nhịp attackCooldownMs; bark(now)
  elif nearest trong SUMO_VISION_RANGE (ngoài tầm đánh) → moveBy(dir*speed*SUMO_CHARGE_MULT*dt)   // charge
  elif baseDist <= range → đánh Thành; bark(now)
  else → moveBy(dir*speed*dt)   // tiến thường
  ```
- **bark gate:** timer per-Sumo `lastBarkAt` (field trên unit hoặc map trong hero-behavior). Chỉ `sound.play('bark')` khi `now - lastBarkAt >= SUMO_BARK_THROTTLE_MS`. Đặt trên unit để mỗi Sumo độc lập.
- **combat.ts:** trong vòng `updateBattle`, `if unit.type === Sumo { updateSumo(...); continue; }` trước logic mặc định. `nearestEnemyUnit` + dọn xác giữ nguyên. **Sửa targeting** `nearestEnemyUnit`: bỏ qua `!other.isTargetable()`.
- **projectile-system.ts:** `nearestEnemyWithin`, `pierceThrough`, `explode` bỏ qua `!u.isTargetable()`.
- **roof-attacker.ts:** `nearestEnemyInRange` bỏ qua `!u.isTargetable()`.
- **sound-manager.ts:** thêm `'bark'` vào type `Sfx` + case → `this.bark()`. `bark()` = sawtooth hạ cao độ (vd 320→130Hz) + 1 lớp noise bandpass ngắn, 2 nhịp giật cách ~90ms ("gắu-gắu"). Throttle chung THROTTLE_MS=55 không đủ → gate 500ms nằm ở hero-behavior (sound-manager giữ generic).

## Related Code Files
- Create: `src/systems/hero-behavior.ts`
- Modify: `src/entities/unit.ts` (state + heal + isTargetable + lastBarkAt)
- Modify: `src/systems/combat.ts` (delegate Sumo + skip untargetable)
- Modify: `src/systems/projectile-system.ts` (skip untargetable)
- Modify: `src/entities/roof-attacker.ts` (skip untargetable)
- Modify: `src/audio/sound-manager.ts` (SFX bark)
- Modify: `test/simulation.test.ts`

## Implementation Steps
1. **Test trước** (stub scene sẵn có, `pump`-style):
   - **Charge:** Sumo Khôi + 1 địch ở khoảng cách trong VISION nhưng ngoài range → sau 1s, quãng đường đi ≈ speed×4×1s (±). So với Bộ binh cùng thế đi speed×1.
   - **Retreat trigger:** set `sumo.hp = maxHp*0.5` → sau update, `retreating` true & x dịch về phía thành mình.
   - **Untargetable heal:** đặt Sumo sau `baseXOf(Khoi)`, retreating → `isTargetable()` false; enemy cung thủ trong tầm KHÔNG nhắm được nó (nearestEnemyUnit của địch bỏ qua); hp tăng dần mỗi update; đạt maxHp → `retreating` false.
   - **Vulnerable while retreating:** Sumo retreating nhưng CHƯA về sau thành → `isTargetable()` true (vẫn dính đòn).
   - **No counter:** Sumo đấu Giáp binh → `damageMultiplier` 1 (đã test Phase 1, ở đây kiểm tổng thể không lỗi).
   - `npm test` → RED.
2. Cài `unit.ts` state/heal/isTargetable/lastBarkAt.
3. Cài `hero-behavior.ts` (export `updateSumo` + `behindOwnBase`). Tách `nearestEnemyUnit` thành helper export dùng chung từ `combat.ts` (DRY) hoặc truyền vào.
4. Sửa `combat.ts` delegate + skip untargetable; sửa projectile-system + roof-attacker skip untargetable.
5. `sound-manager.ts` bark; gọi `sound.play('bark')` (guard `sound`) trong hero-behavior với gate 500ms.
6. `npm run build` + `npm test` → GREEN. Verify trình duyệt (Phase 6 tổng thể) — riêng pha này kiểm bằng test logic.

## Success Criteria
- [ ] 4 test hành vi (charge/retreat/untargetable-heal/vulnerable) pass; 22 cũ pass.
- [ ] `combat.ts` vẫn < 200 dòng.
- [ ] Không Sumo nào bị nhắm khi HEALING; đạn/nóc thành cũng bỏ qua.
- [ ] Build sạch.

## Risk Assessment
- **Yo-yo dao động:** hysteresis 50%↘/100%↗ đã tránh; test khóa.
- **Nhiều Sumo cùng hồi bất khả xâm** = OP/stall → chấp nhận theo thiết kế; số ở config chỉnh sau.
- **`nearestEnemyUnit` chia sẻ:** đảm bảo cả combat lẫn hero-behavior dùng cùng 1 helper (đã bỏ qua untargetable) — tránh lệch logic.
- **Audio không test được ở Node** (`sound` no-op khi ctx null) → chỉ kiểm không ném lỗi; realism nghe thủ công ở Phase 6.
