# Brainstorm — Titan Capibara (Khôi) / Totoro (Nguyên)

**Ngày:** 2026-07-27 · **Trạng thái:** ĐÃ DUYỆT → sẵn sàng plan

## Vấn đề
Thêm 1 archetype đơn vị MỚI "Titan": Capibara (phe Khôi) & Totoro (phe Nguyên) — tank khổng lồ, rơi từ trời, có hào quang chặn đạn xuyên Father, chết thì hồi máu toàn quân. Chỉ người chơi dùng (như hero).

## Yêu cầu chốt (Q&A + scout)

| # | Yêu cầu | Quyết định |
|---|---|---|
| 1 | Ai dùng | **Chỉ người chơi** (unlock xu + đẻ vàng); Máy KHÔNG dùng (như hero) |
| 2 | Hào quang | **Chỉ chặn đạn xuyên Father** đi xuyên qua; Titan VẪN ăn mọi sát thương thường (kể cả đòn Father chặn tại nó) |
| 3 | Chết → hồi máu | Mọi lính còn sống CÙNG PHE `heal(maxHp × 0.01)` (1% máu tối đa của CHÍNH mỗi lính); không hồi thành |
| 4 | Hồi chiêu đẻ | **8 giây** (chống spam tank) |

## Chỉ số (2 con giống hệt, khác avatar/phe — pattern như Sumo/Labubu)

| Stat | Giá trị | Nguồn |
|---|---|---|
| Máu | 1400 | GiapBinh 280 ×5 |
| Sát thương | 36 | GiapBinh 18 ×2 |
| Tốc chạy | 20 | GiapBinh 40 ×0.5 |
| Nhịp đánh (attackCd) | 2200ms | GiapBinh 1100 ×2 (chậm hơn) |
| Tầm | 46 (cận chiến) | = GiapBinh (giả định, user duyệt) |
| Giá đẻ | 200 vàng | chốt |
| Hồi chiêu đẻ | 8000ms | chốt |
| Unlock shop | 120 xu | chốt |
| Bounty khi bị giết | 120 | giả định (~tank), user duyệt |
| Nâng cấp | KHÔNG (chỉ unlock) | YAGNI |
| Ngưỡng hào quang | hp/maxHp > 2/3 | "mất 1/3 máu thì mất hào quang" |

## Kết quả scout (căn cứ)
- GiapBinh: hp280/dmg18/speed40/range46/attackCd1100 [game-config.ts:111].
- Father `piercing:true` [game-config.ts:138] → đạn `pierce` `pierceThrough` [projectile-system.ts:51] xuyên mọi lính, dừng ở thành. Móc chặn hào quang tại đây.
- `HEROES`/`heroForSide` dùng `.find` → **1 hero/phe**; Khôi đã có Sumo → KHÔNG fold Capibara vào HEROES (vỡ). Hành vi cũng khác → archetype riêng.
- Unit render: faceKey `type===Father ? FATHER_FACE_KEY : heroDefByType(type)?.faceKey` [unit.ts]; ảnh cutout nạp ở [preload-scene.ts]. Cần mở rộng cho titan.
- Dead-cleanup + bounty trong `updateBattle` cuối vòng [combat.ts:113] → móc hồi-máu-khi-chết.
- Sumo/Labubu = pattern "cặp giống hệt qua registry" → mirror cho titan.
- Avatar Desktop `capibara.png`(1MB)/`totoro.png`(400KB) là ảnh thô → cần tách nền.

## Kiến trúc
Registry MỚI `TITANS` song song `HEROES`. Titan KHÔNG có nâng cấp (khác hero). Mirror: unlock-by-xu (meta-upgrades localStorage) + nút đẻ HUD + avatar cutout + scene shop.

## Files

| File | Thay đổi |
|---|---|
| `src/config/game-config.ts` | `UnitType.Capibara/Totoro`; `titanUnitStats()`; `TitanDef`+`TITANS`; `CAPIBARA/TOTORO_FACE_KEY`; `titanForSide`/`titanDefByType`; thêm vào `ALL_UNIT_TYPES`/`UNIT_EMOJI`/`unitRecord`; `TITAN_AURA_HP_FRAC=2/3`, `TITAN_DEATH_HEAL_FRAC=0.01`, drop-x const |
| `src/entities/unit.ts` | faceKey lookup + titan; vòng hào quang (arc stroke) + `setAura(active)`; `auraActive` state; drop-from-sky (spawn y cao → tween xuống lane) |
| `src/systems/titan-behavior.ts` (mới) | `updateTitan`: tiến chậm + đánh cận chiến theo nhịp + cập nhật cờ hào quang mỗi frame |
| `src/systems/combat.ts` | dispatch `titanDefByType(type)` → `updateTitan`; trong cleanup: nếu titan chết → hồi 1% maxHp mọi lính cùng phe còn sống |
| `src/systems/projectile-system.ts` | `pierceThrough`: gặp titan địch còn `auraActive` → gây dmg rồi `kill()` (không xuyên tiếp) |
| `src/systems/spawn.ts` | `trySpawnTitan(side,...)`: 200 vàng + cd 8s + cap; đẻ tại 1/3 map (Khôi≈320, Nguyên≈640) với drop |
| `src/systems/titan-shop.ts` (mới) | `usableTitan(side)`/`isTitanUnlocked`/`unlockTitan` (mirror hero-shop, unlock-only) |
| `src/scenes/titan-shop-scene.ts` (mới) | shop unlock (tái dùng `ui-kit`/`avatarFrame`/`clayButton`) + route từ menu |
| `src/scenes/menu-scene.ts` | nút mở shop titan mỗi phe |
| `src/ui/battle-hud.ts` | nút đẻ titan (gold 200, cd 8s) khi đã unlock — `usableTitan` |
| `src/scenes/preload-scene.ts` | nạp 2 cutout titan |
| `assets/characters/` | `capibara-cutout.png`, `totoro-cutout.png` (tách nền từ Desktop) |
| `test/simulation.test.ts` | test: stats dẫn xuất; hào quang chặn xuyên (còn/hết); hồi máu khi chết; ngưỡng 2/3; drop position |

## Cơ chế chi tiết
1. **Rơi từ trời**: `trySpawnTitan` tạo Unit tại x=1/3 map phía quân mình, cờ drop → Unit khởi tạo icon/disc ở y cao, tween xuống `LANE_Y` (~400ms).
2. **Hào quang**: `updateTitan` set `auraActive = hp/maxHp > 2/3`; `setAura` hiện/ẩn vòng. `pierceThrough` bỏ qua (dừng) khi trúng titan địch còn hào quang.
3. **Chết → hồi**: cleanup loop trong `updateBattle`, trước `destroy`, nếu `titanDefByType(unit.type)` → loop mọi `u.side===unit.side && !u.isDead()` → `u.heal(u.maxHp*0.01)`.
4. **Player mods**: titan không nâng cấp → mods=1 (records có sẵn qua `unitRecord`); computePlayerMods không cần đổi ngoài việc UnitType mới lọt records.

## Success criteria
- Unlock 120 xu ở shop titan; trong trận đẻ 200 vàng, hồi chiêu 8s, rơi tại 1/3 map.
- Còn >2/3 máu: đạn xuyên Father dừng ở titan (lính sau sống). ≤2/3: xuyên bình thường.
- Titan chết: mọi lính cùng phe +1% máu.
- Máy không bao giờ đẻ titan.
- `npm run build` + `npm test` xanh.

## Rủi ro / Unresolved
- **Cân bằng**: 1400 máu + hồi toàn quân có thể OP — số ở config, chỉnh sau khi chơi thử (nợ, ghi memory).
- **Tách nền avatar**: cần rmbg/imagemagick; nền phức tạp có thể phải chỉnh tay — verify sau khi cutout.
- **Menu clutter**: mỗi phe giờ 2 shop (hero + titan) — chấp nhận (mirror pattern); gộp UI để sau nếu rối.
