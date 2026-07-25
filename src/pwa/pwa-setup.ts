import { registerSW } from 'virtual:pwa-register';

// Sự kiện cài PWA (Android/Chrome) — chưa có trong lib DOM chuẩn.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CHECK_INTERVAL_MS = 60_000; // định kỳ hỏi SW xem có bản deploy mới không

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isMobile(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Nút Cập nhật: hiện khi service worker phát hiện bản deploy mới. */
function setupUpdateButton(): void {
  const btn = el<HTMLButtonElement>('update-btn');
  const updateSW = registerSW({
    onNeedRefresh() {
      if (!btn) return;
      btn.hidden = false;
      btn.onclick = () => updateSW(true); // reload sang bản mới
    },
    onRegisteredSW(_url, registration) {
      // Định kỳ kiểm tra bản mới trong lúc đang chơi.
      if (registration) setInterval(() => registration.update(), CHECK_INTERVAL_MS);
    },
  });
}

/** Nút Cài đặt App: chỉ hiện trên điện thoại và khi CHƯA cài. */
function setupInstallButton(): void {
  const btn = el<HTMLButtonElement>('install-btn');
  if (!btn || isStandalone() || !isMobile()) return;

  let deferred: BeforeInstallPromptEvent | null = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    btn.hidden = false;
  });

  // iOS không bắn beforeinstallprompt → hiện nút + hướng dẫn thủ công.
  if (isIos()) {
    btn.hidden = false;
    btn.onclick = () => {
      const help = el<HTMLDivElement>('ios-help');
      if (help) help.style.display = help.style.display === 'block' ? 'none' : 'block';
    };
    return;
  }

  btn.onclick = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    btn.hidden = true;
  };

  window.addEventListener('appinstalled', () => {
    btn.hidden = true;
  });
}

/** Cố gắng khoá xoay ngang khi vào toàn màn hình (Android hỗ trợ; iOS bỏ qua). */
function tryLockLandscape(): void {
  const orientation = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
  orientation?.lock?.('landscape').catch(() => {
    /* trình duyệt không hỗ trợ / không ở fullscreen — đã có lớp phủ nhắc xoay */
  });
}

/** Khởi tạo toàn bộ tính năng PWA. Gọi 1 lần khi vào app. */
export function setupPwa(): void {
  setupUpdateButton();
  setupInstallButton();
  tryLockLandscape();
}
