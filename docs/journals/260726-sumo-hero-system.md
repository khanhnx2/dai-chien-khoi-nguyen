# Journal — Hero (Sumo) + "Quán Phở Anh Khôi"

**Ngày:** 2026-07-26 · **Commit:** `a99226c` · **Nhánh:** main

## Bối cảnh
Phiên gồm 3 việc nối tiếp: (1) sửa 2 bug (trứng nóc Khôi AoE → đơn mục tiêu; iOS xoay ngang); (2) thêm bảng chỉ số vào shop NÂNG CẤP; (3) tính năng lớn: hệ thống Hero với hero đầu tiên **Sumo** (chó Chihuahua) — brainstorm → plan (TDD) → cook.

## Quyết định chính
- **Sumo = troop-like, không phải hero giới hạn:** đẻ nhiều, chung cap 20. Unlock 1 lần bằng xu → đẻ bằng vàng (mẫu Father). Chốt qua hỏi–đáp với người dùng.
- **Chỉ Tướng/Sumo mới AoE:** trước đó đổi trứng nóc Khôi từ AoE sang đơn mục tiêu (người dùng chọn) — nền tảng cho triết lý "đòn thường đơn mục tiêu".
- **Nâng cấp hero tách khỏi META_UPGRADES** (`HERO_UPGRADES`) để không lọt shop cũ; ×2 hệ số (+12%/-6%). Cùng kho localStorage `dckn-meta` nên `buyUpgrade`/`getLevel` dùng lại được → `hero-shop.ts` chỉ là façade mỏng.
- **Bất khả xâm khi hồi máu:** `Unit.isTargetable()` false khi Sumo rút lui + đã về sau Thành; guard thêm vào **cả 5** điểm nhắm mục tiêu (combat, 3 nhánh projectile, roof). Với lính khác `retreating` luôn false → 0 regression.
- **Tiếng sủa synth** (không dùng file) để giữ kiến trúc audio-only-Web-Audio; tiết chế 500ms/con.

## Cạm bẫy gặp phải
- **Thêm `UnitType.Sumo` phá mọi `Record<UnitType,…>`** (UNITS, UNIT_EMOJI, unitRecord). Phải thêm khóa Sumo khắp nơi, nếu không `mods.unitHp[Sumo]` = undefined → NaN. `tsc` bắt được các literal thiếu khóa.
- **Circular import `combat.ts` ↔ `hero-behavior.ts`** (updateSumo ↔ nearestEnemyUnit). An toàn vì chỉ dùng ở runtime, không top-level. Ghi chú kỹ thuật: nên tách `targeting.ts` nếu về sau cần dùng ở module-init.
- **RAF throttle khi tab preview mất focus** → không quan sát được chuyển động live trong trình duyệt. Bù bằng unit-test tất định (charge/retreat/heal/untargetable) + kiểm tĩnh (spawn, gating, UI).
- **`sumo.png` thực ra là ảnh chó** nền tối → tách nền bằng flood-fill từ viền (PIL, giữ mắt/mũi tối bên trong). Giải thích luôn yêu cầu "tiếng chó sủa".

## Kết quả
- 4 file mới, 13 sửa; mọi file <200 dòng. Tách `ui/upgrade-row.ts` dùng chung 2 shop (DRY).
- Test 22 → **30** (8 case mới), build `tsc` sạch. Code review: **SHIP** (0 lỗi Critical/High/Medium).
- E2E xác nhận: mở khoá 60 xu, nâng cấp ×2 (Máu 100→112), gating Khôi-only, AI không có Sumo.

## Nợ kỹ thuật / theo dõi
- Cân bằng: nhịp 175ms + spam rẻ + hồi máu dễ OP — số ở config, chỉnh sau khi chơi thử.
- Cosmetic: nút menu "Quán Phở Anh Khôi" hơi đè mép trái tiêu đề.
- `isBehindOwnBase` dùng tâm Thành (không phải mép sau) — thực tế không khai thác được.
