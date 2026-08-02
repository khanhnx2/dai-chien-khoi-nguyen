import Phaser from 'phaser';
import {
  GAME_WIDTH,
  LANE_Y,
  DIFFICULTIES,
  Difficulty,
  SideMods,
  Side,
  SIDE_INFO,
  UnitType,
  UpgradeType,
  ZOMBIE_PUDDLE_COUNT,
  coinsEarned,
  enemyOf,
  heroForSide,
  stageStatMultiplier,
  uniformSideMods,
} from '../config/game-config';
import type { Sfx } from '../audio/sound-manager';
import { addCoins, computePlayerMods } from '../systems/meta-upgrades';
import { Base } from '../entities/base';
import type { Unit } from '../entities/unit';
import type { Projectile } from '../entities/projectile';
import { RoofAttacker } from '../entities/roof-attacker';
import { Cannon } from '../entities/cannon';
import { usableCannon } from '../systems/cannon-shop';
import { Economy } from '../systems/economy';
import { SpawnManager } from '../systems/spawn';
import { updateBattle } from '../systems/combat';
import { updateProjectiles } from '../systems/projectile-system';
import { Upgrades } from '../systems/upgrades';
import { SpecialAbility } from '../systems/special-ability';
import { BasicAi } from '../ai/basic-ai';
import { ReinforcementManager } from '../systems/reinforcements';
import { ZombieDropManager } from '../systems/zombie-drop';
import { PoisonPuddleManager } from '../systems/poison-puddles';
import { BattleHud } from '../ui/battle-hud';
import { UpgradePanel } from '../ui/upgrade-panel';
import { sound } from '../audio/sound-manager';
import { saveLastSelection, unlockNextStage } from '../systems/progress';

interface BattleData {
  playerSide: Side;
  difficulty: Difficulty;
  stage: number;
}

/** Màn chơi chính: 2 thành, đẻ lính, combat, nóc thành bắn, kỹ năng, nâng cấp, AI, thắng/thua. */
export class BattleScene extends Phaser.Scene {
  private playerSide = Side.Khoi;
  private aiSide = Side.Nguyen;
  private difficulty = Difficulty.Normal;
  private stage = 1;

  private units: Unit[] = [];
  private projectiles: Projectile[] = [];
  private bases!: Record<Side, Base>;
  private roofs!: Record<Side, RoofAttacker>;
  private economy!: Economy;
  private spawn!: SpawnManager;
  private upgrades!: Upgrades;
  private special!: SpecialAbility;
  private ai!: BasicAi;
  private reinforcements!: ReinforcementManager;
  private zombieDrops!: ZombieDropManager;
  private poisonPuddles!: PoisonPuddleManager;
  private cannon?: Cannon;
  private hud!: BattleHud;
  private upgradePanel!: UpgradePanel;
  private gameOver = false;

  constructor() {
    super('battle');
  }

  init(data: BattleData): void {
    this.playerSide = data.playerSide ?? Side.Khoi;
    this.aiSide = enemyOf(this.playerSide);
    this.difficulty = data.difficulty ?? Difficulty.Normal;
    this.stage = data.stage ?? 1;
    saveLastSelection(this.playerSide, this.difficulty); // nhớ lựa chọn cuối cho menu
    this.units = [];
    this.projectiles = [];
    this.cannon = undefined;
    this.gameOver = false;
  }

  create(): void {
    sound.startMusic(); // nhạc nền (idempotent — loop xuyên suốt)
    this.add.rectangle(GAME_WIDTH / 2, LANE_Y + 40, GAME_WIDTH, 120, 0x3a2e1f);

    // Người chơi: chỉ số theo nâng cấp vĩnh viễn. Máy: nhân đều theo mức khó × màn.
    const aiMult = DIFFICULTIES[this.difficulty].statMultiplier * stageStatMultiplier(this.stage);
    const playerMods = computePlayerMods();
    const aiMods = uniformSideMods(aiMult);
    const mods: Record<Side, SideMods> =
      this.playerSide === Side.Khoi
        ? { [Side.Khoi]: playerMods, [Side.Nguyen]: aiMods }
        : { [Side.Khoi]: aiMods, [Side.Nguyen]: playerMods };

    // Nhãn màn hiện tại.
    this.add.text(GAME_WIDTH / 2, 14, `Màn ${this.stage}`, { fontSize: '18px', color: '#fde047' }).setOrigin(0.5, 0);

    this.bases = {
      [Side.Khoi]: new Base(this, Side.Khoi, mods[Side.Khoi].baseHp),
      [Side.Nguyen]: new Base(this, Side.Nguyen, mods[Side.Nguyen].baseHp),
    };
    this.roofs = {
      [Side.Khoi]: new RoofAttacker(this, Side.Khoi, mods[Side.Khoi].roofDmg, mods[Side.Khoi].roofCd),
      [Side.Nguyen]: new RoofAttacker(this, Side.Nguyen, mods[Side.Nguyen].roofDmg, mods[Side.Nguyen].roofCd),
    };
    // Đại bác: chỉ phe người chơi, cần đã mở khoá (xu) VÀ màn ≥ CANNON_MIN_STAGE.
    if (usableCannon(this.stage)) {
      const m = mods[this.playerSide];
      this.cannon = new Cannon(this, this.playerSide, m.cannonDmg, m.cannonCd);
    }
    this.economy = new Economy({ [Side.Khoi]: mods[Side.Khoi].income, [Side.Nguyen]: mods[Side.Nguyen].income });
    this.spawn = new SpawnManager(this, mods);
    this.upgrades = new Upgrades();
    this.special = new SpecialAbility({ [Side.Khoi]: mods[Side.Khoi].roofDmg, [Side.Nguyen]: mods[Side.Nguyen].roofDmg });
    this.ai = new BasicAi(this.aiSide, this.difficulty);
    this.reinforcements = new ReinforcementManager();
    this.zombieDrops = new ZombieDropManager();
    this.poisonPuddles = new PoisonPuddleManager(this, this.playerSide);
    this.hud = new BattleHud(this, this.playerSide, mods, {
      onSpawn: (type) => this.onPlayerSpawn(type),
      onSpawnTitan: (type) => this.onPlayerSpawnTitan(type),
      onSpecial: () => this.onPlayerSpecial(),
    });
    this.upgradePanel = new UpgradePanel(this, this.playerSide, (type) => this.onPlayerUpgrade(type));
  }

  private onPlayerSpawn(type: UnitType): void {
    if (this.gameOver) return;
    const result = this.spawn.trySpawn(this.playerSide, type, this.economy, this.units, this.time.now);
    if ('unit' in result) sound.play('spawn');
  }

  private onPlayerSpawnTitan(type: UnitType): void {
    if (this.gameOver) return;
    const result = this.spawn.trySpawnTitan(this.playerSide, type, this.economy, this.units, this.time.now);
    if ('unit' in result) sound.play('spawn');
  }

  private onPlayerSpecial(): void {
    if (this.gameOver) return;
    if (this.special.trigger(this.playerSide, this.time.now, this, this.units, this.projectiles)) {
      sound.play('special');
    }
  }

  private onPlayerUpgrade(type: UpgradeType): void {
    if (this.gameOver) return;
    this.upgrades.tryBuy(this.playerSide, type, this.economy, this.bases[this.playerSide]);
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;
    const dt = delta / 1000;

    this.economy.update(dt);
    this.ai.update({
      now: time,
      stage: this.stage,
      units: this.units,
      projectiles: this.projectiles,
      economy: this.economy,
      spawn: this.spawn,
      upgrades: this.upgrades,
      special: this.special,
      bases: this.bases,
      scene: this,
    });
    updateBattle(this.units, this.bases, this.economy, dt, time, this.projectiles, this, (damage) =>
      this.poisonPuddles.spawnBurst(ZOMBIE_PUDDLE_COUNT, damage, GAME_WIDTH, time),
    );
    this.poisonPuddles.update(this.units, time);
    // Quân tiếp viện cho Máy (sau combat để dùng máu thành mới nhất của frame này).
    // Bỏ qua nếu thành Máy vừa bị hạ trong frame này (tránh toast trên màn sắp kết thúc).
    if (
      !this.bases[this.aiSide].isDead() &&
      this.reinforcements.update(this.stage, this.aiSide, this.bases, this.spawn, this.units)
    ) {
      sound.play((heroForSide(this.aiSide)?.sfx as Sfx) ?? 'spawn');
      this.showToast('⚔️ QUÂN TIẾP VIỆN!', '#ef4444');
    }
    // Zombie đổ bộ cứu Máy (hệ thống độc lập, 1 lần/trận) — chỉ toast lúc kích hoạt, không lặp mỗi đợt rơi.
    if (!this.bases[this.aiSide].isDead()) {
      const zResult = this.zombieDrops.update(this.stage, this.aiSide, this.bases, this.spawn, this.units, time);
      if (zResult === 'start') {
        sound.play('spawn');
        this.showToast('🧟 ZOMBIE ĐỔ BỘ!', '#84cc16');
      }
    }
    this.roofs[Side.Khoi].update(time, this.units, this.projectiles, this.upgrades);
    this.roofs[Side.Nguyen].update(time, this.units, this.projectiles, this.upgrades);
    this.cannon?.update(time, this.units, this.projectiles);
    updateProjectiles(this.projectiles, this.units, this.bases, dt);
    this.hud.update(time, this.economy, this.spawn, this.special);
    this.upgradePanel.update(this.economy, this.upgrades);

    if (this.bases[this.aiSide].isDead()) this.endGame(true);
    else if (this.bases[this.playerSide].isDead()) this.endGame(false);
  }

  /** Toast giữa màn (tiếp viện/zombie...) — tự mờ dần rồi biến mất. */
  private showToast(text: string, color: string): void {
    const toast = this.add
      .text(GAME_WIDTH / 2, LANE_Y - 140, text, {
        fontSize: '30px',
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(1000);
    this.tweens.add({
      targets: toast,
      alpha: { from: 1, to: 0 },
      y: toast.y - 40,
      scale: { from: 1.2, to: 1 },
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  private endGame(playerWon: boolean): void {
    this.gameOver = true;
    sound.play(playerWon ? 'win' : 'lose');
    for (const u of this.units) u.destroy();
    for (const p of this.projectiles) p.kill();
    this.units = [];
    this.projectiles = [];
    this.poisonPuddles.destroyAll();

    // Thắng → mở màn kế của ĐÚNG chiến dịch (phe + mức khó) này.
    if (playerWon) unlockNextStage(this.playerSide, this.difficulty, this.stage);
    // Thưởng xu để nâng cấp vĩnh viễn.
    addCoins(coinsEarned(playerWon, this.stage));

    const winnerSide = playerWon ? this.playerSide : this.aiSide;
    this.scene.start('result', {
      playerWon,
      winnerSide,
      winnerLabel: SIDE_INFO[winnerSide].label,
      playerSide: this.playerSide,
      difficulty: this.difficulty,
      stage: this.stage,
    });
  }
}
