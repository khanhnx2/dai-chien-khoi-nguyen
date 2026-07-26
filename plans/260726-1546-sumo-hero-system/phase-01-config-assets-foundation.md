---
phase: 1
title: Config & assets foundation
status: completed
priority: P1
effort: 3h
dependencies: []
---

# Phase 1: Config & assets foundation

## Overview
Khai báo Sumo trong nguồn chân lý (`game-config.ts`), copy + tách nền avatar, nạp texture. Nền tảng type/const cho các pha sau. Chưa có hành vi/UI.

## Requirements
- Functional: có `UnitType.Sumo` + `UNITS[Sumo]` dẫn xuất từ Bộ binh; hằng số hành vi & hero-upgrade defs; texture `unit-sumo` nạp được.
- Non-functional: DRY (số Sumo tính từ `UNITS[BoBinh]`), không phá 22 test hiện có, avatar nền trong suốt.

## Architecture
- Sumo = một `UnitType` mới, KHÔNG vào `SPAWN_ORDER` (AI không dùng) và KHÔNG vào `PLAYER_SPAWN_ORDER` (Khôi-only + gated unlock, xử lý riêng ở HUD — Phase 6).
- KHÔNG thêm vào `COUNTERS` → `damageMultiplier` trả 1 (không khắc chế). Giống Father.
- `HERO_UPGRADES` là list **tách khỏi** `META_UPGRADES` (để không lọt shop NÂNG CẤP cũ), cùng shape `MetaUpgradeDef`, `perLevel` = INC×2 / RED×2, group `'Sumo'`.
- `ALL_UNIT_TYPES` + `unitRecord()` phải gồm Sumo (nếu không `SideMods.unitHp[Sumo]` = undefined → NaN khi nhân).

## Related Code Files
- Create: `assets/characters/sumo-cutout.png` (copy từ `~/Documents/sumo.png`, tách nền)
- Modify: `src/config/game-config.ts`
- Modify: `src/scenes/preload-scene.ts`
- Modify: `test/simulation.test.ts` (thêm case config)

## Implementation Steps
1. **Test trước** (`test/simulation.test.ts`), thêm case:
   - `UNITS[Sumo]`: hp === UNITS[BoBinh].hp; damage === BoBinh.damage/2; cost === BoBinh.cost/2; attackCooldownMs === BoBinh.attackCooldownMs/4; speed === BoBinh.speed; range ~42.
   - `damageMultiplier(Sumo, X)` === 1 với mọi X (không khắc chế).
   - `uniformSideMods(1).unitHp[Sumo]` === 1 (record đủ khóa Sumo).
   - `HERO_UPGRADES`: mỗi def hp/dmg perLevel === META INC×2 (0.12); cost/spawncd === RED×2 (-0.06); group 'Sumo'; maxLevel 15.
   - Chạy `npm test` → RED (chưa có Sumo).
2. `game-config.ts`:
   - `enum UnitType { ... Sumo = 'sumo' }`.
   - `UNITS[Sumo]`: dẫn xuất bằng biểu thức tham chiếu BoBinh (vd `hp: UNITS_BO.hp` — hoặc hằng cục bộ) — máu 100, damage 6, speed 62, range 42, cost 20, attackCooldownMs 175, spawnCooldownMs 1500, reward 10, color (vd 0xf472b6), size 30, **không** `piercing`.
   - `SUMO_FACE_KEY = 'unit-sumo'`.
   - Hằng hành vi (export): `SUMO_VISION_RANGE = 450`, `SUMO_CHARGE_MULT = 4`, `SUMO_RETREAT_HP_FRAC = 0.5`, `SUMO_RETREAT_SPEED_MULT = 4`, `SUMO_HEAL_FRAC_PER_SEC = 0.25`, `SUMO_BARK_THROTTLE_MS = 500`.
   - `SUMO_UNLOCK_COST = 60` (xu).
   - Thêm `Sumo` vào `ALL_UNIT_TYPES` và các nhánh `unitRecord()`.
   - `HERO_UPGRADES: MetaUpgradeDef[]` — 4 def (hp/dmg/spawncd/cost) target `unitHp/unitDmg/unitSpawnCd/unitCost` với `unitType: Sumo`, `perLevel` gấp đôi, group `'Sumo'`, id `sumo.hp`/`sumo.dmg`/`sumo.spawncd`/`sumo.cost`. (Unlock def xử lý ở Phase 2.)
3. `preload-scene.ts`: `import sumoUrl from '../../assets/characters/sumo-cutout.png'` + `this.load.image(SUMO_FACE_KEY, sumoUrl)`.
4. Copy asset: `cp ~/Documents/sumo.png assets/characters/` rồi tách nền (skill xoá nền → `sumo-cutout.png`). Nếu tách nền lỗi, dùng ảnh gốc tạm + ghi chú.
5. `npm run build` + `npm test` → GREEN.

## Success Criteria
- [ ] Test config Sumo pass; 22 test cũ vẫn pass.
- [ ] `npm run build` sạch (type-check).
- [ ] `assets/characters/sumo-cutout.png` tồn tại, nền trong suốt.
- [ ] `UNITS[Sumo]` đúng dẫn xuất; `HERO_UPGRADES` ×2 hệ số.

## Risk Assessment
- **NaN mod:** quên thêm Sumo vào `unitRecord`/`ALL_UNIT_TYPES` → mods undefined. Test khóa điều này.
- **Tách nền lỗi:** fallback ảnh gốc + cờ TODO, không chặn pha sau.
- **color/size field:** `stats.color` không dùng cho disc (disc = màu phe) nhưng vẫn khai để đủ interface.
