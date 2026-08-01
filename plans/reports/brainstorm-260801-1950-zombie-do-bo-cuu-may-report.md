# Brainstorm — Zombie đổ bộ cứu Máy (từ màn 40)

**Ngày:** 2026-08-01 · **Trạng thái:** ĐÃ DUYỆT → sẵn sàng plan

## Vấn đề
Thêm lính Zombie (ảnh `/Users/khanhnx/Desktop/zombie.webp`) + cơ chế "cứu viện" mới: khi thành Máy mất 25% máu (1 mốc duy nhất), kích hoạt 10s zombie đổ bộ bằng dù, 10 con/giây, vị trí ngẫu nhiên nửa sân Máy. Chỉ từ màn ≥40.

## Yêu cầu chốt (Q&A + scout)

| # | Yêu cầu | Quyết định |
|---|---|---|
| 1 | Phe hưởng lợi | **Chỉ Máy** — nhất quán 100% với `ReinforcementManager` hiện có (luôn giúp Máy, không bao giờ giúp người chơi) |
| 2 | Mốc kích hoạt | **1 mốc duy nhất**: hp/maxHp thành Máy ≤75% lần đầu (= mất 25%) — KHÔNG phải 3-4 mốc |
| 3 | Số lượng | 10 con/giây × 10 giây = **tối đa 100 con/trận** (one-shot, không lặp lại) |
| 4 | Vị trí rơi | Ngẫu nhiên trong TOÀN BỘ nửa sân của Máy (vd Máy=Nguyên: x∈[480,870]) |
| 5 | Chỉ số zombie | Máu/công/tốc = ½ Bộ binh; hồi chiêu đẻ = ×2 Bộ binh (hp50/dmg6/speed31/spawnCd2400) |
| 6 | Màn tối thiểu | ≥40 (giống mốc titan tiếp viện hiện có) |
| 7 | Hình ảnh | Ảnh thật (tách nền `zombie.webp`), dù vẽ bằng Phaser graphics đơn giản (không có asset dù) |

## Kết quả scout (căn cứ)
- `ReinforcementManager` ([reinforcements.ts](../../src/systems/reinforcements.ts)): tiền lệ chính xác — CHỈ giúp Máy, one-shot khi hp≤50%, đẻ qua `forceSpawn` (bỏ qua vàng/cap/hồi chiêu). Cơ chế zombie này là hệ thống **MỚI, độc lập**, chạy song song (không sửa cái cũ) vì trigger khác hẳn (rải theo thời gian, không đẻ 1 lượt).
- `Unit` ctor ([unit.ts:49](../../src/entities/unit.ts)) đã có cờ `drop` (tween rơi từ trên cao, bounce) — tái dùng cho hiệu ứng đổ bộ.
- `forceSpawn` ([spawn.ts:84](../../src/systems/spawn.ts)) hiện KHÔNG hỗ trợ `drop` (chỉ `trySpawnTitan` có, tại vị trí cố định) → cần mở rộng thêm tham số `drop=false`.
- BoBinh gốc: hp100/dmg12/speed62/spawnCd1200 ([game-config.ts:103](../../src/config/game-config.ts)) → Zombie = hp50/dmg6/speed31/spawnCd2400.
- `GAME_WIDTH=960`, `KHOI_BASE_X=90`, `NGUYEN_BASE_X=870` → nửa sân Máy tính theo `GAME_WIDTH/2` tới base X của Máy.

## Thiết kế

### Config (`game-config.ts`)
```ts
// UnitType mới
Zombie = 'zombie'

// Stats (mirror BoBinh, KHÔNG có trong bảng khắc chế — không counter ai)
[UnitType.Zombie]: { hp: 50, damage: 6, speed: 31, range: 42, cost: 20,
  attackCooldownMs: 700, spawnCooldownMs: 2400, reward: 9, color: ..., size: 26 }

ZOMBIE_MIN_STAGE = 40
ZOMBIE_TRIGGER_HP_FRAC = 0.75   // kích khi hp/maxHp ≤ mốc này (mất 25%)
ZOMBIE_WAVE_DURATION_MS = 10000
ZOMBIE_DROP_INTERVAL_MS = 1000
ZOMBIE_DROP_COUNT = 10
ZOMBIE_FACE_KEY = 'unit-zombie'
```
Thêm `Zombie` vào `ALL_UNIT_TYPES`, `unitRecord`, `UNIT_EMOJI` (fallback '🧟' nếu ảnh lỗi). KHÔNG thêm vào bảng khắc chế (COUNTERS) — zombie không counter/bị counter, giống hero/titan.

### `entities/unit.ts`
Zombie dùng ảnh thật (`ZOMBIE_FACE_KEY`) trong faceKey lookup chain (như Father/hero/titan). Khi `drop=true`, vẽ thêm 1 dù đơn giản (Phaser graphics: hình thang/vòng cung màu trắng + 2-4 đường dây nối) phía trên, tween rơi cùng lúc với unit rồi biến mất khi chạm đất (dùng `onComplete` của tween drop hiện có).

### `systems/spawn.ts`
`forceSpawn(side, type, units, xOffset=0, drop=false)` — thêm tham số cuối, truyền vào `new Unit(..., drop)`.

### `systems/zombie-drop.ts` (mới, ~40 dòng)
```ts
export class ZombieDropManager {
  private triggered = false;
  private waveEndAt = 0;
  private nextDropAt = 0;

  /** Trả 'start' đúng frame kích hoạt (toast), 'drop' mỗi đợt rơi (không toast), false nếu không có gì. */
  update(stage, aiSide, bases, spawn, units, now): 'start' | 'drop' | false {
    if (stage < ZOMBIE_MIN_STAGE) return false;
    if (!this.triggered) {
      const base = bases[aiSide];
      if (base.hp / base.maxHp > ZOMBIE_TRIGGER_HP_FRAC) return false;
      this.triggered = true;
      this.waveEndAt = now + ZOMBIE_WAVE_DURATION_MS;
      this.nextDropAt = now; // đẻ đợt đầu ngay
    }
    if (now >= this.waveEndAt) return false; // cửa sổ đã đóng, không đẻ nữa
    if (now < this.nextDropAt) return false;
    this.nextDropAt += ZOMBIE_DROP_INTERVAL_MS;
    const [lo, hi] = zombieDropZone(aiSide); // nửa sân Máy
    for (let i = 0; i < ZOMBIE_DROP_COUNT; i++) {
      spawn.forceSpawn(aiSide, UnitType.Zombie, units, lo + Math.random() * (hi - lo) - baseXOf(aiSide) /* xOffset tương đối */, true);
    }
    return this.nextDropAt - ZOMBIE_DROP_INTERVAL_MS === this.waveEndAt - ZOMBIE_WAVE_DURATION_MS ? 'start' : 'drop';
  }
}
```
(Lưu ý: `forceSpawn` đẻ tại `spawnX(side) + xOffset` — cần hàm `zombieDropX(aiSide)` trả thẳng toạ độ tuyệt đối ngẫu nhiên trong nửa sân, rồi tính `xOffset = x - spawnX(aiSide)` khi gọi, HOẶC đơn giản hơn: thêm biến thể `forceSpawnAt(side, type, units, absoluteX, drop)` để tránh tính ngược xOffset — chốt ở phase code cụ thể.)

### `scenes/battle-scene.ts`
Field `zombieDrops = new ZombieDropManager()`. Gọi cạnh `reinforcements.update(...)`; khi trả `'start'` → toast "🧟 ZOMBIE ĐỔ BỘ!" (mirror `showReinforceToast`); khi `'drop'` → không toast (tránh spam 10 lần/10s).

### Assets
Tách nền `zombie.webp` → `assets/characters/zombie-cutout.png` (giống pipeline capibara/totoro/bamboo trước đó) + preload `ZOMBIE_FACE_KEY`.

### Test
- Kích đúng 1 lần khi hp Máy ≤75%, không kích lại nếu hp tụt tiếp.
- Trong 10s: đúng 10 zombie/giây (10 lần đẻ × 10 con = 100 tổng, đợt cuối tại `waveEndAt`).
- Sau 10s: không đẻ thêm dù hp Máy tiếp tục giảm.
- Vị trí x mọi zombie nằm trong nửa sân Máy.
- Stats zombie đúng tỉ lệ (hp50/dmg6/speed31/spawnCd2400).
- Màn <40: không kích dù hp Máy rất thấp.

## Success criteria
- Màn ≥40, thành Máy tụt xuống ≤75% máu lần đầu → 10s đổ bộ, đúng 100 zombie tối đa, rơi rải rác nửa sân Máy có hiệu ứng dù.
- Không kích lại trong cùng trận. Màn <40: không có cơ chế này.
- `npm run build` + `npm test` xanh.

## Rủi ro / Unresolved
- **Hiệu năng**: 100 zombie cùng lúc (+ lính thường + titan tiếp viện nếu màn ≥40) có thể giật ở máy yếu — chấp nhận theo tinh thần "màn cao brutal" đã thống nhất trước đó với titan tiếp viện.
- **Chi tiết kỹ thuật `forceSpawn` absolute-X**: sẽ chốt cách truyền toạ độ tuyệt đối cụ thể lúc code (thêm tham số hoặc hàm mới `forceSpawnAt`) — không ảnh hưởng thiết kế tổng thể.
