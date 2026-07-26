---
phase: 3
title: Titan behavior aura & death-heal
status: completed
priority: P1
effort: 2h
dependencies:
  - 1
---

# Phase 3: Titan behavior aura & death-heal

## Overview
Hành vi titan (tiến chậm + đánh cận chiến + cờ hào quang) + vòng hào quang trên Unit + hồi máu toàn quân khi titan chết.

## Requirements
- Functional: titan tự tiến/đánh như lính thường nhưng dispatch riêng; `auraActive = hp/maxHp > 2/3` cập nhật mỗi frame + vòng hiển thị theo cờ; titan chết → mọi lính cùng phe còn sống +1% maxHp.
- Non-functional: `titan-behavior.ts` < 80 dòng; không phá `updateHero`/lính thường.

## Architecture
- Unit: thêm state `auraActive` + `readonly` vòng hào quang (arc stroke, chỉ tạo cho titan) + `setAura(active)` bật/tắt visible + di chuyển kèm disc trong `moveBy`.
- combat dispatch: sau nhánh `heroDefByType`, thêm `if (titanDefByType(unit.type)) { updateTitan(...); continue; }`.
- `updateTitan`: giống nhánh lính thường (tìm gần nhất, đánh unit/base theo nhịp, ngoài tầm tiến tới) NHƯNG không khắc chế (titan không trong bảng COUNTERS → `damageMultiplier` trả 1 sẵn, có thể để dùng chung); đầu frame set `unit.setAura(unit.hp/unit.maxHp > TITAN_AURA_HP_FRAC)`.
- Death-heal: trong cleanup loop `updateBattle`, khi `unit.isDead()`, TRƯỚC `destroy()`, nếu `titanDefByType(unit.type)` → `for (u of units) if (u.side===unit.side && !u.isDead() && u!==unit) u.heal(u.maxHp*TITAN_DEATH_HEAL_FRAC)`.

## Related Code Files
- Create: `src/systems/titan-behavior.ts`
- Modify: `src/entities/unit.ts`, `src/systems/combat.ts`

## Implementation Steps
1. `unit.ts`:
   - field `auraActive = false;` + `private readonly aura?: Phaser.GameObjects.Arc`.
   - Trong ctor, nếu `titanDefByType(type)` → tạo `this.aura = scene.add.circle(startX, y, this.stats.size/2 + 8).setStrokeStyle(3, 0xfde047).setAlpha(0.9)` (vòng vàng), ban đầu visible.
   - `setAura(active: boolean)`: nếu có `aura` và `active!==auraActive` → `auraActive=active; aura.setVisible(active)`.
   - `moveBy`/drop: cập nhật `aura.x`/`aura.y` cùng disc.
   - `destroy()`: `aura?.destroy()`.
2. `titan-behavior.ts`: `updateTitan(unit, units, bases, dt, now)` — logic tiến/đánh cận chiến + `setAura`. Tái dùng `nearestEnemyUnit` (export sẵn từ combat) — LƯU Ý import vòng: combat↔titan-behavior, chỉ dùng ở function-level (giống combat↔hero-behavior). Đặt import type + gọi trong hàm.
3. `combat.ts`:
   - import `titanDefByType` + `updateTitan` + `TITAN_DEATH_HEAL_FRAC`.
   - dispatch titan trước nhánh thường.
   - cleanup: hook death-heal như trên (trước `economy.reward` + `destroy`).

## Success Criteria
- [ ] Titan hp đầy → `auraActive===true`; sau khi mất >1/3 máu → `false` + vòng ẩn.
- [ ] Titan tiến về thành địch + đánh cận chiến theo nhịp 2200ms.
- [ ] Titan chết: mọi lính cùng phe còn sống tăng đúng 1% maxHp của CHÍNH nó; lính khác phe không đổi; không hồi cho chính titan (đã chết).
- [ ] `npm run build` xanh; lính thường/hero không đổi hành vi.

## Risk Assessment
- Vòng import combat↔titan-behavior: chỉ an toàn khi symbol không dùng ở top-level (giống hero-behavior). Tuân thủ.
- Death-heal chạy trong cùng cleanup loop đang splice — chỉ ĐỌC/heal các unit khác, không splice thêm → an toàn.
