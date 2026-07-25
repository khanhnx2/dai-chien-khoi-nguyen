// Âm thanh tổng hợp bằng Web Audio (không cần file asset → luôn chạy trên Pages).
// AudioContext chỉ khởi tạo sau thao tác người dùng (chính sách trình duyệt).

type Sfx = 'spawn' | 'special' | 'win' | 'lose';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(sfx: Sfx): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    switch (sfx) {
      case 'spawn':
        this.blip(ctx, 220, 0.08, 'square');
        break;
      case 'special':
        this.sweep(ctx, 400, 900, 0.25);
        break;
      case 'win':
        this.arpeggio(ctx, [523, 659, 784]);
        break;
      case 'lose':
        this.sweep(ctx, 400, 120, 0.4, 'sawtooth');
        break;
    }
  }

  private blip(ctx: AudioContext, freq: number, dur: number, type: OscillatorType): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private sweep(ctx: AudioContext, from: number, to: number, dur: number, type: OscillatorType = 'triangle'): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(to, ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private arpeggio(ctx: AudioContext, freqs: number[]): void {
    freqs.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }
}
