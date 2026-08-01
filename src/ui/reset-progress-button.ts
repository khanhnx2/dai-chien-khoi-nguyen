import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game-config';
import { resetMetaProgress } from '../systems/meta-upgrades';
import { resetProgress } from '../systems/progress';
import { COLORS } from './theme';
import { clayButton, confirmDialog } from './ui-kit';

/**
 * Nút "Chơi lại từ đầu" (menu chính): xóa toàn bộ xu + nâng cấp + màn đã mở,
 * sau khi người chơi xác nhận (hành động không thể hoàn tác).
 */
export function buildResetProgressButton(scene: Phaser.Scene): void {
  clayButton(scene, {
    x: 92,
    y: 156,
    width: 150,
    height: 30,
    label: '🗑 Chơi lại từ đầu',
    fill: COLORS.slate,
    fontSize: 11,
    onClick: () => {
      confirmDialog(
        scene,
        GAME_WIDTH,
        GAME_HEIGHT,
        'Xóa TOÀN BỘ tiến trình (xu, nâng cấp, màn đã mở)?\nKhông thể hoàn tác.',
        () => {
          resetProgress();
          resetMetaProgress();
          scene.scene.start('menu');
        },
      );
    },
  });
}
