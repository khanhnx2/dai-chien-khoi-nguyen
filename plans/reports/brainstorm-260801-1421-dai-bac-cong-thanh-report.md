# Brainstorm — Đại bác công thành (từ màn ≥40)

**Ngày:** 2026-08-01 · **Trạng thái:** ĐÃ DUYỆT → sẵn sàng plan

## Vấn đề
Thêm "đại bác" đặt sau thành người chơi, chỉ hoạt động từ màn ≥40. Bắn 1 viên/5s, 1000 sát thương, đơn mục tiêu. Cần hệ nâng cấp vĩnh viễn (mua bằng xu, như hero/titan).

## Yêu cầu chốt (Q&A + scout)

| # | Yêu cầu | Quyết định |
|---|---|---|
| 1 | Unlock | Cần mua mở khóa bằng xu trước (như hero/titan) — KHÔNG tự động dù đã đạt màn 40 |
| 2 | Loại nâng cấp | Vĩnh viễn bằng xu, scene shop riêng (như hero/titan) — không phải upgrade trong trận |
| 3 | Mục tiêu | Lính địch gần nhất trong tầm — giống `RoofAttacker`, KHÔNG tự bắn thẳng vào thành nếu không có lính |
| 4 | Hình ảnh | Đồ họa đơn giản (hình khối màu phe + emoji 💣) — giống phong cách `RoofAttacker` hiện tại, không chờ asset |
| 5 | Giá unlock | 240 xu |
| 6 | Tầm bắn | 400px |
| 7 | Sát thương/nhịp | 1000 dmg / 5000ms (chốt từ đầu) |
| 8 | Kích hoạt | Chỉ hoạt động khi ĐỦ 2 điều kiện: đã unlock (xu) VÀ màn hiện tại ≥40 |

## Kết quả scout (căn cứ)
- `RoofAttacker` ([roof-attacker.ts](../../src/entities/roof-attacker.ts)) là tiền lệ gần nhất: tự bắn theo nhịp, nhắm lính địch gần nhất trong tầm qua `nearestEnemyInRange` (point-based, không phải theo Unit) — cannon sẽ dùng chung pattern này (đề xuất tách thành helper dùng chung, DRY).
- 2 hệ nâng cấp đã tồn tại và KHÁC NHAU: (a) trong trận bằng vàng (`Upgrades`/`UpgradeType`, reset mỗi trận), (b) vĩnh viễn bằng xu (`computePlayerMods`, `META_UPGRADES` + `ALL_HERO_UPGRADES` + `ALL_TITAN_UPGRADES`, lưu `localStorage`). Cannon dùng nhóm (b).
- `roofDmg`/`roofCd` trong `SideMods` ĐÃ LÀ nâng cấp vĩnh viễn (nhóm "Thành" trong `META_UPGRADES`, hệ số INC=6%/RED=-3%, MAX_LV=15) — pattern mẫu chính xác cho 2 nâng cấp cannon (Sát thương/Giảm hồi chiêu), KHÔNG dùng hệ số ×2 của hero/titan (cannon đã rất mạnh, không cần nhân đôi).
- `SideMods` chỉ có DUY NHẤT 1 chỗ khởi tạo literal (`uniformSideMods`) → thêm field `cannonDmg`/`cannonCd` an toàn, không vỡ chỗ khác.
- `reinforcements.update(this.stage, ...)` trong [battle-scene.ts](../../src/scenes/battle-scene.ts) là tiền lệ gating-theo-màn — cannon dùng cùng cách (`this.stage >= CANNON_MIN_STAGE`).
- Player-only (như hero/titan/Father) — AI không bao giờ có cannon, không cần đụng `ai/basic-ai.ts`.
- Titan hào quang chỉ chặn đạn `pierce=true` (Father) — đạn cannon `pierce=false` (như roof) nên KHÔNG bị/không cần tương tác với hào quang.
- Hero-¼-dmg-rule chỉ áp khi HERO tấn công titan — không liên quan cannon (cannon luôn gây full dmg lên mọi mục tiêu, kể cả titan).

## Thiết kế

### Số liệu (`game-config.ts`)
```
CANNON_DAMAGE = 1000
CANNON_COOLDOWN_MS = 5000
CANNON_RANGE = 400
CANNON_MIN_STAGE = 40
CANNON_UNLOCK_COST = 240
CANNON_PROJECTILE_SPEED = 380   // chậm hơn đạn thường, cảm giác "nặng"
CANNON_PROJECTILE_COLOR = 0x334155  // xám đậm, khác các đạn khác
```
`SideMods` thêm `cannonDmg: number; cannonCd: number;` (mirror `roofDmg`/`roofCd`). `uniformSideMods` set cả 2 = mult (AI không dùng nhưng cần default hợp lệ).

### Nâng cấp (vĩnh viễn, xu)
- `CANNON_UNLOCK: MetaUpgradeDef` — id `cannon.unlock`, baseCost 240, 1 cấp.
- `CANNON_UPGRADES: MetaUpgradeDef[]` — 2 def: `cannon.dmg` (target `cannonDmg`, INC=6%), `cannon.cd` (target `cannonCd`, RED=-3%), MAX_LV=15 (giống nhóm "Thành", KHÔNG dùng hệ số ×2 hero/titan).
- Fold vào `computePlayerMods` ([meta-upgrades.ts](../../src/systems/meta-upgrades.ts)): thêm case `'cannonDmg'`/`'cannonCd'` + `for (const def of CANNON_UPGRADES) apply(def);`.

### Entity mới `src/entities/cannon.ts` (mirror `roof-attacker.ts`, ~70 dòng)
- Visual: hình chữ nhật màu phe + emoji 💣, đặt tại `baseXOf(side) - directionOf(side)*(BASE.width/2 + OFFSET)` (phía sau thành, rìa màn hình — chấp nhận sát mép canvas với icon nhỏ ~28px).
- Bắn: đạn xuất phát từ `frontX` (mép trước thành, như RoofAttacker) — tránh đạn bay xuyên qua thành nhìn kỳ; đích là lính địch gần nhất trong `CANNON_RANGE`.
- Tái dùng `Projectile` class hiện có (`kind:'straight'`, `aoeRadius:0`, `pierce` mặc định false) — KHÔNG cần code projectile mới.
- **DRY refactor nhỏ**: tách `nearestEnemyInRange(units, side, x, range)` từ `RoofAttacker` thành helper dùng chung (đặt trong `combat.ts` hoặc file entity dùng chung), cả `RoofAttacker` và `Cannon` gọi lại — tránh trùng logic.

### Gating/shop (mirror hero-shop.ts/titan-shop.ts, đơn giản hơn vì không có 2 biến thể theo phe)
- `src/systems/cannon-shop.ts` (mới): `isCannonUnlocked()`, `unlockCannon()`, `usableCannon(stage)` = `isCannonUnlocked() && stage >= CANNON_MIN_STAGE`.
- `src/scenes/cannon-shop-scene.ts` (mới, mirror titan-shop-scene.ts nhưng KHÔNG có data param theo phe): title "💣 ĐẠI BÁC", stats panel, nút unlock 240 xu → sau khi unlock hiện 2 hàng nâng cấp.
- `src/main.ts`: đăng ký `CannonShopScene`.
- `src/ui/cannon-shop-button.ts` (mới, mirror `reset-progress-button.ts`): 1 nút nhỏ trong menu (cột trái, dưới nút Reset) → `scene.start('cannon')`.
- `src/scenes/menu-scene.ts`: 1 dòng gọi `buildCannonShopButton(this)` — giữ file ≤200 dòng.

### Wiring `battle-scene.ts`
- Field `private cannon?: Cannon;`. Trong `create()`: nếu `usableCannon(this.stage)` → khởi tạo `new Cannon(this, this.playerSide, mods[this.playerSide].cannonDmg, mods[this.playerSide].cannonCd)`.
- Trong `update()`: `this.cannon?.update(time, this.units, this.projectiles)` (đặt cạnh `this.roofs[...].update(...)`).

### Test (`test/simulation.test.ts`)
- `usableCannon`: chưa unlock → false dù màn 99; đã unlock nhưng màn <40 → false; cả 2 đủ → true.
- Cannon bắn: lính địch gần nhất trong tầm trúng đúng 1000×dmgMult sau khi hồi chiêu; không bắn lại trước 5s×cdMult; lính ngoài tầm 400px không trúng.
- Nâng cấp fold: mua `cannon.dmg`/`cannon.cd` → `computePlayerMods().cannonDmg/cannonCd` đổi đúng hệ số.

## Files

| File | Thay đổi |
|---|---|
| `src/config/game-config.ts` | hằng số cannon, `SideMods.cannonDmg/cannonCd`, `CANNON_UNLOCK`, `CANNON_UPGRADES` |
| `src/systems/meta-upgrades.ts` | fold case `cannonDmg`/`cannonCd` + `CANNON_UPGRADES` |
| `src/systems/cannon-shop.ts` (mới) | unlock/usable |
| `src/entities/cannon.ts` (mới) | entity tự bắn |
| `src/entities/roof-attacker.ts` | tách `nearestEnemyInRange` thành helper dùng chung (DRY) |
| `src/scenes/cannon-shop-scene.ts` (mới) | shop unlock + nâng cấp |
| `src/main.ts` | đăng ký scene |
| `src/ui/cannon-shop-button.ts` (mới) | nút menu |
| `src/scenes/menu-scene.ts` | gọi nút |
| `src/scenes/battle-scene.ts` | khởi tạo + update cannon có điều kiện |
| `test/simulation.test.ts` | test gating + bắn + nâng cấp |

## Success criteria
- Chưa unlock: không có cannon dù màn ≥40. Đã unlock nhưng màn <40: không có cannon. Cả 2 đủ: cannon xuất hiện, tự bắn 5s/viên, 1000 dmg, đơn mục tiêu, tầm 400px.
- Nâng cấp Sát thương/Giảm hồi chiêu mua được ở shop riêng, có tác dụng đúng trong trận.
- AI không bao giờ có cannon. `npm run build` + `npm test` xanh.

## Rủi ro / Unresolved
- **Cân bằng**: 1000 dmg/5s = 200 dps từ 1 nguồn miễn phí (sau unlock) — rất mạnh với lính thường (100-280 hp), diệt gọn trong 1 đòn. Cân với titan (5000hp) hợp lý hơn (5 đòn/25s). Số liệu để sau khi chơi thử chỉnh (nợ, ghi memory).
- **Vị trí "sau thành"** sát mép canvas (Khôi ~x16, Nguyên ~x944 trên canvas 960px) — chấp nhận, icon nhỏ.
