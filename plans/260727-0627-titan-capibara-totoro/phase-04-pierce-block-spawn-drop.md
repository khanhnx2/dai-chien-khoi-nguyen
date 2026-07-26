---
phase: 4
title: Pierce-block & spawn drop
status: completed
priority: P1
effort: 1.5h
dependencies:
  - 1
  - 3
---

# Phase 4: Pierce-block & spawn drop

## Overview
Hào quang chặn đạn xuyên Father + đẻ titan rơi từ trời tại 1/3 map (giá 200 vàng, cd 8s).

## Requirements
- Functional: đạn xuyên Father gặp titan địch còn `auraActive` → gây dmg cho titan rồi DỪNG (không xuyên lính sau); titan hết hào quang → xuyên bình thường. `trySpawnTitan` trừ 200 vàng, cd 8s, cap 20, đẻ tại `titanSpawnX` với hiệu ứng rơi.
- Non-functional: không đổi hành vi đạn xuyên với lính thường.

## Architecture
- `projectile-system.pierceThrough`: khi duyệt trúng 1 unit địch, nếu `titanDefByType(u.type) && u.auraActive` → `u.takeDamage(p.damage); p.kill(); return;` (dừng ngay, KHÔNG add vào hitUnits để xuyên tiếp). Lính thường & titan-hết-hào-quang giữ logic cũ (xuyên qua).
  - Thứ tự duyệt: hiện `pierceThrough` loop toàn `units` không theo vị trí. Cần dừng ở titan có hào quang NẰM TRÊN đường đạn (`Math.abs(u.x-p.x)<=STRAIGHT_HIT_DIST`) — check trong cùng điều kiện trúng.
- `spawn.ts` `trySpawnTitan(side, type, economy, units, now)`: check cd (readyAt key `titan:${side}`), cap, spend `TITAN_SPAWN_COST`; tạo Unit tại `titanSpawnX(side)` với cờ drop; set readyAt += `TITAN_SPAWN_COOLDOWN_MS`. Trả `SpawnResult`.
- Drop: Unit ctor nhận `drop=false`; nếu true → disc/icon/aura/hpBar khởi tạo ở `y - DROP_HEIGHT`, tween về `y` (~400ms, Bounce.easeOut). Vị trí X vẫn `startX`.

## Related Code Files
- Modify: `src/systems/projectile-system.ts`, `src/systems/spawn.ts`, `src/entities/unit.ts`

## Implementation Steps
1. `projectile-system.ts`: trong `pierceThrough`, trong nhánh trúng (`Math.abs(u.x-p.x)<=STRAIGHT_HIT_DIST` & chưa hit), thêm: nếu titan có hào quang → dmg + `p.kill()` + return khỏi hàm (đạn dừng); else giữ nguyên (dmg + add hitUnits, xuyên tiếp).
2. `unit.ts`: thêm tham số ctor `drop=false`; nếu true, tính `y0=y-DROP_HEIGHT` cho các GO, rồi `scene.tweens.add({targets:[disc,icon,hpBar,aura?], y, duration:400, ease:'Bounce.easeOut'})`. (hpBar y lệch — tween tương đối bằng offset, hoặc tween từng GO tới y gốc của nó.)
3. `spawn.ts`: import `titanSpawnX`, `TITAN_SPAWN_COST`, `TITAN_SPAWN_COOLDOWN_MS`; thêm `trySpawnTitan`. Dùng `this.mods[side].unitHp[type]`/`unitDmg[type]` cho hp/dmg (mods titan=1).
4. (Cooldown hiển thị HUD xử lý ở phase 5 qua `cooldownLeft`-tương-tự hoặc method mới `titanCooldownLeft`.)

## Success Criteria
- [ ] Father bắn xuyên: titan địch còn hào quang đứng trước → chỉ titan trúng, lính sau NGUYÊN; đạn dừng.
- [ ] Titan ≤2/3 máu: đạn xuyên qua titan trúng cả lính sau (như cũ).
- [ ] `trySpawnTitan`: đủ 200 vàng + hết cd + dưới cap → đẻ tại x=320/640, rơi xuống; thiếu điều kiện → trả reason đúng.
- [ ] Lính thường không bị ảnh hưởng bởi thay đổi pierce.
- [ ] `npm run build` xanh.

## Risk Assessment
- `pierceThrough` duyệt units không sắp theo X: nếu có titan hào quang + lính khác cùng nằm trong `STRAIGHT_HIT_DIST` ở frame đó, thứ tự lặp quyết định ai trúng trước. Chấp nhận (đạn nhanh 520, khoảng hit 22px hẹp → hiếm trùng); nếu cần chuẩn, sắp theo khoảng cách trước khi xử lý. Ghi chú, không bắt buộc.
- Drop tween trên nhiều GO có y gốc khác nhau (hpBar cao hơn) — tween từng GO tới y đích riêng để không lệch.
