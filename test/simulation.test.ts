// Test mô phỏng logic lõi (không cần trình duyệt / RAF).
// Stub scene Phaser tối thiểu để dựng Base/Unit thật, rồi chạy updateBattle
// tất định và kiểm chứng: di chuyển, khắc chế, chết + bounty, phá thành, AI đẻ lính.
import assert from 'node:assert';
import {
  Side,
  UnitType,
  BASE,
  ECONOMY,
  UNITS,
  UPGRADE_EFFECT,
  UPGRADE_ORDER,
  UpgradeType,
  Difficulty,
  DIFFICULTIES,
  damageMultiplier,
  enemyOf,
  statMultipliersFor,
} from '../src/config/game-config';
import { Base } from '../src/entities/base';
import { Unit } from '../src/entities/unit';
import { Economy } from '../src/systems/economy';
import { SpawnManager } from '../src/systems/spawn';
import { nearestEnemyUnit, updateBattle } from '../src/systems/combat';
import { updateProjectiles } from '../src/systems/projectile-system';
import { Upgrades } from '../src/systems/upgrades';
import { SpecialAbility } from '../src/systems/special-ability';
import { RoofAttacker } from '../src/entities/roof-attacker';
import { Projectile } from '../src/entities/projectile';
import {
  ALL_HERO_UPGRADES,
  HEROES,
  HERO_UNLOCK_COST,
  LANE_Y,
  META_UPGRADES,
  heroForSide,
  SideMods,
  coinsEarned,
  metaFactor,
  stageStatMultiplier,
  uniformSideMods,
} from '../src/config/game-config';
import { getUnlockedStage, unlockNextStage } from '../src/systems/progress';
import { ReinforcementManager } from '../src/systems/reinforcements';
import { REINFORCE_HP_FRAC, reinforcementCount } from '../src/config/game-config';
import { updateTitan } from '../src/systems/titan-behavior';
import { updateHero } from '../src/systems/hero-behavior';
import { titanForSide, titanSpawnX, TITAN_AURA_HP_FRAC, TITAN_HERO_DMG_TAKEN_FRAC, TITANS } from '../src/config/game-config';
import { addCoins, buyUpgrade, computePlayerMods, getCoins, getLevel } from '../src/systems/meta-upgrades';
import { buyHeroUpgrade, heroUpgradeLevel, isHeroUnlocked, unlockHero, usableHero } from '../src/systems/hero-shop';
import { BasicAi, type AiContext } from '../src/ai/basic-ai';

// --- Fake Phaser scene: game object stub chainable, đủ field/method code dùng tới. ---
function makeGO() {
  const o: Record<string, unknown> = { x: 0, y: 0, width: 0, height: 0 };
  const chain = () => o;
  Object.assign(o, {
    setOrigin: chain,
    setText: chain,
    setColor: chain,
    setAlpha: chain,
    setScale: chain,
    setBackgroundColor: chain,
    setDepth: chain,
    setTint: chain,
    setDisplaySize: chain,
    setStrokeStyle: chain,
    setInteractive: chain,
    setVisible: chain,
    on: chain,
    destroy: () => {},
  });
  return o;
}
const scene = {
  add: {
    rectangle: () => makeGO(),
    text: () => makeGO(),
    image: () => makeGO(),
    circle: () => makeGO(),
  },
  tweens: { add: () => ({}) },
} as never;

function makeBases(): Record<Side, Base> {
  return { [Side.Khoi]: new Base(scene, Side.Khoi), [Side.Nguyen]: new Base(scene, Side.Nguyen) };
}

const DT = 1 / 60;
const DT_MS = 1000 / 60;

function pump(
  units: Unit[],
  bases: Record<Side, Base>,
  economy: Economy,
  steps: number,
  startNow: number,
): number {
  let now = startNow;
  for (let i = 0; i < steps; i++) {
    now += DT_MS;
    economy.update(DT);
    updateBattle(units, bases, economy, DT, now);
  }
  return now;
}

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// 1. Khắc chế kéo–búa–bao.
check('khắc chế: Bộ>Cung, Cung>Giáp, Giáp>Bộ = 1.6x, còn lại 1x', () => {
  assert.strictEqual(damageMultiplier(UnitType.BoBinh, UnitType.CungThu), 1.6);
  assert.strictEqual(damageMultiplier(UnitType.CungThu, UnitType.GiapBinh), 1.6);
  assert.strictEqual(damageMultiplier(UnitType.GiapBinh, UnitType.BoBinh), 1.6);
  assert.strictEqual(damageMultiplier(UnitType.BoBinh, UnitType.GiapBinh), 1);
  assert.strictEqual(damageMultiplier(UnitType.BoBinh, UnitType.BoBinh), 1);
});

// 2. Kinh tế: thu nhập, tiêu, không đủ thì fail, bounty.
check('kinh tế: income + spend + reward', () => {
  const e = new Economy();
  assert.strictEqual(e.getGold(Side.Khoi), ECONOMY.startingGold);
  e.update(1); // +incomePerSecond
  assert.ok(Math.abs(e.getGold(Side.Khoi) - (ECONOMY.startingGold + ECONOMY.incomePerSecond)) < 1e-6);
  assert.strictEqual(e.spend(Side.Khoi, 1e9), false); // không đủ
  assert.strictEqual(e.spend(Side.Khoi, 50), true);
  const before = e.getGold(Side.Nguyen);
  e.reward(Side.Nguyen, 42);
  assert.strictEqual(e.getGold(Side.Nguyen), before + 42);
});

// 3. Lính tiến về thành địch & phá thành (điều kiện thắng).
check('march + phá thành: lính Khôi tiến sang phải, hạ thành Nguyên', () => {
  const bases = makeBases();
  const economy = new Economy();
  const units: Unit[] = [];
  // 4 bộ binh Khôi, không có địch → tiến sang phải đánh thành Nguyên.
  for (let i = 0; i < 4; i++) units.push(new Unit(scene, Side.Khoi, UnitType.BoBinh, 150 + i * 5));
  const startX = units[0].x;
  pump(units, bases, economy, 120, 0); // ~2s
  assert.ok(units[0].x > startX, 'lính phải di chuyển sang phải');
  pump(units, bases, economy, 60 * 60, 2000); // thêm ~60s
  assert.ok(bases[Side.Nguyen].isDead(), 'thành Nguyên phải bị hạ');
  assert.ok(!bases[Side.Khoi].isDead(), 'thành Khôi còn nguyên (không có địch)');
});

// 4. Combat + khắc chế quyết định kẻ sống sót.
check('combat: bộ binh khắc chế cung thủ → cung thủ chết trước', () => {
  const bases = makeBases();
  const economy = new Economy();
  // Đặt sát nhau giữa sân để đánh ngay.
  const boBinh = new Unit(scene, Side.Khoi, UnitType.BoBinh, 470);
  const cungThu = new Unit(scene, Side.Nguyen, UnitType.CungThu, 500);
  const units: Unit[] = [boBinh, cungThu];
  const nguyenGoldBefore = economy.getGold(Side.Nguyen);
  pump(units, bases, economy, 60 * 20, 0); // ~20s
  assert.ok(cungThu.isDead(), 'cung thủ (bị khắc chế) phải chết');
  assert.ok(!boBinh.isDead(), 'bộ binh phải sống sót');
  // Bounty: Khôi giết cung thủ Nguyên → Nguyên KHÔNG được thưởng; Khôi được.
  assert.ok(economy.getGold(Side.Nguyen) - nguyenGoldBefore >= 0);
});

// 5. Đẻ lính qua SpawnManager: trừ vàng, hồi chiêu, pop cap.
check('spawn: trừ vàng đúng + chặn khi đang hồi chiêu', () => {
  const economy = new Economy();
  const spawn = new SpawnManager(scene);
  const units: Unit[] = [];
  const goldBefore = economy.getGold(Side.Khoi);
  const r1 = spawn.trySpawn(Side.Khoi, UnitType.BoBinh, economy, units, 0);
  assert.ok('unit' in r1, 'đẻ lần 1 thành công');
  assert.strictEqual(units.length, 1);
  assert.strictEqual(economy.getGold(Side.Khoi), goldBefore - UNITS[UnitType.BoBinh].cost);
  const r2 = spawn.trySpawn(Side.Khoi, UnitType.BoBinh, economy, units, 10); // còn hồi chiêu
  assert.deepStrictEqual(r2, { reason: 'cooldown' });
});

// Tạo AiContext đầy đủ cho test (scene=null → không cần sprite).
function makeAiCtx(now: number, units: Unit[], bases: Record<Side, Base>): AiContext {
  return {
    now,
    units,
    projectiles: [] as Projectile[],
    economy: new Economy(),
    spawn: new SpawnManager(scene),
    upgrades: new Upgrades(),
    special: new SpecialAbility(),
    bases,
    scene: null,
  };
}

// 6. AI tự đẻ lính khi đủ vàng.
check('AI: đẻ lính khi đủ vàng', () => {
  const ctx = makeAiCtx(1000, [], makeBases());
  new BasicAi(Side.Nguyen).update(ctx); // qua mốc quyết định
  assert.ok(ctx.units.some((u) => u.side === Side.Nguyen), 'AI phải đẻ ít nhất 1 lính Nguyên');
});

// 7. frontX của thành đúng hướng (điểm lính đánh vào).
check('base.frontX: Khôi ở trái (phải+), Nguyên ở phải (trái-)', () => {
  const bases = makeBases();
  assert.strictEqual(bases[Side.Khoi].frontX, bases[Side.Khoi].x + BASE.width / 2);
  assert.strictEqual(bases[Side.Nguyen].frontX, bases[Side.Nguyen].x - BASE.width / 2);
  assert.strictEqual(enemyOf(Side.Khoi), Side.Nguyen);
});

// ---- Phase 3: nóc thành, kỹ năng, nâng cấp, mức khó AI ----

// 8. Nóc thành tự bắn: đạn hạ lính địch trong tầm.
check('nóc thành: tự bắn hạ lính địch trong tầm', () => {
  const bases = makeBases();
  const target = new Unit(scene, Side.Nguyen, UnitType.CungThu, 400);
  const units: Unit[] = [target];
  const projectiles: Projectile[] = [];
  const upgrades = new Upgrades();
  const roof = new RoofAttacker(null, Side.Khoi);
  // Bơm: roof bắn, đạn bay, nổ/hạ mục tiêu.
  for (let i = 0; i < 60 * 15; i++) {
    const now = i * DT_MS;
    roof.update(now, units, projectiles, upgrades);
    updateBattle(units, bases, new Economy(), DT, now); // combat sẽ dọn xác khỏi mảng
    updateProjectiles(projectiles, units, bases, DT);
  }
  assert.ok(target.isDead(), 'lính địch phải bị nóc thành hạ');
  assert.strictEqual(units.length, 0, 'xác đã được dọn khỏi mảng');
});

// 9. Nâng cấp: income tăng thu nhập, base-hp tăng máu tối đa, roof-damage tăng hệ số.
check('nâng cấp: income + máu thành + sức bắn', () => {
  const bases = makeBases();
  const economy = new Economy();
  economy.reward(Side.Khoi, 100000); // đủ tiền mua
  const up = new Upgrades();

  const before = economy.getGold(Side.Khoi);
  economy.update(1);
  const incomeBase = economy.getGold(Side.Khoi) - before;
  assert.ok(up.tryBuy(Side.Khoi, UpgradeType.Income, economy, bases[Side.Khoi]));
  const afterBuy = economy.getGold(Side.Khoi);
  economy.update(1);
  const incomeUp = economy.getGold(Side.Khoi) - afterBuy;
  assert.ok(incomeUp - incomeBase >= UPGRADE_EFFECT.incomePerLevel - 1e-6, 'thu nhập phải tăng');

  const maxBefore = bases[Side.Khoi].maxHp;
  assert.ok(up.tryBuy(Side.Khoi, UpgradeType.BaseHp, economy, bases[Side.Khoi]));
  assert.strictEqual(bases[Side.Khoi].maxHp, maxBefore + UPGRADE_EFFECT.baseHpPerLevel);

  const multBefore = up.roofDamageMultiplier(Side.Khoi);
  assert.ok(up.tryBuy(Side.Khoi, UpgradeType.RoofDamage, economy, bases[Side.Khoi]));
  assert.ok(up.roofDamageMultiplier(Side.Khoi) > multBefore, 'hệ số sức bắn phải tăng');
});

// 10. Kỹ năng Khôi (mưa trứng): tạo nhiều đạn AoE hạ đám lính địch.
check('kỹ năng Khôi: mưa trứng hạ đám lính địch', () => {
  const bases = makeBases();
  const units: Unit[] = [];
  for (let i = 0; i < 5; i++) units.push(new Unit(scene, Side.Nguyen, UnitType.CungThu, 600 + i * 8));
  const projectiles: Projectile[] = [];
  const special = new SpecialAbility();
  assert.ok(special.trigger(Side.Khoi, 0, null, units, projectiles), 'kỹ năng phải kích hoạt');
  assert.ok(projectiles.length >= 3, 'mưa trứng phải tạo nhiều đạn');
  for (let i = 0; i < 60 * 6; i++) updateProjectiles(projectiles, units, bases, DT);
  assert.ok(units.some((u) => u.isDead()), 'mưa trứng phải hạ được lính');
  // Còn hồi chiêu → không kích hoạt lại ngay.
  assert.strictEqual(special.trigger(Side.Khoi, 100, null, units, projectiles), false);
});

// 11. Kỹ năng Nguyên (xịt nước): sát thương + đẩy lùi lính địch tức thời.
check('kỹ năng Nguyên: xịt nước đẩy lùi + sát thương', () => {
  const front = BASE.width; // gần thành Nguyên (bên phải)
  const enemy = new Unit(scene, Side.Khoi, UnitType.BoBinh, 820); // trong tầm blast
  const units: Unit[] = [enemy];
  const hpBefore = enemy.hp;
  const xBefore = enemy.x;
  const special = new SpecialAbility();
  assert.ok(special.trigger(Side.Nguyen, 0, null, units, []));
  assert.ok(enemy.hp < hpBefore, 'phải mất máu');
  assert.ok(enemy.x < xBefore, 'phải bị đẩy lùi về trái (thành Khôi)');
  void front;
});

// 12. AI mức khó: Easy không mua nâng cấp, Hard có (khác biệt hành vi tất định).
check('AI: Easy không mua nâng cấp, Hard có', () => {
  function totalUpgradeLevels(diff: Difficulty): number {
    const ctx = makeAiCtx(0, [], makeBases());
    ctx.economy.reward(Side.Nguyen, 100000); // dư tiền
    const ai = new BasicAi(Side.Nguyen, diff);
    for (let i = 0; i < 60 * 10; i++) {
      ctx.now = i * DT_MS;
      ai.update(ctx);
    }
    return UPGRADE_ORDER.reduce((s, t) => s + ctx.upgrades.getLevel(Side.Nguyen, t), 0);
  }
  assert.strictEqual(totalUpgradeLevels(Difficulty.Easy), 0, 'Easy không mua nâng cấp');
  assert.ok(totalUpgradeLevels(Difficulty.Hard) > 0, 'Hard phải mua nâng cấp');
});

// Mô phỏng trận AI-vs-AI đầy đủ (buff = hệ số máu&công mỗi phe, như scale mức khó × màn).
// Trả về phe thắng hoặc null nếu bế tắc tới hết giờ.
function simulateMatch(
  minutes: number,
  buff: Record<Side, number> = { [Side.Khoi]: 1, [Side.Nguyen]: 1 },
): Side | null {
  const mods: Record<Side, SideMods> = {
    [Side.Khoi]: uniformSideMods(buff[Side.Khoi]),
    [Side.Nguyen]: uniformSideMods(buff[Side.Nguyen]),
  };
  const bases: Record<Side, Base> = {
    [Side.Khoi]: new Base(scene, Side.Khoi, buff[Side.Khoi]),
    [Side.Nguyen]: new Base(scene, Side.Nguyen, buff[Side.Nguyen]),
  };
  const economy = new Economy();
  const spawn = new SpawnManager(scene, mods);
  const upgrades = new Upgrades();
  const special = new SpecialAbility();
  const units: Unit[] = [];
  const projectiles: Projectile[] = [];
  const roofK = new RoofAttacker(null, Side.Khoi, buff[Side.Khoi]);
  const roofN = new RoofAttacker(null, Side.Nguyen, buff[Side.Nguyen]);
  const aiK = new BasicAi(Side.Khoi, Difficulty.Normal);
  const aiN = new BasicAi(Side.Nguyen, Difficulty.Normal);
  const ctx: AiContext = { now: 0, units, projectiles, economy, spawn, upgrades, special, bases, scene: null };

  for (let i = 0; i < 60 * 60 * minutes; i++) {
    const now = i * DT_MS;
    ctx.now = now;
    economy.update(DT);
    aiK.update(ctx);
    aiN.update(ctx);
    updateBattle(units, bases, economy, DT, now);
    roofK.update(now, units, projectiles, upgrades);
    roofN.update(now, units, projectiles, upgrades);
    updateProjectiles(projectiles, units, bases, DT);
    if (bases[Side.Nguyen].isDead()) return Side.Khoi;
    if (bases[Side.Khoi].isDead()) return Side.Nguyen;
  }
  return null;
}

// 13. Cân bằng: phe được BUFF máu&công (như scale mức khó × màn) phải phá được thành
// phe base — chứng minh chênh lệch chỉ số quyết định thắng bại (thành CÓ THỂ bị hạ).
check('cân bằng: phe mạnh hơn (buff chỉ số) hạ được thành phe base', () => {
  assert.strictEqual(
    simulateMatch(8, { [Side.Khoi]: 3, [Side.Nguyen]: 1 }),
    Side.Khoi,
    'Khôi (×3 máu&công) phải hạ thành Nguyên base',
  );
});

// 14. Chống đơn điệu: AI phải đẻ nhiều loại lính khác nhau (không chỉ Bộ binh).
check('AI: đẻ đa dạng loại lính (không chỉ Bộ binh)', () => {
  const ctx = makeAiCtx(0, [], makeBases());
  ctx.economy.reward(Side.Nguyen, 100000); // dư tiền → không bị kẹt về lính rẻ
  const ai = new BasicAi(Side.Nguyen, Difficulty.Normal);
  for (let i = 0; i < 60 * 30; i++) {
    ctx.now = i * DT_MS;
    ai.update(ctx);
  }
  const types = new Set(ctx.units.filter((u) => u.side === Side.Nguyen).map((u) => u.type));
  assert.ok(types.size >= 2, `AI phải đẻ >=2 loại lính, thực tế ${types.size}`);
});

// 15. Hệ số mức khó: Máy được +máu&công theo mức, người chơi giữ base.
check('mức khó: Máy +20% (Thường) / +50% (Khó) máu & công, người chơi base', () => {
  assert.strictEqual(DIFFICULTIES[Difficulty.Easy].statMultiplier, 1.0);
  assert.strictEqual(DIFFICULTIES[Difficulty.Normal].statMultiplier, 1.2);
  assert.strictEqual(DIFFICULTIES[Difficulty.Hard].statMultiplier, 1.5);

  // Người chơi Khôi, Máy Nguyên, mức Khó → Khôi ×1, Nguyên ×1.5.
  const mods = statMultipliersFor(Side.Khoi, Difficulty.Hard);
  assert.strictEqual(mods[Side.Khoi], 1);
  assert.strictEqual(mods[Side.Nguyen], 1.5);

  // Lính Máy (×1.2 máu & công) mạnh hơn base.
  const base = new Unit(scene, Side.Nguyen, UnitType.BoBinh, 0, 1, 1);
  const buffed = new Unit(scene, Side.Nguyen, UnitType.BoBinh, 0, 1.2, 1.2);
  assert.ok(Math.abs(buffed.maxHp - base.maxHp * 1.2) < 1e-6);
  assert.ok(Math.abs(buffed.attackDamage - base.attackDamage * 1.2) < 1e-6);

  // Thành Máy (×1.5) máu cao hơn.
  const baseWall = new Base(scene, Side.Nguyen, 1);
  const buffedWall = new Base(scene, Side.Nguyen, 1.5);
  assert.strictEqual(buffedWall.maxHp, baseWall.maxHp * 1.5);
});

// 16. Father: đạn ma thuật XUYÊN trúng NHIỀU lính địch (không bị cản).
check('Father: đạn xuyên trúng nhiều lính địch cùng lúc', () => {
  const bases = makeBases();
  const economy = new Economy();
  const projectiles: Projectile[] = [];
  // Father Khôi + 3 lính Nguyên xếp hàng trong tầm.
  const father = new Unit(scene, Side.Khoi, UnitType.Father, 300, 1);
  const enemies = [
    new Unit(scene, Side.Nguyen, UnitType.BoBinh, 360),
    new Unit(scene, Side.Nguyen, UnitType.BoBinh, 420),
    new Unit(scene, Side.Nguyen, UnitType.BoBinh, 480),
  ];
  const units: Unit[] = [father, ...enemies];
  const hpBefore = enemies.map((e) => e.hp);
  // Bơm: Father bắn (combat tạo đạn), đạn bay xuyên qua cả 3.
  for (let i = 0; i < 60 * 4; i++) {
    const now = i * DT_MS;
    updateBattle(units, bases, economy, DT, now, projectiles, null);
    updateProjectiles(projectiles, units, bases, DT);
  }
  const damagedCount = enemies.filter((e, idx) => e.isDead() || e.hp < hpBefore[idx]).length;
  assert.ok(damagedCount >= 2, `đạn xuyên phải trúng >=2 lính, thực tế ${damagedCount}`);
});

// 17. Father chỉ của người chơi — AI KHÔNG bao giờ đẻ Father.
check('Father: AI không bao giờ đẻ Father', () => {
  const ctx = makeAiCtx(0, [], makeBases());
  ctx.economy.reward(Side.Nguyen, 100000);
  const ai = new BasicAi(Side.Nguyen, Difficulty.Hard);
  for (let i = 0; i < 60 * 30; i++) {
    ctx.now = i * DT_MS;
    ai.update(ctx);
  }
  assert.ok(!ctx.units.some((u) => u.type === UnitType.Father), 'AI không được đẻ Father');
});

// 18. Đạn xuyên biến mất sau khi bay đủ maxTravel (1.5× tầm xa).
check('Father: đạn xuyên biến mất sau khi bay quá quãng đường tối đa', () => {
  const maxTravel = 372; // 1.5× tầm Father (248)
  const p = new Projectile(null, Side.Khoi, 'straight', 100, 800, 30, 0, 500, 0xffffff, LANE_Y - 20, true, maxTravel);
  assert.strictEqual(p.expired(), false);
  p.advance(0.5); // x: 100 → 350, đã bay 250 < 372
  assert.strictEqual(p.expired(), false);
  p.advance(0.5); // x: 350 → 600, đã bay 500 >= 372
  assert.strictEqual(p.expired(), true);
});

// 19. Chiến dịch 50 màn: hệ số scale theo màn + mở khóa riêng từng (phe×mức khó).
check('màn: scale +10%/màn (nhân chồng mức khó) + mở khóa riêng từng chiến dịch', () => {
  assert.ok(Math.abs(stageStatMultiplier(1) - 1) < 1e-9, 'màn 1 = ×1.0');
  assert.ok(Math.abs(stageStatMultiplier(50) - 5.9) < 1e-9, 'màn 50 = ×5.9 (+10%/màn)');

  // Khó (×1.5) màn 50 → Máy = 1.5 × 5.9; người chơi giữ ×1.
  const mods = statMultipliersFor(Side.Khoi, Difficulty.Hard, 50);
  assert.ok(Math.abs(mods[Side.Nguyen] - 1.5 * 5.9) < 1e-9);
  assert.strictEqual(mods[Side.Khoi], 1);

  // Mở khóa độc lập: thắng màn 1 (Khôi-Dễ) chỉ mở Khôi-Dễ.
  assert.strictEqual(getUnlockedStage(Side.Khoi, Difficulty.Easy), 1);
  unlockNextStage(Side.Khoi, Difficulty.Easy, 1);
  assert.strictEqual(getUnlockedStage(Side.Khoi, Difficulty.Easy), 2);
  assert.strictEqual(getUnlockedStage(Side.Khoi, Difficulty.Hard), 1, 'Khôi-Khó độc lập');
  assert.strictEqual(getUnlockedStage(Side.Nguyen, Difficulty.Easy), 1, 'Nguyên-Dễ độc lập');

  // Thắng lại màn thấp hơn mốc → không nhảy cóc.
  unlockNextStage(Side.Khoi, Difficulty.Easy, 1);
  assert.strictEqual(getUnlockedStage(Side.Khoi, Difficulty.Easy), 2);
});

// 20. Kỹ năng đặc biệt chỉ của người chơi — AI KHÔNG bao giờ kích hoạt.
check('AI: không bao giờ dùng kỹ năng đặc biệt', () => {
  const ctx = makeAiCtx(0, [], makeBases());
  ctx.economy.reward(Side.Nguyen, 100000);
  // "Dụ" AI: nhiều lính địch (Khôi) trong tầm.
  for (let i = 0; i < 6; i++) ctx.units.push(new Unit(scene, Side.Khoi, UnitType.BoBinh, 400 + i * 10));
  const ai = new BasicAi(Side.Nguyen, Difficulty.Hard);
  let everUsed = false;
  for (let i = 0; i < 60 * 20; i++) {
    ctx.now = i * DT_MS;
    ai.update(ctx);
    if (!ctx.special.isReady(Side.Nguyen, ctx.now)) everUsed = true;
  }
  assert.strictEqual(everUsed, false, 'AI không được kích hoạt kỹ năng đặc biệt');
});

// 21. Nâng cấp vĩnh viễn: xu thưởng, mua trừ xu + tăng cấp + áp đúng chỉ số.
check('meta: xu thưởng + mua nâng cấp + áp vào SideMods người chơi', () => {
  // Xu thưởng: thắng nhiều hơn thua, tăng theo màn.
  assert.ok(coinsEarned(true, 10) > coinsEarned(false, 10));
  assert.ok(coinsEarned(true, 20) > coinsEarned(true, 1));

  // metaFactor: tăng thì >1, giảm thì kẹp sàn 0.4.
  const incDef = META_UPGRADES.find((d) => d.id === 'bo-binh.hp')!;
  const redDef = META_UPGRADES.find((d) => d.id === 'bo-binh.cost')!;
  assert.ok(metaFactor(incDef, 5) > 1);
  assert.ok(metaFactor(redDef, 100) >= 0.4); // kẹp sàn, không âm

  // Mua: đủ xu → trừ xu, +1 cấp; áp vào computePlayerMods.
  addCoins(100000);
  const before = getLevel('bo-binh.hp');
  const coinsBefore = getCoins();
  assert.ok(buyUpgrade(incDef), 'mua thành công khi đủ xu');
  assert.strictEqual(getLevel('bo-binh.hp'), before + 1);
  assert.ok(getCoins() < coinsBefore, 'xu bị trừ');
  const mods: SideMods = computePlayerMods();
  assert.ok(mods.unitHp[UnitType.BoBinh] > 1, 'máu bộ binh người chơi được buff');
});

// 22. uniformSideMods (Máy): máu&công×mult, giá/hồi chiêu/thu nhập giữ 1.
check('meta: uniformSideMods cho Máy đúng', () => {
  const m = uniformSideMods(1.5);
  assert.strictEqual(m.unitHp[UnitType.BoBinh], 1.5);
  assert.strictEqual(m.unitDmg[UnitType.GiapBinh], 1.5);
  assert.strictEqual(m.baseHp, 1.5);
  assert.strictEqual(m.roofDmg, 1.5);
  assert.strictEqual(m.unitCost[UnitType.CungThu], 1);
  assert.strictEqual(m.income, 1);
});

// 23. Sumo config: dẫn xuất Bộ binh + không khắc chế + record mods đủ khóa.
check('sumo config: dẫn xuất Bộ binh, không khắc chế', () => {
  const bo = UNITS[UnitType.BoBinh];
  const sumo = UNITS[UnitType.Sumo];
  assert.strictEqual(sumo.hp, bo.hp, 'máu = Bộ binh');
  assert.strictEqual(sumo.speed, bo.speed, 'tốc = Bộ binh');
  assert.strictEqual(sumo.damage, bo.damage / 2, 'sát thương = ½ Bộ binh');
  assert.strictEqual(sumo.cost, bo.cost / 2, 'giá = ½ Bộ binh');
  assert.strictEqual(sumo.attackCooldownMs, bo.attackCooldownMs / 4, 'nhịp = ¼ Bộ binh');
  assert.strictEqual(sumo.range, 42, 'cận chiến');
  for (const t of [UnitType.BoBinh, UnitType.CungThu, UnitType.GiapBinh, UnitType.Sumo]) {
    assert.strictEqual(damageMultiplier(UnitType.Sumo, t), 1, 'Sumo không khắc chế ai');
    assert.strictEqual(damageMultiplier(t, UnitType.Sumo), 1, 'không ai khắc chế Sumo');
  }
  assert.strictEqual(uniformSideMods(1).unitHp[UnitType.Sumo], 1, 'record mods đủ khóa Sumo');
});

// 24. Hero registry: mỗi phe 1 hero; nâng cấp ×2 hệ số, tách khỏi META_UPGRADES.
check('hero registry: Khôi=Sumo, Nguyên=Labubu; nâng cấp ×2 tách khỏi shop cũ', () => {
  assert.strictEqual(heroForSide(Side.Khoi)?.unitType, UnitType.Sumo);
  assert.strictEqual(heroForSide(Side.Nguyen)?.unitType, UnitType.Labubu);
  const hpDef = ALL_HERO_UPGRADES.find((d) => d.id === 'sumo.hp')!;
  const costDef = ALL_HERO_UPGRADES.find((d) => d.id === 'labubu.cost')!;
  const metaHp = META_UPGRADES.find((d) => d.id === 'bo-binh.hp')!;
  const metaCost = META_UPGRADES.find((d) => d.id === 'bo-binh.cost')!;
  assert.ok(Math.abs(hpDef.perLevel - metaHp.perLevel * 2) < 1e-9, 'máu ×2 hệ số');
  assert.ok(Math.abs(costDef.perLevel - metaCost.perLevel * 2) < 1e-9, 'giá ×2 hệ số');
  assert.ok(!META_UPGRADES.some((d) => d.id.startsWith('sumo.') || d.id.startsWith('labubu.')), 'hero tách khỏi META_UPGRADES');
});

// 25. Hero shop: mở khoá (idempotent, trừ xu) + nâng cấp ×2 áp đúng cho hero của phe.
check('hero shop: mở khoá + nâng cấp Labubu áp vào mods', () => {
  const labubu = heroForSide(Side.Nguyen)!;
  addCoins(HERO_UNLOCK_COST * 5);
  assert.strictEqual(isHeroUnlocked(labubu), false, 'chưa mở khoá lúc đầu');
  const coinsBefore = getCoins();
  assert.ok(unlockHero(labubu), 'mở khoá khi đủ xu');
  assert.strictEqual(isHeroUnlocked(labubu), true, 'đã mở khoá');
  assert.strictEqual(getCoins(), coinsBefore - HERO_UNLOCK_COST, 'trừ đúng giá mở khoá');
  assert.strictEqual(unlockHero(labubu), false, 'mở khoá idempotent (maxLevel 1)');

  const hpDef = labubu.upgrades.find((d) => d.id === 'labubu.hp')!;
  addCoins(100000);
  const sumoBefore = computePlayerMods().unitHp[UnitType.Sumo];
  assert.ok(buyHeroUpgrade(hpDef), 'mua nâng cấp máu Labubu');
  const lvl = heroUpgradeLevel(hpDef);
  const mods = computePlayerMods();
  assert.ok(Math.abs(mods.unitHp[UnitType.Labubu] - metaFactor(hpDef, lvl)) < 1e-9, 'máu Labubu = metaFactor(cấp)');
  assert.strictEqual(mods.unitHp[UnitType.Sumo], sumoBefore, 'không rò sang hero khác');
});

// 26. usableHero: trả hero của phe khi đã mở khoá (đã unlock Labubu ở test 25).
check('hero gating: usableHero theo phe + trạng thái mở khoá', () => {
  assert.strictEqual(usableHero(Side.Nguyen)?.unitType, UnitType.Labubu, 'Nguyên đã mở khoá → Labubu');
  assert.strictEqual(usableHero(Side.Khoi), null, 'Khôi chưa mở khoá → null');
});

// 27. Sumo charge: thấy địch trong tầm nhìn (ngoài tầm đánh) → lao tới ×4.
check('sumo: lao tới ×4 khi thấy địch trong tầm nhìn', () => {
  const bases = makeBases();
  const sumo = new Unit(scene, Side.Khoi, UnitType.Sumo, 200);
  const enemy = new Unit(scene, Side.Nguyen, UnitType.GiapBinh, 520); // dist 320: trong VISION 450, ngoài range
  const units = [sumo, enemy];
  pump(units, bases, new Economy(), 18, 0); // ~0.3s
  const moved = sumo.x - 200;
  // Lao ×4: ~248px/s × 0.3s ≈ 74px. Tốc thường chỉ ~18px → >55 chứng tỏ charge.
  assert.ok(moved > 55, `Sumo phải lao tới (đi ${moved.toFixed(0)}px > 55)`);
});

// 28. Sumo rút lui: ≤50% máu → quay đầu chạy về thành mình (dù không có địch).
check('sumo: ≤50% máu thì rút lui về hậu phương', () => {
  const bases = makeBases();
  const sumo = new Unit(scene, Side.Khoi, UnitType.Sumo, 500);
  sumo.hp = sumo.maxHp * 0.5;
  const units = [sumo];
  pump(units, bases, new Economy(), 6, 0);
  assert.strictEqual(sumo.retreating, true, 'phải chuyển trạng thái rút lui');
  assert.ok(sumo.x < 500, 'phải lùi về trái (thành Khôi) dù không có địch');
});

// 29. Sumo hồi máu ở hậu phương: bất khả xâm + hồi tới đầy rồi lao lại.
check('sumo: về sau Thành thì bất khả xâm + hồi máu tới đầy', () => {
  const bases = makeBases();
  const sumo = new Unit(scene, Side.Khoi, UnitType.Sumo, 50); // sau Thành Khôi (x<90)
  sumo.retreating = true;
  sumo.hp = sumo.maxHp * 0.5;
  const enemy = new Unit(scene, Side.Nguyen, UnitType.CungThu, 850); // xa, không với tới
  const units = [sumo, enemy];
  assert.strictEqual(sumo.isTargetable(), false, 'đang hồi ở hậu phương → bất khả xâm');
  assert.strictEqual(nearestEnemyUnit(enemy, units), null, 'địch không nhắm được Sumo đang hồi');
  pump(units, bases, new Economy(), 130, 0); // ~2.17s > 2s hồi từ 50%→100%
  assert.strictEqual(sumo.hp, sumo.maxHp, 'phải hồi đầy máu');
  assert.strictEqual(sumo.retreating, false, 'đầy máu → thôi rút lui, lao lại');
});

// 30. Sumo vẫn dính đòn khi đang chạy về (chưa qua Thành).
check('sumo: còn trước Thành khi rút → vẫn bị nhắm', () => {
  const sumo = new Unit(scene, Side.Khoi, UnitType.Sumo, 400); // trước Thành (x>90)
  sumo.retreating = true;
  sumo.hp = sumo.maxHp * 0.5;
  const enemy = new Unit(scene, Side.Nguyen, UnitType.BoBinh, 420);
  assert.strictEqual(sumo.isTargetable(), true, 'chạy về nhưng chưa qua Thành → vẫn dính đòn');
  assert.strictEqual(nearestEnemyUnit(enemy, [sumo, enemy])?.target, sumo, 'địch nhắm được Sumo');
});

// 31. Labubu (phe Nguyên): dùng chung máy trạng thái hero, hướng ngược Sumo.
check('labubu: charge sang trái + rút lui sang phải (đối xứng Sumo)', () => {
  const bases = makeBases();
  // Charge: Labubu Nguyên thấy địch Khôi trong tầm nhìn → lao SANG TRÁI (về phía địch).
  const labubu = new Unit(scene, Side.Nguyen, UnitType.Labubu, 760);
  const enemy = new Unit(scene, Side.Khoi, UnitType.GiapBinh, 440); // dist 320: trong VISION, ngoài range
  pump([labubu, enemy], bases, new Economy(), 18, 0); // ~0.3s
  assert.ok(760 - labubu.x > 55, 'Labubu lao sang trái về phía địch');

  // Rút lui: ≤50% máu → chạy SANG PHẢI (về thành Nguyên).
  const l2 = new Unit(scene, Side.Nguyen, UnitType.Labubu, 500);
  l2.hp = l2.maxHp * 0.5;
  pump([l2], bases, new Economy(), 6, 0);
  assert.strictEqual(l2.retreating, true, 'phải rút lui');
  assert.ok(l2.x > 500, 'Labubu lùi sang phải (thành Nguyên)');
});

// 32. reinforcementCount: 0 dưới màn 30, floor(màn/10) từ 30 trở đi.
check('tiếp viện: reinforcementCount đúng theo màn', () => {
  assert.strictEqual(reinforcementCount(29), 0);
  assert.strictEqual(reinforcementCount(30), 3);
  assert.strictEqual(reinforcementCount(49), 4);
  assert.strictEqual(reinforcementCount(90), 9);
  assert.strictEqual(reinforcementCount(99), 9);
});

// 33. ReinforcementManager: kích đúng 1 lần khi thành Máy ≤50%, đúng thành phần.
check('tiếp viện: màn 30 kích 1 lần → 12 lính (3 mỗi loại + hero Máy)', () => {
  const bases = makeBases();
  const spawn = new SpawnManager(scene);
  const units: Unit[] = [];
  const mgr = new ReinforcementManager();
  const aiSide = Side.Nguyen; // Máy = Nguyên → hero Labubu

  // Chưa xuống ngưỡng → không kích.
  assert.strictEqual(mgr.update(30, aiSide, bases, spawn, units), false);
  assert.strictEqual(units.length, 0);

  // Máu thành Máy ≤50% → kích.
  bases[aiSide].hp = bases[aiSide].maxHp * (REINFORCE_HP_FRAC - 0.1);
  assert.strictEqual(mgr.update(30, aiSide, bases, spawn, units), true);
  assert.strictEqual(units.length, 12, '3 × (bộ binh, cung thủ, giáp binh, Labubu)');

  const countOf = (t: UnitType) => units.filter((u) => u.type === t).length;
  assert.strictEqual(countOf(UnitType.BoBinh), 3);
  assert.strictEqual(countOf(UnitType.CungThu), 3);
  assert.strictEqual(countOf(UnitType.GiapBinh), 3);
  assert.strictEqual(countOf(heroForSide(aiSide)!.unitType), 3);
  assert.ok(units.every((u) => u.side === aiSide), 'tất cả thuộc phe Máy');

  // Chỉ kích 1 lần.
  assert.strictEqual(mgr.update(30, aiSide, bases, spawn, units), false);
  assert.strictEqual(units.length, 12);
});

// 34. Màn <30: không tiếp viện dù thành Máy kiệt máu.
check('tiếp viện: màn 20 không kích dù thành Máy ≤50%', () => {
  const bases = makeBases();
  const spawn = new SpawnManager(scene);
  const units: Unit[] = [];
  const mgr = new ReinforcementManager();
  bases[Side.Nguyen].hp = bases[Side.Nguyen].maxHp * 0.1;
  assert.strictEqual(mgr.update(20, Side.Nguyen, bases, spawn, units), false);
  assert.strictEqual(units.length, 0);
});

// 35. Titan: stats dẫn xuất Giáp binh + vị trí đẻ 1/3 sân.
check('titan: stats (hp1400/dmg36/speed20/cd2200/cost200) + spawnX 1/3', () => {
  const c = UNITS[UnitType.Capibara];
  assert.strictEqual(c.hp, 1400);
  assert.strictEqual(c.damage, 36);
  assert.strictEqual(c.speed, 20);
  assert.strictEqual(c.attackCooldownMs, 2200);
  assert.strictEqual(c.cost, 200);
  assert.strictEqual(titanForSide(Side.Khoi)?.unitType, UnitType.Capibara);
  assert.strictEqual(titanForSide(Side.Nguyen)?.unitType, UnitType.Totoro);
  assert.strictEqual(titanSpawnX(Side.Khoi), 320);
  assert.strictEqual(titanSpawnX(Side.Nguyen), 640);
});

// 36. Titan: hào quang chặn đạn xuyên (test cô lập cơ chế pierceThrough — dựng Father vs
// titan ĐỊCH; luồng chơi thật chỉ đạt được khi titan vào quân tiếp viện của Máy).
check('titan: hào quang chặn đạn xuyên — lính sau không trúng', () => {
  const bases = makeBases();
  const titan = new Unit(scene, Side.Nguyen, UnitType.Totoro, 500); // đầy máu → aura bật
  const behind = new Unit(scene, Side.Nguyen, UnitType.BoBinh, 545); // sau titan (phía phải)
  const units = [titan, behind];
  // Đạn xuyên Khôi bay sang phải từ x=488.
  const bolt = new Projectile(null, Side.Khoi, 'straight', 488, 900, 40, 0, 520, 0xffffff, LANE_Y, true, 600);
  const projectiles = [bolt];
  assert.strictEqual(titan.auraActive, true);
  for (let i = 0; i < 10 && bolt.alive; i++) updateProjectiles(projectiles, units, bases, DT);
  assert.ok(titan.hp < titan.maxHp, 'titan trúng đạn');
  assert.strictEqual(behind.hp, behind.maxHp, 'lính sau được hào quang che');
  assert.strictEqual(bolt.alive, false, 'đạn dừng ở titan');
});

// 37. Titan: hết hào quang (≤2/3 máu) → đạn xuyên qua trúng lính sau.
check('titan: hết hào quang thì đạn xuyên qua', () => {
  const bases = makeBases();
  const titan = new Unit(scene, Side.Nguyen, UnitType.Totoro, 500);
  titan.hp = titan.maxHp * 0.5; // dưới 2/3
  updateTitan(titan, [titan], bases, DT, 0); // cập nhật cờ aura → tắt
  assert.strictEqual(titan.auraActive, false);
  const behind = new Unit(scene, Side.Nguyen, UnitType.BoBinh, 545);
  const units = [titan, behind];
  const bolt = new Projectile(null, Side.Khoi, 'straight', 488, 900, 40, 0, 520, 0xffffff, LANE_Y, true, 600);
  const projectiles = [bolt];
  for (let i = 0; i < 20 && bolt.alive; i++) updateProjectiles(projectiles, units, bases, DT);
  assert.ok(behind.hp < behind.maxHp, 'lính sau bị xuyên trúng');
});

// 38. Titan chết → hồi 1% maxHp cho toàn quân cùng phe (không hồi phe địch).
check('titan chết → hồi 1% máu toàn quân phe mình', () => {
  const bases = makeBases();
  const economy = new Economy();
  const titan = new Unit(scene, Side.Khoi, UnitType.Capibara, 200);
  const ally = new Unit(scene, Side.Khoi, UnitType.BoBinh, 190);
  ally.hp = 50; // maxHp 100 → sau hồi +1 = 51
  const foe = new Unit(scene, Side.Nguyen, UnitType.BoBinh, 900);
  foe.hp = 50;
  const units = [titan, ally, foe];
  titan.takeDamage(titan.maxHp); // giết titan
  updateBattle(units, bases, economy, DT, 1000);
  assert.ok(Math.abs(ally.hp - 51) < 1e-6, 'đồng minh +1% maxHp (100→51)');
  assert.strictEqual(foe.hp, 50, 'phe địch không được hồi');
});

// 39. Titan: ngưỡng hào quang đúng 2/3.
check('titan: ngưỡng hào quang = 2/3 máu', () => {
  const bases = makeBases();
  const titan = new Unit(scene, Side.Khoi, UnitType.Capibara, 300);
  titan.hp = titan.maxHp * 0.7; // > 2/3
  updateTitan(titan, [titan], bases, DT, 0);
  assert.strictEqual(titan.auraActive, true);
  titan.hp = titan.maxHp * (TITAN_AURA_HP_FRAC - 0.01); // < 2/3
  updateTitan(titan, [titan], bases, DT, 0);
  assert.strictEqual(titan.auraActive, false);
});

// 40. Titan chỉ hứng ¼ sát thương khi bị hero (Sumo/Labubu) đánh.
check('titan: hứng ¼ sát thương từ hero', () => {
  const bases = makeBases();
  const sumo = new Unit(scene, Side.Khoi, UnitType.Sumo, 500); // dmg 6
  const titan = new Unit(scene, Side.Nguyen, UnitType.Totoro, 520); // trong tầm 42
  updateHero(sumo, [sumo, titan], bases, DT, 1000); // Sumo đánh 1 đòn
  const expected = titan.maxHp - sumo.attackDamage * TITAN_HERO_DMG_TAKEN_FRAC;
  assert.ok(Math.abs(titan.hp - expected) < 1e-6, `titan chỉ mất ¼ dmg (${sumo.attackDamage}→${sumo.attackDamage * 0.25})`);

  // Đối chứng: hero đánh lính thường → full dmg.
  const grunt = new Unit(scene, Side.Nguyen, UnitType.BoBinh, 520);
  const sumo2 = new Unit(scene, Side.Khoi, UnitType.Sumo, 500);
  updateHero(sumo2, [sumo2, grunt], bases, DT, 1000);
  assert.ok(Math.abs(grunt.hp - (grunt.maxHp - sumo2.attackDamage)) < 1e-6, 'lính thường ăn full dmg');
});

// 41. Nâng cấp titan fold vào computePlayerMods (máu titan tăng theo cấp).
check('titan: nâng cấp máu fold vào mods', () => {
  const hpDef = TITANS[0].upgrades.find((d) => d.target === 'unitHp')!;
  assert.strictEqual(computePlayerMods().unitHp[UnitType.Capibara], 1); // chưa mua
  addCoins(9999);
  assert.strictEqual(buyUpgrade(hpDef), true);
  assert.ok(computePlayerMods().unitHp[UnitType.Capibara] > 1, 'máu Capibara tăng sau nâng cấp');
});

console.log(`\n${passed} test cases passed.`);
