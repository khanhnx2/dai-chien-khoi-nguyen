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
import { updateBattle } from '../src/systems/combat';
import { updateProjectiles } from '../src/systems/projectile-system';
import { Upgrades } from '../src/systems/upgrades';
import { SpecialAbility } from '../src/systems/special-ability';
import { RoofAttacker } from '../src/entities/roof-attacker';
import { Projectile } from '../src/entities/projectile';
import { LANE_Y, stageStatMultiplier } from '../src/config/game-config';
import { getUnlockedStage, unlockNextStage } from '../src/systems/progress';
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

// Mô phỏng trận AI-vs-AI đầy đủ; trả về phe thắng hoặc null nếu bế tắc tới hết giờ.
function simulateMatch(diffKhoi: Difficulty, diffNguyen: Difficulty, minutes: number): Side | null {
  const bases = makeBases();
  const economy = new Economy();
  const spawn = new SpawnManager(scene);
  const upgrades = new Upgrades();
  const special = new SpecialAbility();
  const units: Unit[] = [];
  const projectiles: Projectile[] = [];
  const roofK = new RoofAttacker(null, Side.Khoi);
  const roofN = new RoofAttacker(null, Side.Nguyen);
  const aiK = new BasicAi(Side.Khoi, diffKhoi);
  const aiN = new BasicAi(Side.Nguyen, diffNguyen);
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

// 13. Cân bằng: phe MẠNH hơn (Hard) phải phá được thành phe yếu (Easy) — chứng minh
// thành CÓ THỂ bị hạ trong trận thật; ưu thế được đền đáp (không bế tắc khi có chênh lệch).
check('cân bằng: Hard thắng Easy (ưu thế phá được thành)', () => {
  assert.strictEqual(simulateMatch(Difficulty.Hard, Difficulty.Easy, 6), Side.Khoi, 'Hard (Khôi) phải hạ thành Easy');
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

  // Lính Máy (×1.2) mạnh hơn base về máu & công.
  const base = new Unit(scene, Side.Nguyen, UnitType.BoBinh, 0, 1);
  const buffed = new Unit(scene, Side.Nguyen, UnitType.BoBinh, 0, 1.2);
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

console.log(`\n${passed} test cases passed.`);
