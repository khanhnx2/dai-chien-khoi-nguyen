import type Phaser from 'phaser';
import { COLORS } from './theme';
import { clayButton } from './ui-kit';

/** Nút mở shop Đại bác (menu chính) — 1 thực thể duy nhất, dùng chung cho cả 2 phe. */
export function buildCannonShopButton(scene: Phaser.Scene): void {
  clayButton(scene, {
    x: 92,
    y: 196,
    width: 150,
    height: 30,
    label: '💣 Đại bác',
    fill: COLORS.slate,
    fontSize: 11,
    onClick: () => scene.scene.start('cannon'),
  });
}
