// Bảng màu + font dùng chung cho giao diện (phong cách Claymorphism — chunky, tròn, vui).
import Phaser from 'phaser';

/** Font vui nhộn (Baloo 2, nạp qua Google Fonts ở index.html). */
export const FONT = "'Baloo 2', system-ui, sans-serif";

export const COLORS = {
  bgTop: 0x2a2150,
  bgBottom: 0x120f26,
  panel: 0x272044,
  panelBorder: 0x4c3f80,
  blue: 0x3b82f6, // Khôi / primary
  red: 0xef4444, // Nguyên
  orange: 0xf97316, // CTA phụ
  green: 0x22c55e, // Bắt đầu
  gold: 0xfbbf24,
  slate: 0x475569,
  textLight: '#ffffff',
  textMuted: '#b9c0e0',
  textGold: '#fde047',
};

export function darken(color: number, amount = 0.35): number {
  return Phaser.Display.Color.IntegerToColor(color).darken(amount * 100).color;
}
export function lighten(color: number, amount = 0.25): number {
  return Phaser.Display.Color.IntegerToColor(color).lighten(amount * 100).color;
}

/** Vẽ nền gradient dọc (trên → dưới) phủ toàn màn. */
export function drawGradientBg(scene: Phaser.Scene, w: number, h: number): void {
  const g = scene.add.graphics();
  g.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
  g.fillRect(0, 0, w, h);
  // vài đốm sáng mờ trang trí
  g.fillStyle(0xffffff, 0.03);
  g.fillCircle(w * 0.2, h * 0.25, 120);
  g.fillCircle(w * 0.85, h * 0.7, 160);
}
