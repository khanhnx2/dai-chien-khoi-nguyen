---
title: Hero system (Sumo) + trang Quán Phở Anh Khôi
description: >-
  Hero Khôi-only (Sumo): unlock bằng xu, đẻ bằng vàng, charge/rút lui hồi máu,
  nâng cấp ×2, sủa khi đánh + scene shop riêng.
status: completed
priority: P2
branch: main
tags:
  - feature
  - hero
  - gameplay
  - ui
  - audio
blockedBy: []
blocks: []
created: '2026-07-26T08:50:16.605Z'
createdBy: 'ck:plan'
source: skill
---

# Hero system (Sumo) + trang Quán Phở Anh Khôi

## Overview

Thêm hệ thống Hero riêng cho Player Khôi. Hero đầu tiên **Sumo**: mở khoá 1 lần bằng **xu** ở scene mới "Quán Phở Anh Khôi", trong trận (cầm Khôi) đẻ bằng **vàng** như Father. Sumo cận chiến nhịp cực nhanh (175ms), thấy địch trong tầm nhìn thì **tốc ×4 lao tới**, xuống **≤50% máu chạy về hậu phương hồi máu** (vẫn dính đòn dọc đường, bất khả xâm khi đã về sau Thành) rồi lao lại. Nâng cấp Sumo **×2 hệ số** so với quân thường. Khi đánh phát **tiếng sủa "gắu"** (Web Audio, tiết chế ~500ms).

Nguồn thiết kế: [brainstorm report](../reports/brainstorm-design-260726-1546-sumo-hero-system-report.md).

Stack: Phaser 3 + TypeScript + Vite. Test: `tsx test/simulation.test.ts` (stub scene, không cần trình duyệt). **TDD:** mỗi pha logic viết test trước.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Config & assets foundation](./phase-01-config-assets-foundation.md) | Completed |
| 2 | [Hero shop (unlock/upgrade/mods)](./phase-02-hero-shop-unlock-upgrade-mods.md) | Completed |
| 3 | [Sumo combat behavior + bark audio](./phase-03-sumo-combat-behavior-bark-audio.md) | Completed |
| 4 | [UI — Hero scene (Quán Phở Anh Khôi)](./phase-04-ui-hero-scene.md) | Completed |
| 5 | [Menu button + main registration](./phase-05-menu.md) | Completed |
| 6 | [Battle HUD Sumo gating](./phase-06-hud-gating.md) | Completed |

## Key constraints
- **Nguồn chân lý chỉ số** = `src/config/game-config.ts`. Mọi số Sumo dẫn xuất từ `UNITS[BoBinh]` (DRY).
- **Không đụng** cân bằng phe Nguyên / Father / troop hiện có. `META_UPGRADES` (shop cũ) giữ nguyên — Sumo dùng list `HERO_UPGRADES` tách riêng.
- Giữ file < 200 dòng; tách module theo ranh giới rõ (`hero-behavior.ts`, `hero-shop.ts`, `hero-scene.ts`).
- Comment code **không** tham chiếu số phase/plan (theo rule dự án).
- 22 test hiện có phải tiếp tục pass.

## Dependencies
- Phase 2, 3 phụ thuộc Phase 1 (config types/consts).
- Phase 4, 5, 6 phụ thuộc Phase 1–3 (scene đọc hero-shop + spawn Sumo).
- Plan game gốc `260724-2013-dai-chien-khoi-nguyen` đã `completed` — không ràng buộc chặn.
