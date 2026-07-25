import Phaser from 'phaser';
import { COLORS, FONT, darken, lighten } from './theme';

export interface ClayButtonOpts {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  fill: number;
  labelColor?: string;
  fontSize?: number;
  radius?: number;
  onClick?: () => void;
}

/** Nút phong cách Claymorphism: thân bo tròn + "gờ" đổ bóng dưới + viền sáng, nhún khi bấm. */
export interface ClayButton {
  container: Phaser.GameObjects.Container;
  setFill: (fill: number) => void;
  setLabel: (label: string) => void;
  setEnabled: (enabled: boolean) => void;
}

export function clayButton(scene: Phaser.Scene, o: ClayButtonOpts): ClayButton {
  const w = o.width;
  const h = o.height;
  const r = o.radius ?? 16;
  const fontSize = o.fontSize ?? 20;
  const lip = scene.add.graphics();
  const body = scene.add.graphics();
  const label = scene.add
    .text(0, 0, o.label, { fontFamily: FONT, fontSize: `${fontSize}px`, color: o.labelColor ?? COLORS.textLight, fontStyle: 'bold', align: 'center' })
    .setOrigin(0.5);
  const container = scene.add.container(o.x, o.y, [lip, body, label]);

  let fill = o.fill;
  let enabled = true;

  const draw = (pressed: boolean) => {
    const dy = pressed ? 5 : 0;
    lip.clear();
    lip.fillStyle(darken(fill, 0.5), 1);
    lip.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
    body.clear();
    body.fillStyle(fill, 1);
    body.lineStyle(3, lighten(fill, 0.3), 1);
    body.fillRoundedRect(-w / 2, -h / 2 + dy, w, h, r);
    body.strokeRoundedRect(-w / 2, -h / 2 + dy, w, h, r);
    label.y = dy;
  };
  draw(false);

  container.setSize(w, h + 6);
  container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h + 6), Phaser.Geom.Rectangle.Contains);
  if (container.input) container.input.cursor = 'pointer';
  container.on('pointerover', () => enabled && scene.tweens.add({ targets: container, scale: 1.04, duration: 120 }));
  container.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 120 });
    draw(false);
  });
  container.on('pointerdown', () => enabled && draw(true));
  container.on('pointerup', () => {
    if (!enabled) return;
    draw(false);
    o.onClick?.();
  });

  return {
    container,
    setFill: (f) => {
      fill = f;
      draw(false);
    },
    setLabel: (t) => label.setText(t),
    setEnabled: (e) => {
      enabled = e;
      container.setAlpha(e ? 1 : 0.5);
    },
  };
}

/** Khung avatar tròn: vòng màu phe + ảnh mặt, có thể làm nổi bật khi được chọn. */
export interface AvatarFrame {
  container: Phaser.GameObjects.Container;
  setSelected: (on: boolean) => void;
}

export function avatarFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  textureKey: string,
  size: number,
  ringColor: number,
): AvatarFrame {
  const ring = scene.add.graphics();
  const img = scene.add.image(0, 0, textureKey).setDisplaySize(size, size);
  const container = scene.add.container(x, y, [ring, img]);

  const draw = (selected: boolean) => {
    ring.clear();
    ring.fillStyle(darken(ringColor, 0.3), 1);
    ring.fillCircle(0, 0, size / 2 + (selected ? 8 : 5));
    ring.lineStyle(selected ? 4 : 2, lighten(ringColor, 0.3), 1);
    ring.strokeCircle(0, 0, size / 2 + (selected ? 8 : 5));
  };
  draw(false);

  return {
    container,
    setSelected: (on) => {
      draw(on);
      container.setAlpha(on ? 1 : 0.55);
      scene.tweens.add({ targets: container, scale: on ? 1.06 : 1, duration: 150 });
    },
  };
}
