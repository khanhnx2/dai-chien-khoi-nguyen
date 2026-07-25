---
phase: 2
title: Core Battle (playable slice)
status: completed
priority: P1
effort: 1-2d
dependencies:
  - 1
---

# Phase 2: Core Battle (playable slice)

## Overview
Bản chơi được end-to-end với hình khối placeholder: 2 thành có máu, 1 lằn đất, vàng thu nhập nền, đẻ 3 loại lính, lính auto-march + đánh nhau, AI cơ bản cầm phe địch, phát hiện thắng/thua. Đây là lát quan trọng nhất — phải CHƠI ĐƯỢC.

## Requirements
- Functional: chọn phe → đẻ lính bằng vàng → lính đi đánh → phá thành địch = thắng, mất thành mình = thua.
- Non-functional: 60fps với ~30 lính trên màn; logic tách khỏi render; số liệu từ `game-config.ts`.

## Architecture
- **Entity (tách file, mỗi cái 1 class nhỏ):**
  - `src/entities/base.ts` — thành: HP, vị trí, thanh máu, phe.
  - `src/entities/unit.ts` — lính: type, HP, damage, speed, range, phe; state machine `march → attack`.
- **Systems:**
  - `src/systems/economy.ts` — vàng: cộng đều theo thời gian (từ config).
  - `src/systems/combat.ts` — quét cặp địch trong tầm, gây damage theo cooldown, xử lý chết.
  - `src/systems/spawn.ts` — đẻ lính (trừ vàng, cooldown mỗi loại), giới hạn cơ bản.
  - `src/ai/basic-ai.ts` — máy: tích vàng → chọn lính phản kèo kéo–búa–bao → đẻ.
- **UI:** `src/ui/battle-hud.ts` — hiện vàng, 3 nút đẻ lính, 2 thanh máu thành.
- **Kéo–búa–bao:** bảng khắc chế trong config (multiplier damage): bộ>cung, cung>giáp, giáp>bộ.
- **1 lane:** lính đi trên 1 đường ngang; va chạm tầm đánh = khoảng cách x.

## Related Code Files
- Create: `src/entities/{base,unit}.ts`
- Create: `src/systems/{economy,combat,spawn}.ts`
- Create: `src/ai/basic-ai.ts`
- Create: `src/ui/battle-hud.ts`
- Modify: `src/scenes/battle-scene.ts` (ghép systems vào update loop)
- Modify: `src/scenes/menu-scene.ts` (chọn phe thật → truyền sang Battle)
- Modify: `src/config/game-config.ts` (điền số: HP thành, 3 lính, giá, cooldown, income, bảng khắc chế)

## Implementation Steps
1. Điền `game-config.ts`: base HP, 3 unit stats (hp/dmg/speed/range/cost/cooldown), income rate, bảng multiplier khắc chế.
2. `base.ts` + `unit.ts` dùng hình chữ nhật màu (placeholder), phe = màu (Khôi xanh, Nguyên đỏ).
3. `economy.ts`: vàng tăng đều; expose `spend()`.
4. `spawn.ts`: nút HUD → trừ vàng → tạo unit ở thành mình, cooldown mỗi loại + pop cap cơ bản.
5. `combat.ts`: mỗi frame, với mỗi lính tìm mục tiêu gần nhất trong tầm (lính địch hoặc thành), đánh theo cooldown, áp multiplier khắc chế; HP<=0 → hủy.
6. `unit.ts` state: chưa có địch trong tầm → đi; có → dừng đánh.
7. `basic-ai.ts`: đối thủ chạy cùng economy/spawn, quyết định đơn giản theo số lính địch/loại.
8. `battle-scene.ts`: khởi tạo 2 thành, gắn systems vào `update(dt)`, kiểm tra thắng/thua → màn kết quả (text placeholder + nút chơi lại).
9. `menu-scene.ts`: 2 nút chọn phe → set `playerSide`, phe kia AI.

## Success Criteria
- [ ] Chọn Khôi hoặc Nguyên, vào trận với phe đúng
- [ ] Đẻ được 3 loại lính, bị trừ vàng + cooldown
- [ ] Lính tự đi, đánh lính địch & thành địch, chết khi hết máu
- [ ] Khắc chế kéo–búa–bao có hiệu lực (test tay: cung thắng giáp...)
- [ ] AI tự đẻ lính tạo kháng cự
- [ ] Phá thành địch → màn thắng; mất thành → màn thua; có nút chơi lại
- [ ] Chơi trọn 1 ván không crash

## Risk Assessment
- Combat quét O(n²) lag khi đông lính. Mitigation: pop cap + chỉ quét lính "đầu hàng" mỗi phe (1 lane nên thường chỉ 2 lính giáp mặt).
- AI quá ngu/quá mạnh. Mitigation: tinh chỉnh ở P3 (mức khó); P2 chỉ cần "chơi được".
- Cân bằng lệch. Mitigation: số ở config, chỉnh nhanh.
