# Brainstorm — Tiếp viện AI + mở cap màn 99

**Ngày:** 2026-07-26 · **Trạng thái:** ĐÃ DUYỆT → sẵn sàng plan

## Vấn đề

Mở giới hạn campaign 50→99 màn. Từ màn ≥30, khi máu thành Máy lần đầu tụt ≤50% → xuất hiện 1 đợt quân tiếp viện cho Máy. Số lượng tăng theo màn.

## Yêu cầu chốt (verified qua Q&A + scout)

| # | Yêu cầu | Quyết định |
|---|---|---|
| 1 | Cap màn | 50 → **99** |
| 2 | Scaling độ khó | Giữ **tuyến tính +10%/màn** (`stageStatMultiplier`, màn 99 = ×10.8 base, chưa nhân mức khó) |
| 3 | Kích tiếp viện | **1 đợt/trận**, lần đầu `bases[aiSide].hp/maxHp ≤ 0.5`, chỉ khi màn ≥30 |
| 4 | Số lượng | `count = floor(màn/10)` mỗi loại (30-39→3 … 90-99→9) |
| 5 | Thành phần | bộ binh + cung thủ + giáp binh + **hero phe Máy** (Sumo nếu Máy=Khôi, Labubu nếu Máy=Nguyên) |
| 6 | Giới hạn | Tiếp viện **bỏ qua** POPULATION_CAP + vàng + hồi chiêu |
| 7 | Toast + SFX | **Thêm** toast "⚔️ QUÂN TIẾP VIỆN!" + tái dùng SFX hero (`bark`/`labubu`) |
| 8 | Hero tiếp viện | **Giữ** cơ chế heal (nhất quán hero người chơi) — side-agnostic đã verify |

## Kết quả scout (căn cứ quyết định)

- `TOTAL_STAGES = 50` [game-config.ts:307]; consumers (menu/result/progress) **clamp theo hằng số này** → đổi 1 chỗ là cap 99 chạy ngay.
- `stageStatMultiplier` +10%/màn tuyến tính [game-config.ts:311].
- `Base.hp/maxHp` chỉ giảm trong trận (không tự hồi) → mốc 50% vượt qua đúng 1 lần → cờ one-time là đủ.
- AI **không** đẻ hero (Sumo/Labubu ngoài `SPAWN_ORDER`) → tiếp viện cần code path riêng.
- `updateHero` [hero-behavior.ts:26] hoàn toàn side-agnostic (`directionOf(unit.side)`/`enemyOf`/`bases[...]`) → hero Máy chạy đúng (lao tới, rút về sau thành Máy hồi máu). **Không cần sửa hero behavior.**
- `POPULATION_CAP = 20` [game-config.ts:202]; burst tối đa 4×9=36 > cap → cần `forceSpawn` bỏ qua cap.
- Spawn qua `SpawnManager.trySpawn` (check cooldown/cap/gold) [spawn.ts]; hero unit tạo bằng `new Unit(scene, side, type, spawnX, hp, dmg)` theo `mods[side]`.

## Thiết kế

**Files:**

1. **`config/game-config.ts`** — `TOTAL_STAGES` 50→99; thêm:
   - `REINFORCE_MIN_STAGE = 30`, `REINFORCE_HP_FRAC = 0.5`
   - `reinforcementCount(stage) => stage >= REINFORCE_MIN_STAGE ? Math.floor(stage/10) : 0`

2. **`systems/spawn.ts`** — thêm `forceSpawn(side, type, units): Unit`: tạo `Unit` theo `mods[side]` (hp/dmg), **bỏ qua** gold/cap/cooldown; dùng lại `spawnX`. `trySpawn` giữ nguyên.

3. **`systems/reinforcements.ts`** (mới, <60 dòng) — `ReinforcementManager`:
   - state `sent = false`
   - `update(stage, aiSide, bases, spawn, units)`: nếu `!sent && reinforcementCount(stage) > 0 && bases[aiSide].hp/maxHp ≤ REINFORCE_HP_FRAC` → loop `count×` force-spawn `[BoBinh, CungThu, GiapBinh, heroForSide(aiSide).unitType]`, stagger X nhẹ để không chồng khít, set `sent=true`, trả về `true` (để scene bắn toast/SFX).

4. **`scenes/battle-scene.ts`** — new `ReinforcementManager` trong `create()`; gọi trong `update()` **sau** `updateBattle`; nếu trả `true` → toast "⚔️ QUÂN TIẾP VIỆN!" + `sound.play(heroForSide(aiSide).sfx)`.

5. **`test/simulation.test.ts`** — 1 check: dựng trận màn 30, hạ máu thành Máy ≤50%, pump → xác nhận đúng `4×3=12` lính tiếp viện xuất hiện & chỉ kích 1 lần (pump thêm không đẻ lần 2).

**Tự chạy sẵn:** menu stepper, result "màn kế", `progress.unlockNextStage` — đều theo `TOTAL_STAGES`.

## Rủi ro

- **Hiệu năng burst 36 lính** (màn 90-99, bỏ cap): chấp nhận (user chọn). Nếu lag → cân nhắc cap mềm sau, không thuộc scope này.
- **Màn cao brutal** (×10.8 × mức khó): user chấp nhận, tiếp viện là thử thách cộng thêm; cân bằng để sau (nợ kỹ thuật, ghi memory).
- **Hero tiếp viện heal vô hạn** → khó diệt: nhất quán với hero người chơi, chấp nhận.

## Success criteria

- Chọn được màn tới 99; menu/result hiển thị `/99`.
- Màn <30: không có tiếp viện. Màn 30/40/…/90: đúng `floor/10 ×4` lính khi thành Máy ≤50%, đúng hero phe Máy.
- Chỉ kích 1 lần/trận. `npm run build` + `npm test` xanh.

## Unresolved

- Cân bằng số học màn 51-99 (×10.8) chưa tinh chỉnh — để lần sau nếu chơi thấy quá khó.
