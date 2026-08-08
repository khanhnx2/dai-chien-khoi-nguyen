---
title: Chế độ Zombie
description: >-
  Thêm mức khó thứ 4 'Zombie' — cấu hình giống hệt mức Thường, AI chỉ đẻ Zombie
  (không Hero/Titan), tiếp viện đổi thành Zombie.
status: completed
priority: P2
branch: main
tags:
  - zombie
  - difficulty
  - ai
  - game-feature
blockedBy: []
blocks: []
created: '2026-08-08T12:03:24.064Z'
createdBy: 'ck:plan'
source: skill
---

# Chế độ Zombie

## Overview

Thêm mức khó thứ 4 **Zombie** vào game tower-defense. Cấu hình độ khó **giống hệt mức Thường** (nhịp quyết định 850ms, mua nâng cấp, statMultiplier ×1.2), nhưng phe Máy **chỉ ra 1 loại quân: Zombie** — từ màn 1, không mua Hero/Titan kể cả màn cao. Tiếp viện (màn ≥30) đổi thành toàn Zombie. Zombie đổ bộ cứu Máy + cơ chế cuồng nộ/vũng độc **giữ nguyên** (vốn chỉ đẻ Zombie). Campaign có chiến dịch riêng (mỗi phe×mức khó tự động).

**Source thiết kế:** [`plans/reports/brainstorm-260808-1900-zombie-mode-report.md`](../reports/brainstorm-260808-1900-zombie-mode-report.md)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Config — Difficulty.Zombie](./phase-01-config.md) | Completed |
| 2 | [AI Zombie-only](./phase-02-ai-zombie-only.md) | Completed |
| 3 | [Reinforcement Zombie](./phase-03-reinforcement-zombie.md) | Completed |
| 4 | [Menu UI — nút Zombie](./phase-04-menu-ui.md) | Completed |
| 5 | [Verify Build + Tests](./phase-05-verify-build-tests.md) | Completed |

## Dependencies

- Không có dependency chéo plan (mọi plan cũ đã `completed`).
- Trong plan: Phase 1 → 2/3 (cần `Difficulty.Zombie` + flag) → 4 → 5.
- Mode: `--tdd` — mỗi phase viết test trước, implement sau.
