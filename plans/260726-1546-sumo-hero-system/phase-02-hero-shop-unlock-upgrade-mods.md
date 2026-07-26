---
phase: 2
title: Hero shop (unlock/upgrade/mods)
status: completed
priority: P1
effort: 3h
dependencies:
  - 1
---

# Phase 2: Hero shop (unlock/upgrade/mods)

## Overview
Hệ thống dữ liệu cho hero: mở khoá Sumo (1 lần, xu) + nâng cấp hero (localStorage) + fold `HERO_UPGRADES` vào `computePlayerMods()` để Sumo nhận buff ×2. Chưa có UI (Phase 4).

## Requirements
- Functional: `isHeroUnlocked('sumo')`, `unlockHero('sumo')` (trừ xu, đủ điều kiện), get/buy hero-upgrade level; `computePlayerMods()` áp `HERO_UPGRADES` vào `mods.unit*[Sumo]`.
- Non-functional: tái dùng store xu/level sẵn có (`meta-upgrades.ts` pattern), không đụng logic meta cũ.

## Architecture
- **Tái dùng store meta:** unlock + hero-upgrade levels lưu chung `dckn-meta` (localStorage) qua `getLevel(id)`/`buyUpgrade(def)` sẵn có trong `meta-upgrades.ts`. Xu chung `dckn-coins`.
- Unlock = `MetaUpgradeDef` đặc biệt `SUMO_UNLOCK` (id `sumo.unlock`, maxLevel 1, baseCost `SUMO_UNLOCK_COST`, target bất kỳ nhưng KHÔNG fold vào mods). `isHeroUnlocked` = `getLevel('sumo.unlock') >= 1`.
- `hero-shop.ts` (mới) = façade mỏng bọc `meta-upgrades` cho hero: `isHeroUnlocked`, `unlockHero`, list `HERO_UPGRADES` re-export, `heroUpgradeLevel`, `buyHeroUpgrade`. Giữ scene Phase 4 gọn.
- **Fold mods:** sửa `computePlayerMods()` lặp thêm qua `HERO_UPGRADES` (ngoài `META_UPGRADES`) áp `metaFactor` vào `mods.unitHp/unitDmg/unitCost/unitSpawnCd[Sumo]`. Chỉ áp khi đã unlock? → KHÔNG cần: nếu chưa unlock, người chơi không đẻ được Sumo nên mod thừa vô hại; áp luôn cho đơn giản (level 0 = ×1).

## Related Code Files
- Create: `src/systems/hero-shop.ts`
- Modify: `src/systems/meta-upgrades.ts` (`computePlayerMods` fold `HERO_UPGRADES`; export `SUMO_UNLOCK` nếu đặt ở đây, hoặc import từ config)
- Modify: `src/config/game-config.ts` (thêm `SUMO_UNLOCK` def nếu chưa có ở Phase 1)
- Modify: `test/simulation.test.ts`

## Implementation Steps
1. **Test trước:**
   - `isHeroUnlocked('sumo')` === false khi fresh; sau `addCoins(100)` + `unlockHero('sumo')` === true; xu giảm đúng `SUMO_UNLOCK_COST`.
   - `unlockHero` khi thiếu xu → false, không trừ.
   - Mua `sumo.hp` 1 cấp → `computePlayerMods().unitHp[Sumo]` === `metaFactor(hpDef, 1)` (1.12); trong khi `unitHp[BoBinh]` không đổi.
   - Test dùng `beforeEach`-style reset: xoá `dckn-meta`/`dckn-coins` (localStorage stub trong test env — kiểm tra harness `--localstorage-file`).
   - `npm test` → RED.
2. `hero-shop.ts`: bọc `meta-upgrades` (`getLevel/buyUpgrade/getCoins`). Hàm `unlockHero` = `buyUpgrade(SUMO_UNLOCK)`. `buyHeroUpgrade(def)` = `buyUpgrade(def)`.
3. `meta-upgrades.ts` `computePlayerMods()`: sau vòng `META_UPGRADES`, thêm vòng `HERO_UPGRADES` áp cùng switch (chỉ nhánh unit*). Giữ hàm < 200 dòng (đang ~100, ok).
4. `npm run build` + `npm test` → GREEN.

## Success Criteria
- [ ] Test unlock + ×2 mod pass; 22 test cũ pass.
- [ ] `computePlayerMods()` áp HERO_UPGRADES chỉ cho Sumo, không rò sang troop khác.
- [ ] Unlock idempotent (maxLevel 1, mua lần 2 → false).

## Risk Assessment
- **localStorage trong test:** harness chạy `tsx` với `--localstorage-file`; nếu không có localStorage, `meta-upgrades` fallback bộ nhớ RAM (`memLevels`/`memCoins`) — test phải reset các biến này (dùng API `addCoins`/mua, hoặc export hàm reset test-only). Xác minh ở bước 1.
- **Rò mod:** đảm bảo vòng fold chỉ chạm khóa `[Sumo]`.
