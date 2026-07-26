---
phase: 1
title: Config & unit stats registry
status: completed
priority: P1
effort: 1.5h
dependencies: []
---

# Phase 1: Config & unit stats registry

## Overview
Đăng ký 2 UnitType mới (Capibara/Totoro) + registry TITANS + các hằng số cơ chế, đảm bảo mọi `Record<UnitType,…>` đủ khoá (tránh NaN mods).

## Requirements
- Functional: `UnitType.Capibara`/`UnitType.Totoro` với stats dẫn xuất GiapBinh; registry `TITANS` + helpers; hằng số hào quang/hồi-máu/drop.
- Non-functional: `npm run build` xanh (exhaustive records đủ khoá); giữ file < 200 dòng (game-config đã lớn — chỉ THÊM, không phình quá).

## Architecture
- Mirror pattern Sumo/Labubu: `titanUnitStats(label,color)` trả stats giống nhau cho cả 2 titan.
- `TitanDef` gọn hơn `HeroDef` (KHÔNG có upgrades): `{ id, unitType, side, faceKey, shopTitle, menuLabel, menuFill, unlock: MetaUpgradeDef }`.
- `TITANS` registry + `titanForSide(side)` (`.find` — 1 titan/phe) + `titanDefByType(type)`.
- Stats titan qua `computePlayerMods` = 1 (không nâng cấp) miễn là lọt `ALL_UNIT_TYPES` + `unitRecord`.

## Related Code Files
- Modify: `src/config/game-config.ts`

## Implementation Steps
1. `enum UnitType`: thêm `Capibara = 'capibara'`, `Totoro = 'totoro'` (kèm comment: Titan tank, người chơi).
2. `UNITS`: thêm 2 entry qua helper:
   ```ts
   [UnitType.Capibara]: titanUnitStats('Capibara', 0x84cc16),
   [UnitType.Totoro]: titanUnitStats('Totoro', 0x64748b),
   function titanUnitStats(label: string, color: number): UnitStats {
     return { label, hp: 1400, damage: 36, speed: 20, range: 46, cost: 200,
       attackCooldownMs: 2200, spawnCooldownMs: 8000, reward: 120, color, size: 48 };
   }
   ```
3. `UNIT_EMOJI`: thêm `[UnitType.Capibara]: '🦫'`, `[UnitType.Totoro]: '🌰'` (fallback nếu chưa có ảnh).
4. Texture keys: `export const CAPIBARA_FACE_KEY = 'unit-capibara';` + `TOTORO_FACE_KEY = 'unit-totoro';`.
5. `ALL_UNIT_TYPES`: thêm `UnitType.Capibara, UnitType.Totoro`. Kiểm `unitRecord` bao trọn (nó dùng literal record → thêm 2 khoá vào object trong `unitRecord`).
6. Hằng số cơ chế:
   ```ts
   export const TITAN_AURA_HP_FRAC = 2 / 3;   // >2/3 máu: hào quang chặn đạn xuyên
   export const TITAN_DEATH_HEAL_FRAC = 0.01; // chết → +1% maxHp mỗi lính cùng phe
   export const TITAN_SPAWN_COST = 200;
   export const TITAN_SPAWN_COOLDOWN_MS = 8000;
   export const TITAN_UNLOCK_COST = 120;
   /** X đẻ titan: 1/3 map phía quân mình (Khôi ≈320, Nguyên ≈640). */
   export function titanSpawnX(side: Side): number {
     return side === Side.Khoi ? GAME_WIDTH / 3 : (GAME_WIDTH * 2) / 3;
   }
   ```
7. `TitanDef` + `TITANS` + `titanForSide` + `titanDefByType` + `titanUnlockDef(id,label)` (mirror `heroUnlockDef`, baseCost `TITAN_UNLOCK_COST`).

## Success Criteria
- [ ] `UNITS[UnitType.Capibara].hp===1400`, `.damage===36`, `.speed===20`, `.attackCooldownMs===2200`, `.cost===200`.
- [ ] `titanForSide(Side.Khoi)?.unitType===UnitType.Capibara`, `Side.Nguyen→Totoro`.
- [ ] `titanSpawnX(Side.Khoi)===320`, `titanSpawnX(Side.Nguyen)===640` (GAME_WIDTH 960).
- [ ] `npm run build` xanh (không NaN record / unused).

## Risk Assessment
- Quên thêm khoá vào 1 record → NaN mods hoặc lỗi tsc. `unitRecord` + `UNIT_EMOJI` + `UNITS` là 3 record exhaustive cần cập nhật; tsc bắt literal.
