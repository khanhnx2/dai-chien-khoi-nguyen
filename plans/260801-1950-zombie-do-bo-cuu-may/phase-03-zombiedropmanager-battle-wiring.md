---
phase: 3
title: ZombieDropManager & battle wiring
status: completed
priority: P1
effort: 1.5h
dependencies:
  - 1
  - 2
---

# Phase 3: ZombieDropManager & battle wiring

## Overview
Hệ thống trigger + rải zombie theo thời gian (1 lần/trận), gắn vào `battle-scene.ts` song song `ReinforcementManager`.

## Requirements
- Functional: kích 1 lần khi hp thành Máy lần đầu ≤75% VÀ màn ≥40; trong 10s tiếp theo, mỗi 1s đẻ 10 zombie tại X ngẫu nhiên trong nửa sân Máy; sau 10s không đẻ thêm dù hp tiếp tục giảm.
- Non-functional: không sửa `ReinforcementManager`/`reinforcements.ts`; toast riêng, không toast lặp lại mỗi đợt rơi (10 lần/10s → spam UI).

## Architecture
- Hằng số mới trong `game-config.ts`: `ZOMBIE_MIN_STAGE=40`, `ZOMBIE_TRIGGER_HP_FRAC=0.75`, `ZOMBIE_WAVE_DURATION_MS=10000`, `ZOMBIE_DROP_INTERVAL_MS=1000`, `ZOMBIE_DROP_COUNT=10`.
- `ZombieDropManager` (mới, ~40 dòng): state `triggered`, `waveEndAt`, `nextDropAt`. `update(stage, aiSide, bases, spawn, units, now)` trả `'start' | 'drop' | false`:
  - Chưa `triggered` + `stage>=ZOMBIE_MIN_STAGE` + `hp/maxHp<=ZOMBIE_TRIGGER_HP_FRAC` → set `triggered=true`, `waveEndAt=now+DURATION`, `nextDropAt=now`, tiếp tục xử lý đợt đầu ngay (rơi luôn), trả `'start'`.
  - Đã `triggered`, `now<waveEndAt`, `now>=nextDropAt` → đẻ `ZOMBIE_DROP_COUNT` zombie tại X ngẫu nhiên nửa sân Máy (dùng `forceSpawnAt` + `drop=true`), `nextDropAt+=INTERVAL`, trả `'drop'` (đợt đầu đã trả 'start' ở nhánh trên, gộp logic để không trả cả 2).
  - Ngoài 2 trường hợp trên → `false`.
- Nửa sân Máy: hàm `zombieDropZone(aiSide)` trả `[lo, hi]` — Máy=Khôi: `[KHOI_BASE_X, GAME_WIDTH/2]`; Máy=Nguyên: `[GAME_WIDTH/2, NGUYEN_BASE_X]`. X ngẫu nhiên = `lo + Math.random()*(hi-lo)`.
- `battle-scene.ts`: field `zombieDrops = new ZombieDropManager()`. Gọi ngay sau khối `reinforcements.update(...)` hiện có (cùng guard `!bases[aiSide].isDead()`). Nếu trả `'start'` → toast "🧟 ZOMBIE ĐỔ BỘ!" (mirror `showReinforceToast`, màu khác vd xanh lá `#84cc16` để phân biệt tiếp viện thường). Nếu `'drop'` → không làm gì thêm (chỉ log/không toast).

## Related Code Files
- Modify: `src/config/game-config.ts` (hằng số + `zombieDropZone`)
- Create: `src/systems/zombie-drop.ts`
- Modify: `src/scenes/battle-scene.ts`

## Implementation Steps
1. `game-config.ts`: thêm 5 hằng số + hàm `zombieDropZone(side): [number, number]` (đặt cạnh khối `REINFORCE_*`).
2. Tạo `src/systems/zombie-drop.ts` theo Architecture trên — export `ZombieDropManager`.
3. `battle-scene.ts`:
   - import `ZombieDropManager`, `UnitType.Zombie` (nếu cần trực tiếp — thường không, manager tự biết type).
   - field `private zombieDrops!: ZombieDropManager;` khởi tạo trong `create()` cạnh `this.reinforcements`.
   - trong `update()`, sau khối `reinforcements.update`, thêm:
     ```ts
     if (!this.bases[this.aiSide].isDead()) {
       const zResult = this.zombieDrops.update(this.stage, this.aiSide, this.bases, this.spawn, this.units, time);
       if (zResult === 'start') this.showZombieToast();
     }
     ```
   - thêm `private showZombieToast()` mirror `showReinforceToast` (đổi text/màu).

## Success Criteria
- [ ] Màn ≥40, hp Máy tụt ≤75% lần đầu → toast hiện + bắt đầu đổ bộ ngay đợt đầu (10 zombie).
- [ ] Đúng 10 đợt trong 10s (10 zombie/đợt = tối đa 100 tổng), đợt cuối tại/trước `waveEndAt`.
- [ ] Sau `waveEndAt`, không đẻ thêm dù hp Máy tiếp tục giảm.
- [ ] Chỉ kích 1 lần/trận (test hp giảm tiếp không kích lại).
- [ ] Màn <40: không kích dù hp Máy rất thấp.
- [ ] Mọi zombie đẻ có X nằm trong nửa sân Máy đúng theo phe.
- [ ] `npm run build` xanh.

## Risk Assessment
- Đợt đầu và vòng lặp "đủ interval" có thể đẻ trùng nếu logic không tách rõ (đẻ 2 lần cùng frame kích hoạt) — Implementation Steps đã note gộp xử lý đợt đầu vào is-triggered-this-frame để tránh double-fire; verify kỹ ở test phase 4.
- 100 zombie cùng lúc + lính thường + titan tiếp viện (nếu màn ≥40 cả 2 hệ đều kích) → tải nặng, chấp nhận theo brainstorm.
