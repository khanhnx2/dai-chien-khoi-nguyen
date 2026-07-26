import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BACKGROUND_COLOR } from './config/game-config';
import { BootScene } from './scenes/boot-scene';
import { PreloadScene } from './scenes/preload-scene';
import { MenuScene } from './scenes/menu-scene';
import { BattleScene } from './scenes/battle-scene';
import { ResultScene } from './scenes/result-scene';
import { UpgradeScene } from './scenes/upgrade-scene';
import { HeroScene } from './scenes/hero-scene';
import { TitanShopScene } from './scenes/titan-shop-scene';
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
  scene: [BootScene, PreloadScene, MenuScene, BattleScene, ResultScene, UpgradeScene, HeroScene, TitanShopScene],
});

// PWA: nút Cài đặt / Cập nhật + khoá xoay ngang.
setupPwa();

// iOS: sau khi xoay ngang, Safari cập nhật kích thước cửa sổ TRỄ → Phaser (Scale.FIT)
// đo nhầm và kẹt canvas ở kích thước dọc (chạm lệch, không chơi được). Ép đo lại
// ngay + vài lần sau khi layout ổn định. Android/desktop: refresh dư vô hại.
function refreshScale(): void {
  game.scale.refresh();
}
window.addEventListener('orientationchange', () => {
  refreshScale();
  [50, 200, 500].forEach((ms) => window.setTimeout(refreshScale, ms));
});
window.addEventListener('resize', refreshScale);
window.visualViewport?.addEventListener('resize', refreshScale);

// Dev: expose để debug/kiểm thử thủ công (khi tab ẩn, RAF bị trình duyệt tạm dừng).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
