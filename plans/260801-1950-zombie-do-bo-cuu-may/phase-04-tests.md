---
phase: 4
title: Tests
status: completed
priority: P2
effort: 1h
dependencies:
  - 3
---

# Phase 4: Tests

## Overview
Test mô phỏng cho toàn bộ cơ chế zombie: gating, nhịp đổ bộ, số lượng, vị trí, dừng đúng lúc, không kích lại.

## Requirements
- Functional: cover đủ acceptance criteria của phase 3 bằng `check()` + `pump`-style time stepping, theo pattern có sẵn trong `test/simulation.test.ts`.
- Non-functional: dùng `SpawnManager`/`ZombieDropManager` thật với stub scene; không phụ thuộc thứ tự chạy (mỗi check dựng state riêng).

## Architecture
- Dựng `bases`, `spawn = new SpawnManager(scene)`, `units: Unit[] = []`, `mgr = new ZombieDropManager()`.
- Set `bases[aiSide].hp` trực tiếp để mô phỏng các mốc máu (giống pattern test titan/reinforcement hiện có).
- Gọi `mgr.update(stage, aiSide, bases, spawn, units, now)` lặp lại với `now` tăng dần theo `ZOMBIE_DROP_INTERVAL_MS` để mô phỏng 10s.

## Related Code Files
- Modify: `test/simulation.test.ts`

## Implementation Steps
1. Import `ZombieDropManager`, `UnitType`, hằng số zombie từ `game-config.ts`, `zombieDropZone`.
2. Check `zombie: kích 1 lần khi hp Máy ≤75%, màn ≥40`:
   - `bases[aiSide].hp = maxHp * 0.8` → `mgr.update(40, aiSide, bases, spawn, units, 0)` → `false` (chưa đủ ngưỡng), `units.length===0`.
   - `bases[aiSide].hp = maxHp * 0.7` → `mgr.update(40, aiSide, bases, spawn, units, 1000)` → `'start'`, `units.length===10` (đợt đầu ngay).
3. Check `zombie: đúng 10 đợt trong 10s, dừng sau đó`:
   - Từ trạng thái đã kích ở bước trên, gọi `mgr.update` lặp 9 lần nữa với `now` tăng 1000ms mỗi lần (1000→10000) → `units.length===100` sau đủ 10 đợt.
   - Gọi thêm `mgr.update(40, aiSide, bases, spawn, units, 11000)` → `false`, `units.length` không đổi (100) — cửa sổ đã đóng.
4. Check `zombie: không kích lại trong cùng trận`:
   - Sau khi đã trigger + hết wave, hạ `bases[aiSide].hp` xuống 0.1×maxHp rồi `mgr.update(...)` → vẫn `false`, không đẻ thêm.
5. Check `zombie: màn <40 không kích dù hp rất thấp`:
   - `bases[aiSide].hp = maxHp*0.1`, `mgr.update(39, aiSide, bases, spawn, units, 0)` → `false`, `units.length===0`.
6. Check `zombie: vị trí X luôn trong nửa sân Máy`:
   - Sau khi có ≥10 zombie từ bước 2, `assert.ok(units.every(u => { const [lo,hi]=zombieDropZone(aiSide); return u.x>=lo && u.x<=hi; }))`.
7. Check `zombie: stats đúng tỉ lệ ½ Bộ binh + hồi chiêu ×2`:
   - So `UNITS[UnitType.Zombie]` với `UNITS[UnitType.BoBinh]` theo tỉ lệ đã định (hp/damage/speed = ½, spawnCooldownMs = ×2).
8. Chạy `npm test` — xanh toàn bộ (test cũ + mới).

## Success Criteria
- [ ] Tất cả check trên pass; test cũ (reinforcement/titan/roof...) không bị ảnh hưởng.
- [ ] `npm run build` xanh.

## Risk Assessment
- Off-by-one giữa "đợt đầu" và vòng lặp interval (double-fire hoặc thiếu 1 đợt) — test bước 3 kiểm đúng tổng 100, phát hiện ngay nếu lệch.
- `zombieDropZone` cần export để test dùng trực tiếp — đảm bảo hàm này `export` trong game-config.ts (đã note ở phase 3).
