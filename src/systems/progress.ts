import { Difficulty, Side, TOTAL_STAGES } from '../config/game-config';

// Lưu tiến trình 6 chiến dịch riêng (2 phe × 3 mức khó): màn cao nhất đã MỞ.
// Khóa: `${side}:${difficulty}`. Lưu chung 1 JSON trong localStorage; nếu môi
// trường không có localStorage (test/ẩn danh) thì fallback bộ nhớ tạm.

const STORAGE_KEY = 'dckn-progress';
const LAST_KEY = 'dckn-last';

type ProgressMap = Record<string, number>;

const memoryFallback: ProgressMap = {};

function key(side: Side, difficulty: Difficulty): string {
  return `${side}:${difficulty}`;
}

function load(): ProgressMap {
  try {
    if (typeof localStorage === 'undefined') return memoryFallback;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return memoryFallback;
  }
}

function save(map: ProgressMap): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* bỏ qua: chế độ ẩn danh / storage đầy */
  }
}

/** Lưu lựa chọn cuối (phe + mức khó) để khôi phục khi quay lại menu. */
export function saveLastSelection(side: Side, difficulty: Difficulty): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LAST_KEY, JSON.stringify({ side, difficulty }));
  } catch {
    /* bỏ qua */
  }
}

/** Đọc lựa chọn cuối; null nếu chưa có / không hợp lệ. */
export function getLastSelection(): { side: Side; difficulty: Difficulty } | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { side?: string; difficulty?: string };
    const side = Object.values(Side).find((s) => s === p.side);
    const difficulty = Object.values(Difficulty).find((d) => d === p.difficulty);
    return side && difficulty ? { side, difficulty } : null;
  } catch {
    return null;
  }
}

/** Xóa toàn bộ tiến trình chiến dịch (màn đã mở + lựa chọn cuối) — dùng cho "Chơi lại từ đầu". */
export function resetProgress(): void {
  for (const k of Object.keys(memoryFallback)) delete memoryFallback[k];
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_KEY);
  } catch {
    /* bỏ qua */
  }
}

/** Màn cao nhất đã mở của 1 chiến dịch (phe+mức khó); tối thiểu 1. */
export function getUnlockedStage(side: Side, difficulty: Difficulty): number {
  const map = load();
  const n = map[key(side, difficulty)] ?? 1;
  return Math.max(1, Math.min(TOTAL_STAGES, n));
}

/**
 * Thắng `stage` → mở màn kế của ĐÚNG chiến dịch đó (nếu stage đang là mốc cao
 * nhất và chưa tới màn cuối). Trả về màn đã mở mới.
 */
export function unlockNextStage(side: Side, difficulty: Difficulty, stage: number): number {
  const map = load();
  const k = key(side, difficulty);
  const current = map[k] ?? 1;
  if (stage >= current && stage < TOTAL_STAGES) {
    map[k] = stage + 1;
    memoryFallback[k] = stage + 1;
    save(map);
  }
  return map[k] ?? current;
}
