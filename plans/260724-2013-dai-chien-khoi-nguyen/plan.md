---
title: Đại chiến Khôi Nguyên — game thủ thành 2 bên (Phaser 3 + TS)
description: >-
  Web tower-defense (Age of War) 2 bên: Quán Phở Anh Khôi vs Tạp hoá Thảo
  Nguyên. Người chơi chọn 1 phe, AI cầm phe kia. Deploy GitHub Pages.
status: completed
priority: P2
branch: ''
tags:
  - game
  - phaser
  - typescript
  - tower-defense
blockedBy: []
blocks: []
created: '2026-07-24T13:14:05.340Z'
createdBy: 'ck:plan'
source: skill
---

# Đại chiến Khôi Nguyên — game thủ thành 2 bên (Phaser 3 + TS)

## Overview

Game web thủ thành kiểu **Age of War**: 2 thành 2 đầu màn hình — **Quán Phở Anh Khôi** vs **Tạp hoá Thảo Nguyên**. Mỗi bên tiêu vàng đẻ lính, lính tự đi đánh thành địch. Nhân vật trên nóc thành (Khôi ném trứng / Nguyên bắn súng nước) = phòng thủ + kỹ năng đặc biệt. Người chơi chọn 1 phe, máy (AI) cầm phe còn lại. Phá thành địch về 0 HP = thắng.

**Stack:** Phaser 3 + TypeScript + Vite. **Deploy:** GitHub Pages (file tĩnh, không backend).

**Chiến lược chia lát:** P1+P2 = bản chơi được end-to-end (placeholder) → P3 chiều sâu → P4 nghệ thuật/cá nhân hóa → P5 deploy & cân bằng.

Design nguồn: [brainstorm-design report](../reports/brainstorm-design-260724-1954-dai-chien-khoi-nguyen-tower-defense-report.md)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Setup & Scaffold](./phase-01-setup-scaffold.md) | Completed |
| 2 | [Core Battle (playable slice)](./phase-02-core-battle-playable-slice.md) | Completed |
| 3 | [Base Defense & Progression](./phase-03-base-defense-progression.md) | Completed |
| 4 | [Art & Personalization](./phase-04-art-personalization.md) | Completed |
| 5 | [Deploy & Balance](./phase-05-deploy-balance.md) | Completed |

## Key Decisions (từ brainstorm)

- Lối chơi: **Age of War** (2 thành, lính auto-march, 1 lane cho lát đầu).
- 3 loại lính **kéo–búa–bao**: Bộ binh / Cung thủ / Giáp binh.
- Nóc thành: **tự bắn + kỹ năng bấm tay** (cooldown). Khôi = trứng (cung, AoE); Nguyên = nước (thẳng, đơn).
- Avatar = ảnh mặt thật → tách nền (RMBG) → ghép thân hoạt hình.
- Mọi chỉ số gameplay để trong **1 file config** (`game-config.ts`) để cân bằng.

## Dependencies

- Không có cross-plan dependency (project greenfield, plan đầu tiên).
- Asset nguồn: `~/Desktop/geometry dash/assets/characters/player-{khoi,nguyen}.png` (copy vào project ở P4).
