import Phaser from 'phaser';
import { COLORS, FONT, darken, lighten } from './theme';

/** Popup xác nhận full-màn (che nền + hộp thoại + 2 nút) cho hành động không thể hoàn tác. */
export function confirmDialog(
  scene: Phaser.Scene,
  gameWidth: number,
  gameHeight: number,
  message: string,
  onConfirm: () => void,
): void {
  const layer = scene.add.container(0, 0).setDepth(2000);
  const overlay = scene.add
    .rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x000000, 0.6)
    .setInteractive(); // chặn click xuyên qua nền
  const boxW = Math.min(420, gameWidth - 40);
  const box = scene.add.graphics();
  box.fillStyle(COLORS.panel, 1);
  box.lineStyle(3, COLORS.panelBorder, 1);
  box.fillRoundedRect(gameWidth / 2 - boxW / 2, gameHeight / 2 - 90, boxW, 180, 16);
  box.strokeRoundedRect(gameWidth / 2 - boxW / 2, gameHeight / 2 - 90, boxW, 180, 16);
  const text = scene.add
    .text(gameWidth / 2, gameHeight / 2 - 50, message, { fontFamily: FONT, fontSize: '16px', color: COLORS.textLight, align: 'center', wordWrap: { width: boxW - 40 } })
    .setOrigin(0.5, 0);
  layer.add([overlay, box, text]);

  const close = () => layer.destroy();
  const cancelBtn = clayButton(scene, {
    x: gameWidth / 2 - 90, y: gameHeight / 2 + 55, width: 150, height: 46,
    label: 'Hủy', fill: COLORS.slate, fontSize: 16, onClick: close,
  });
  const confirmBtn = clayButton(scene, {
    x: gameWidth / 2 + 90, y: gameHeight / 2 + 55, width: 150, height: 46,
    label: 'Xác nhận', fill: COLORS.orange, fontSize: 16,
    onClick: () => {
      close();
      onConfirm();
    },
  });
  layer.add([cancelBtn.container, confirmBtn.container]);
}

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
  let hovered = false;

  const draw = (pressed: boolean) => {
    const dy = pressed ? 5 : 0;
    // Hover = sáng màu (KHÔNG đổi kích thước/bounds → tránh nhảy mép, dễ bấm).
    const bodyFill = hovered && enabled ? lighten(fill, 0.15) : fill;
    lip.clear();
    lip.fillStyle(darken(fill, 0.5), 1);
    lip.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
    body.clear();
    body.fillStyle(bodyFill, 1);
    body.lineStyle(3, lighten(fill, 0.35), 1);
    body.fillRoundedRect(-w / 2, -h / 2 + dy, w, h, r);
    body.strokeRoundedRect(-w / 2, -h / 2 + dy, w, h, r);
    label.y = dy;
  };
  draw(false);

  // Vùng bấm = 1 Rectangle interactive TRONG SUỐT (đặt trên cùng). Cách này hit-test
  // bằng hình học của chính nó — bền hơn hẳn custom hitArea trên container.
  const pad = 12;
  const hit = scene.add
    .rectangle(0, 0, w + pad * 2, h + 6 + pad * 2, 0xffffff, 0)
    .setInteractive({ useHandCursor: true });
  container.add(hit);
  hit.on('pointerover', () => {
    hovered = true;
    draw(false);
  });
  hit.on('pointerout', () => {
    hovered = false;
    draw(false);
  });
  hit.on('pointerdown', () => enabled && draw(true));
  hit.on('pointerup', () => {
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
  onClick?: () => void,
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

  // Vùng bấm interactive trong suốt (nếu có onClick).
  if (onClick) {
    const hit = scene.add
      .rectangle(0, 0, size + 24, size + 24, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerup', () => onClick());
  }

  return {
    container,
    setSelected: (on) => {
      draw(on);
      container.setAlpha(on ? 1 : 0.55);
    },
  };
}
