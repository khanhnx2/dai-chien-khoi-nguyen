---
phase: 1
title: Zombie unit config & assets
status: completed
priority: P1
effort: 1h
dependencies: []
---

# Phase 1: Zombie unit config & assets

## Overview
Đăng ký `UnitType.Zombie` với chỉ số ½ Bộ binh + hồi chiêu ×2, đảm bảo mọi `Record<UnitType,…>` đủ khoá, và chuẩn bị ảnh avatar.

## Requirements
- Functional: `UNITS[Zombie]` = hp50/dmg6/speed31/spawnCd2400 (còn lại giữ như BoBinh: range42/attackCd700); ảnh cutout nạp qua `ZOMBIE_FACE_KEY`.
- Non-functional: `npm run build` xanh (không NaN record); zombie KHÔNG vào bảng khắc chế `COUNTERS` (không counter/bị counter ai, giống hero/titan).

## Architecture
- Mirror pattern titan phase 1 (đăng ký UnitType mới + records) nhưng đơn giản hơn — không cần registry/def cho unlock/nâng cấp (zombie không mua được, chỉ xuất hiện qua đổ bộ).
- Stats: `hp: 50, damage: 6, speed: 31, range: 42, cost: 20, attackCooldownMs: 700, spawnCooldownMs: 2400, reward: 9`. `cost`/`attackCooldownMs`/`reward` không được yêu cầu cụ thể → giữ tỉ lệ nhất quán với BoBinh (giả định đã duyệt trong brainstorm).
- Ảnh: tách nền `zombie.webp` bằng quy trình đã dùng cho capibara/totoro/bamboo (RMBG).

## Related Code Files
- Modify: `src/config/game-config.ts`
- Modify: `src/scenes/preload-scene.ts`
- Create: `assets/characters/zombie-cutout.png`

## Implementation Steps
1. `game-config.ts`: `enum UnitType` thêm `Zombie = 'zombie'` (comment: đổ bộ cứu Máy, người chơi không mua được).
2. `UNITS`: thêm entry `[UnitType.Zombie]: { label: 'Zombie', hp: 50, damage: 6, speed: 31, range: 42, cost: 20, attackCooldownMs: 700, spawnCooldownMs: 2400, reward: 9, color: 0x84cc16, size: 26 }`.
3. `UNIT_EMOJI`: thêm `[UnitType.Zombie]: '🧟'` (fallback nếu ảnh lỗi).
4. `ZOMBIE_FACE_KEY = 'unit-zombie'` (const texture key, đặt cạnh các FACE_KEY khác).
5. `ALL_UNIT_TYPES` + `unitRecord()`: thêm `UnitType.Zombie` vào cả 2 (như đã làm cho Capibara/Totoro trước đây).
6. Tách nền: `bash ~/.claude/skills/media-processing/scripts/remove-background.sh /Users/khanhnx/Desktop/zombie.webp briaai assets/characters/zombie-cutout.png 512`; verify có alpha channel (`magick identify -format "%[channels]"`).
7. `preload-scene.ts`: import `zombieUrl` + `this.load.image(ZOMBIE_FACE_KEY, zombieUrl)`.
8. `entities/unit.ts`: faceKey lookup thêm `?? (type === UnitType.Zombie ? ZOMBIE_FACE_KEY : null)` vào chuỗi `??` hiện có (Father/hero/titan).

## Success Criteria
- [ ] `UNITS[UnitType.Zombie].hp===50`, `.damage===6`, `.speed===31`, `.spawnCooldownMs===2400`.
- [ ] Ảnh cutout tồn tại, có kênh alpha (nền trong suốt).
- [ ] `npm run build` xanh (không NaN record, không lỗi exhaustive).
- [ ] Zombie hiện ảnh thật (không phải emoji) khi tạo `Unit` — verify ở phase 5.

## Risk Assessment
- Quên thêm vào `ALL_UNIT_TYPES`/`unitRecord` → NaN lan vào mods. `tsc` bắt được vì các Record là exhaustive theo `UnitType`.
- Ảnh tách nền xấu (viền/lỗ) → chỉnh tay hoặc báo lại nếu cần, không chặn logic (fallback emoji vẫn chạy).
