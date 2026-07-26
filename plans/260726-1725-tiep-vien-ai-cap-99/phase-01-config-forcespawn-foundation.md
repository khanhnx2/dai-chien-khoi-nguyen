---
phase: 1
title: Config & forceSpawn foundation
status: completed
priority: P1
effort: 1h
dependencies: []
---

# Phase 1: Config & forceSpawn foundation

## Overview
Nền tảng dữ liệu + khả năng đẻ lính bỏ giới hạn: mở cap 99, thêm config tiếp viện, thêm `SpawnManager.forceSpawn`.

## Requirements
- Functional: cap campaign = 99; helper tính số lính tiếp viện theo màn; API đẻ 1 lính bỏ qua vàng/cap/hồi chiêu nhưng vẫn theo mods phe.
- Non-functional: không phá vỡ record `Record<UnitType, …>` (tránh NaN); `npm run build` xanh; giữ file < 200 dòng.

## Architecture
- `stageStatMultiplier` giữ nguyên (tuyến tính +10%/màn) — chỉ nới clamp lên 99. Consumers (menu/result/progress) đã clamp theo `TOTAL_STAGES` nên tự chạy.
- `forceSpawn` tái dùng `spawnX(side)` + `mods[side]` (hp/dmg) như `trySpawn`, nhưng bỏ 3 guard (cooldown/cap/gold) và không đụng `readyAt`.

## Related Code Files
- Modify: `src/config/game-config.ts`
- Modify: `src/systems/spawn.ts`

## Implementation Steps
1. `game-config.ts`: đổi `export const TOTAL_STAGES = 50;` → `99`. (Comment "Chiến dịch 50 màn" → "Chiến dịch 99 màn"; ví dụ ×5.9 ở docstring `stageStatMultiplier` cập nhật thành màn 99 = ×10.8.)
2. `game-config.ts`: thêm block config tiếp viện (đặt gần khối STAGE):
   ```ts
   // ---- Quân tiếp viện cho Máy: từ màn ≥30, kích 1 lần khi thành Máy ≤50% máu ----
   export const REINFORCE_MIN_STAGE = 30;
   export const REINFORCE_HP_FRAC = 0.5; // ngưỡng máu thành Máy để kích
   /** Số lính MỖI loại trong 1 đợt tiếp viện; 0 nếu màn < REINFORCE_MIN_STAGE. */
   export function reinforcementCount(stage: number): number {
     return stage >= REINFORCE_MIN_STAGE ? Math.floor(stage / 10) : 0;
   }
   ```
3. `spawn.ts`: thêm method `forceSpawn`:
   ```ts
   /** Đẻ 1 lính bỏ qua vàng/cap/hồi chiêu (dùng cho quân tiếp viện). xOffset lệch nhẹ tránh chồng khít. */
   forceSpawn(side: Side, type: UnitType, units: Unit[], xOffset = 0): Unit {
     const m = this.mods[side];
     const unit = new Unit(this.scene, side, type, spawnX(side) + xOffset, m.unitHp[type], m.unitDmg[type]);
     units.push(unit);
     return unit;
   }
   ```
   (Lưu ý `spawnX` hiện là hàm module-level trong spawn.ts — dùng trực tiếp.)

## Success Criteria
- [ ] `TOTAL_STAGES === 99`; menu hiển thị `/ 99` (kiểm tra ở phase 3 / thủ công).
- [ ] `reinforcementCount(29)===0`, `(30)===3`, `(49)===4`, `(90)===9`, `(99)===9`.
- [ ] `forceSpawn` trả về `Unit` đã push vào mảng, hp/dmg theo mods phe, không trừ vàng/không đụng cooldown.
- [ ] `npm run build` xanh (không lỗi record/unused).

## Risk Assessment
- Không đụng mods records → không NaN. Rủi ro thấp. `forceSpawn` không kiểm cap là chủ đích (user duyệt bỏ cap).
