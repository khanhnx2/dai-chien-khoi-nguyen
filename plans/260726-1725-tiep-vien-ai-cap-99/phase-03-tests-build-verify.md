---
phase: 3
title: Tests & build verify
status: completed
priority: P2
effort: 45m
dependencies:
  - 2
---

# Phase 3: Tests & build verify

## Overview
Test mô phỏng cho tiếp viện + verify build/test toàn bộ.

## Requirements
- Functional: 1 check xác nhận kích đúng số lính, đúng thành phần, chỉ 1 lần.
- Non-functional: theo pattern hiện có (`check('name', ...)` + `pump()` + Phaser stub); không browser.

## Architecture
- Dùng `ReinforcementManager` thật + `SpawnManager` thật với `mods` (uniform) + `Base` thật cho aiSide. Hạ `base.hp` thủ công xuống ≤50% rồi gọi `update`, đếm `units`.
- Không cần cả vòng combat — chỉ test manager + forceSpawn.

## Related Code Files
- Modify: `test/simulation.test.ts`

## Implementation Steps
1. Thêm check `reinforcements: kích 1 lần đúng thành phần ở màn 30`:
   - Dựng `bases` (ít nhất aiSide=Nguyen), `spawn = new SpawnManager(scene, mods)`, `units=[]`, `mgr = new ReinforcementManager()`.
   - `base.hp = base.maxHp * 0.4` (dưới ngưỡng).
   - `assert(mgr.update(30, Side.Nguyen, bases, spawn, units) === true)`.
   - `assert(units.length === 12)` (3 loại thường × 3 + hero × 3 = 4×3).
   - Đếm theo type: mỗi loại (BoBinh/CungThu/GiapBinh/Labubu) === 3.
   - Gọi lại `mgr.update(...)` → `=== false` và `units.length` không đổi (chỉ 1 lần).
2. (Optional) check `reinforcementCount`: `29→0, 30→3, 49→4, 90→9, 99→9`.
3. (Optional) check màn 20: `mgr.update(20,...)` khi hp≤50% vẫn `false`, không đẻ.
4. Chạy `npm test` → tất cả xanh; `npm run build` → xanh.

## Success Criteria
- [ ] Check mới pass; toàn bộ test cũ vẫn pass.
- [ ] `npm run build` xanh (tsc + vite).
- [ ] Thủ công (tuỳ chọn): dev server, chọn màn 30, hạ máu thành Máy → thấy toast + đợt lính + hero.

## Risk Assessment
- Base thật cần Phaser stub `scene.add.*` (đã có `makeGO()` trong test). Nếu `Base` ctor gọi API chưa stub → bổ sung no-op vào stub.
