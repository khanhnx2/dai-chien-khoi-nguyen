---
phase: 3
title: Reinforcement Zombie
status: completed
effort: 1h
priority: P2
---

# Phase 3: Reinforcement Zombie

## Overview

`ReinforcementManager` nhận cờ `spawnOnlyZombie`; khi bật, đợt tiếp viện (màn ≥30, thành Máy ≤50% máu) chỉ đẻ **toàn Zombie** thay cho (3 lính cơ bản + hero + titan + zombie). `battle-scene.ts` truyền cờ từ `Difficulty.Zombie`.

## Requirements

- Functional:
  - Zombie mode: tiếp viện đẻ `reinforcementCount(stage) × REINFORCE_ZOMBIE_MODE_MULT` Zombie, **không có** Bộ binh/Cung thủ/Giáp binh/Hero/Titan.
  - Không zombie (mặc định): giữ nguyên thành phần hiện tại (test 33/34b/50 hiện có phải xanh).
  - Ngưỡng kích (màn ≥30, thành ≤50%) và "chỉ kích 1 lần" giữ nguyên.
- Non-functional: constructor param **mặc định `false`** → không phá test hiện có `new ReinforcementManager()`.

## Architecture

- `constructor(private readonly spawnOnlyZombie = false)`.
- `update()`: khi `this.spawnOnlyZombie`:
  - Đẻ `count * REINFORCE_ZOMBIE_MODE_MULT` Zombie bằng `spawn.forceSpawn(aiSide, UnitType.Zombie, units, staggerX)` — cùng công thức stagger như cũ.
  - Bỏ hoàn toàn các block `types`(lính+hero) / `REINFORCE_TITAN_MIN_STAGE` / `REINFORCE_ZOMBIE_MIN_STAGE`.
- `battle-scene.ts`: `new ReinforcementManager(this.difficulty === Difficulty.Zombie)`.

## Related Code Files

- Modify: `src/systems/reinforcements.ts`
- Modify: `src/scenes/battle-scene.ts` (chỉ 1 dòng khởi tạo)
- Modify: `test/simulation.test.ts`

## Implementation Steps (TDD)

1. **Viết test trước (red):** thêm `check('tiếp viện Zombie: màn 30 chỉ đẻ count×4 Zombie', ...)`:
   - `const mgr = new ReinforcementManager(true);`
   - `bases[aiSide].hp = maxHp × 0.3;`
   - `mgr.update(30, Side.Nguyen, bases, spawn, units)` → `true`.
   - Assert: `units.length === reinforcementCount(30) * REINFORCE_ZOMBIE_MODE_MULT` (= 3×4=12); `units.every(u => u.type === UnitType.Zombie)`; mọi quân phe Máy.
   - Thêm 1 test nữa màn 50: `units.length === 5×4=20`, toàn Zombie, **không có** Totoro.
   - Chạy `npm test` → **đỏ** (constructor chưa nhận tham số / bỏ qua → đẻ 12 lính thường).
2. **Implement (green):** sửa `reinforcements.ts` + truyền cờ ở `battle-scene.ts`.
3. Chạy `npm test` → **xanh**. Xác nhận test 33 (`12 lính`) / 34b (`20`) / màn 50 (`30`) vẫn xanh ở mode mặc định.
4. Chạy `npm run build` → không lỗi tsc.

## Success Criteria

- [x] Zombie mode: tiếp viện chỉ đẻ Zombie, số lượng = `count × 4` (test mới).
- [x] Zombie mode màn 50: không Titan (test mới).
- [x] Mode mặc định: 3 test tiếp viện hiện có vẫn xanh.
- [x] `npm test` + `npm run build` xanh.

## Risk Assessment

- `REINFORCE_ZOMBIE_MODE_MULT = 4` ≈ khối lượng (3 lính + hero) của Thường — số mở, chỉnh dễ ở config.
- Zombie yếu hơn Bộ binh → sóng tiếp viện Zombie có thể thấy "mềm" hơn dù cùng số lượng — chấp nhận, cân bằng chỉnh sau qua config.
