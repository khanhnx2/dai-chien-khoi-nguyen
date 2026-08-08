---
phase: 5
title: Verify Build + Tests
status: completed
effort: 0.5h
priority: P2
---

# Phase 5: Verify Build + Tests

## Overview

Chạy pipeline hoàn chỉnh: build type-check + test toàn bộ. Đảm bảo feature Zombie không phá 3 mức khó cũ, campaign riêng hoạt động, không lỗi tsc strict.

## Requirements

- Functional:
  - `npm run build` xanh (tsc `--noEmit` src + vite build).
  - `npm test` xanh (toàn bộ `check(...)` cũ + mới).
- Non-functional: không có test bị bỏ qua / che (no fake, no mocks để qua build).

## Architecture

Pipeline chuẩn của repo: `npm test` (tsx, 1 file `test/simulation.test.ts`) → `npm run build` (tsc src + vite). Test mới đã viết ở phase 1–3.

## Implementation Steps

1. `npm test` → ghi nhận toàn bộ xanh, đặc biệt: test Zombie (config/AI/reinforcement) + test cũ mức Normal/Hard.
2. `npm run build` → không lỗi tsc, vite build thành công.
3. (Tuỳ chọn) `npm run dev` + xác nhận thủ công 4 nút khó (phase 4 đã làm).
4. Nếu có lỗi: sửa theo `file:line`, chạy lại. **Không** lờ test đỏ.

## Success Criteria

- [x] `npm test` xanh 100%.
- [x] `npm run build` xanh.
- [x] Không lỗi `noUnusedLocals`/`noUnusedParameters`/`noImplicitReturns`.

## Risk Assessment

- Rò rỉ `SPAWN_ORDER` sang nhánh zombie → test AI bắt được.
- Quên entry `DIFFICULTIES` → tsc bắt.
- Build OK nhưng cân bằng Zombie "quá dễ/quá khó" → chỉnh `REINFORCE_ZOMBIE_MODE_MULT`/`statMultiplier` ở config, ngoài phạm vi code.

## Next Steps

- Sau khi xanh: `/ck:code-review` kiểm tra diff trước khi commit; cập nhật `docs/` nếu cần.
