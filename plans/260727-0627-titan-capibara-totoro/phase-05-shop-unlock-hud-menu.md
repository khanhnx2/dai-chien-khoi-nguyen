---
phase: 5
title: Shop unlock HUD & menu
status: completed
priority: P1
effort: 2h
dependencies:
  - 1
  - 4
---

# Phase 5: Shop unlock HUD & menu

## Overview
Unlock titan bằng xu (shop scene + nút menu) + nút đẻ titan trong trận (gold 200, cd 8s) khi đã unlock.

## Requirements
- Functional: `titan-shop.ts` (isTitanUnlocked/unlockTitan/usableTitan); `titan-shop-scene.ts` shop mua unlock 120 xu; nút menu mở shop mỗi phe; nút HUD đẻ titan (gate bằng usableTitan, hiển thị cd + giá 200).
- Non-functional: tái dùng `ui-kit`/`meta-upgrades`/`upgrade-row`; không đụng hero-shop.

## Architecture
- `titan-shop.ts` mirror `hero-shop.ts` (unlock-only, KHÔNG có buy-upgrade): dùng `buyUpgrade`/`getLevel` từ meta-upgrades trên `titan.unlock`.
- `titan-shop-scene.ts` mirror `hero-scene.ts` nhưng bỏ phần upgrade rows — chỉ avatar + panel stats tĩnh + nút "Mở khoá (120 xu)". Route qua init data `titanId`.
- `menu-scene.ts`: thêm nút mở titan-shop cho phe đang chọn (giống nút hero shop). Nếu menu chật → đặt cạnh nút hero shop.
- `battle-hud.ts`: sau nút hero, thêm nút titan nếu `usableTitan(playerSide)`; onClick gọi callback scene → `trySpawnTitan`. Hiển thị hồi chiêu (dùng `spawn.titanCooldownLeft` hoặc `cooldownLeft` với type titan).
- `battle-scene.ts`: `onPlayerSpawnTitan()` gọi `spawn.trySpawnTitan`, phát sound 'spawn' nếu thành công.

## Related Code Files
- Create: `src/systems/titan-shop.ts`, `src/scenes/titan-shop-scene.ts`
- Modify: `src/scenes/menu-scene.ts`, `src/ui/battle-hud.ts`, `src/scenes/battle-scene.ts`, `src/main.ts` (đăng ký scene mới)

## Implementation Steps
1. `titan-shop.ts`: `isTitanUnlocked(t)`, `unlockTitan(t)`, `usableTitan(side)` (mirror hero-shop `usableHero`).
2. `titan-shop-scene.ts`: scene key `'titan'`; render title/avatar/stats + nút mở khoá (disable nếu đã mở / thiếu xu). Tái dùng `avatarFrame`/`clayButton`/`buildStatsPanel`.
3. `main.ts`: thêm `TitanShopScene` vào danh sách scene.
4. `menu-scene.ts`: nút "🦫/🌰 Titan" → `scene.start('titan', { titanId })` theo phe.
5. `battle-hud.ts`: nút đẻ titan (gate `usableTitan`), giá 200, hiển thị cd; callback `onSpawnTitan`.
6. `battle-scene.ts`: thêm `onSpawnTitan` vào HUD config → `this.spawn.trySpawnTitan(...)`.

## Success Criteria
- [ ] Vào shop titan, mua 120 xu → `isTitanUnlocked` true (persist localStorage).
- [ ] Trong trận (đã unlock): nút titan hiện; bấm khi đủ 200 vàng + hết cd → titan rơi xuống; cd 8s hiển thị đếm lùi.
- [ ] Chưa unlock → không có nút titan.
- [ ] Máy không có nút/không đẻ titan.
- [ ] `npm run build` xanh.

## Risk Assessment
- Đăng ký scene ở main.ts dễ quên → scene 'titan' không tồn tại khi start. Kiểm danh sách scene.
- Menu chật chỗ (đã có hero shop + stage stepper). Nếu đè nhau → xếp lại layout; ưu tiên không che tiêu đề (đã có tiền lệ fix nút Quán Phở).
