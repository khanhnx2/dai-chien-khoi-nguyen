---
phase: 1
title: Config stats & upgrade defs
status: completed
priority: P1
effort: 1h
dependencies: []
---

# Phase 1: Config stats & upgrade defs

## Overview
Khai báo mọi số liệu đại bác + 2 field mods mới + def unlock/nâng cấp, và fold chúng vào `computePlayerMods`.

## Requirements
- Functional: hằng số cannon; `SideMods.cannonDmg/cannonCd`; `CANNON_UNLOCK` (240 xu, 1 cấp) + `CANNON_UPGRADES` (2 def); fold vào mods.
- Non-functional: `npm run build` xanh; không phá `uniformSideMods` (chỗ duy nhất khởi tạo `SideMods` literal).

## Architecture
- Hằng số + def đặt trong `game-config.ts` (NGUỒN CHÂN LÝ). Đặt gần khối `ROOF_ATTACK` cho dễ đối chiếu.
- `cannonDmg`/`cannonCd` mirror chính xác `roofDmg`/`roofCd` (đã tồn tại, cùng ngữ nghĩa: nhân sát thương / nhân hồi chiêu).
- Nâng cấp dùng hệ số nhóm "Thành" (`INC`=0.06, `RED`=-0.03, `MAX_LV`=15) — KHÔNG dùng `HERO_INC/HERO_RED` (×2) vì cannon đã rất mạnh.
- Cannon là thực thể DUY NHẤT (không phải cặp theo phe như hero/titan) → không cần registry array, chỉ 1 def unlock + 1 mảng upgrades.

## Related Code Files
- Modify: `src/config/game-config.ts`
- Modify: `src/systems/meta-upgrades.ts`

## Implementation Steps
1. `game-config.ts` — thêm khối hằng số (đặt sau `ROOF_ATTACK`):
   ```ts
   // ---- Đại bác: sau thành người chơi, chỉ từ màn ≥40 + đã mở khoá bằng xu ----
   export const CANNON_MIN_STAGE = 40;
   export const CANNON_UNLOCK_COST = 240;   // xu, mua 1 lần
   export const CANNON_DAMAGE = 1000;
   export const CANNON_COOLDOWN_MS = 5000;
   export const CANNON_RANGE = 400;
   export const CANNON_PROJECTILE_SPEED = 380;  // chậm hơn đạn thường → cảm giác "nặng"
   export const CANNON_PROJECTILE_COLOR = 0x334155;
   ```
2. `SideMods` — thêm `cannonDmg: number;` + `cannonCd: number;` (ngay dưới `roofDmg`/`roofCd`).
3. `uniformSideMods` — thêm `cannonDmg: mult, cannonCd: mult` (AI không dùng nhưng cần giá trị hợp lệ, tránh `undefined` lọt vào phép nhân → NaN).
4. `MetaUpgradeDef['target']` union — thêm `'cannonDmg' | 'cannonCd'`.
5. Thêm def (đặt cạnh `META_UPGRADES`, KHÔNG fold vào mảng đó — cannon có shop riêng như hero/titan):
   ```ts
   /** Def "mở khoá" đại bác (1 cấp, giá cố định) — KHÔNG fold vào mods (perLevel 0). */
   export const CANNON_UNLOCK: MetaUpgradeDef =
     { id: 'cannon.unlock', group: 'Đại bác', label: 'Mở khoá Đại bác', target: 'income',
       perLevel: 0, maxLevel: 1, baseCost: CANNON_UNLOCK_COST, costGrowth: 1 };

   /** 2 nâng cấp đại bác (hệ số nhóm "Thành", KHÔNG ×2 như hero/titan). */
   export const CANNON_UPGRADES: MetaUpgradeDef[] = [
     { id: 'cannon.dmg', group: 'Đại bác', label: 'Sát thương', target: 'cannonDmg',
       perLevel: INC, maxLevel: MAX_LV, baseCost: 14, costGrowth: 1.45 },
     { id: 'cannon.cd', group: 'Đại bác', label: 'Giảm hồi chiêu', target: 'cannonCd',
       perLevel: RED, maxLevel: MAX_LV, baseCost: 14, costGrowth: 1.45 },
   ];
   ```
6. `meta-upgrades.ts` — import `CANNON_UPGRADES`; thêm 2 case vào switch trong `computePlayerMods`:
   `case 'cannonDmg': mods.cannonDmg *= factor; break;` và tương tự `cannonCd`; thêm `for (const def of CANNON_UPGRADES) apply(def);` sau vòng titan.

## Success Criteria
- [ ] `CANNON_DAMAGE===1000`, `CANNON_COOLDOWN_MS===5000`, `CANNON_RANGE===400`, `CANNON_MIN_STAGE===40`, `CANNON_UNLOCK_COST===240`.
- [ ] `uniformSideMods(1).cannonDmg===1` và `.cannonCd===1`.
- [ ] Mua 1 cấp `cannon.dmg` → `computePlayerMods().cannonDmg > 1`; mua `cannon.cd` → `.cannonCd < 1`.
- [ ] `npm run build` xanh (union `target` khớp mọi chỗ dùng).

## Risk Assessment
- Quên thêm field vào `uniformSideMods` → `undefined * số` = NaN lan vào sát thương. `tsc` bắt được vì `SideMods` là interface bắt buộc đủ field.
- `MetaUpgradeDef.target` là union hẹp → quên mở rộng sẽ lỗi type ngay khi khai báo def (tốt, fail sớm).
