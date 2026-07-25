import Phaser from 'phaser';

/** Boot: khởi động tối thiểu rồi chuyển sang Preload. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    this.scene.start('preload');
  }
}
