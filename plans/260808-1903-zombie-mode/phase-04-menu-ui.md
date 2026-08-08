---
phase: 4
title: Menu UI — nút Zombie
status: completed
effort: 0.5h
priority: P2
---

# Phase 4: Menu UI — nút Zombie

## Overview

Thêm nút **Zombie** vào hàng mức khó của `menu-scene.ts`; dàn đều 4 nút. `getLastSelection`/`getUnlockedStage`/`result-scene` đã tự xử lý `Difficulty.Zombie` (qua `Object.values`/`DIFFICULTIES`) — không cần sửa.

## Requirements

- Functional:
  - Hàng "MỨC KHÓ" có 4 nút: Dễ / Thường / Khó / **Zombie**.
  - Chọn Zombie → `stage` nhảy tới màn đã mở của campaign `phe:zombie`; highlight nút đúng; `BẮT ĐẦU` vào `battle` với `difficulty: Difficulty.Zombie`.
  - Label hiển thị "Zombie" (từ `DIFFICULTIES[Zombie].label`).
- Non-functional: không tràn màn hình (960px rộng, 4 nút 110px đều).

## Architecture

- `diffs = [Difficulty.Easy, Difficulty.Normal, Difficulty.Hard, Difficulty.Zombie]`.
- Vị trí 4 nút đều: `x = GAME_WIDTH * ((i + 0.5) / 4)` → 0.125 / 0.375 / 0.625 / 0.875 (tâm 4 phần tư). `Map<Difficulty, ClayButton>` đã tổng quát → không cần sửa refresh.

## Related Code Files

- Modify: `src/scenes/menu-scene.ts` (hàm `buildDifficultyRow`)

## Implementation Steps

1. `buildDifficultyRow()`: đổi `diffs` thành 4 phần tử; đổi công thức `x` thành `GAME_WIDTH * ((i + 0.5) / 4)`.
2. Kiểm tra `refresh()`: `diffButtons` Map highlight đúng với 4 key; `unlockedLabel` hiển thị "Khôi · Zombie — đã mở tới màn N".
3. **Verification thủ công (scene UI, không cover bằng test mô phỏng):**
   - Chạy `npm run dev`, mở `http://localhost:5173`.
   - Menu hiện 4 nút khó, không tràn; chọn Zombie → màn 1; bấm BẮT ĐẦU → trận đấu phe Máy chỉ ra Zombie.

## Success Criteria

- [x] 4 nút khó hiển thị đều, không đè nhau.
- [x] Chọn Zombie → vào trận, AI phe Máy chỉ ra Zombie.
- [x] Nhấn quay lại menu → giữ lựa chọn Zombie (last selection).

## Risk Assessment

- Chỉ sửa UI scene, không đụng logic — rủi ro thấp. Duy nhất: căn lại toạ độ 4 nút tránh chồng hero/titan shop buttons (nằm góc, không trùng).
