import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  DIFFICULTIES,
  Difficulty,
  FACE_KEY,
  Side,
  SIDE_INFO,
  TOTAL_STAGES,
} from '../config/game-config';
import { getLastSelection, getUnlockedStage } from '../systems/progress';
import { getCoins } from '../systems/meta-upgrades';
import { COLORS, FONT, drawGradientBg } from '../ui/theme';
import { avatarFrame, clayButton, type AvatarFrame, type ClayButton } from '../ui/ui-kit';
import { sound } from '../audio/sound-manager';

/** Menu: chọn mức khó + phe + màn (chiến dịch 50 màn riêng cho mỗi phe×mức) → Bắt đầu. */
export class MenuScene extends Phaser.Scene {
  private side = Side.Khoi;
  private difficulty = Difficulty.Normal;
  private stage = 1;

  private diffButtons = new Map<Difficulty, ClayButton>();
  private avatars = new Map<Side, AvatarFrame>();
  private stageLabel!: Phaser.GameObjects.Text;
  private unlockedLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('menu');
  }

  create(): void {
    // Khôi phục phe + mức khó lần chọn cuối; màn luôn nhảy tới màn cao nhất đã mở.
    const last = getLastSelection();
    this.side = last?.side ?? Side.Khoi;
    this.difficulty = last?.difficulty ?? Difficulty.Normal;
    this.stage = getUnlockedStage(this.side, this.difficulty);
    this.diffButtons.clear();
    this.avatars.clear();

    drawGradientBg(this, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.11, 'ĐẠI CHIẾN KHÔI NGUYÊN', {
        fontFamily: FONT,
        fontSize: '46px',
        color: COLORS.textLight,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#1a1030', 8)
      .setShadow(0, 5, '#000000', 8, true, true);

    // Xu (góc phải trên) + nút Nâng cấp (góc trái trên).
    this.add
      .text(GAME_WIDTH - 16, 14, `Xu: ${getCoins()} 🪙`, { fontFamily: FONT, fontSize: '20px', color: COLORS.textGold, fontStyle: 'bold' })
      .setOrigin(1, 0);
    clayButton(this, {
      x: 92,
      y: 30,
      width: 150,
      height: 44,
      label: '⚙ Nâng cấp',
      fill: COLORS.orange,
      fontSize: 17,
      onClick: () => this.scene.start('upgrade'),
    });

    this.buildDifficultyRow();
    this.buildSideRow();
    this.buildStageStepper();

    clayButton(this, {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT * 0.88,
      width: 260,
      height: 62,
      label: '▶  BẮT ĐẦU',
      fill: COLORS.green,
      fontSize: 28,
      onClick: () => this.scene.start('battle', { playerSide: this.side, difficulty: this.difficulty, stage: this.stage }),
    });

    this.refresh();

    // Nhạc nền bắt đầu ngay khi người chơi chạm lần đầu (chính sách audio của trình duyệt).
    this.input.once('pointerdown', () => sound.startMusic());
  }

  private buildDifficultyRow(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.22, 'MỨC KHÓ', { fontFamily: FONT, fontSize: '16px', color: COLORS.textMuted })
      .setOrigin(0.5);
    const diffs = [Difficulty.Easy, Difficulty.Normal, Difficulty.Hard];
    diffs.forEach((d, i) => {
      const btn = clayButton(this, {
        x: GAME_WIDTH * (0.33 + i * 0.17),
        y: GAME_HEIGHT * 0.31,
        width: 110,
        height: 48,
        label: DIFFICULTIES[d].label,
        fill: COLORS.slate,
        fontSize: 20,
        onClick: () => {
          this.difficulty = d;
          this.stage = getUnlockedStage(this.side, d); // nhảy tới màn cuối của campaign này
          this.refresh();
        },
      });
      this.diffButtons.set(d, btn);
    });
  }

  private buildSideRow(): void {
    const positions: Record<Side, number> = { [Side.Khoi]: 0.33, [Side.Nguyen]: 0.67 };
    for (const side of [Side.Khoi, Side.Nguyen]) {
      const x = GAME_WIDTH * positions[side];
      const y = GAME_HEIGHT * 0.51;
      const af = avatarFrame(this, x, y, FACE_KEY[side], 84, SIDE_INFO[side].color);
      af.container.setSize(112, 112);
      af.container.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-56, -56, 112, 112),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      af.container.on('pointerup', () => {
        this.side = side;
        this.stage = getUnlockedStage(side, this.difficulty); // nhảy tới màn cuối của campaign này
        this.refresh();
      });
      this.avatars.set(side, af);
      this.add
        .text(x, y + 62, SIDE_INFO[side].label, {
          fontFamily: FONT,
          fontSize: '22px',
          color: COLORS.textLight,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.add
        .text(x, y + 84, SIDE_INFO[side].sign, { fontFamily: FONT, fontSize: '12px', color: COLORS.textMuted })
        .setOrigin(0.5);
    }
  }

  private buildStageStepper(): void {
    const y = GAME_HEIGHT * 0.71;
    clayButton(this, { x: GAME_WIDTH * 0.38, y, width: 50, height: 46, label: '◀', fill: COLORS.blue, fontSize: 24, onClick: () => this.changeStage(-1) });
    clayButton(this, { x: GAME_WIDTH * 0.62, y, width: 50, height: 46, label: '▶', fill: COLORS.blue, fontSize: 24, onClick: () => this.changeStage(1) });
    this.stageLabel = this.add
      .text(GAME_WIDTH / 2, y, '', { fontFamily: FONT, fontSize: '26px', color: COLORS.textGold, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.unlockedLabel = this.add
      .text(GAME_WIDTH / 2, y + 30, '', { fontFamily: FONT, fontSize: '13px', color: COLORS.textMuted })
      .setOrigin(0.5);
  }

  private changeStage(delta: number): void {
    const unlocked = getUnlockedStage(this.side, this.difficulty);
    this.stage = Math.max(1, Math.min(unlocked, this.stage + delta));
    this.refresh();
  }

  private refresh(): void {
    for (const [d, btn] of this.diffButtons) btn.setFill(d === this.difficulty ? COLORS.blue : COLORS.slate);
    for (const [s, af] of this.avatars) af.setSelected(s === this.side);

    const unlocked = getUnlockedStage(this.side, this.difficulty);
    if (this.stage > unlocked) this.stage = unlocked;
    this.stageLabel.setText(`Màn ${this.stage} / ${TOTAL_STAGES}`);
    this.unlockedLabel.setText(
      `${SIDE_INFO[this.side].label} · ${DIFFICULTIES[this.difficulty].label} — đã mở tới màn ${unlocked}`,
    );
  }
}
