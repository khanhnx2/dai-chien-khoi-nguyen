---
title: Zombie đổ bộ cứu Máy (màn ≥40)
description: ''
status: completed
priority: P2
branch: main
tags: []
blockedBy: []
blocks: []
created: '2026-08-01T12:52:39.218Z'
createdBy: 'ck:plan'
source: skill
---

# Zombie đổ bộ cứu Máy (màn ≥40)

## Overview

Zombie mới (ảnh `zombie.webp` tách nền), chỉ số ½ Bộ binh (hp50/dmg6/speed31, spawnCd×2=2400). Từ màn ≥40, khi thành Máy lần đầu tụt ≤75% máu (mất 25%) → kích 1 lần/trận: 10s đổ bộ, 10 zombie/giây rơi dù tại vị trí ngẫu nhiên nửa sân Máy (tối đa 100 con). Hệ thống MỚI độc lập (`ZombieDropManager`), song song `ReinforcementManager` hiện có, không sửa cái cũ. Chỉ giúp phe Máy.

Nguồn: [brainstorm report](../reports/brainstorm-260801-1950-zombie-do-bo-cuu-may-report.md).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Zombie unit config & assets](./phase-01-zombie-unit-config-assets.md) | Completed |
| 2 | [Drop mechanic & spawn extension](./phase-02-drop-mechanic-spawn-extension.md) | Completed |
| 3 | [ZombieDropManager & battle wiring](./phase-03-zombiedropmanager-battle-wiring.md) | Completed |
| 4 | [Tests](./phase-04-tests.md) | Completed |
| 5 | [Build verify & visual check](./phase-05-build-verify-visual-check.md) | Completed |

## Dependencies

<!-- Cross-plan dependencies -->
