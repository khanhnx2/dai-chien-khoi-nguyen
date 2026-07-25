import Phaser from 'phaser';
import {
  GAME_WIDTH,
  LANE_Y,
  Difficulty,
  Side,
  SIDE_INFO,
  UnitType,
  UpgradeType,
  enemyOf,
  statMultipliersFor,
} from '../config/game-config';
import { Base } from '../entities/base';
import type { Unit } from '../entities/unit';
import type { Projectile } from '../entities/projectile';
import { RoofAttacker } from '../entities/roof-attacker';
import { Economy } from '../systems/economy';
import { SpawnManager } from '../systems/spawn';
import { updateBattle } from '../systems/combat';
import { updateProjectiles } from '../systems/projectile-system';
import { Upgrades } from '../systems/upgrades';
import { SpecialAbility } from '../systems/special-ability';
import { BasicAi } from '../ai/basic-ai';
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
    this.gameOver = false;
  }

  create(): void {
    sound.startMusic(); // nhạc nền (idempotent — loop xuyên suốt)
    this.add.rectangle(GAME_WIDTH / 2, LANE_Y + 40, GAME_WIDTH, 120, 0x3a2e1f);

    // Hệ số máu&công: người chơi giữ base (×1), Máy nhân theo mức khó × màn.
    const statMods = statMultipliersFor(this.playerSide, this.difficulty, this.stage);

    // Nhãn màn hiện tại.
    this.add.text(GAME_WIDTH / 2, 14, `Màn ${this.stage}`, { fontSize: '18px', color: '#fde047' }).setOrigin(0.5, 0);

    this.bases = {
      [Side.Khoi]: new Base(this, Side.Khoi, statMods[Side.Khoi]),
      [Side.Nguyen]: new Base(this, Side.Nguyen, statMods[Side.Nguyen]),
    };
    this.roofs = {
      [Side.Khoi]: new RoofAttacker(this, Side.Khoi, statMods[Side.Khoi]),
      [Side.Nguyen]: new RoofAttacker(this, Side.Nguyen, statMods[Side.Nguyen]),
    };
    this.economy = new Economy();
    this.spawn = new SpawnManager(this, statMods);
    this.upgrades = new Upgrades();
    this.special = new SpecialAbility(statMods);
    this.ai = new BasicAi(this.aiSide, this.difficulty);
    this.hud = new BattleHud(this, this.playerSide, {
      onSpawn: (type) => this.onPlayerSpawn(type),
      onSpecial: () => this.onPlayerSpecial(),
    });
    this.upgradePanel = new UpgradePanel(this, this.playerSide, (type) => this.onPlayerUpgrade(type));
  }

  private onPlayerSpawn(type: UnitType): void {
    if (this.gameOver) return;
    const result = this.spawn.trySpawn(this.playerSide, type, this.economy, this.units, this.time.now);
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
      units: this.units,
      projectiles: this.projectiles,
      economy: this.economy,
      spawn: this.spawn,
      upgrades: this.upgrades,
      special: this.special,
      bases: this.bases,
      scene: this,
    });
    updateBattle(this.units, this.bases, this.economy, dt, time, this.projectiles, this);
    this.roofs[Side.Khoi].update(time, this.units, this.projectiles, this.upgrades);
    this.roofs[Side.Nguyen].update(time, this.units, this.projectiles, this.upgrades);
    updateProjectiles(this.projectiles, this.units, this.bases, dt);
    this.hud.update(time, this.economy, this.spawn, this.special);
    this.upgradePanel.update(this.economy, this.upgrades);

    if (this.bases[this.aiSide].isDead()) this.endGame(true);
    else if (this.bases[this.playerSide].isDead()) this.endGame(false);
  }

  private endGame(playerWon: boolean): void {
    this.gameOver = true;
    sound.play(playerWon ? 'win' : 'lose');
    for (const u of this.units) u.destroy();
    for (const p of this.projectiles) p.kill();
    this.units = [];
    this.projectiles = [];

    // Thắng → mở màn kế của ĐÚNG chiến dịch (phe + mức khó) này.
    if (playerWon) unlockNextStage(this.playerSide, this.difficulty, this.stage);

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
