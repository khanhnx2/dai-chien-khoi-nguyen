---
phase: 1
title: Config — Difficulty.Zombie
status: completed
effort: 0.5h
priority: P2
---

# Phase 1: Config — Difficulty.Zombie

## Overview

Mở rộng `Difficulty` thêm member `Zombie`, thêm entry `DIFFICULTIES[Zombie]` giống hệt Thường, thêm flag `spawnOnlyZombie` vào `DifficultyConfig`, thêm hằng số `REINFORCE_ZOMBIE_MODE_MULT` cho tiếp viện (phase 3 dùng). Mọi số nằm ở `game-config.ts` — "NGUỒN CHÂN LÝ".

## Requirements

- Functional:
  - `Difficulty.Zombie = 'zombie'`.
  - `DIFFICULTIES[Zombie] = { label:'Zombie', decisionIntervalMs:850, buysUpgrades:true, statMultiplier:1.2, spawnOnlyZombie:true }` — giống hệt Thường, chỉ thêm flag.
  - `DifficultyConfig` thêm field tuỳ chọn `spawnOnlyZombie?: boolean`.
  - Hằng `REINFORCE_ZOMBIE_MODE_MULT = 4` (số Zombie/đợt tiếp viện = `reinforcementCount(stage) × 4`).
- Non-functional: tsc strict — `Record<Difficulty, DifficultyConfig>` phải đủ 4 entry.

## Architecture

`enum Difficulty` → `DIFFICULTIES: Record<Difficulty, DifficultyConfig>` → `statMultipliersFor()` / `battle-scene` đọc tự động. Thêm member + entry là đủ; `SPAWN_ORDER`/`PLAYER_SPAWN_ORDER`/`ALL_UNIT_TYPES` không đổi (Zombie đã có trong `ALL_UNIT_TYPES`).

## Related Code Files

- Modify: `src/config/game-config.ts`
- Modify: `test/simulation.test.ts`

## Implementation Steps (TDD)

1. **Scaffold (bắt buộc để test biên dịch):** thêm `Zombie = 'zombie'` vào `enum Difficulty`; thêm `spawnOnlyZombie?: boolean` vào `interface DifficultyConfig`.
2. **Viết test trước (red):** thêm `check('mức khó: Zombie giống hệt Thường + spawnOnlyZombie', ...)`:
   - `DIFFICULTIES[Difficulty.Zombie].decisionIntervalMs === 850`
   - `DIFFICULTIES[Difficulty.Zombie].buysUpgrades === true`
   - `DIFFICULTIES[Difficulty.Zombie].statMultiplier === 1.2`
   - `DIFFICULTIES[Difficulty.Zombie].spawnOnlyZombie === true`
   - `statMultipliersFor(Side.Khoi, Difficulty.Zombie)[Side.Nguyen] === 1.2`
   - `REINFORCE_ZOMBIE_MODE_MULT === 4`
   - Chạy `npm test` → **đỏ** (`DIFFICULTIES[Zombie]` undefined vì thiếu entry).
3. **Implement (green):** thêm `DIFFICULTIES[Difficulty.Zombie] = {...}` (giống hệt Thường + `spawnOnlyZombie: true`); thêm `export const REINFORCE_ZOMBIE_MODE_MULT = 4;`.
4. Chạy `npm test` → **xanh**; `npm run build` → hết lỗi tsc (enum đủ 4 entry).

## Success Criteria

- [x] `DIFFICULTIES[Difficulty.Zombie]` có đủ 4 field với giá trị đúng (850/true/1.2/true).
- [x] `statMultipliersFor` với Zombie cho phe Máy ×1.2.
- [x] `REINFORCE_ZOMBIE_MODE_MULT` export, = 4.
- [x] `npm test` xanh (test mới + toàn bộ test cũ không đổi).
- [x] `npm run build` không lỗi tsc.

## Risk Assessment

- Quên thêm entry `DIFFICULTIES[Zombie]` → tsc lỗi (Record thiếu key) — bắt sớm.
- `buysUpgrades:true` giữ đúng "giống hệt Thường" (AI Zombie vẫn mua nâng cấp).
