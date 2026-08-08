# Brainstorm — Chế độ Zombie (mức khó thứ 4)

**Ngày:** 2026-08-08 · **Trạng thái:** ✅ Đã chốt thiết kế, sẵn sàng cho `/ck:plan`

---

## 1. Vấn đề & yêu cầu

Người dùng muốn thêm chế độ **Zombie** ngoài 3 mức Dễ/Thường/Khó:
- Độ khó **giống hệt mức Thường** (nhịp quyết định 850ms, mua nâng cấp, statMultiplier ×1.2).
- Máy tính **chỉ ra 1 loại quân duy nhất là Zombie**.
- Cơ chế ra quân giống hệt Thường — chỉ thay đơn vị bằng Zombie.

### Quyết định đã chốt (từ hỏi đáp)
| # | Câu hỏi | Chốt |
|---|---------|------|
| 1 | Campaign progress | **Chiến dịch riêng** (mỗi phe×Zombie có màn mở riêng, như 3 mức kia) |
| 2 | Hero/Titan màn cao (≥60/70) | **Chỉ Zombie tuyệt đối** — AI không mua Hero/Titan |
| 3 | Tiếp viện (màn ≥30) | **Biến thành Zombie** — đợt tiếp viện chỉ đẻ Zombie, bỏ lính thường + Titan |
| 4 | Zombie đổ bộ cứu Máy + cuồng nộ | **Giữ nguyên** (vốn chỉ đẻ Zombie → vẫn thuần Zombie) |

---

## 2. Phương án đã đánh giá

### Phương án A (CHỌN): Thêm `Difficulty.Zombie` vào enum + flag trong config
- Thêm member `Zombie='zombie'`, entry `DIFFICULTIES[Zombie]` giống hệt Thường.
- Thêm flag `spawnOnlyZombie?: boolean` vào `DifficultyConfig`; AI + Reinforcement đọc flag.
- **Ưu:** tái dùng toàn bộ machinery (progress, result-scene, battle-scene, menu); KISS; tsc bắt thiếu entry `Record<Difficulty,…>`.
- **Nhược:** enum "mức khó" giờ chứa 1 mode đặc biệt — chấp nhận được, không đáng tách.

### Phương án B: Thêm field `mode: 'campaign'|'zombie'` riêng
- **Nhược:** over-engineer cho 1 mode, phải thêm nhánh khắp nơi. Vi phạm YAGNI. → Bỏ.

---

## 3. Thiết kế chi tiết (phương án A)

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/config/game-config.ts` | `enum Difficulty` +`Zombie`. `DIFFICULTIES[Zombie] = {label:'Zombie', decisionIntervalMs:850, buysUpgrades:true, statMultiplier:1.2}`. `DifficultyConfig` +`spawnOnlyZombie?: boolean`. Hằng `REINFORCE_ZOMBIE_MODE_MULT = 4` (số zombie/đợt tiếp viện = count × 4) |
| 2 | `src/ai/basic-ai.ts` | `update()`: nếu `cfg.spawnOnlyZombie` → bỏ `maybeBuySpecialUnit`; `maybeSpawn` luôn chọn `UnitType.Zombie`; `bestAffordable` duyệt pool `[Zombie]` thay `SPAWN_ORDER` |
| 3 | `src/systems/reinforcements.ts` | Constructor nhận `spawnOnlyZombie: boolean`. Bật → đẻ `count × REINFORCE_ZOMBIE_MODE_MULT` Zombie, bỏ hero/titan/zombie-gate |
| 4 | `src/scenes/battle-scene.ts` | Truyền `this.difficulty === Difficulty.Zombie` vào `ReinforcementManager` |
| 5 | `src/scenes/menu-scene.ts` | `diffs = [Easy, Normal, Hard, Zombie]`; 4 nút đều: x = GAME_WIDTH × (0.125/0.375/0.625/0.875) |
| 6 | `test/simulation.test.ts` | Test mới: AI zombie chỉ đẻ Zombie; tiếp viện zombie chỉ đẻ Zombie; `DIFFICULTIES[Zombie]` = 850/×1.2/buysUpgrades true |

### Không sửa (tự chạy)
- `progress.ts` — chiến dịch riêng theo `phe:mức` tự động.
- `zombie-drop.ts` — đã chỉ đẻ Zombie.
- `battle-scene` statMultiplier / `result-scene` — đọc từ `DIFFICULTIES`.
- Texture/entity Zombie — đã có (`unit-zombie`).

---

## 4. Cân bằng & rủi ro

- **Zombie yếu hơn Bộ binh** (hp50/dmg6/speed31, giá 20, hồi 2.4s) → AI "ra bầy" chậm đều, cảm giác độ khó khác Thường dù statMult bằng. Đây là đặc trưng chế độ — chấp nhận.
- **Sóng tiếp viện zombie:** `count × 4` ≈ khối lượng 3 lính + hero của Thường; bỏ Titan để giữ thuần Zombie. Hằng số ở config, dễ chỉnh.
- **TS strict / noUnusedLocals:** thêm enum member bắt buộc thêm entry `DIFFICULTIES` — tsc sẽ bắt.
- **Edge:** màn 1–29 chưa có tiếp viện → AI chỉ đẻ Zombie bằng kinh tế. OK.

---

## 5. Tiêu chí thành công

- Menu hiển thị 4 nút khó; chọn Zombie → battle chạy mức Thường (850ms/×1.2), AI chỉ đẻ Zombie từ màn 1.
- Màn cao: tiếp viện chỉ đẻ Zombie; Zombie đổ bộ + cuồng nộ hoạt động như Thường.
- Campaign Zombie độc lập; thắng mở màn riêng.
- `npm run build` + `npm test` xanh.

---

## 6. Bước tiếp theo

1. Chạy `/ck:plan` với report này làm context → sinh phase-by-phase.
2. Implement → test → code-review theo workflow chuẩn.
