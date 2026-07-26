// ============================================================================
// game-config.ts — NGUỒN CHÂN LÝ cho mọi chỉ số gameplay (cân bằng ở đây).
// Mọi hệ thống đọc số từ file này (DRY). Đòn nóc thành + nâng cấp điền ở Phase 3.
// ============================================================================

/** Kích thước sân chơi gốc (Phaser scale FIT sẽ co giãn theo màn hình). */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const BACKGROUND_COLOR = '#1a1a2e';

/** Đường (lane) lính đi + vị trí 2 thành. */
export const LANE_Y = GAME_HEIGHT * 0.72;
export const KHOI_BASE_X = 90;
export const NGUYEN_BASE_X = GAME_WIDTH - 90;

/** Hai phe. Người chơi chọn 1, máy cầm phe còn lại. */
export enum Side {
  Khoi = 'khoi',
  Nguyen = 'nguyen',
}

/** Nhận diện phe: tên hiển thị, biển hiệu, màu (HP bar / tint lính). */
export const SIDE_INFO: Record<Side, { label: string; sign: string; color: number }> = {
  [Side.Khoi]: { label: 'Khôi', sign: 'Quán Phở Anh Khôi', color: 0x3b82f6 },
  [Side.Nguyen]: { label: 'Nguyên', sign: 'Tạp hoá Thảo Nguyên', color: 0xef4444 },
};

/** Khoá texture khuôn mặt (đã tách nền) theo phe — dùng chung nhiều scene/entity. */
export const FACE_KEY: Record<Side, string> = {
  [Side.Khoi]: 'face-khoi',
  [Side.Nguyen]: 'face-nguyen',
};

/** Khôi ở trái đi sang phải (+1); Nguyên ở phải đi sang trái (-1). */
export function directionOf(side: Side): 1 | -1 {
  return side === Side.Khoi ? 1 : -1;
}
export function baseXOf(side: Side): number {
  return side === Side.Khoi ? KHOI_BASE_X : NGUYEN_BASE_X;
}
export function enemyOf(side: Side): Side {
  return side === Side.Khoi ? Side.Nguyen : Side.Khoi;
}

/** Thành: máu + kích thước khối placeholder. */
export const BASE = {
  maxHp: 1000,
  width: 80,
  height: 140,
};

/** Kinh tế: vàng khởi đầu + thu nhập nền theo giây. Bounty giết lính = UNITS[type].reward. */
export const ECONOMY = {
  startingGold: 120,
  incomePerSecond: 12,
};

/** 3 loại lính kéo–búa–bao. */
export enum UnitType {
  BoBinh = 'bo-binh', // cận chiến, rẻ, cân bằng
  CungThu = 'cung-thu', // bắn xa, giòn
  GiapBinh = 'giap-binh', // trâu, chậm, đắt
  Father = 'father', // TƯỚNG của người chơi (Máy không có), bắn ma thuật xuyên
  Sumo = 'sumo', // HERO phe Khôi: cận chiến nhịp nhanh, lao tới, tự rút lui hồi máu
  Labubu = 'labubu', // HERO phe Nguyên: giống hệt Sumo, khác avatar & tiếng kêu
}

export interface UnitStats {
  label: string;
  hp: number;
  damage: number;
  speed: number; // px/giây
  range: number; // tầm đánh (px)
  cost: number; // vàng để đẻ
  attackCooldownMs: number; // nhịp đánh
  spawnCooldownMs: number; // hồi chiêu đẻ loại này
  reward: number; // bounty vàng khi giết
  color: number; // màu khối placeholder
  size: number; // cạnh khối (px)
  /** Bắn đạn ma thuật XUYÊN (không bị lính cản, trúng mọi mục tiêu trên đường). */
  piercing?: boolean;
}

export const UNITS: Record<UnitType, UnitStats> = {
  [UnitType.BoBinh]: {
    label: 'Bộ binh',
    hp: 100,
    damage: 12,
    speed: 62,
    range: 42,
    cost: 40,
    attackCooldownMs: 700,
    spawnCooldownMs: 1200,
    reward: 18,
    color: 0xfbbf24,
    size: 26,
  },
  [UnitType.CungThu]: {
    label: 'Cung thủ',
    hp: 60,
    damage: 16,
    speed: 55,
    range: 165,
    cost: 65,
    attackCooldownMs: 1000,
    spawnCooldownMs: 1800,
    reward: 26,
    color: 0x34d399,
    size: 24,
  },
  [UnitType.GiapBinh]: {
    label: 'Giáp binh',
    hp: 280,
    damage: 18,
    speed: 40,
    range: 46,
    cost: 95,
    attackCooldownMs: 1100,
    spawnCooldownMs: 3000,
    reward: 42,
    color: 0x9ca3af,
    size: 34,
  },
  // Father — tướng người chơi: đi chậm như Giáp, giá 2× Giáp, tầm & công 2× Cung,
  // bắn ma thuật XUYÊN (không bị cản). Máu/nhịp/hồi chiêu chọn hợp vai tướng.
  [UnitType.Father]: {
    label: 'Father (Tướng)',
    hp: 220,
    damage: 32, // 2× Cung thủ (16)
    speed: 40, // = Giáp binh
    range: 248, // 1.5× Cung thủ (165)
    cost: 190, // 2× Giáp binh (95)
    attackCooldownMs: 1000,
    spawnCooldownMs: 6000, // tướng — không spam
    reward: 90,
    color: 0xa855f7,
    size: 34,
    piercing: true,
  },
  // Hero (Sumo/Labubu) — chỉ số GIỐNG NHAU, dẫn xuất Bộ binh: máu & tốc = Bộ binh;
  // sức mạnh = ½; nhịp đánh = ¼ (rất nhanh); giá = ½. Lao tới ×4, tự rút lui hồi máu.
  [UnitType.Sumo]: heroUnitStats('Sumo', 0xf472b6),
  [UnitType.Labubu]: heroUnitStats('Labubu', 0xf9a8d4),
};

/** Chỉ số 1 hero (dùng chung cho mọi hero — chúng giống hệt nhau, chỉ khác nhãn/màu). */
function heroUnitStats(label: string, color: number): UnitStats {
  return {
    label,
    hp: 100, // = Bộ binh
    damage: 6, // = ½ Bộ binh (12)
    speed: 62, // = Bộ binh
    range: 42, // cận chiến
    cost: 20, // = ½ Bộ binh (40)
    attackCooldownMs: 175, // = ¼ Bộ binh (700)
    spawnCooldownMs: 1500,
    reward: 10,
    color,
    size: 30,
  };
}

/** Biểu tượng emoji theo loại lính (đọc rõ kéo–búa–bao; màu phe thể hiện bằng nền tròn). */
export const UNIT_EMOJI: Record<UnitType, string> = {
  [UnitType.BoBinh]: '🗡️',
  [UnitType.CungThu]: '🏹',
  [UnitType.GiapBinh]: '🛡️',
  [UnitType.Father]: '🧙',
  [UnitType.Sumo]: '🥋',
  [UnitType.Labubu]: '🧸',
};

/** Khoá texture khuôn mặt Father (đã tách nền) — Father dùng ảnh thật thay emoji. */
export const FATHER_FACE_KEY = 'unit-father';

/** Khoá texture ảnh Sumo (đã tách nền) — Sumo dùng ảnh thật thay emoji. */
export const SUMO_FACE_KEY = 'unit-sumo';

/** Khoá texture ảnh Labubu (đã tách nền) — hero phe Nguyên. */
export const LABUBU_FACE_KEY = 'unit-labubu';

/** Bảng khắc chế: kéo–búa–bao (Father không tham gia khắc chế). Bộ>Cung, Cung>Giáp, Giáp>Bộ. */
export const COUNTER_MULTIPLIER = 1.6;
const COUNTERS: Partial<Record<UnitType, UnitType>> = {
  [UnitType.BoBinh]: UnitType.CungThu,
  [UnitType.CungThu]: UnitType.GiapBinh,
  [UnitType.GiapBinh]: UnitType.BoBinh,
};

/** Hệ số sát thương khi `attacker` đánh `defender` (áp khắc chế). */
export function damageMultiplier(attacker: UnitType, defender: UnitType): number {
  return COUNTERS[attacker] === defender ? COUNTER_MULTIPLIER : 1;
}

/** Loại lính khắc chế được `enemy` (dùng cho AI chọn phản kèo). */
export function unitThatBeats(enemy: UnitType): UnitType {
  const found = (Object.keys(COUNTERS) as UnitType[]).find((u) => COUNTERS[u] === enemy);
  return found ?? UnitType.BoBinh;
}

/** Giới hạn quân mỗi phe (chống spam). */
export const POPULATION_CAP = 20;

/** 3 lính cơ bản — AI dùng danh sách này (KHÔNG có Father). */
export const SPAWN_ORDER: UnitType[] = [UnitType.BoBinh, UnitType.CungThu, UnitType.GiapBinh];

/** Nút đẻ lính của NGƯỜI CHƠI (có thêm Father — tướng riêng người chơi). */
export const PLAYER_SPAWN_ORDER: UnitType[] = [...SPAWN_ORDER, UnitType.Father];

// ============================================================================
// PHASE 3 — Nóc thành (tự bắn), kỹ năng đặc biệt, nâng cấp, mức khó AI.
// ============================================================================

export type ProjectileKind = 'arc' | 'straight';

/** Đòn tự bắn của nhân vật nóc thành, theo phe (chất riêng: trứng cung/AoE vs nước thẳng/đơn). */
export interface RoofAttackConfig {
  kind: ProjectileKind;
  damage: number;
  range: number;
  cooldownMs: number;
  projectileSpeed: number; // px/giây
  aoeRadius: number; // >0 chỉ với 'arc' (nổ bẹt)
  color: number;
}

export const ROOF_ATTACK: Record<Side, RoofAttackConfig> = {
  // Khôi ném trứng: vòng cung, nhịp chậm, ĐƠN MỤC TIÊU (aoeRadius 0 → chỉ trúng 1 lính
  // gần điểm rơi). Chỉ Tướng & kỹ năng tay mới đánh diện rộng.
  [Side.Khoi]: { kind: 'arc', damage: 20, range: 340, cooldownMs: 1400, projectileSpeed: 460, aoeRadius: 0, color: 0xfde047 },
  // Nguyên bắn súng nước: thẳng, nhanh, đơn mục tiêu.
  [Side.Nguyen]: { kind: 'straight', damage: 13, range: 320, cooldownMs: 650, projectileSpeed: 560, aoeRadius: 0, color: 0x38bdf8 },
};

/** Kỹ năng bấm tay: Khôi mưa trứng (nhiều đạn AoE), Nguyên xịt nước mạnh (dải + đẩy lùi). */
export interface SpecialConfig {
  label: string;
  cooldownMs: number;
  damage: number;
  aoeRadius: number; // Khôi: bán kính mỗi quả; Nguyên: nửa bề rộng dải
  eggCount: number; // Khôi: số quả trứng rơi; Nguyên: 0
  knockback: number; // Nguyên: px đẩy lùi; Khôi: 0
}

export const SPECIAL: Record<Side, SpecialConfig> = {
  [Side.Khoi]: { label: 'Mưa trứng', cooldownMs: 12000, damage: 40, aoeRadius: 60, eggCount: 6, knockback: 0 },
  [Side.Nguyen]: { label: 'Xịt nước mạnh', cooldownMs: 12000, damage: 55, aoeRadius: 90, eggCount: 0, knockback: 70 },
};

/** Nâng cấp mua bằng vàng (dùng chung 2 phe). Chi phí tăng theo cấp. */
export enum UpgradeType {
  Income = 'income', // +thu nhập vàng/giây
  BaseHp = 'base-hp', // +máu tối đa & hồi máu thành
  RoofDamage = 'roof-damage', // +% sát thương nóc thành
}

export interface UpgradeConfig {
  label: string;
  baseCost: number;
  costGrowth: number; // nhân chi phí mỗi cấp
  maxLevel: number;
}

export const UPGRADES: Record<UpgradeType, UpgradeConfig> = {
  [UpgradeType.Income]: { label: 'Thu nhập', baseCost: 80, costGrowth: 1.6, maxLevel: 5 },
  [UpgradeType.BaseHp]: { label: 'Máu thành', baseCost: 100, costGrowth: 1.6, maxLevel: 5 },
  [UpgradeType.RoofDamage]: { label: 'Sức bắn', baseCost: 90, costGrowth: 1.6, maxLevel: 5 },
};

export const UPGRADE_EFFECT = {
  incomePerLevel: 4, // +4 vàng/giây mỗi cấp
  baseHpPerLevel: 250, // +250 máu tối đa & hồi ngần đó mỗi cấp
  roofDamagePerLevel: 0.3, // +30% sát thương nóc mỗi cấp
};

export const UPGRADE_ORDER: UpgradeType[] = [UpgradeType.Income, UpgradeType.BaseHp, UpgradeType.RoofDamage];

/** Chi phí nâng cấp ở cấp hiện tại (level bắt đầu từ 0). */
export function upgradeCost(type: UpgradeType, currentLevel: number): number {
  const cfg = UPGRADES[type];
  return Math.round(cfg.baseCost * Math.pow(cfg.costGrowth, currentLevel));
}

/** Mức khó AI: nhịp quyết định + có nâng cấp / dùng kỹ năng không. */
export enum Difficulty {
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
}

export interface DifficultyConfig {
  label: string;
  decisionIntervalMs: number;
  buysUpgrades: boolean;
  /** Hệ số nhân MÁU & CÔNG áp cho phe Máy (lính + thành + nóc thành). Base = 1.0. */
  statMultiplier: number;
}

// Lưu ý: kỹ năng đặc biệt chỉ dành cho NGƯỜI CHƠI — AI không dùng ở bất kỳ mức nào.
export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.Easy]: { label: 'Dễ', decisionIntervalMs: 1500, buysUpgrades: false, statMultiplier: 1.0 },
  [Difficulty.Normal]: { label: 'Thường', decisionIntervalMs: 850, buysUpgrades: true, statMultiplier: 1.2 },
  [Difficulty.Hard]: { label: 'Khó', decisionIntervalMs: 500, buysUpgrades: true, statMultiplier: 1.5 },
};

// ---- Chiến dịch 50 màn: mỗi màn Máy +10% máu & công (nhân chồng lên mức khó) ----
export const TOTAL_STAGES = 50;
export const STAGE_STAT_PER_LEVEL = 0.1; // +10% mỗi màn

/** Hệ số máu&công theo màn: màn 1 = ×1.0 (base), màn 50 = ×5.9. */
export function stageStatMultiplier(stage: number): number {
  const s = Math.max(1, Math.min(TOTAL_STAGES, stage));
  return 1 + (s - 1) * STAGE_STAT_PER_LEVEL;
}

/**
 * Hệ số máu&công theo phe: người chơi giữ base (1.0); Máy = mức_khó × màn.
 * VD Khó (×1.5) màn 50 (×1.49) ≈ ×2.24.
 */
export function statMultipliersFor(
  playerSide: Side,
  difficulty: Difficulty,
  stage = 1,
): Record<Side, number> {
  const aiMult = DIFFICULTIES[difficulty].statMultiplier * stageStatMultiplier(stage);
  return playerSide === Side.Khoi
    ? { [Side.Khoi]: 1, [Side.Nguyen]: aiMult }
    : { [Side.Khoi]: aiMult, [Side.Nguyen]: 1 };
}

// ============================================================================
// Hệ số chỉ số 1 phe (dùng chung cho AI theo mức khó×màn, và người chơi theo
// nâng cấp vĩnh viễn). Hệ số nhân: >1 = tăng, <1 = giảm (cho cooldown/giá).
// ============================================================================
export interface SideMods {
  unitHp: Record<UnitType, number>;
  unitDmg: Record<UnitType, number>;
  unitCost: Record<UnitType, number>;
  unitSpawnCd: Record<UnitType, number>;
  baseHp: number;
  roofDmg: number;
  roofCd: number;
  income: number;
}

const ALL_UNIT_TYPES: UnitType[] = [UnitType.BoBinh, UnitType.CungThu, UnitType.GiapBinh, UnitType.Father, UnitType.Sumo, UnitType.Labubu];

function unitRecord(value: number): Record<UnitType, number> {
  return {
    [UnitType.BoBinh]: value,
    [UnitType.CungThu]: value,
    [UnitType.GiapBinh]: value,
    [UnitType.Father]: value,
    [UnitType.Sumo]: value,
    [UnitType.Labubu]: value,
  };
}

/** SideMods đồng đều (AI): máu&công×mult cho lính/thành/nóc; giá/hồi chiêu/thu nhập giữ nguyên. */
export function uniformSideMods(mult: number): SideMods {
  return {
    unitHp: unitRecord(mult),
    unitDmg: unitRecord(mult),
    unitCost: unitRecord(1),
    unitSpawnCd: unitRecord(1),
    baseHp: mult,
    roofDmg: mult,
    roofCd: 1,
    income: 1,
  };
}

// ---- Nâng cấp vĩnh viễn của người chơi (mua bằng "xu" ở Menu) ----
export type MetaTarget = 'unitHp' | 'unitDmg' | 'unitCost' | 'unitSpawnCd' | 'baseHp' | 'roofDmg' | 'roofCd' | 'income';

export interface MetaUpgradeDef {
  id: string; // khoá lưu localStorage
  group: string; // nhãn tab (đối tượng)
  label: string; // tên nâng cấp
  target: MetaTarget;
  unitType?: UnitType; // nếu target là chỉ số lính
  perLevel: number; // +0.06 (tăng) hoặc -0.03 (giảm)
  maxLevel: number;
  baseCost: number; // xu cho cấp 1
  costGrowth: number; // nhân chi phí mỗi cấp
}

const INC = 0.06; // +6%/cấp (máu, sát thương, thu nhập)
const RED = -0.03; // -3%/cấp (giá, hồi chiêu)
export const META_REDUCTION_FLOOR = 0.4; // giảm tối đa 60%
const MAX_LV = 15;

function unitUpgrades(type: UnitType, group: string): MetaUpgradeDef[] {
  return [
    { id: `${type}.hp`, group, label: 'Máu', target: 'unitHp', unitType: type, perLevel: INC, maxLevel: MAX_LV, baseCost: 8, costGrowth: 1.4 },
    { id: `${type}.dmg`, group, label: 'Sát thương', target: 'unitDmg', unitType: type, perLevel: INC, maxLevel: MAX_LV, baseCost: 8, costGrowth: 1.4 },
    { id: `${type}.spawncd`, group, label: 'Giảm hồi chiêu đẻ', target: 'unitSpawnCd', unitType: type, perLevel: RED, maxLevel: MAX_LV, baseCost: 10, costGrowth: 1.45 },
    { id: `${type}.cost`, group, label: 'Giảm giá mua', target: 'unitCost', unitType: type, perLevel: RED, maxLevel: MAX_LV, baseCost: 10, costGrowth: 1.45 },
  ];
}

/** Toàn bộ nâng cấp, nhóm theo tab. */
export const META_UPGRADES: MetaUpgradeDef[] = [
  { id: 'thanh.hp', group: 'Thành', label: 'Máu thành', target: 'baseHp', perLevel: INC, maxLevel: MAX_LV, baseCost: 12, costGrowth: 1.45 },
  { id: 'thanh.roofdmg', group: 'Thành', label: 'Sát thương nóc', target: 'roofDmg', perLevel: INC, maxLevel: MAX_LV, baseCost: 10, costGrowth: 1.4 },
  { id: 'thanh.roofcd', group: 'Thành', label: 'Giảm hồi chiêu nóc', target: 'roofCd', perLevel: RED, maxLevel: MAX_LV, baseCost: 10, costGrowth: 1.45 },
  ...unitUpgrades(UnitType.BoBinh, 'Bộ binh'),
  ...unitUpgrades(UnitType.CungThu, 'Cung thủ'),
  ...unitUpgrades(UnitType.GiapBinh, 'Giáp binh'),
  ...unitUpgrades(UnitType.Father, 'Father'),
  { id: 'chung.income', group: 'Chung', label: 'Tăng thu nhập', target: 'income', perLevel: INC, maxLevel: MAX_LV, baseCost: 15, costGrowth: 1.5 },
];

/** Thứ tự tab hiển thị trong shop. */
export const META_GROUPS = ['Thành', 'Bộ binh', 'Cung thủ', 'Giáp binh', 'Father', 'Chung'];

/** Chi phí xu cho cấp tiếp theo của 1 nâng cấp. */
export function metaUpgradeCost(def: MetaUpgradeDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}

/** Xu thưởng sau trận. */
export function coinsEarned(playerWon: boolean, stage: number): number {
  return playerWon ? 15 + stage * 5 : 5 + stage;
}

/** Biến 1 cấp nâng cấp thành hệ số nhân (giảm thì kẹp sàn). */
export function metaFactor(def: MetaUpgradeDef, level: number): number {
  const f = 1 + level * def.perLevel;
  return def.perLevel < 0 ? Math.max(META_REDUCTION_FLOOR, f) : f;
}

// ============================================================================
// HERO — mỗi phe 1 hero (Khôi: Sumo, Nguyên: Labubu). Hành vi & chỉ số GIỐNG HỆT
// nhau (chỉ khác avatar/tiếng kêu/phe). Registry HEROES cho phép thêm hero về sau.
// Nâng cấp hero TÁCH khỏi META_UPGRADES (không lọt shop NÂNG CẤP cũ); mỗi hero có
// scene shop riêng render list của mình.
// ============================================================================

/** Tầm nhìn: có địch trong khoảng này (ngoài tầm đánh) → hero lao tới ×4. */
export const HERO_VISION_RANGE = 450;
/** Hệ số tăng tốc khi lao tới. */
export const HERO_CHARGE_MULT = 4;
/** Ngưỡng máu (tỉ lệ) hero bắt đầu rút lui hồi máu. */
export const HERO_RETREAT_HP_FRAC = 0.5;
/** Hệ số tốc độ khi chạy về hậu phương. */
export const HERO_RETREAT_SPEED_MULT = 4;
/** Tốc hồi máu mỗi giây (tỉ lệ máu tối đa) khi ở hậu phương an toàn. */
export const HERO_HEAL_FRAC_PER_SEC = 0.25;
/** Giãn cách tối thiểu giữa 2 tiếng kêu (ms) — tránh kêu liên thanh. */
export const HERO_CRY_THROTTLE_MS = 500;
/** Giá xu mở khoá 1 hero (1 lần, vĩnh viễn). */
export const HERO_UNLOCK_COST = 60;

const HERO_INC = 0.12; // +12%/cấp (×2 quân thường) — máu, sát thương
const HERO_RED = -0.06; // -6%/cấp (×2 quân thường) — giá, hồi chiêu

/** 4 nâng cấp hero (×2 hệ số troop). id = `${unitType}.xxx` để lưu localStorage ổn định. */
function heroUpgradeDefs(unitType: UnitType, group: string): MetaUpgradeDef[] {
  return [
    { id: `${unitType}.hp`, group, label: 'Máu', target: 'unitHp', unitType, perLevel: HERO_INC, maxLevel: MAX_LV, baseCost: 8, costGrowth: 1.4 },
    { id: `${unitType}.dmg`, group, label: 'Sát thương', target: 'unitDmg', unitType, perLevel: HERO_INC, maxLevel: MAX_LV, baseCost: 8, costGrowth: 1.4 },
    { id: `${unitType}.spawncd`, group, label: 'Giảm hồi chiêu đẻ', target: 'unitSpawnCd', unitType, perLevel: HERO_RED, maxLevel: MAX_LV, baseCost: 10, costGrowth: 1.45 },
    { id: `${unitType}.cost`, group, label: 'Giảm giá mua', target: 'unitCost', unitType, perLevel: HERO_RED, maxLevel: MAX_LV, baseCost: 10, costGrowth: 1.45 },
  ];
}

/** Def "mở khoá" hero (1 cấp, giá cố định) — KHÔNG fold vào mods (perLevel 0). */
function heroUnlockDef(id: string, label: string): MetaUpgradeDef {
  return { id, group: 'hero', label, target: 'income', perLevel: 0, maxLevel: 1, baseCost: HERO_UNLOCK_COST, costGrowth: 1 };
}

/** Mô tả 1 hero: định danh, phe, avatar, shop, tiếng kêu, mở khoá + nâng cấp. */
export interface HeroDef {
  id: string;
  unitType: UnitType;
  side: Side;
  faceKey: string;
  shopTitle: string; // tiêu đề scene shop
  menuLabel: string; // nhãn nút menu
  menuFill: number; // màu nút (theo phe)
  statsGroup: string; // nhóm cho statsLines/nâng cấp
  sfx: string; // SFX tiếng kêu ('bark' | 'labubu')
  unlock: MetaUpgradeDef;
  upgrades: MetaUpgradeDef[];
}

export const HEROES: HeroDef[] = [
  {
    id: 'sumo', unitType: UnitType.Sumo, side: Side.Khoi, faceKey: SUMO_FACE_KEY,
    shopTitle: '🍜 QUÁN PHỞ ANH KHÔI', menuLabel: '🍜 Quán Phở Anh Khôi', menuFill: SIDE_INFO[Side.Khoi].color,
    statsGroup: 'Sumo', sfx: 'bark',
    unlock: heroUnlockDef('sumo.unlock', 'Mở khoá Sumo'), upgrades: heroUpgradeDefs(UnitType.Sumo, 'Sumo'),
  },
  {
    id: 'labubu', unitType: UnitType.Labubu, side: Side.Nguyen, faceKey: LABUBU_FACE_KEY,
    shopTitle: '🧸 TẠP HOÁ THẢO NGUYÊN', menuLabel: '🧸 Tạp hoá Thảo Nguyên', menuFill: SIDE_INFO[Side.Nguyen].color,
    statsGroup: 'Labubu', sfx: 'labubu',
    unlock: heroUnlockDef('labubu.unlock', 'Mở khoá Labubu'), upgrades: heroUpgradeDefs(UnitType.Labubu, 'Labubu'),
  },
];

/** Hero của 1 phe (hoặc undefined nếu phe đó chưa có hero). */
export function heroForSide(side: Side): HeroDef | undefined {
  return HEROES.find((h) => h.side === side);
}
/** Hero theo loại lính (để combat/unit nhận diện). */
export function heroDefByType(type: UnitType): HeroDef | undefined {
  return HEROES.find((h) => h.unitType === type);
}
/** Gộp mọi nâng cấp hero (để computePlayerMods fold 1 lượt). */
export const ALL_HERO_UPGRADES: MetaUpgradeDef[] = HEROES.flatMap((h) => h.upgrades);

export { ALL_UNIT_TYPES };
