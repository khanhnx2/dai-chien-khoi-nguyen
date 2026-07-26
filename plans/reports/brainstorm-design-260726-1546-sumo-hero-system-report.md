# Brainstorm — Hệ thống Hero (Sumo) + trang "Quán Phở Anh Khôi"

- Ngày: 2026-07-26
- Trạng thái: ĐÃ DUYỆT → chuyển `/ck:plan --tdd`
- Phe áp dụng: chỉ Khôi

## 1. Vấn đề / Yêu cầu
Thêm hệ thống Hero riêng cho Player Khôi. Hero đầu tiên = **Sumo**. Menu chính thêm nút **"Quán Phở Anh Khôi"** → scene mua + nâng cấp hero. Sumo có hành vi đặc biệt (charge, rút lui hồi máu), nâng cấp ×2 hệ số, và **tiếng chó sủa khi đánh**.

## 2. Quyết định đã chốt (qua hỏi–đáp)
| Hạng mục | Chốt |
|---|---|
| Mua/ra trận | Mở khoá 1 lần bằng **xu** (vĩnh viễn) → trong trận đẻ bằng **vàng** (mẫu Father) |
| Giới hạn | Đẻ nhiều, chung cap 20/phe (troop-like) |
| Trang nâng cấp | **Scene mới** "Quán Phở Anh Khôi", tiêu chung xu; màn NÂNG CẤP cũ giữ nguyên |
| Charge | Địch gần nhất trong **tầm nhìn** (ngoài tầm đánh) → tốc ×4; hết địch/vào tầm đánh → tốc thường |
| Hồi máu | ≤50% máu → chạy về, **vẫn dính đòn dọc đường**; về sau Thành mình → bất khả xâm + hồi; đầy máu → lao lại |
| Khôi-only | Nút Hero luôn hiện ở menu; nút đẻ Sumo trong trận **chỉ khi cầm Khôi** |
| Nâng cấp | 4 chỉ số như troop (Máu/Sức mạnh/Hồi đẻ/Giá), **hệ số ×2** (+12%/-6% mỗi cấp, max 15) |
| Tầm/khắc chế | Cận chiến (~42), **không** tham gia kéo-búa-bao (như Father) |
| Âm thanh | Tiếng sủa **tổng hợp Web Audio** (SFX `bark`), tiết chế ~500ms ("gắu... gắu") |

## 3. Chỉ số Sumo (dẫn xuất Bộ binh)
| Chỉ số | Giá trị |
|---|---|
| Máu | 100 (= Bộ binh) |
| Tốc độ | 62 thường / **248** khi charge (×4) |
| Sức mạnh | 6 (½ Bộ binh) |
| Nhịp đánh | 175ms (¼ Bộ binh) |
| Giá vàng | 20 (½ Bộ binh) |
| Tầm | 42 (cận chiến) |

**Hằng số cân bằng (tunable, mặc định đề xuất):** tầm nhìn charge 450px · ngưỡng rút 50% · tốc chạy về ×4 · hồi máu ~25%/s (50%→100% ≈ 2s) · hồi đẻ 1500ms · bounty 10 · **mở khoá 60 xu** · bark throttle 500ms.

## 4. Máy trạng thái Sumo
```
TIẾN/ĐÁNH ──(máu≤50%)──► RÚT LUI (vẫn bị bắn) ──(về sau Thành)──► HỒI (bất khả xâm + regen)
   ▲                                                                      │
   └──────────────────────────── (đầy máu) ◄──────────────────────────────┘
TIẾN/ĐÁNH: địch trong tầm đánh → đánh 175ms (+bark throttle); địch trong tầm nhìn → tốc ×4;
           không địch → tiến tốc thường (đánh Thành khi tới tầm).
HỒI: x đã lùi qua Thành mình → isTargetable()=false → regen. Hysteresis 50%↘ / 100%↗.
```

## 5. Kiến trúc / Touchpoints (~14 file, mỗi chỗ nhỏ)
**Mới:**
- `assets/characters/sumo-cutout.png` — copy từ `~/Documents/sumo.png`, **tách nền** (skill xoá nền).
- `src/systems/hero-behavior.ts` — state machine Sumo (charge/retreat/heal + gate bark).
- `src/systems/hero-shop.ts` — mở khoá + cấp nâng cấp hero (localStorage như meta).
- `src/scenes/hero-scene.ts` — trang "Quán Phở Anh Khôi" (avatar, chỉ số hiện tại, nút Mở khoá/Đã sở hữu, 4 hàng nâng cấp). Tái dùng `clayButton` + mẫu `statsLines`/`buildRow` (cân nhắc tách helper dùng chung với `upgrade-scene.ts`).

**Sửa:**
- `config/game-config.ts`: `UnitType.Sumo` + `UNITS[Sumo]` + `SUMO_FACE_KEY` + `HERO_UPGRADES` (tách khỏi `META_UPGRADES` để không lọt shop cũ) + hằng số hành vi + thêm Sumo vào `ALL_UNIT_TYPES`/`unitRecord`.
- `systems/meta-upgrades.ts`: `computePlayerMods()` fold thêm `HERO_UPGRADES` (Sumo nhận buff ×2).
- `entities/unit.ts`: cờ trạng thái hero + `heal()` + `isTargetable()`.
- `systems/combat.ts`: delegate Sumo → `hero-behavior`; bỏ qua `!isTargetable()` trong tìm mục tiêu.
- `systems/projectile-system.ts` + `entities/roof-attacker.ts`: bỏ qua Sumo `!isTargetable()` khi nhắm.
- `audio/sound-manager.ts`: thêm SFX `bark` (sawtooth hạ cao độ + noise, 2 nhịp giật).
- `ui/battle-hud.ts`: nút đẻ Sumo (chỉ Khôi + đã mở khoá) — không đụng `PLAYER_SPAWN_ORDER`.
- `scenes/menu-scene.ts` + `main.ts`: nút "🍜 Quán Phở Anh Khôi" + đăng ký `HeroScene`.
- `scenes/preload-scene.ts`: nạp ảnh sumo.
- `test/simulation.test.ts`: case charge / rút lui / untargetable-healing / nâng cấp ×2 / unlock gating.

## 6. Rủi ro & Giảm thiểu
1. **OP tiềm tàng:** nhịp 175ms + giá rẻ 20 + cap 20 + hồi máu → gần bất tử trước cận chiến (sau 15 cấp sức mạnh ×2 ≈ ~97 dps/con). → giữ hồi đẻ 1500ms, tinh chỉnh số sau; toàn số cân bằng ở config (dễ sửa).
2. **Đám Sumo hồi máu bất khả xâm sau thành** có thể chặn đợt tấn công địch → chọn "vẫn dính đòn khi chạy về" (đã chốt) giảm nhẹ (cung thủ bắn rụng dọc đường).
3. **sumo.png là photo** → phải tách nền, nếu không hiện khối vuông.
4. **Tiếng sủa synth chỉ GIỐNG**, không chân thực 100% (đánh đổi để giữ kiến trúc synth-only, offline, deploy nhẹ).

## 7. Phạm vi
- **Trong:** chỉ hero Sumo (thiết kế cho phép thêm hero sau).
- **Ngoài:** hero thứ 2, AI dùng hero, hero cho Nguyên, SFX file thật.

## 8. Câu hỏi chưa chốt
- Các số cân bằng (nhịp/hồi đẻ/mở khoá 60 xu/hồi máu) để mặc định, tinh chỉnh sau khi chơi thử — không chặn triển khai.
