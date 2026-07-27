import type Phaser from 'phaser';

/**
 * Số sát thương bay lên rồi mờ dần khi 1 mục tiêu (lính/thành) trúng đòn.
 * Thuần hình ảnh, tự huỷ. Dùng chung cho Unit & Base (DRY).
 */
export function showDamagePopup(scene: Phaser.Scene, x: number, y: number, amount: number): void {
  const dmg = Math.round(amount);
  if (dmg <= 0) return;
  const text = scene.add
    .text(x, y, `-${dmg}`, { fontSize: '14px', color: '#fca5a5', fontStyle: 'bold', stroke: '#7f1d1d', strokeThickness: 3 })
    .setOrigin(0.5)
    .setDepth(900);
  scene.tweens.add({
    targets: text,
    y: y - 24,
    alpha: { from: 1, to: 0 },
    duration: 600,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}
