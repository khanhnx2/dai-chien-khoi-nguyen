---
phase: 2
title: AI Zombie-only
status: completed
effort: 1h
priority: P2
---

# Phase 2: AI Zombie-only

## Overview

`BasicAi` khi `DIFFICULTIES[difficulty].spawnOnlyZombie === true` thì **chỉ đẻ Zombie**: bỏ nhánh mua Hero/Titan (`maybeBuySpecialUnit`), `maybeSpawn` luôn chọn `UnitType.Zombie`, `bestAffordable` duyệt pool `[Zombie]`. Hành vi mức Thường/Khó/Easy giữ nguyên.

## Requirements

- Functional:
  - Zombie mode: AI không bao giờ đẻ quân khác Zombie (Bộ binh/Cung thủ/Giáp binh/Hero/Titan đều không).
  - Zombie mode: `maybeBuyUpgrade` vẫn chạy (giống Thường).
  - Các mức khác: hành vi hiện tại không đổi (test cũ giữ xanh).
- Non-functional: giữ cấu trúc `update()` rõ ràng; không tham chiếu symbol import vòng ở module-init.

## Architecture

- `update()`: `if (!cfg.spawnOnlyZombie && this.maybeBuySpecialUnit(ctx)) return;` rồi `this.maybeSpawn(ctx)`.
- `maybeSpawn()`: `const desired = cfg.spawnOnlyZombie ? UnitType.Zombie : this.pickUnit(ctx.units);`
- `bestAffordable()`: thay vòng lặp `SPAWN_ORDER` bằng `this.spawnPool` — field mới trong constructor: `cfg.spawnOnlyZombie ? [UnitType.Zombie] : SPAWN_ORDER`.
- `randomType()`/`pickUnit()` chỉ chạy ở nhánh không zombie (an toàn giữ nguyên).

## Related Code Files

- Modify: `src/ai/basic-ai.ts`
- Modify: `test/simulation.test.ts`

## Implementation Steps (TDD)

1. **Viết test trước (red):** thêm `check('AI Zombie: chỉ đẻ Zombie, không Hero/Titan kể cả màn cao', ...)`:
   - Dựng `ctx = makeAiCtx(0, [], makeBases(), 90)` (màn 90 — trên mọi mốc AI_HERO/TITAN/ZOMBIE_MIN_STAGE).
   - `ctx.economy.reward(Side.Nguyen, 100000)` — dư tiền để không kẹt.
   - `const ai = new BasicAi(Side.Nguyen, Difficulty.Zombie);`
   - Chạy `ai.update(ctx)` trong `60 * 60` frame (1 phút game).
   - Assert: `ctx.units` phe Nguyên **đều** `u.type === UnitType.Zombie`; không có Hero (Sumo/Labubu) hay Titan (Capibara/Totoro).
   - Chạy `npm test` → **đỏ** (hiện AI Zombie vẫn đẻ lính thường).
2. **Implement (green):** sửa `basic-ai.ts` theo Architecture ở trên.
3. Chạy `npm test` → **xanh**. Xác nhận test cũ `AI: đẻ đa dạng loại lính (không chỉ Bộ binh)` (mức Normal) vẫn xanh → chứng minh không phá mức khác.
4. Chạy `npm run build` → không lỗi tsc (noUnusedLocals: xoá biến thừa nếu có).

## Success Criteria

- [x] Zombie mode: 100% quân AI đẻ là Zombie ở mọi màn (test mới).
- [x] Zombie mode: không Hero/Titan ở màn 90 (test mới).
- [x] Normal mode: test đa dạng lính + test mua Hero/Titan hiện có vẫn xanh.
- [x] `npm test` + `npm run build` xanh.

## Risk Assessment

- Zombie `cost:20`, hồi chiêu 2.4s, nhịp quyết định 850ms → AI tích vàng nhanh, đẻ 1 Zombie mỗi ~2.4s — "bầy chậm đều", cân bằng chấp nhận (đặc trưng chế độ).
- `SPAWN_ORDER` chỉ dùng trong `this.spawnPool` — phải đảm bảo không rò rỉ sang nhánh zombie.
