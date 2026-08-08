# PM Report — Chế độ Zombie

**Ngày:** 2026-08-08 · **Trạng thái:** ✅ Completed (5/5 phases)

## Kết quả

| Phase | Nội dung | Files | Status |
|-------|----------|-------|--------|
| 1 | Config `Difficulty.Zombie` (giống hệt Thường + `spawnOnlyZombie`) + `REINFORCE_ZOMBIE_MODE_MULT` | `game-config.ts` | ✅ |
| 2 | AI chỉ đẻ Zombie, bỏ Hero/Titan | `basic-ai.ts` | ✅ |
| 3 | Tiếp viện → toàn Zombie (`count×4`) | `reinforcements.ts`, `battle-scene.ts` | ✅ |
| 4 | Nút "Zombie" thứ 4 trên menu | `menu-scene.ts` | ✅ |
| 5 | Verify `npm test` + `npm run build` | — | ✅ |

## Verification

- **Tests:** 76/76 xanh (72 cũ + 4 mới: config / AI stage-90 / tiếp viện màn 30 & 50).
- **Build:** `npm run build` (tsc strict + vite + PWA) sạch — chỉ còn warning chunk-size có sẵn.
- **Code review:** DONE — 0 critical/high; 6/6 acceptance criteria đạt; không regression 3 mức cũ.
- **Fix phòng thủ:** `randomType()` dùng `spawnPool` (thay `SPAWN_ORDER`) — reviewer đề xuất, đã áp, test vẫn xanh.

## Quyết định user đã chốt

- Chiến dịch riêng cho `phe×Zombie` (tự động qua progress key).
- AI chỉ Zombie tuyệt đối — không Hero/Titan kể cả màn cao.
- Tiếp viện thành Zombie; Zombie đổ bộ + cuồng nộ giữ nguyên.

## Docs impact: none

`docs/` chỉ có `journals/` — không changelog/roadmap cần sync.

## Lưu ý cân bằng (không chặn)

- Zombie chết nổ vũng độc + cuồng nộ ×4 tác động lên MỌI zombie (kể cả AI đẻ kinh tế) → màn cao cảm giác có thể khó hơn Hard dù config thấp. Cân bằng chỉnh sau qua config (`statMultiplier` / `REINFORCE_ZOMBIE_MODE_MULT`).

## Unresolved: none
