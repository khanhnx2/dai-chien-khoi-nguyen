---
phase: 3
title: Base Defense & Progression
status: completed
priority: P2
effort: 1-2d
dependencies:
  - 2
---

# Phase 3: Base Defense & Progression

## Overview
Thêm chiều sâu: nhân vật nóc thành tự bắn (Khôi trứng vòng cung/AoE, Nguyên nước thẳng/đơn) + kỹ năng bấm tay có cooldown, thưởng vàng khi giết lính, hệ nâng cấp bằng vàng, và 2-3 mức khó AI.

## Requirements
- Functional: nóc thành auto-bắn địch trong tầm; kỹ năng đặc biệt bấm tay; giết lính được vàng; mua nâng cấp; chọn mức khó AI.
- Non-functional: đòn/đạn tái dùng chung code (DRY), chỉ khác tham số trong config.

## Architecture
- `src/entities/roof-attacker.ts` — nhân vật nóc: auto nhắm địch gần nhất trong tầm, bắn theo cooldown; giữ tham chiếu phe.
- `src/entities/projectile.ts` — đạn dùng chung: kiểu `arc` (trứng: có trọng lực, nổ AoE khi chạm/đáp) vs `straight` (nước: thẳng nhanh, đơn mục tiêu). Kiểu + tham số từ config.
- `src/systems/special-ability.ts` — kỹ năng bấm tay: Khôi "mưa trứng" (loạt đạn arc dội 1 vùng), Nguyên "xịt nước mạnh" (tia lớn đẩy lùi + damage dải); cooldown + UI nút.
- `src/systems/economy.ts` (mở rộng) — thưởng vàng khi lính địch chết (bounty theo config).
- `src/systems/upgrades.ts` — mua bằng vàng: +HP thành, +income, mở/nâng lính, nâng đòn nóc thành. State giữ ở scene.
- `src/ai/basic-ai.ts` (mở rộng) — mức khó: điều chỉnh nhịp quyết định + có mua nâng cấp + dùng kỹ năng. Enum `Easy|Normal|Hard`.
- `src/ui/battle-hud.ts` (mở rộng) — nút kỹ năng (cooldown radial), panel nâng cấp.

## Related Code Files
- Create: `src/entities/{roof-attacker,projectile}.ts`
- Create: `src/systems/{special-ability,upgrades}.ts`
- Modify: `src/systems/{combat,economy}.ts`, `src/ai/basic-ai.ts`, `src/ui/battle-hud.ts`
- Modify: `src/scenes/{battle,menu}-scene.ts` (chọn mức khó ở menu; gắn nóc thành + upgrades)
- Modify: `src/config/game-config.ts` (số cho roof-attack, projectile, special, bounty, upgrades, AI tiers)

## Implementation Steps
1. `projectile.ts`: 2 hành vi arc/straight; arc dùng gravity + nổ AoE (quét lính trong bán kính); straight trúng mục tiêu đầu tiên.
2. `roof-attacker.ts`: mỗi thành 1 cái; auto nhắm địch gần nhất trong tầm; bắn projectile theo type của phe.
3. Nối vào `battle-scene`: 2 nóc thành bắn tự động, dùng combat cho damage.
4. `special-ability.ts`: nút HUD → kích hoạt đòn mạnh theo phe, cooldown; AI cũng gọi được.
5. `economy.ts`: khi lính chết bởi phe kia → cộng bounty cho phe đó.
6. `upgrades.ts` + panel HUD: danh mục nâng cấp, trừ vàng, áp hiệu ứng (đọc/ghi vào config runtime của trận).
7. `basic-ai.ts`: thêm enum mức khó, chỉnh tần suất + cho AI mua nâng cấp & dùng special.
8. `menu-scene.ts`: thêm chọn mức khó.

## Success Criteria
- [ ] Nóc thành tự bắn địch: Khôi trứng vòng cung nổ AoE, Nguyên nước thẳng đơn mục tiêu
- [ ] Kỹ năng bấm tay hoạt động + có cooldown hiển thị
- [ ] Giết lính địch được cộng vàng (bounty)
- [ ] Mua được ít nhất 3 loại nâng cấp, có tác dụng thật
- [ ] Chọn được mức khó; AI dễ/thường/khó khác biệt rõ
- [ ] Không file .ts > 200 dòng (tách nếu cần)

## Risk Assessment
- Kỹ năng/nâng cấp làm vỡ cân bằng. Mitigation: số ở config, test tay từng mục.
- Đạn arc tính toán trọng lực sai tầm. Mitigation: hàm tính vận tốc ban đầu theo khoảng cách, test vài mốc.
- Upgrade state rối với AI. Mitigation: tách state nâng cấp theo từng phe rõ ràng.
