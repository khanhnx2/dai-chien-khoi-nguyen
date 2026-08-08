# Journal — Chế độ Zombie (Difficulty 4)

**Ngày:** 2026-08-08 · **Commit:** `f3eec8e` · **Nhánh:** main

## Bối cảnh
Thêm difficulty thứ 4 **Zombie** (game vốn có Easy/Normal/Hard) theo TDD: viết test đỏ trước, implementation mới chuyển xanh. Chế độ zombie (cuồng nộ ×4, vũng độc, nhảy dù) đã có sẵn từ các commit trước — việc này chỉ gắn chúng vào một difficulty riêng biệt, AI đẻ toàn zombie.

## Quyết định chính (người dùng chốt)
- **Zombie = clone config của Normal + cờ `spawnOnlyZombie: true`** (KISS — không thêm field mode riêng). Cấu hình giống Normal: decision 850ms, `buysUpgrades: true`, `statMultiplier: 1.2`.
- **AI strictly zombie-only** (`basic-ai.ts`): bỏ qua `maybeBuySpecialUnit` (không Hero/Titan ở mọi stage), `maybeSpawn` chọn thẳng Zombie, spawn-pool `[Zombie]` cho `bestAffordable`/`randomType`.
- **Tiếp viện → toàn zombie**: `reinforcements.ts` nhận param `spawnOnlyZombie` (default `false`, không regression); wave = `count × REINFORCE_ZOMBIE_MODE_MULT(=4)` Zombie, bỏ titan.
- **Campaign tách per phe×difficulty** (tự động, không cần sửa).

## Cạm bẫy gặp phải
- **`randomType` trong `maybeSpawn` có thể đẻ quân thường** ngay cả khi pool đã set — code-review bắt được, sửa defensive bằng spawn-pool `[Zombie]` (kết quả review DONE, 0 critical/high).
- **Thêm difficulty phải sửa mọi chỗ map theo index cũng như theo enum**: menu dùng `Object.entries(DIFFICULTIES)` nên tự cập nhật — layout nút đổi sang `x = GAME_WIDTH * ((i+0.5)/4)` (4 nút đều: 0.125/0.375/0.625/0.875) trong `menu-scene.ts`.

## Kết quả
- File chính: `src/config/game-config.ts` (DifficultyConfig + entry Zombie), `src/ai/basic-ai.ts` (đẻ zombie-only), `src/systems/reinforcements.ts` (param + mult), `src/scenes/menu-scene.ts` (4 nút).
- Test 72 → **76** (4 mới: giá trị config, AI stage-90 chỉ zombie, tiếp viện stage 30 & 50). `npm run build` sạch (tsc strict + vite + PWA).

## Nợ cân bằng (chấp nhận, chỉnh ở config)
Rage ×4 + vũng độc áp cho **mọi** zombie bất kể nguồn → chế độ Zombie có thể khó hơn ngưỡng ×1.2 đặt ra ở stage cao. Điều chỉnh qua `statMultiplier` / `REINFORCE_ZOMBIE_MODE_MULT`; đánh giá lại sau khi chơi thử.
