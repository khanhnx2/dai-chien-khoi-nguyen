---
phase: 6
title: Tests & build verify
status: completed
priority: P2
effort: 1h
dependencies:
  - 3
  - 4
  - 5
---

# Phase 6: Tests & build verify

## Overview
Test mô phỏng cho cơ chế titan + verify build/test/dev toàn bộ.

## Requirements
- Functional: cover stats, hào quang chặn xuyên (còn/hết), hồi máu khi chết, ngưỡng 2/3, spawn cd/giá/vị trí.
- Non-functional: theo pattern `check()` + `pump()` + Phaser stub; không browser.

## Architecture
- Dùng Unit/Base/SpawnManager thật với stub scene. Stub `scene.add.circle` đã có; kiểm `setStrokeStyle`/`setVisible` có trong `makeGO` (thêm nếu thiếu).
- Pierce test: dựng Projectile `pierce` + titan hào quang + lính sau, chạy `updateProjectiles`, kiểm lính sau còn nguyên máu.

## Related Code Files
- Modify: `test/simulation.test.ts`

## Implementation Steps
1. Bổ sung stub `makeGO`: đảm bảo `setStrokeStyle`, `setVisible` chainable (thêm nếu chưa có).
2. Check `titan: stats dẫn xuất GiapBinh`: hp1400/dmg36/speed20/attackCd2200/cost200; `titanForSide` + `titanSpawnX` đúng.
3. Check `titan: hào quang chặn đạn xuyên Father`:
   - Titan Nguyên (địch của Khôi) hp đầy tại x=500, 1 lính thường Nguyên tại x=520 (sau titan theo hướng đạn Khôi bay phải).
   - Projectile Khôi `pierce` tại x≈480 bay phải, `updateProjectiles` vài frame.
   - Assert: titan trúng dmg, lính sau `hp===maxHp` (được chắn), đạn `!alive`.
4. Check `titan: hết hào quang thì xuyên qua`: set titan hp = maxHp*0.5 → `updateTitan` 1 frame để set aura false → đạn xuyên trúng cả lính sau.
5. Check `titan chết → hồi 1% toàn quân`: 1 titan Khôi + vài lính Khôi (giảm máu sẵn) + 1 lính Nguyên; set titan hp=1 rồi cho chết (takeDamage) → chạy `updateBattle` 1 frame → lính Khôi +1% maxHp mỗi con, lính Nguyên không đổi.
6. Check `titan: ngưỡng aura` : hp>2/3 → auraActive true; =2/3 hoặc thấp hơn → false.
7. Chạy `npm test` (tất cả xanh) + `npm run build` (xanh). Optional: dev server smoke — unlock, đẻ titan, thấy rơi + hào quang.

## Success Criteria
- [ ] Các check mới pass; toàn bộ test cũ vẫn pass.
- [ ] `npm run build` xanh (tsc + vite).
- [ ] (Optional) dev server: shop unlock → đẻ titan rơi 1/3 map, hào quang hiện, Father không xuyên qua khi đầy máu.

## Risk Assessment
- Stub scene thiếu method mới (setStrokeStyle/setVisible/tween drop) → test crash. Bổ sung no-op vào makeGO/scene stub.
- Test pierce phụ thuộc thứ tự duyệt units — dựng khoảng cách rõ ràng (titan trước lính sau theo hướng đạn) để tất định.
