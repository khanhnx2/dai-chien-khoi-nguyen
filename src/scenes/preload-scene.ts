import Phaser from 'phaser';
import { BAMBOO_FACE_KEY, CAPIBARA_FACE_KEY, FACE_KEY, FATHER_FACE_KEY, LABUBU_FACE_KEY, SUMO_FACE_KEY, Side, TOTORO_FACE_KEY } from '../config/game-config';
import khoiFaceUrl from '../../assets/characters/player-khoi-cutout.png';
import nguyenFaceUrl from '../../assets/characters/player-nguyen-cutout.png';
import fatherFaceUrl from '../../assets/characters/player-father-cutout.png';
import sumoUrl from '../../assets/characters/sumo-cutout.png';
import labubuUrl from '../../assets/characters/labubu-cutout.png';
import capibaraUrl from '../../assets/characters/capibara-cutout.png';
import totoroUrl from '../../assets/characters/totoro-cutout.png';
import bambooUrl from '../../assets/characters/bamboo-cutout.png';

/**
 * Preload: nạp avatar (đã tách nền). Import qua Vite để URL đúng base path trên
 * GitHub Pages. Hiện loading bar rồi vào Menu.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload(): void {
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2, height / 2, 4, 20, 0xffffff).setOrigin(0.5);
    this.load.on('progress', (p: number) => (bar.width = 300 * p));
    this.load.on('complete', () => bar.destroy());

    this.load.image(FACE_KEY[Side.Khoi], khoiFaceUrl);
    this.load.image(FACE_KEY[Side.Nguyen], nguyenFaceUrl);
    this.load.image(FATHER_FACE_KEY, fatherFaceUrl);
    this.load.image(SUMO_FACE_KEY, sumoUrl);
    this.load.image(LABUBU_FACE_KEY, labubuUrl);
    this.load.image(CAPIBARA_FACE_KEY, capibaraUrl);
    this.load.image(TOTORO_FACE_KEY, totoroUrl);
    this.load.image(BAMBOO_FACE_KEY, bambooUrl);
  }

  create(): void {
    // Chờ font Baloo 2 nạp xong rồi mới vẽ menu (canvas cần font sẵn sàng), có timeout an toàn.
    const go = () => this.scene.start('menu');
    const fonts = (document as unknown as { fonts?: { load: (f: string) => Promise<unknown> } }).fonts;
    if (fonts?.load) {
      Promise.race([
        Promise.all([fonts.load("700 40px 'Baloo 2'"), fonts.load("600 20px 'Baloo 2'")]),
        new Promise((r) => setTimeout(r, 2500)),
      ]).then(go, go);
    } else {
      go();
    }
  }
}
