import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BACKGROUND_COLOR } from './config/game-config';
import { BootScene } from './scenes/boot-scene';
import { PreloadScene } from './scenes/preload-scene';
import { MenuScene } from './scenes/menu-scene';
import { BattleScene } from './scenes/battle-scene';
import { ResultScene } from './scenes/result-scene';
import { setupPwa } from './pwa/pwa-setup';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, MenuScene, BattleScene, ResultScene],
});

// PWA: nút Cài đặt / Cập nhật + khoá xoay ngang.
setupPwa();

// Dev: expose để debug/kiểm thử thủ công (khi tab ẩn, RAF bị trình duyệt tạm dừng).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
