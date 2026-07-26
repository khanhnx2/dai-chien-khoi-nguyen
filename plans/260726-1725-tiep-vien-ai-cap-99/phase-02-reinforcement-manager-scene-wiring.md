---
phase: 2
title: Reinforcement manager & scene wiring
status: completed
priority: P1
effort: 1.5h
dependencies:
  - 1
---

# Phase 2: Reinforcement manager & scene wiring

## Overview
Hệ thống tiếp viện 1 đợt/trận + gắn vào battle-scene, kèm toast + SFX.

## Requirements
- Functional: mỗi frame kiểm tra điều kiện kích; khi kích → đẻ `count×` cho `[BoBinh, CungThu, GiapBinh, hero-phe-Máy]` qua `forceSpawn`; chỉ 1 lần/trận; báo scene để bắn toast + SFX.
- Non-functional: file mới < 60 dòng; không đụng vòng lặp combat/hero (đã side-agnostic).

## Architecture
- `ReinforcementManager` giữ cờ `sent`. `update(...)` trả `boolean` (true đúng frame kích) để scene phản ứng (toast/SFX) — tách UI khỏi logic.
- Hero phe Máy lấy qua `heroForSide(aiSide)`; nếu `undefined` (phe không hero) thì bỏ hero, vẫn đẻ 3 loại thường (an toàn với registry tương lai).
- Stagger X: mỗi lính lệch `i * 14 * directionOf(aiSide)` (đẻ dồn về phía trong sân Máy) để không chồng khít.

## Related Code Files
- Create: `src/systems/reinforcements.ts`
- Modify: `src/scenes/battle-scene.ts`

## Implementation Steps
1. Tạo `src/systems/reinforcements.ts`:
   ```ts
   import {
     REINFORCE_HP_FRAC, Side, UnitType, directionOf, heroForSide, reinforcementCount,
   } from '../config/game-config';
   import type { Base } from '../entities/base';
   import type { Unit } from '../entities/unit';
   import type { SpawnManager } from './spawn';

   /** Quân tiếp viện cho Máy: 1 đợt/trận khi thành Máy lần đầu ≤ REINFORCE_HP_FRAC. */
   export class ReinforcementManager {
     private sent = false;

     /** Trả true đúng frame kích (để scene bắn toast/SFX). */
     update(stage: number, aiSide: Side, bases: Record<Side, Base>, spawn: SpawnManager, units: Unit[]): boolean {
       if (this.sent) return false;
       const count = reinforcementCount(stage);
       if (count === 0) return false;
       const base = bases[aiSide];
       if (base.hp / base.maxHp > REINFORCE_HP_FRAC) return false;

       this.sent = true;
       const hero = heroForSide(aiSide)?.unitType;
       const types: UnitType[] = [UnitType.BoBinh, UnitType.CungThu, UnitType.GiapBinh, ...(hero ? [hero] : [])];
       const dir = directionOf(aiSide);
       let i = 0;
       for (const type of types) {
         for (let n = 0; n < count; n++) spawn.forceSpawn(aiSide, type, units, i++ * 14 * dir);
       }
       return true;
     }
   }
   ```
2. `battle-scene.ts`:
   - import `ReinforcementManager` + `heroForSide`.
   - field `private reinforcements!: ReinforcementManager;` khởi tạo trong `create()`: `this.reinforcements = new ReinforcementManager();`
   - Trong `update()`, **sau** `updateBattle(...)` (để dùng máu thành mới nhất frame này):
     ```ts
     if (this.reinforcements.update(this.stage, this.aiSide, this.bases, this.spawn, this.units)) {
       sound.play(heroForSide(this.aiSide)?.sfx ?? 'spawn');
       this.showReinforceToast();
     }
     ```
   - Thêm `private showReinforceToast()`: text giữa màn "⚔️ QUÂN TIẾP VIỆN!" màu đỏ, fade/scale rồi destroy (~1.5s) bằng `this.tweens`/`this.time.delayedCall`. Giữ ngắn gọn.
   - `sound.play` nhận string literal union `Sfx`; `hero.sfx` là `'bark' | 'labubu'` — đã thuộc union (verify khi build).

## Success Criteria
- [ ] Màn <30: `update` luôn trả false, không đẻ.
- [ ] Màn 30: khi thành Máy ≤50% → đẻ đúng 12 lính (3×4 loại), gồm hero phe Máy; các frame sau không đẻ thêm.
- [ ] Toast + SFX phát đúng 1 lần.
- [ ] `npm run build` xanh.

## Risk Assessment
- Thứ tự gọi sau `updateBattle` quan trọng (máu thành cập nhật trong đó). Đặt sai → trễ 1 frame (không nghiêm trọng).
- `sound.play` với key hero: nếu union chưa có → build đỏ; fallback `'spawn'` an toàn nếu cần.
