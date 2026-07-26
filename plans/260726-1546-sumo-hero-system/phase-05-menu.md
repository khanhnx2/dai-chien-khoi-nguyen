---
phase: 5
title: Menu button + main registration
status: completed
priority: P2
effort: 1h
dependencies:
  - 4
---

# Phase 5: Menu button + main registration

## Overview
Thêm nút "🍜 Quán Phở Anh Khôi" ở menu chính → mở `HeroScene`; đăng ký `HeroScene` vào Phaser.Game.

## Requirements
- Functional: nút luôn hiện ở menu (mua/nâng cấp bất kỳ lúc nào, không phụ thuộc phe đang chọn); bấm → scene 'hero'.
- Non-functional: không xô lệch layout menu hiện có.

## Architecture
- `main.ts`: import `HeroScene`, thêm vào mảng `scene: [...]` (sau `UpgradeScene`).
- `menu-scene.ts`: thêm `clayButton` "🍜 Quán Phở Anh Khôi". Vị trí đề xuất: dưới nút "⚙ Nâng cấp" (góc trái trên), vd `x≈120, y≈78`, hoặc cạnh phải đối xứng. Tránh đè tiêu đề (y≈GAME_HEIGHT*0.11) và hàng mức khó (y≈0.22–0.31). Chốt toạ độ khi xem thực tế (Phase 6).

## Related Code Files
- Modify: `src/main.ts`
- Modify: `src/scenes/menu-scene.ts`

## Implementation Steps
1. `main.ts`: đăng ký `HeroScene`.
2. `menu-scene.ts`: thêm nút → `this.scene.start('hero')`.
3. Verify điều hướng menu ↔ hero ↔ upgrade ↔ menu (Phase 6).

## Success Criteria
- [ ] Nút hiện ở menu, bấm mở HeroScene, quay lại menu OK.
- [ ] Không đè phần tử menu khác.
- [ ] Build sạch.

## Risk Assessment
- **Chật menu:** menu đã có tiêu đề + mức khó + phe + stage + Bắt đầu + Nâng cấp. Đặt nút gọn góc trên; kiểm bằng screenshot.
