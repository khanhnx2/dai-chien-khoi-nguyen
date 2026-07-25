import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, Difficulty, FACE_KEY, Side, TOTAL_STAGES } from '../config/game-config';
import { COLORS, FONT, drawGradientBg } from '../ui/theme';
import { avatarFrame, clayButton } from '../ui/ui-kit';

interface ResultData {
  playerWon: boolean;
  winnerSide: Side;
  winnerLabel: string;
  playerSide: Side;
  difficulty: Difficulty;
  stage: number;
}

/** Màn kết quả: thắng/thua + màn hiện tại + nút Màn tiếp (nếu thắng) / Chơi lại / Về menu. */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result');
  }

  create(data: ResultData): void {
    drawGradientBg(this, GAME_WIDTH, GAME_HEIGHT);

    const title = data.playerWon ? 'CHIẾN THẮNG!' : 'THUA CUỘC';
    const color = data.playerWon ? COLORS.textGold : '#f87171';

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.24, title, { fontFamily: FONT, fontSize: '54px', color, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#1a1030', 8)
      .setShadow(0, 5, '#000000', 8, true, true);

    if (data.winnerSide) {
      avatarFrame(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.47, FACE_KEY[data.winnerSide], 96, SIDE_INFO_color(data.winnerSide)).setSelected(true);
    }

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.63, `Màn ${data.stage} — phe ${data.winnerLabel} thắng`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: COLORS.textLight,
      })
      .setOrigin(0.5);

    const hasNext = data.playerWon && data.stage < TOTAL_STAGES;
    const startBattle = (stage: number) =>
      this.scene.start('battle', { playerSide: data.playerSide, difficulty: data.difficulty, stage });

    if (hasNext) {
      clayButton(this, { x: GAME_WIDTH / 2, y: GAME_HEIGHT * 0.76, width: 230, height: 56, label: `Màn ${data.stage + 1}  ▶`, fill: COLORS.green, fontSize: 24, onClick: () => startBattle(data.stage + 1) });
      clayButton(this, { x: GAME_WIDTH * 0.34, y: GAME_HEIGHT * 0.88, width: 170, height: 48, label: 'Chơi lại', fill: COLORS.slate, fontSize: 20, onClick: () => startBattle(data.stage) });
      clayButton(this, { x: GAME_WIDTH * 0.66, y: GAME_HEIGHT * 0.88, width: 170, height: 48, label: 'Về menu', fill: COLORS.slate, fontSize: 20, onClick: () => this.scene.start('menu') });
    } else {
      clayButton(this, { x: GAME_WIDTH * 0.34, y: GAME_HEIGHT * 0.8, width: 180, height: 54, label: 'Chơi lại', fill: COLORS.orange, fontSize: 22, onClick: () => startBattle(data.stage) });
      clayButton(this, { x: GAME_WIDTH * 0.66, y: GAME_HEIGHT * 0.8, width: 180, height: 54, label: 'Về menu', fill: COLORS.slate, fontSize: 22, onClick: () => this.scene.start('menu') });
    }
  }
}

// Màu vòng theo phe (tránh import vòng lặp — lấy từ SIDE_INFO gián tiếp).
function SIDE_INFO_color(side: Side): number {
  return side === Side.Khoi ? COLORS.blue : COLORS.red;
}
